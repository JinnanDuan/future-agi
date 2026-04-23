"""
Ground Truth Search tool for AI agent evaluators.

Searches a ground truth dataset using embedding similarity to find
relevant reference examples. Used by AgentEvaluator to access
human-annotated examples during evaluation.
"""

import structlog
from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.registry import register_tool

logger = structlog.get_logger(__name__)


class GroundTruthSearchInput(PydanticBaseModel):
    query: str = Field(
        description="Search query — describe what kind of examples you're looking for"
    )
    ground_truth_id: str = Field(description="Ground truth dataset ID to search in")
    max_results: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of examples to return (default 5)",
    )


@register_tool
class GroundTruthSearchTool(BaseTool):
    name = "search_ground_truth"
    description = (
        "Search the ground truth dataset for relevant reference examples that have "
        "been evaluated by human experts. Returns similar cases with their expected "
        "outputs and scoring. Use this to find calibration examples when evaluating "
        "similar inputs."
    )
    category = "web"
    input_model = GroundTruthSearchInput

    def execute(
        self, params: GroundTruthSearchInput, context: ToolContext
    ) -> ToolResult:
        try:
            from model_hub.utils.ground_truth_retrieval import (
                generate_embedding,
                retrieve_similar_examples,
            )

            query_embedding = generate_embedding(params.query)

            results = retrieve_similar_examples(
                ground_truth_id=params.ground_truth_id,
                query_embedding=query_embedding,
                max_examples=params.max_results,
                similarity_threshold=0.3,  # Lower threshold — let agent judge relevance
            )

            if not results:
                return ToolResult(
                    output="No relevant ground truth examples found for this query.",
                    metadata={"total_results": 0},
                )

            # Format results for the agent
            formatted_parts = [
                f"Found {len(results)} relevant ground truth examples:\n"
            ]
            for i, result in enumerate(results, 1):
                formatted_parts.append(
                    f"--- Example {i} (similarity: {result['similarity']}) ---"
                )
                row_data = result["row_data"]
                for key, value in row_data.items():
                    val_str = str(value)
                    if len(val_str) > 500:
                        val_str = val_str[:500] + "..."
                    formatted_parts.append(f"  {key}: {val_str}")
                formatted_parts.append("")

            return ToolResult(
                output="\n".join(formatted_parts),
                metadata={"total_results": len(results)},
            )

        except Exception as e:
            logger.error("ground_truth_search_failed", error=str(e))
            return ToolResult.error(f"Ground truth search failed: {e}")
