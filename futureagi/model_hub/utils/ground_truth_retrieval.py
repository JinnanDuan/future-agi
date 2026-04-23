"""
Ground truth embedding and retrieval service.

Handles:
- Text preparation for embedding (from ground truth rows + role mapping)
- Embedding generation via the model serving client
- Cosine similarity search for retrieving similar examples
- Few-shot prompt formatting
"""

import numpy as np
import structlog

logger = structlog.get_logger(__name__)


# =========================================================================
# Text Preparation
# =========================================================================


def prepare_embedding_text(row: dict, role_mapping: dict | None) -> str:
    """
    Build the text to embed for a ground truth row.

    Prioritizes role-mapped columns (input + expected_output) since that's
    what we match against at eval time. Excludes score/reasoning (metadata
    about the judgment, not the content).

    Falls back to concatenating all columns if no role mapping.
    """
    if role_mapping:
        parts = []
        for role in ("input", "expected_output"):
            col = role_mapping.get(role)
            if col and col in row:
                val = row[col]
                if val is not None and str(val).strip():
                    parts.append(f"{role}: {val}")
        if parts:
            return "\n".join(parts)

    # Fallback: concatenate all columns
    parts = []
    for key, value in row.items():
        if value is not None and str(value).strip():
            parts.append(f"{key}: {value}")
    return "\n".join(parts)


# =========================================================================
# Embedding Generation
# =========================================================================


