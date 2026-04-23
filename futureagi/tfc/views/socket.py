import json
import traceback

import structlog
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

logger = structlog.get_logger(__name__)
from model_hub.utils.utils import send_message_to_channel, send_message_to_uuid
from tfc.utils.general_methods import GeneralMethods


class CallWebsocketView(APIView):
    _gm = GeneralMethods()
    permission_classes = [IsAuthenticated]

    # Sending message to websocket
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            # logger.error("Invalid JSON in request body")
            logger.error("websocket: Invalid JSON in request body")

            return self._gm.bad_request("Invalid JSON format")

        try:
            message = data.get("message")
            if not message:
                logger.error("websocket: Missing required field: message")
                return self._gm.bad_request(
                    "Missing required field: message is required"
                )
            org_id = (
                getattr(request, "organization", None) or request.user.organization
            ).id
            if data.get("send_to_uuid", False):
                send_message_to_uuid(data.get("uuid"), message)
            else:
                send_message_to_channel(org_id, message)

            return self._gm.success_response("Message sent to websocket")
        except Exception:
            logger.exception("Unable to send message to Websocket")
            traceback.print_exc()
            return self._gm.bad_request("Unable to send message to Websocket")
