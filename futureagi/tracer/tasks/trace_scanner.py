"""
Trace scanner Temporal activities.

Activity 1: scan_traces_task — scan completed traces for issues
Activity 2: embed_trace_inputs_task — kevinify + embed root inputs for all scanned traces
Activity 3: cluster_scan_issues_task — cluster unclustered issues + match success traces
"""

import time
from typing import List

import structlog

from tfc.temporal.drop_in import temporal_activity
from tracer.models.trace_error_analysis import TraceErrorGroup
from tracer.utils.trace_scanner import (
    cluster_issues,
    embed_trace_inputs,
    match_success_traces,
    scan_and_write,
)

logger = structlog.get_logger(__name__)

SCAN_DELAY_SECONDS = 10


@temporal_activity(time_limit=600, queue="agent_compass", max_retries=1)
def scan_traces_task(trace_ids: List[str], project_id: str):
    """
    Scan completed traces for issues.

    Triggered from OTLP ingestion after root span completion.
    Waits 10s for straggler child spans, then runs the full scan pipeline.
    Chain: scan → embed inputs → cluster + match success traces.
    """
    time.sleep(SCAN_DELAY_SECONDS)

    logger.info(
        "scan_traces_task_started",
        trace_count=len(trace_ids),
        project_id=project_id,
    )

    results = scan_and_write(trace_ids, project_id)

    issues_found = sum(len(r.issues) for r in results)
    logger.info(
        "scan_traces_task_completed",
        trace_count=len(results),
        issues_found=issues_found,
        project_id=project_id,
    )

    # Always embed root inputs (success + failure traces needed for KNN).
    # Embed triggers clustering if there are new issues.
    embed_trace_inputs_task.apply_async(
        args=(trace_ids, project_id, issues_found > 0),
    )


@temporal_activity(time_limit=300, queue="agent_compass", max_retries=1)
def embed_trace_inputs_task(
    trace_ids: List[str], project_id: str, trigger_clustering: bool
):
    """
    Kevinify + embed root span inputs for all scanned traces.

    Stores in ClickHouse for KNN success trace matching.
    Runs for ALL traces (success and failure) so KNN has both sides.
    Chains to clustering if new issues were found.
    """
    logger.info(
        "embed_trace_inputs_task_started",
        trace_count=len(trace_ids),
        project_id=project_id,
    )

    stored = embed_trace_inputs(trace_ids, project_id)

    logger.info(
        "embed_trace_inputs_task_completed",
        project_id=project_id,
        stored=stored,
    )

    if trigger_clustering:
        cluster_scan_issues_task.apply_async(args=(project_id,))


@temporal_activity(time_limit=300, queue="agent_compass", max_retries=1)
def cluster_scan_issues_task(project_id: str):
    """
    Cluster unclustered scanner issues + match success traces for updated clusters.

    Online incremental: each issue → embed → cosine match centroids → assign or create cluster.
    After clustering, KNN matches nearest success trace per updated cluster.
    """
    logger.info("cluster_scan_issues_task_started", project_id=project_id)

    summary = cluster_issues(project_id)

    logger.info(
        "cluster_scan_issues_task_completed",
        project_id=project_id,
        clustered=summary.clustered,
        new_clusters=summary.new_clusters,
        assigned=summary.assigned,
    )

    # Match success traces for all scanner clusters in this project
    if summary.clustered > 0:
        cluster_ids = list(
            TraceErrorGroup.objects.filter(
                project_id=project_id,
                source="scanner",
            ).values_list("cluster_id", flat=True)
        )

        matches = match_success_traces(project_id, cluster_ids)
        logger.info(
            "success_trace_matching_completed",
            project_id=project_id,
            clusters_checked=len(cluster_ids),
            matches_found=len(matches),
        )
