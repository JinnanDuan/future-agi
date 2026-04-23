"""
Tests for Phase 11: Trace/Session-Level Evals.
"""

import pytest

from model_hub.models.choices import OwnerChoices
from model_hub.models.evals_metric import EvalTemplate


@pytest.fixture
def eval_template(organization, workspace):
    return EvalTemplate.no_workspace_objects.create(
        name="trace-eval",
        organization=organization,
        workspace=workspace,
        owner=OwnerChoices.USER.value,
        config={"output": "Pass/Fail", "required_keys": ["input", "output"]},
        criteria="Check if {{input}} matches {{output}}",
        visible_ui=True,
        output_type_normalized="pass_fail",
        pass_threshold=0.5,
    )


@pytest.mark.e2e
@pytest.mark.django_db
class TestTraceEvalAPI:
    def _url(self, template_id):
        return f"/model-hub/eval-templates/{template_id}/run-on-trace/"

    def test_nonexistent_template(self, auth_client):
        response = auth_client.post(
            "/model-hub/eval-templates/00000000-0000-0000-0000-000000000000/run-on-trace/",
            {"trace_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code == 404

    def test_nonexistent_trace(self, auth_client, eval_template):
        response = auth_client.post(
            self._url(eval_template.id),
            {"trace_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code == 404

    def test_invalid_request(self, auth_client, eval_template):
        response = auth_client.post(
            self._url(eval_template.id),
            {},
            format="json",
        )
        assert response.status_code == 400
