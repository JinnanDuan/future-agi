"""
analyze_project_traces — triggers background error analysis for traces in a project.

This is the on-demand replacement for the beat task. Each trace is analyzed
independently using the full TraceErrorAnalysisAgent pipeline (Chauffeur + Judge),
same as the old beat task did. Results appear on the feed once clustering completes.

The tool returns immediately — analysis runs in the background via Temporal.
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.formatting import key_value_block, section
from ai_tools.registry import register_tool


class AnalyzeProjectTracesInput(PydanticBaseModel):
    project_id: UUID = Field(
        description="The project UUID whose traces should be analyzed",
    )
    trace_ids: list[str] = Field(
        default_factory=list,
        description=(
            "Specific trace IDs to analyze. If empty, analyzes all "
            "un-analyzed traces in the project."
        ),
    )
    max_traces: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of traces to analyze in this batch",
    )


@register_tool
class AnalyzeProjectTracesTool(BaseTool):
    name = "analyze_project_traces"
    description = (
        "Triggers background error analysis for traces in a project. "
        "Each trace is analyzed independently using the full analysis pipeline "
        "(reads all spans, identifies errors, scores quality, clusters results). "
        "Returns immediately — analysis runs in the background. "
        "Results appear on the error feed once complete."
    )
    category = "error_feed"
    input_model = AnalyzeProjectTracesInput

    def execute(
        self, params: AnalyzeProjectTracesInput, context: ToolContext
    ) -> ToolResult:
        import structlog

        from tracer.models.project import Project
        from tracer.models.trace import Trace, TraceErrorAnalysisStatus
        from tracer.models.trace_error_analysis import TraceErrorAnalysis

        logger = structlog.get_logger(__name__)

        # Verify project access
        try:
            project = Project.objects.get(
                id=params.project_id,
                organization=context.organization,
            )
        except Project.DoesNotExist:
            return ToolResult.not_found("Project", str(params.project_id))

        # Determine which traces to analyze
        if params.trace_ids and len(params.trace_ids) > 0:
            # Specific traces requested — validate they exist
            traces = list(
                Trace.objects.filter(
                    id__in=params.trace_ids,
                    project=project,
                ).values_list("id", flat=True)
            )
            if not traces:
                return ToolResult.error(
                    "None of the specified trace IDs were found in this project."
                )
            trace_ids = [str(t) for t in traces]
        else:
            # Find un-analyzed traces in the project
            already_analyzed = set(
                TraceErrorAnalysis.objects.filter(project=project).values_list(
                    "trace_id", flat=True
                )
            )
            all_trace_ids = list(
                Trace.objects.filter(project=project)
                .order_by("-created_at")
                .values_list("id", flat=True)[: params.max_traces]
            )
            trace_ids = [str(t) for t in all_trace_ids if t not in already_analyzed]

            if not trace_ids:
                # All traces already analyzed — offer to re-analyze
                total = Trace.objects.filter(project=project).count()
                analyzed = len(already_analyzed)
                return ToolResult(
                    content=section(
                        "Analysis Status",
                        f"All {analyzed} of {total} traces in project "
                        f"**{project.name}** have already been analyzed.\n\n"
                        f"To re-analyze specific traces, pass their trace_ids explicitly.",
                    ),
                    data={
                        "status": "already_analyzed",
                        "total_traces": total,
                        "analyzed_traces": analyzed,
                    },
                )

        # Mark traces as processing
        Trace.objects.filter(id__in=trace_ids).update(
            error_analysis_status=TraceErrorAnalysisStatus.PROCESSING
        )

        # Dispatch via Temporal in batches of 10 (same as old beat task)
        try:
            from tracer.tasks.error_analysis import analyze_traces_on_demand

            batch_size = 10
            batches_dispatched = 0
            for i in range(0, len(trace_ids), batch_size):
                batch = trace_ids[i : i + batch_size]
                analyze_traces_on_demand.delay(str(project.id), batch)
                batches_dispatched += 1

            logger.info(
                "analyze_project_traces_dispatched",
                project_id=str(project.id),
                trace_count=len(trace_ids),
                batches=batches_dispatched,
            )
        except Exception as e:
            logger.exception("Failed to dispatch trace analysis")
            return ToolResult.error(f"Failed to start background analysis: {str(e)}")

        # Build response
        info = key_value_block(
            [
                ("Status", "Analysis started in background"),
                ("Project", project.name),
                ("Traces queued", str(len(trace_ids))),
                ("Batches", str(batches_dispatched)),
                ("Batch size", str(batch_size)),
            ]
        )

        content = section("Trace Analysis Triggered", info)
        content += (
            "\n\nEach trace will be analyzed independently using the full "
            "error analysis pipeline. Results will appear on the **Feed** tab "
            "once analysis and clustering complete.\n\n"
            f"Estimated time: {len(trace_ids) * 30}–{len(trace_ids) * 60} seconds "
            f"for {len(trace_ids)} traces."
        )

        return ToolResult(
            content=content,
            data={
                "status": "dispatched",
                "project_id": str(project.id),
                "project_name": project.name,
                "trace_count": len(trace_ids),
                "trace_ids": trace_ids,
                "batches": batches_dispatched,
            },
        )
