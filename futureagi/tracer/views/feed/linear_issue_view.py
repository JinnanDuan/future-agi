"""
Linear integration endpoints for Error Feed.

POST /tracer/feed/issues/{cluster_id}/create-linear-issue/
GET  /tracer/feed/integrations/linear/teams/
"""

import structlog
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from integrations.models.integration_connection import IntegrationPlatform
from integrations.services.credentials import CredentialManager
from tfc.utils.general_methods import GeneralMethods
from tracer.models.trace_error_analysis import TraceErrorGroup
from tracer.views.feed._permissions import resolve_requested_project_ids

logger = structlog.get_logger(__name__)


class CreateLinearIssueSerializer(serializers.Serializer):
    team_id = serializers.CharField()
    title = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.IntegerField(required=False, default=0)


class CreateLinearIssueView(APIView):
    """POST /tracer/feed/issues/{cluster_id}/create-linear-issue/"""

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def post(self, request, cluster_id: str):
        body = CreateLinearIssueSerializer(data=request.data)
        if not body.is_valid():
            return self._gm.bad_request(body.errors)

        project_ids = resolve_requested_project_ids(request, None)
        if project_ids is None:
            return self._gm.forbidden_response("Access denied")

        # Find the cluster
        cluster = TraceErrorGroup.objects.filter(
            cluster_id=cluster_id,
            project_id__in=project_ids,
        ).first()
        if cluster is None:
            return self._gm.not_found(f"Cluster {cluster_id} not found")

        # Already linked?
        if cluster.external_issue_url:
            return self._gm.success_response(
                {
                    "already_linked": True,
                    "issue_url": cluster.external_issue_url,
                    "issue_id": cluster.external_issue_id,
                }
            )

        # Find active Linear connection for this org
        from integrations.models.integration_connection import (
            ConnectionStatus,
            IntegrationConnection,
        )

        connection = (
            IntegrationConnection.objects.filter(
                organization=request.user.organization,
                platform=IntegrationPlatform.LINEAR,
                deleted=False,
            )
            .exclude(status=ConnectionStatus.ERROR)
            .first()
        )
        if connection is None:
            return self._gm.bad_request(
                "No active Linear integration found. "
                "Connect Linear in Settings > Integrations first."
            )

        credentials = CredentialManager.decrypt(connection.encrypted_credentials)

        # Build default title/description from cluster if not provided
        title = body.validated_data.get("title") or ""
        if not title:
            title = f"[{cluster.cluster_id}] {cluster.title or cluster.error_type}"

        description = body.validated_data.get("description") or ""
        if not description:
            parts = [
                f"**Error Feed Issue**: {cluster.cluster_id}",
                f"**Status**: {cluster.status}",
                f"**Impact**: {cluster.combined_impact}",
                f"**Events**: {cluster.total_events}",
                f"**Unique Traces**: {cluster.unique_traces}",
                "",
            ]
            if cluster.combined_description:
                parts.append("## Description")
                parts.append(cluster.combined_description[:2000])
            description = "\n".join(parts)

        try:
            from integrations.services.linear_service import LinearService

            service = LinearService()
            issue = service.create_issue(
                credentials=credentials,
                team_id=body.validated_data["team_id"],
                title=title[:200],
                description=description,
                priority=body.validated_data.get("priority", 0),
            )
        except Exception:
            logger.exception("linear_create_issue_failed", cluster_id=cluster_id)
            return self._gm.bad_request("Failed to create Linear issue")

        # Store the link on the cluster
        cluster.external_issue_url = issue["url"]
        cluster.external_issue_id = issue["identifier"]
        cluster.save(
            update_fields=["external_issue_url", "external_issue_id", "updated_at"]
        )

        logger.info(
            "linear_issue_created",
            cluster_id=cluster_id,
            issue_id=issue["identifier"],
            issue_url=issue["url"],
        )

        return self._gm.success_response(
            {
                "issue_id": issue["identifier"],
                "issue_url": issue["url"],
                "issue_title": issue["title"],
            }
        )


class LinearTeamsView(APIView):
    """GET /tracer/feed/integrations/linear/teams/

    Returns the list of Linear teams for the team picker dropdown.
    Requires an active Linear integration for the user's org.
    """

    permission_classes = [IsAuthenticated]
    _gm = GeneralMethods()

    def get(self, request):
        from integrations.models.integration_connection import (
            ConnectionStatus,
            IntegrationConnection,
        )

        connection = (
            IntegrationConnection.objects.filter(
                organization=request.user.organization,
                platform=IntegrationPlatform.LINEAR,
                deleted=False,
            )
            .exclude(status=ConnectionStatus.ERROR)
            .first()
        )
        if connection is None:
            return self._gm.success_response(
                {
                    "connected": False,
                    "teams": [],
                }
            )

        credentials = CredentialManager.decrypt(connection.encrypted_credentials)

        try:
            from integrations.services.linear_service import LinearService

            service = LinearService()
            teams = service.get_teams(credentials)
        except Exception:
            logger.exception("linear_get_teams_failed")
            return self._gm.bad_request("Failed to fetch Linear teams")

        return self._gm.success_response(
            {
                "connected": True,
                "teams": teams,
            }
        )
