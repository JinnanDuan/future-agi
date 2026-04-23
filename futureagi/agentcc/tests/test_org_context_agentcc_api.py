import pytest

from accounts.models.organization import Organization
from accounts.models.organization_membership import OrganizationMembership
from accounts.models.workspace import Workspace, WorkspaceMembership
from conftest import WorkspaceAwareAPIClient
from agentcc.models.blocklist import AgentccBlocklist
from agentcc.models.custom_property import AgentccCustomPropertySchema
from agentcc.models.email_alert import AgentccEmailAlert
from agentcc.models.org_config import AgentccOrgConfig
from agentcc.models.session import AgentccSession
from agentcc.models.webhook import AgentccWebhook
from tfc.constants.levels import Level
from tfc.constants.roles import OrganizationRoles


@pytest.fixture
def secondary_org_context(user):
    org_b = Organization.objects.create(name="Agentcc Secondary Org")
    membership = OrganizationMembership.no_workspace_objects.create(
        user=user,
        organization=org_b,
        role=OrganizationRoles.OWNER,
        level=Level.OWNER,
        is_active=True,
    )
    workspace_b = Workspace.objects.create(
        name="Agentcc Secondary Workspace",
        organization=org_b,
        is_default=True,
        is_active=True,
        created_by=user,
    )
    WorkspaceMembership.objects.create(
        workspace=workspace_b,
        user=user,
        role=OrganizationRoles.WORKSPACE_ADMIN,
        level=Level.WORKSPACE_ADMIN,
        organization_membership=membership,
        is_active=True,
    )
    return org_b, workspace_b


@pytest.fixture
def secondary_org_client(user, secondary_org_context):
    _, workspace_b = secondary_org_context
    client = WorkspaceAwareAPIClient()
    client.force_authenticate(user=user)
    client.set_workspace(workspace_b)
    yield client
    client.stop_workspace_injection()


@pytest.mark.integration
@pytest.mark.api
class TestAgentccRequestOrganizationContext:
    def test_session_create_uses_active_request_organization(
        self, user, secondary_org_context, secondary_org_client
    ):
        org_b, _ = secondary_org_context

        response = secondary_org_client.post(
            "/agentcc/sessions/",
            {"session_id": "sec-org-session", "name": "secondary"},
            format="json",
        )

        assert response.status_code == 200, response.json()
        session = AgentccSession.no_workspace_objects.get(session_id="sec-org-session")
        assert session.organization_id == org_b.id
        assert session.organization_id != user.organization_id

    def test_webhook_create_uses_active_request_organization(
        self, user, secondary_org_context, secondary_org_client
    ):
        org_b, _ = secondary_org_context

        response = secondary_org_client.post(
            "/agentcc/webhooks/",
            {
                "name": "secondary_webhook",
                "url": "https://example.com/webhook",
                "events": ["request.completed"],
            },
            format="json",
        )

        assert response.status_code == 200, response.json()
        webhook = AgentccWebhook.no_workspace_objects.get(name="secondary_webhook")
        assert webhook.organization_id == org_b.id
        assert webhook.organization_id != user.organization_id

    def test_custom_property_create_uses_active_request_organization(
        self, user, secondary_org_context, secondary_org_client
    ):
        org_b, _ = secondary_org_context

        response = secondary_org_client.post(
            "/agentcc/custom-properties/",
            {"name": "secondary_property", "property_type": "string"},
            format="json",
        )

        assert response.status_code == 200, response.json()
        schema = AgentccCustomPropertySchema.no_workspace_objects.get(
            name="secondary_property"
        )
        assert schema.organization_id == org_b.id
        assert schema.organization_id != user.organization_id

    def test_blocklist_create_uses_active_request_organization(
        self, user, secondary_org_context, secondary_org_client
    ):
        org_b, _ = secondary_org_context

        response = secondary_org_client.post(
            "/agentcc/blocklists/",
            {"name": "secondary_blocklist", "words": ["foo"]},
            format="json",
        )

        assert response.status_code == 200, response.json()
        blocklist = AgentccBlocklist.no_workspace_objects.get(name="secondary_blocklist")
        assert blocklist.organization_id == org_b.id
        assert blocklist.organization_id != user.organization_id

    def test_email_alert_create_uses_active_request_organization(
        self, user, secondary_org_context, secondary_org_client
    ):
        org_b, _ = secondary_org_context

        response = secondary_org_client.post(
            "/agentcc/email-alerts/",
            {
                "name": "secondary_alert",
                "recipients": ["alerts@example.com"],
                "events": ["budget.exceeded"],
                "provider": "sendgrid",
                "provider_config": {"api_key": "sg.test"},
            },
            format="json",
        )

        assert response.status_code == 200, response.json()
        alert = AgentccEmailAlert.no_workspace_objects.get(name="secondary_alert")
        assert alert.organization_id == org_b.id
        assert alert.organization_id != user.organization_id

    def test_org_config_active_uses_active_request_organization(
        self, user, secondary_org_context, secondary_org_client
    ):
        org_b, _ = secondary_org_context
        AgentccOrgConfig.no_workspace_objects.create(
            organization=user.organization,
            version=1,
            is_active=True,
            cache={"enabled": False},
        )
        AgentccOrgConfig.no_workspace_objects.create(
            organization=org_b,
            version=7,
            is_active=True,
            cache={"enabled": True},
        )

        response = secondary_org_client.get("/agentcc/org-configs/active/")

        assert response.status_code == 200, response.json()
        payload = response.json()["result"]
        assert payload["version"] == 7
        assert payload["cache"]["enabled"] is True