def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text using the serving client.
    Returns a list of floats.
    """
    from agentic_eval.core.embeddings.serving_client import get_serving_client

    client = get_serving_client()
    embedding = client.embed_text(text)
    return embedding


def generate_embeddings_batch(
    texts: list[str], batch_size: int = 32
) -> list[list[float]]:
    """
    Generate embeddings for a batch of texts.
    Processes in chunks to avoid overwhelming the serving client.
    """
    from agentic_eval.core.embeddings.serving_client import get_serving_client

    client = get_serving_client()
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        # embed_text accepts list[str] and returns embeddings
        # For batch, we call individually to match the API
        for text in batch:
            try:
                emb = client.embed_text(text)
                all_embeddings.append(emb)
            except Exception as e:
                logger.warning("embedding_failed_for_row", error=str(e), batch_offset=i)
                all_embeddings.append(None)

    return all_embeddings


# =========================================================================
# Similarity Search
# =========================================================================


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def retrieve_similar_examples(
    ground_truth_id: str,
    query_embedding: list[float],
    max_examples: int = 3,
    similarity_threshold: float = 0.7,
) -> list[dict]:
    """
    Retrieve top-K most similar ground truth rows by cosine similarity.

    Returns list of dicts: [{"similarity": float, "row_data": dict, "row_index": int}, ...]
    sorted by similarity descending.
    """
    from model_hub.models.evals_metric import EvalGroundTruthEmbedding

    embeddings_qs = EvalGroundTruthEmbedding.objects.filter(
        ground_truth_id=ground_truth_id,
    ).values_list("embedding", "row_data", "row_index")

    scored = []
    for emb_vec, row_data, row_index in embeddings_qs:
        sim = cosine_similarity(query_embedding, emb_vec)
        if sim >= similarity_threshold:
            scored.append(
                {
                    "similarity": round(sim, 4),
                    "row_data": row_data,
                    "row_index": row_index,
                }
            )

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:max_examples]


# =========================================================================
# Ground Truth Loading (for eval execution)
# =========================================================================


def load_ground_truth_config(eval_template) -> dict | None:
    """
    Load ground truth configuration from an eval template.
    Returns the ground_truth config dict, or None if not configured/enabled.
    """
    config = eval_template.config or {}
    gt_config = config.get("ground_truth")
    if not gt_config or not gt_config.get("enabled"):
        return None
    if not gt_config.get("ground_truth_id"):
        return None
    return gt_config


def get_ground_truth_few_shot_examples(
    gt_config: dict,
    current_input: dict,
) -> list[dict]:
    """
    For LLM-as-a-Judge: Retrieve similar ground truth examples for few-shot injection.

    Args:
        gt_config: The ground_truth config from eval_template.config
        current_input: The current eval input variables dict

    Returns:
        List of row_data dicts (the actual ground truth examples)
    """
    from model_hub.models.evals_metric import EvalGroundTruth

    gt_id = gt_config.get("ground_truth_id")
    max_examples = gt_config.get("max_examples", 3)
    threshold = gt_config.get("similarity_threshold", 0.7)

    try:
        gt = EvalGroundTruth.objects.get(id=gt_id, deleted=False)
    except EvalGroundTruth.DoesNotExist:
        logger.warning("ground_truth_not_found", gt_id=gt_id)
        return []

    if gt.embedding_status != "completed":
        logger.warning(
            "ground_truth_embeddings_not_ready", gt_id=gt_id, status=gt.embedding_status
        )
        return []

    # Build query text from current eval input
    query_parts = []
    for key in ("input", "output", "expected"):
        if key in current_input and current_input[key]:
            query_parts.append(str(current_input[key]))
    if not query_parts:
        # Fallback: concatenate all input values
        for value in current_input.values():
            if value and str(value).strip():
                query_parts.append(str(value))

    if not query_parts:
        return []

    query_text = "\n".join(query_parts)

    try:
        query_embedding = generate_embedding(query_text)
    except Exception as e:
        logger.warning("query_embedding_failed", error=str(e))
        return []

    results = retrieve_similar_examples(
        ground_truth_id=gt_id,
        query_embedding=query_embedding,
        max_examples=max_examples,
        similarity_threshold=threshold,
    )

    return [r["row_data"] for r in results]


# =========================================================================
# Few-Shot Prompt Formatting
# =========================================================================


def format_few_shot_examples(
    examples: list[dict],
    role_mapping: dict | None,
    injection_format: str = "structured",
) -> str:
    """
    Format ground truth examples as a text block for injection into eval prompts.

    Args:
        examples: List of row_data dicts
        role_mapping: Maps semantic roles to column names
        injection_format: "structured", "conversational", or "xml"

    Returns:
        Formatted string to inject into the prompt
    """
    if not examples:
        return ""

    if injection_format == "xml":
        return _format_xml(examples, role_mapping)
    elif injection_format == "conversational":
        return _format_conversational(examples, role_mapping)
    else:
        return _format_structured(examples, role_mapping)


def _format_structured(examples: list[dict], role_mapping: dict | None) -> str:
    lines = [
        "--- Reference Examples (scored by human experts) ---",
        "",
    ]

    for i, example in enumerate(examples, 1):
        lines.append(f"Example {i}:")
        if role_mapping:
            for role, col in role_mapping.items():
                if col in example:
                    label = role.replace("_", " ").title()
                    val = example[col]
                    lines.append(f"  {label}: {val}")
        else:
            for key, val in example.items():
                lines.append(f"  {key}: {val}")
        lines.append("")

    lines.append("--- End Reference Examples ---")
    return "\n".join(lines)


def _format_conversational(examples: list[dict], role_mapping: dict | None) -> str:
    lines = []
    for i, example in enumerate(examples, 1):
        # Build the "case" part
        case_parts = []
        answer_parts = []
        if role_mapping:
            for role, col in role_mapping.items():
                if col in example:
                    if role in ("input", "expected_output"):
                        case_parts.append(
                            f"{role.replace('_', ' ').title()}: {example[col]}"
                        )
                    else:
                        answer_parts.append(
                            f"{role.replace('_', ' ').title()}: {example[col]}"
                        )
        else:
            for key, val in example.items():
                case_parts.append(f"{key}: {val}")

        if case_parts:
            lines.append(f"Example {i}: " + " | ".join(case_parts))
        if answer_parts:
            lines.append("Expert judgment: " + " | ".join(answer_parts))
        lines.append("")

    return "\n".join(lines)


def _format_xml(examples: list[dict], role_mapping: dict | None) -> str:
    lines = ["<reference_examples>"]

    for example in examples:
        score = ""
        if role_mapping and "score" in role_mapping:
            score_col = role_mapping["score"]
            if score_col in example:
                score = f' score="{example[score_col]}"'

        lines.append(f"  <example{score}>")
        if role_mapping:
            for role, col in role_mapping.items():
                if col in example and role != "score":
                    lines.append(f"    <{role}>{example[col]}</{role}>")
        else:
            for key, val in example.items():
                lines.append(f"    <{key}>{val}</{key}>")
        lines.append("  </example>")

    lines.append("</reference_examples>")
    return "\n".join(lines)
