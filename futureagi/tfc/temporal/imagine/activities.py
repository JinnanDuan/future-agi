"""
Temporal activities for Imagine dynamic analysis.

These run on the tasks_xl worker (LLM-heavy).
"""

import asyncio

import structlog
from temporalio import activity

from tfc.temporal.imagine.types import (
    FetchTraceInput,
    RunAnalysisInput,
    SaveResultInput,
)

logger = structlog.get_logger(__name__)


@activity.defn
async def fetch_trace_data(input: FetchTraceInput) -> str:
    """Fetch trace + spans from DB and format as context string for LLM."""
    from channels.db import database_sync_to_async

    from tracer.models.observation_span import ObservationSpan
    from tracer.models.trace import Trace

    try:
        trace = await database_sync_to_async(
            lambda: Trace.objects.select_related("project").get(
                id=input.trace_id,
                project__organization_id=input.org_id,
            )
        )()
    except Trace.DoesNotExist:
        return f"Trace {input.trace_id} not found."

    spans = await database_sync_to_async(
        lambda: list(
            ObservationSpan.objects.filter(trace_id=str(input.trace_id))
            .order_by("start_time")
            .values(
                "id",
                "name",
                "observation_type",
                "status",
                "latency_ms",
                "total_tokens",
                "model",
                "input",
                "output",
                "cost",
            )[:20]
        )
    )()

    project_name = trace.project.name if trace.project else "?"

    lines = [
        f"Trace ID: {trace.id}",
        f"Project: {project_name}",
        f"Spans: {len(spans)}",
        "",
    ]

    total_latency = 0
    total_tokens = 0
    for i, s in enumerate(spans):
        lat = s.get("latency_ms") or 0
        tok = s.get("total_tokens") or 0
        total_latency += lat
        total_tokens += tok
        model = f" model={s['model']}" if s.get("model") else ""
        lines.append(
            f"  {i + 1}. {s['name']} [{s.get('observation_type', '?')}] "
            f"{lat}ms {tok}tok status={s.get('status', '?')}{model}"
        )

    lines.insert(3, f"Total: {total_latency}ms latency, {total_tokens} tokens")

    # Root span input/output
    if spans:
        root = spans[0]
        inp = str(root.get("input", ""))[:300]
        out = str(root.get("output", ""))[:300]
        if inp:
            lines.append(f"\nInput: {inp}")
        if out:
            lines.append(f"Output: {out}")

    return "\n".join(lines)


@activity.defn
async def run_llm_analysis(input: RunAnalysisInput) -> str:
    """Run LLM analysis using Falcon's LLM client. Returns markdown."""
    # Falcon is gated on deployment mode (EE / Cloud) AND code presence.
    try:
        from ee.usage.deployment import DeploymentMode

        _is_oss = DeploymentMode.is_oss()
    except ImportError:
        _is_oss = True

    if _is_oss:
        raise RuntimeError(
            "Imagine requires Falcon AI (EE). Not available on OSS."
        )

    try:
        from ee.falcon_ai.llm_client import FalconLLMClient
    except ImportError:
        raise RuntimeError(
            "Imagine requires Falcon AI (EE). Not available on OSS."
        )

    client = FalconLLMClient()

    full_prompt = (
        f"{input.prompt}\n\n"
        f"Trace context:\n{input.trace_context}\n\n"
        f"Respond in markdown. Be specific with numbers from the trace data. "
        f"Keep it concise (3-5 paragraphs max)."
    )

    messages = [{"role": "user", "content": full_prompt}]

    content = ""
    async for chunk in client.stream_completion(messages, tools=None):
        choices = chunk.get("choices", [])
        if not choices:
            continue
        delta = choices[0].get("delta", {})
        text = delta.get("content", "")
        if text:
            content += text
        if choices[0].get("finish_reason") == "stop":
            break

    if not content.strip():
        raise Exception("LLM returned empty response")

    return content


@activity.defn
async def save_analysis_result(input: SaveResultInput) -> None:
    """Save analysis result to DB."""
    from channels.db import database_sync_to_async

    def _save():
        from tracer.models.imagine_analysis import ImagineAnalysis

        try:
            analysis = ImagineAnalysis.objects.get(id=input.analysis_id)
            analysis.content = input.content
            analysis.status = input.status
            analysis.error = input.error
            analysis.save(update_fields=["content", "status", "error", "updated_at"])
        except ImagineAnalysis.DoesNotExist:
            logger.warning("imagine_analysis_not_found", id=input.analysis_id)

    await database_sync_to_async(_save)()
