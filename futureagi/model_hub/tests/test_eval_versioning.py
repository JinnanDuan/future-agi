"""
Tests for Phase 5: Eval Template Versioning.
"""

import pytest

from model_hub.models.choices import OwnerChoices
from model_hub.models.evals_metric import EvalTemplate, EvalTemplateVersion


@pytest.fixture
def user_template(organization, workspace, user):
    return EvalTemplate.no_workspace_objects.create(
        name="versioned-eval",
        organization=organization,
        workspace=workspace,
        owner=OwnerChoices.USER.value,
        config={"output": "Pass/Fail"},
        eval_tags=["llm"],
        criteria="Check {{response}}",
        model="turing_large",
        visible_ui=True,
    )


# =============================================================================
# Unit: EvalTemplateVersionManager
# =============================================================================


@pytest.mark.unit
@pytest.mark.django_db
class TestVersionManager:
    def test_create_first_version(self, user_template, user, organization, workspace):
        v = EvalTemplateVersion.objects.create_version(
            eval_template=user_template,
            criteria="Check {{response}}",
            model="turing_large",
            user=user,
            organization=organization,
            workspace=workspace,
        )
        assert v.version_number == 1
        assert v.is_default is True
        assert v.criteria == "Check {{response}}"

    def test_create_second_version_increments(
        self, user_template, user, organization, workspace
    ):
        EvalTemplateVersion.objects.create_version(
            eval_template=user_template,
            criteria="V1",
            user=user,
            organization=organization,
        )
        v2 = EvalTemplateVersion.objects.create_version(
            eval_template=user_template,
            criteria="V2",
            user=user,
            organization=organization,
        )
        assert v2.version_number == 2

    def test_get_default(self, user_template, user, organization):
        v1 = EvalTemplateVersion.objects.create_version(
            eval_template=user_template,
            criteria="V1",
            user=user,
            organization=organization,
        )
        default = EvalTemplateVersion.objects.get_default(user_template)
        assert default.id == v1.id


# =============================================================================
# E2E: Version List API
# =============================================================================


@pytest.mark.e2e
@pytest.mark.django_db
class TestVersionListAPI:
    def _url(self, template_id):
        return f"/model-hub/eval-templates/{template_id}/versions/"

    def test_list_empty(self, auth_client, user_template):
        response = auth_client.get(self._url(user_template.id))
        assert response.status_code == 200
        result = response.data["result"]
        assert result["total"] == 0
        assert result["versions"] == []

    def test_list_with_versions(self, auth_client, user_template, user, organization):
        EvalTemplateVersion.objects.create_version(
            eval_template=user_template,
            criteria="V1",
            user=user,
            organization=organization,
        )
        EvalTemplateVersion.objects.create_version(
            eval_template=user_template,
            criteria="V2",
            user=user,
            organization=organization,
        )
        response = auth_client.get(self._url(user_template.id))
        assert response.status_code == 200
        result = response.data["result"]
        assert result["total"] == 2
        # Ordered by version_number desc
        assert result["versions"][0]["version_number"] == 2
        assert result["versions"][1]["version_number"] == 1

    def test_list_nonexistent_template(self, auth_client):
        response = auth_client.get(
            "/model-hub/eval-templates/00000000-0000-0000-0000-000000000000/versions/"
        )
        assert response.status_code == 404


# =============================================================================
# E2E: Version Create API
# =============================================================================


@pytest.mark.e2e
@pytest.mark.django_db
class TestVersionCreateAPI:
    def _url(self, template_id):
        return f"/model-hub/eval-templates/{template_id}/versions/create/"

    def test_create_version(self, auth_client, user_template):
        response = auth_client.post(self._url(user_template.id), {}, format="json")
        assert response.status_code == 200
        result = response.data["result"]
        assert result["version_number"] == 1
        assert result["is_default"] is True

    def test_create_multiple_versions(self, auth_client, user_template):
        r1 = auth_client.post(self._url(user_template.id), {}, format="json")
        r2 = auth_client.post(self._url(user_template.id), {}, format="json")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.data["result"]["version_number"] == 1
        assert r2.data["result"]["version_number"] == 2
        # Latest should be default
        assert r2.data["result"]["is_default"] is True

    def test_create_version_with_overrides(self, auth_client, user_template):
        response = auth_client.post(
            self._url(user_template.id),
            {"criteria": "New instructions {{var}}", "model": "turing_flash"},
            format="json",
        )
        assert response.status_code == 200
        v = EvalTemplateVersion.objects.get(id=response.data["result"]["id"])
        assert v.criteria == "New instructions {{var}}"
        assert v.model == "turing_flash"

    def test_create_version_sets_new_default(self, auth_client, user_template):
        r1 = auth_client.post(self._url(user_template.id), {}, format="json")
        r2 = auth_client.post(self._url(user_template.id), {}, format="json")

        v1 = EvalTemplateVersion.objects.get(id=r1.data["result"]["id"])
        v2 = EvalTemplateVersion.objects.get(id=r2.data["result"]["id"])

        v1.refresh_from_db()
        assert v1.is_default is False
        assert v2.is_default is True

    def test_create_version_nonexistent_template(self, auth_client):
        response = auth_client.post(
            "/model-hub/eval-templates/00000000-0000-0000-0000-000000000000/versions/create/",
            {},
            format="json",
        )
        assert response.status_code == 404
