from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.formatting import (
    format_datetime,
    format_number,
    markdown_table,
    section,
    truncate,
)
from ai_tools.registry import register_tool


class ListTraceScoresInput(PydanticBaseModel):
    trace_id: Optional[UUID] = Field(
        default=None,
        description="The UUID of the trace to list annotations/scores for",
    )
    observation_span_id: Optional[str] = Field(
        default=None,
        description="Filter by observation span ID",
    )
    annotators: Optional[List[UUID]] = Field(
        default=None,
        description="Include only annotations from these annotator user IDs",
    )
    exclude_annotators: Optional[List[UUID]] = Field(
        default=None,
        description="Exclude annotations from these annotator user IDs",
    )


@register_tool
class ListTraceScoresTool(BaseTool):
    name = "list_trace_scores"
    description = (
        "Lists all annotations/scores for a specific trace, including the annotation "
        "label name, type, value, observation span, and who created it."
    )
    category = "tracing"
    input_model = ListTraceScoresInput

    def execute(self, params: ListTraceScoresInput, context: ToolContext) -> ToolResult:

        from tracer.models.trace import Trace
        from tracer.models.trace_annotation import TraceAnnotation

        if not params.trace_id and not params.observation_span_id:
            return ToolResult.error(
                "Provide at least one of trace_id or observation_span_id.",
                error_code="VALIDATION_ERROR",
            )

        # Build base filter with org scoping
        filters = {}
        if params.trace_id:
            # Verify trace exists and belongs to the user's organization
            try:
                trace = Trace.objects.get(
                    id=params.trace_id,
                    project__organization=context.organization,
                )
            except Trace.DoesNotExist:
                return ToolResult.not_found("Trace", str(params.trace_id))
            filters["trace"] = trace

        if params.observation_span_id:
            filters["observation_span_id"] = params.observation_span_id
            filters["observation_span__project__organization"] = context.organization

        annotations = (
            TraceAnnotation.objects.filter(**filters)
            .select_related("annotation_label", "user", "observation_span")
            .order_by("-created_at")
        )

        # Apply annotator filters
        if params.annotators:
            annotations = annotations.filter(user_id__in=params.annotators)
        if params.exclude_annotators:
            annotations = annotations.exclude(user_id__in=params.exclude_annotators)

        total = annotations.count()

        if not annotations:
            return ToolResult(
                content=section(
                    "Trace Annotations",
                    f"No annotations found for trace `{params.trace_id}`.",
                ),
                data={"annotations": [], "total": 0},
            )

        rows = []
        data_list = []
        for ann in annotations[:50]:
            label_name = ann.annotation_label.name if ann.annotation_label else "—"
            label_type = ann.annotation_label.type if ann.annotation_label else "—"

            # Determine value based on type
            if ann.annotation_value is not None:
                value = ann.annotation_value
            elif ann.annotation_value_float is not None:
                value = format_number(ann.annotation_value_float)
            elif ann.annotation_value_bool is not None:
                value = "True" if ann.annotation_value_bool else "False"
            elif ann.annotation_value_str_list:
                value = ", ".join(str(v) for v in ann.annotation_value_str_list[:3])
            else:
                value = "—"

            span_id = (
                f"`{str(ann.observation_span_id)[:12]}...`"
                if ann.observation_span_id
                else "—"
            )
            user_name = ann.user.email if ann.user else (ann.updated_by or "—")

            rows.append(
                [
                    f"`{ann.id}`",
                    label_name,
                    label_type,
                    truncate(str(value), 40),
                    span_id,
                    user_name,
                    format_datetime(ann.created_at),
                ]
            )
            data_list.append(
                {
                    "id": str(ann.id),
                    "label_name": label_name,
                    "label_type": label_type,
                    "value": ann.annotation_value,
                    "value_float": ann.annotation_value_float,
                    "value_bool": ann.annotation_value_bool,
                    "observation_span_id": (
                        str(ann.observation_span_id)
                        if ann.observation_span_id
                        else None
                    ),
                    "annotation_label_id": (
                        str(ann.annotation_label_id)
                        if ann.annotation_label_id
                        else None
                    ),
                }
            )

        table = markdown_table(
            ["ID", "Label", "Type", "Value", "Span", "By", "Created"], rows
        )

        content = section(
            f"Annotations for Trace `{str(params.trace_id)}` ({total})",
            table,
        )

        if total > 50:
            content += f"\n\n_Showing 50 of {total} annotations._"

        return ToolResult(
            content=content, data={"annotations": data_list, "total": total}
        )
