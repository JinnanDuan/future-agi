"""
Per-tab endpoints for the Error Feed detail view.

- GET  /tracer/feed/issues/{cluster_id}/overview/      → FeedOverviewView
- GET  /tracer/feed/issues/{cluster_id}/traces/        → FeedTracesView
- GET  /tracer/feed/issues/{cluster_id}/trends/        → FeedTrendsView
- GET  /tracer/feed/issues/{cluster_id}/sidebar/       → FeedSidebarView
- GET  /tracer/feed/issues/{cluster_id}/root-cause/    → FeedRootCauseView
- POST /tracer/feed/issues/{cluster_id}/deep-analysis/ → FeedDeepAnalysisView
"""

import structlog
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from tfc.utils.general_methods import GeneralMethods
from tracer.serializers.feed import (
    DeepAnalysisBodySerializer,
    DeepAnalysisDispatchResponseSerializer,
    DeepAnalysisQuerySerializer,
    DeepAnalysisResponseSerializer,
    FeedSidebarQuerySerializer,
    FeedSidebarSerializer,
    OverviewResponseSerializer,
    TracesTabQuerySerializer,
    TracesTabResponseSerializer,
    TrendsTabQuerySerializer,
    TrendsTabResponseSerializer,
)
from tracer.utils import feed as feed_service

logger = structlog.get_logger(__name__)


class FeedOverviewView(APIView):
    """GET /tracer/feed/issues/{cluster_id}/overview/"""

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def get(self, request, cluster_id: str):
        try:
            result = feed_service.get_overview_tab(cluster_id)
        except Exception:
            logger.exception("feed_overview_failed", cluster_id=cluster_id)
            return self._gm.bad_request("Failed to fetch overview")

        if result is None:
            return self._gm.not_found(f"Cluster {cluster_id} not found")

        return self._gm.success_response(OverviewResponseSerializer(result).data)


class FeedTracesView(APIView):
    """GET /tracer/feed/issues/{cluster_id}/traces/"""

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def get(self, request, cluster_id: str):
        query = TracesTabQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return self._gm.bad_request(query.errors)

        params = query.validated_data
        try:
            result = feed_service.get_traces_tab(
                cluster_id,
                limit=params.get("limit", 50),
                offset=params.get("offset", 0),
            )
        except Exception:
            logger.exception("feed_traces_failed", cluster_id=cluster_id)
            return self._gm.bad_request("Failed to fetch traces")

        if result is None:
            return self._gm.not_found(f"Cluster {cluster_id} not found")

        return self._gm.success_response(TracesTabResponseSerializer(result).data)


class FeedTrendsView(APIView):
    """GET /tracer/feed/issues/{cluster_id}/trends/"""

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def get(self, request, cluster_id: str):
        query = TrendsTabQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return self._gm.bad_request(query.errors)

        days = query.validated_data.get("days", 14)
        try:
            result = feed_service.get_trends_tab(cluster_id, days=days)
        except Exception:
            logger.exception("feed_trends_failed", cluster_id=cluster_id)
            return self._gm.bad_request("Failed to fetch trends")

        if result is None:
            return self._gm.not_found(f"Cluster {cluster_id} not found")

        return self._gm.success_response(TrendsTabResponseSerializer(result).data)


class FeedSidebarView(APIView):
    """GET /tracer/feed/issues/{cluster_id}/sidebar/

    Accepts an optional ``?trace_id=`` query param. When present, the
    trace-level sections (AI Metadata + Evaluations) are computed for
    that trace instead of the cluster's latest, keeping the sidebar in
    sync with the Overview tab's trace selection.
    """

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def get(self, request, cluster_id: str):
        query = FeedSidebarQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return self._gm.bad_request(query.errors)
        trace_id = query.validated_data.get("trace_id") or None

        try:
            result = feed_service.get_sidebar(cluster_id, trace_id=trace_id)
        except Exception:
            logger.exception("feed_sidebar_failed", cluster_id=cluster_id)
            return self._gm.bad_request("Failed to fetch sidebar")

        if result is None:
            return self._gm.not_found(f"Cluster {cluster_id} not found")

        return self._gm.success_response(FeedSidebarSerializer(result).data)


class FeedRootCauseView(APIView):
    """GET /tracer/feed/issues/{cluster_id}/root-cause/?trace_id=X

    Read cached deep-analysis results for a single trace within the
    cluster. The frontend hits this on mount (to show existing results)
    and polls it after a POST to /deep-analysis/ until ``status`` flips
    from ``running`` to ``done`` or ``failed``.
    """

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def get(self, request, cluster_id: str):
        query = DeepAnalysisQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return self._gm.bad_request(query.errors)
        trace_id = query.validated_data["trace_id"]

        try:
            result = feed_service.get_deep_analysis(cluster_id, trace_id=trace_id)
        except Exception:
            logger.exception(
                "feed_root_cause_failed",
                cluster_id=cluster_id,
                trace_id=trace_id,
            )
            return self._gm.bad_request("Failed to fetch deep analysis")

        if result is None:
            return self._gm.not_found(
                f"Trace {trace_id} is not part of cluster {cluster_id}"
            )

        return self._gm.success_response(DeepAnalysisResponseSerializer(result).data)


class FeedDeepAnalysisView(APIView):
    """POST /tracer/feed/issues/{cluster_id}/deep-analysis/

    Body: ``{trace_id, force?}``. On first click (``force=False``),
    returns the cached result if one exists without re-running; on an
    explicit Re-run click (``force=True``), deletes the cached
    analysis and dispatches a fresh Temporal run. Always returns 202
    with a status the frontend can switch on.
    """

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def post(self, request, cluster_id: str):
        body = DeepAnalysisBodySerializer(data=request.data)
        if not body.is_valid():
            return self._gm.bad_request(body.errors)
        trace_id = body.validated_data["trace_id"]
        force = body.validated_data.get("force", False)

        try:
            result = feed_service.dispatch_deep_analysis(
                cluster_id, trace_id=trace_id, force=force
            )
        except Exception:
            logger.exception(
                "feed_deep_analysis_dispatch_failed",
                cluster_id=cluster_id,
                trace_id=trace_id,
            )
            return self._gm.bad_request("Failed to dispatch deep analysis")

        if result is None:
            return self._gm.not_found(
                f"Trace {trace_id} is not part of cluster {cluster_id}"
            )

        return self._gm.success_response(
            DeepAnalysisDispatchResponseSerializer(result).data
        )
