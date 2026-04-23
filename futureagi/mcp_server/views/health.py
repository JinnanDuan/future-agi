from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_tools.registry import registry


class MCPHealthView(APIView):
    """Unauthenticated health check for MCP server."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "status": True,
                "result": {
                    "healthy": True,
                    "tool_count": registry.count(),
                    "version": "1.0.0",
                },
            }
        )
