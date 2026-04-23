from uuid import UUID

from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.formatting import (
    format_number,
    key_value_block,
    markdown_table,
    section,
)
from ai_tools.registry import register_tool


class GetSessionAnalyticsInput(PydanticBaseModel):
    session_id: UUID = Field(description="The UUID of the session to analyze")


@register_tool
class GetSessionAnalyticsTool(BaseTool):
    name = "get_session_analytics"
    description = (
        "Returns aggregated analytics for a trace session, including total tokens, "
        "total cost, error count, average latency, and per-model breakdown."
    )
    category = "tracing"
    input_model = GetSessionAnalyticsInput

    def execute(
        self, params: GetSessionAnalyticsInput, context: ToolContext
    ) -> ToolResult:
        from django.db.models import Avg, Count, Sum

        from tracer.models.observation_span import ObservationSpan
        from tracer.models.trace import Trace
        from tracer.models.trace_session import TraceSession

        try:
            session = TraceSession.objects.select_related("project").get(
                id=params.session_id, project__organization=context.organization
            )
        except TraceSession.DoesNotExist:
            return ToolResult.not_found("Session", str(params.session_id))

        # Trace-level stats
        traces = Trace.objects.filter(session=session)
        trace_count = traces.count()
        error_traces = traces.exclude(error__isnull=True).exclude(error={}).count()

        # Span-level aggregations
        spans = ObservationSpan.objects.filter(trace__session=session, deleted=False)

        agg = spans.aggregate(
            total_tokens=Sum("total_tokens"),
            total_prompt_tokens=Sum("prompt_tokens"),
            total_completion_tokens=Sum("completion_tokens"),
            total_cost=Sum("cost"),
            avg_latency=Avg("latency_ms"),
            span_count=Count("id"),
        )

        error_spans = spans.filter(status="ERROR").count()

        info = key_value_block(
            [
                ("Session ID", f"`{params.session_id}`"),
                ("Session Name", session.name or "—"),
                ("Project", session.project.name if session.project else "—"),
                ("Total Traces", str(trace_count)),
                ("Error Traces", str(error_traces)),
                (
                    "Error Rate",
                    f"{format_number(error_traces / trace_count * 100 if trace_count else 0)}%",
                ),
                ("Total Spans", str(agg["span_count"] or 0)),
                ("Error Spans", str(error_spans)),
                ("Total Tokens", str(agg["total_tokens"] or 0)),
                ("Prompt Tokens", str(agg["total_prompt_tokens"] or 0)),
                ("Completion Tokens", str(agg["total_completion_tokens"] or 0)),
                ("Total Cost", f"${format_number(agg['total_cost'] or 0, 4)}"),
                ("Avg Latency", f"{format_number(agg['avg_latency'] or 0)}ms"),
            ]
        )

        content = section(f"Session Analytics: {session.name or str(session.id)}", info)

        # Per-model breakdown
        model_stats = (
            spans.exclude(model__isnull=True)
            .exclude(model="")
            .values("model")
            .annotate(
                count=Count("id"),
                tokens=Sum("total_tokens"),
                cost=Sum("cost"),
                avg_lat=Avg("latency_ms"),
            )
            .order_by("-count")[:15]
        )

        if model_stats:
            content += "\n\n### Per-Model Breakdown\n\n"
            model_rows = []
            for ms in model_stats:
                model_rows.append(
                    [
                        ms["model"],
                        str(ms["count"]),
                        str(ms["tokens"] or 0),
                        f"${format_number(ms['cost'] or 0, 4)}",
                        f"{format_number(ms['avg_lat'] or 0)}ms",
                    ]
                )
            content += markdown_table(
                ["Model", "Spans", "Tokens", "Cost", "Avg Latency"], model_rows
            )

        # Per-type breakdown
        type_stats = (
            spans.values("observation_type")
            .annotate(
                count=Count("id"),
                tokens=Sum("total_tokens"),
                cost=Sum("cost"),
            )
            .order_by("-count")
        )

        if type_stats:
            content += "\n\n### Per-Type Breakdown\n\n"
            type_rows = []
            for ts in type_stats:
                type_rows.append(
                    [
                        ts["observation_type"] or "—",
                        str(ts["count"]),
                        str(ts["tokens"] or 0),
                        f"${format_number(ts['cost'] or 0, 4)}",
                    ]
                )
            content += markdown_table(["Type", "Spans", "Tokens", "Cost"], type_rows)

        data = {
            "session_id": str(params.session_id),
            "trace_count": trace_count,
            "error_traces": error_traces,
            "total_tokens": agg["total_tokens"] or 0,
            "total_cost": float(agg["total_cost"] or 0),
            "avg_latency_ms": float(agg["avg_latency"] or 0),
            "span_count": agg["span_count"] or 0,
        }

        return ToolResult(content=content, data=data)
