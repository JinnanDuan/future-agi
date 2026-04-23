import json

import structlog
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import APIKeyAuthentication, LangfuseBasicAuthentication
from tfc.utils.error_codes import get_error_message
from tfc.utils.payload_storage import PAYLOAD_DEFAULT_TTL, payload_storage
from tracer.utils.parsers import ProtobufParser
from tracer.utils.trace_ingestion import bulk_create_observation_span_task

logger = structlog.get_logger(__name__)


class OTLPTraceHTTPView(APIView):
    """
    HTTP/JSON endpoint for OTLP traces.

    Supports both FutureAGI native auth (X-Api-Key / X-Secret-Key or JWT)
    and Langfuse SDK Basic auth (Authorization: Basic base64(pk:sk)).
    """

    parser_classes = [ProtobufParser, JSONParser]
    authentication_classes = [LangfuseBasicAuthentication, APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Asynchronously handles the POST request to create ObservationSpans from OTEL data.
        """
        try:
            user = request.user
            if not hasattr(user, "organization") or not user.organization:
                return Response(
                    {"detail": "User has no organization."},
                    status=403,
                )

            organization_id = (
                getattr(request, "organization", None) or user.organization
            ).id
            user_id = user.id
            workspace = getattr(request, "workspace", None)
            workspace_id = str(workspace.id) if workspace else None

            request_json = json.dumps(request.data)
            payload_key = payload_storage.store(request_json, ttl=PAYLOAD_DEFAULT_TTL)

            logger.info(
                "trace_payload_stored_in_redis",
                payload_key=payload_key,
                payload_size=len(request_json),
            )

            bulk_create_observation_span_task.apply_async(
                args=[payload_key, organization_id, user_id, workspace_id, "json"],
                queue="trace_ingestion",
            )

            return Response({}, status=200)

        except Exception as e:
            logger.exception(f"Error in creating observation span (HTTP): {str(e)}")
            return Response(
                {"detail": get_error_message("FAILED_CREATION_OBSERVATION_SPAN")},
                status=500,
            )
