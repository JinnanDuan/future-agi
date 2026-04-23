import structlog
from django.core.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from agent_playground.services.trace_to_graph import convert_trace_to_graph
from tfc.utils.general_methods import GeneralMethods
from tracer.models.trace import Trace

logger = structlog.get_logger(__name__)


class TraceToGraphView(APIView):
    """
    POST /agent-playground/graphs/from-trace/

    Create a new agent playground graph from a trace's LLM spans.
    """

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def post(self, request):
        trace_id = request.data.get("trace_id")
        if not trace_id:
            return self._gm.bad_request("trace_id is required")

        # Validate trace exists and belongs to user's organization
        try:
            trace = Trace.no_workspace_objects.get(id=trace_id)
        except Trace.DoesNotExist:
            return self._gm.not_found("Trace not found")

        if trace.project.organization_id != request.organization.id:
            return self._gm.not_found("Trace not found")

        try:
            graph, version = convert_trace_to_graph(
                trace=trace,
                user=request.user,
                organization=request.organization,
                workspace=request.workspace,
            )
            return self._gm.create_response(
                {
                    "graph_id": str(graph.id),
                    "version_id": str(version.id),
                }
            )
        except ValidationError as e:
            return self._gm.bad_request(str(e))
        except Exception:
            logger.exception("Error creating graph from trace", trace_id=trace_id)
            return self._gm.internal_server_error_response(
                "Failed to create graph from trace"
            )
