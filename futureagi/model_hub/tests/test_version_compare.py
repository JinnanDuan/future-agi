"""
Tests for Phase 12: Version Comparison.
"""

import pytest

from model_hub.models.choices import OwnerChoices
from model_hub.models.evals_metric import EvalTemplate, EvalTemplateVersion


@pytest.fixture
def eval_template(organization, workspace):
    return EvalTemplate.no_workspace_objects.create(
        name="compare-eval",
        organization=organization,
        workspace=workspace,
        owner=OwnerChoices.USER.value,
        config={"output": "Pass/Fail"},
        visible_ui=True,
    )


@pytest.fixture
def two_versions(eval_template, user, organization):
    v1 = EvalTemplateVersion.objects.create_version(
        eval_template=eval_template,
        criteria="Version 1 instructions",
        model="turing_large",
        config_snapshot={"output": "Pass/Fail"},
        user=user,
        organization=organization,
    )
    v2 = EvalTemplateVersion.objects.create_version(
        eval_template=eval_template,
        criteria="Version 2 with changes",
        model="turing_flash",
        config_snapshot={"output": "score"},
        user=user,
        organization=organization,
    )
    return v1, v2


@pytest.mark.e2e
@pytest.mark.django_db
class TestVersionCompareAPI:
    def _url(self, template_id):
        return f"/model-hub/eval-templates/{template_id}/versions/compare/"

    def test_compare_versions(self, auth_client, eval_template, two_versions):
        response = auth_client.get(self._url(eval_template.id) + "?a=1&b=2")
        assert response.status_code == 200
        result = response.data["result"]
        assert result["version_a"] == 1
        assert result["version_b"] == 2
        assert len(result["diffs"]) == 3  # criteria, model, config_snapshot

        # Criteria should be different
        criteria_diff = next(d for d in result["diffs"] if d["field"] == "criteria")
        assert criteria_diff["changed"] is True
        assert "Version 1" in criteria_diff["version_a_value"]
        assert "Version 2" in criteria_diff["version_b_value"]

        # Model should be different
        model_diff = next(d for d in result["diffs"] if d["field"] == "model")
        assert model_diff["changed"] is True

    def test_compare_missing_params(self, auth_client, eval_template):
        response = auth_client.get(self._url(eval_template.id))
        assert response.status_code == 400

    def test_compare_nonexistent_version(
        self, auth_client, eval_template, two_versions
    ):
        response = auth_client.get(self._url(eval_template.id) + "?a=1&b=99")
        assert response.status_code == 404
