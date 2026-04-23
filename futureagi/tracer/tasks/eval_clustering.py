"""
Temporal activities for eval result clustering.

Mirrors trace_scanner tasks — cluster failing eval results into
TraceErrorGroup rows with source="eval".
"""

from typing import List

import structlog
from django.db import close_old_connections

from tfc.temporal import temporal_activity

logger = structlog.get_logger(__name__)


@temporal_activity(time_limit=600, queue="agent_compass", max_retries=1)
def cluster_eval_results_task(project_id: str):
    """
    Cluster unclustered failing eval results for a project.

    Call after eval task completion or on a sweep schedule.
    """
    from tracer.utils.eval_clustering import cluster_eval_results

    close_old_connections()

    summary = cluster_eval_results(project_id)

    logger.info(
        "cluster_eval_results_task_completed",
        project_id=project_id,
        clustered=summary.clustered,
        new_clusters=summary.new_clusters,
        assigned=summary.assigned,
    )
    return {
        "clustered": summary.clustered,
        "new_clusters": summary.new_clusters,
        "assigned": summary.assigned,
    }


@temporal_activity(time_limit=600, queue="agent_compass", max_retries=1)
def cluster_eval_results_for_projects(project_ids: List[str]):
    """
    Cluster eval results across multiple projects.

    Convenience wrapper for batch/sweep scenarios.
    """
    from tracer.utils.eval_clustering import cluster_eval_results

    close_old_connections()

    total = 0
    for project_id in project_ids:
        try:
            summary = cluster_eval_results(project_id)
            total += summary.clustered
        except Exception:
            logger.exception(
                "cluster_eval_results_project_failed",
                project_id=project_id,
            )

    logger.info(
        "cluster_eval_results_for_projects_completed",
        projects=len(project_ids),
        total_clustered=total,
    )
    return {"projects": len(project_ids), "total_clustered": total}
