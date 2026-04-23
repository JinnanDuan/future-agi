"""
Service layer for eval result clustering.

Mirrors trace_scanner.cluster_issues() — orchestrates the embed → match → assign
pipeline for failing eval results.
"""

from typing import List

import structlog

from tracer.queries.eval_clustering import (
    assign_to_cluster,
    create_cluster,
    embed_texts,
    find_nearest_centroid,
    get_unclustered_eval_results,
)
from tracer.types.eval_cluster_types import EvalClusteringSummary

logger = structlog.get_logger(__name__)


def cluster_eval_results(project_id: str) -> EvalClusteringSummary:
    """
    Cluster all unclustered failing eval results for a project.

    Online incremental: embed each explanation → cosine match against
    centroids (partitioned by eval name) → assign or create.
    """
    results = get_unclustered_eval_results(project_id)
    if not results:
        logger.info("no_unclustered_eval_results", project_id=project_id)
        return EvalClusteringSummary()

    texts = [r.embedding_text for r in results]
    embeddings = embed_texts(texts)

    summary = EvalClusteringSummary()

    for result, embedding in zip(results, embeddings):
        try:
            match = find_nearest_centroid(embedding, project_id, result.eval_name)

            if match:
                cluster_id, distance = match
                assign_to_cluster(cluster_id, project_id, result, embedding)
                summary.assigned += 1
                logger.debug(
                    "eval_result_matched",
                    eval_logger_id=result.eval_logger_id,
                    cluster_id=cluster_id,
                    distance=round(distance, 4),
                )
            else:
                create_cluster(project_id, result, embedding)
                summary.new_clusters += 1
        except Exception:
            logger.exception(
                "cluster_eval_result_failed",
                eval_logger_id=result.eval_logger_id,
                project_id=project_id,
            )

    summary.clustered = summary.new_clusters + summary.assigned
    logger.info(
        "cluster_eval_results_completed",
        project_id=project_id,
        clustered=summary.clustered,
        new_clusters=summary.new_clusters,
        assigned=summary.assigned,
    )
    return summary
