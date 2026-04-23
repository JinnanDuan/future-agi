"""
Temporal activities for ground truth embedding generation.

Generates per-row embeddings for a ground truth dataset so they can be
used for similarity-based retrieval at eval time.
"""

import structlog
from django.db import close_old_connections
from temporalio import activity

from tfc.temporal.ground_truth.types import (
    GenerateEmbeddingsInput,
    GenerateEmbeddingsOutput,
)

logger = structlog.get_logger(__name__)


def _generate_embeddings_sync(ground_truth_id: str) -> dict:
    """
    Synchronous implementation of embedding generation.

    For each row in the ground truth dataset:
    1. Prepare text from role-mapped columns
    2. Generate embedding via serving client
    3. Store in EvalGroundTruthEmbedding
    4. Update progress on parent EvalGroundTruth
    """
    close_old_connections()

    from model_hub.models.evals_metric import EvalGroundTruth, EvalGroundTruthEmbedding
    from model_hub.utils.ground_truth_retrieval import (
        generate_embedding,
        prepare_embedding_text,
    )

    try:
        gt = EvalGroundTruth.objects.get(id=ground_truth_id, deleted=False)
    except EvalGroundTruth.DoesNotExist:
        return {
            "ground_truth_id": ground_truth_id,
            "rows_embedded": 0,
            "status": "failed",
            "error": "Ground truth not found",
        }

    # Mark as processing
    gt.embedding_status = "processing"
    gt.embedded_row_count = 0
    gt.save(update_fields=["embedding_status", "embedded_row_count", "updated_at"])

    # Clear any existing embeddings (for re-embedding after role mapping change)
    EvalGroundTruthEmbedding.objects.filter(ground_truth=gt).delete()

    data = gt.data or []
    role_mapping = gt.role_mapping
    rows_embedded = 0

    for idx, row in enumerate(data):
        try:
            text = prepare_embedding_text(row, role_mapping)
            if not text.strip():
                logger.warning(
                    "empty_embedding_text",
                    gt_id=ground_truth_id,
                    row_index=idx,
                )
                continue

            embedding = generate_embedding(text)

            EvalGroundTruthEmbedding.objects.create(
                ground_truth=gt,
                row_index=idx,
                text_content=text[:5000],  # Truncate for storage
                embedding=embedding,
                row_data=row,
            )
            rows_embedded += 1

            # Update progress every 50 rows
            if rows_embedded % 50 == 0:
                gt.embedded_row_count = rows_embedded
                gt.save(update_fields=["embedded_row_count", "updated_at"])

            # Heartbeat so Temporal knows we're alive
            activity.heartbeat(f"Embedded {rows_embedded}/{len(data)} rows")

        except Exception as e:
            logger.warning(
                "row_embedding_failed",
                gt_id=ground_truth_id,
                row_index=idx,
                error=str(e),
            )
            # Continue with next row — don't fail the whole job for one row

    # Final update
    gt.embedded_row_count = rows_embedded
    gt.embedding_status = "completed" if rows_embedded > 0 else "failed"
    gt.save(update_fields=["embedding_status", "embedded_row_count", "updated_at"])

    return {
        "ground_truth_id": ground_truth_id,
        "rows_embedded": rows_embedded,
        "status": gt.embedding_status,
        "error": None if rows_embedded > 0 else "No rows could be embedded",
    }


@activity.defn
async def generate_ground_truth_embeddings_activity(
    input: GenerateEmbeddingsInput,
) -> GenerateEmbeddingsOutput:
    """
    Temporal activity that generates embeddings for all rows in a ground truth dataset.
    Runs on tasks_xl queue (long-running, uses embedding model).
    """
    logger.info(
        "generate_ground_truth_embeddings_start",
        gt_id=input.ground_truth_id,
    )

    try:
        from tfc.telemetry import otel_sync_to_async

        result = await otel_sync_to_async(_generate_embeddings_sync)(
            input.ground_truth_id
        )

        logger.info(
            "generate_ground_truth_embeddings_done",
            gt_id=input.ground_truth_id,
            rows_embedded=result["rows_embedded"],
            status=result["status"],
        )

        return GenerateEmbeddingsOutput(**result)

    except Exception as e:
        logger.error(
            "generate_ground_truth_embeddings_error",
            gt_id=input.ground_truth_id,
            error=str(e),
        )

        # Mark as failed
        try:
            close_old_connections()
            from model_hub.models.evals_metric import EvalGroundTruth

            gt = EvalGroundTruth.objects.get(id=input.ground_truth_id)
            gt.embedding_status = "failed"
            gt.save(update_fields=["embedding_status", "updated_at"])
        except Exception:
            pass

        return GenerateEmbeddingsOutput(
            ground_truth_id=input.ground_truth_id,
            rows_embedded=0,
            status="failed",
            error=str(e),
        )
