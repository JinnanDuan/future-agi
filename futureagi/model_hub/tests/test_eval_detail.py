"""
Tests for Phase 4: Eval Detail & Update API.
"""

import pytest

from model_hub.models.choices import OwnerChoices
from model_hub.models.evals_metric import EvalTemplate


@pytest.fixture
def user_template(organization, workspace, user):
    return EvalTemplate.no_workspace_objects.create(
        name="detail-test-eval",
        organization=organization,
        workspace=workspace,
        owner=OwnerChoices.USER.value,
        config={
            "output": "Pass/Fail",
            "eval_type_id": "CustomPromptEvaluator",
            "required_keys": ["response"],
        },
        eval_tags=["llm"],
        criteria="Check if {{response}} is correct.",
        model="turing_large",
        description="Test eval for detail",
        visible_ui=True,
        output_type_normalized="pass_fail",
        pass_threshold=0.5,
    )


@pytest.fixture
def system_template(organization):
    return EvalTemplate.no_workspace_objects.create(
        name="system-detail-eval",
        organization=None,
        workspace=None,
        owner=OwnerChoices.SYSTEM.value,
        config={"output": "score"},
        eval_tags=["llm"],
        visible_ui=True,
    )


# =============================================================================
# Detail API
# =============================================================================


@pytest.mark.e2e
@pytest.mark.django_db
class TestEvalTemplateDetailAPI:
    def _url(self, template_id):
        return f"/model-hub/eval-templates/{template_id}/detail/"

    def test_get_user_template(self, auth_client, user_template):
        response = auth_client.get(self._url(user_template.id))
        assert response.status_code == 200
        result = response.data["result"]
        assert result["id"] == str(user_template.id)
        assert result["name"] == "detail-test-eval"
        assert result["eval_type"] == "llm"
        assert result["output_type"] == "pass_fail"
        assert result["instructions"] == "Check if {{response}} is correct."
        assert result["owner"] == "user"
        assert result["pass_threshold"] == 0.5

    def test_get_system_template(self, auth_client, system_template):
        response = auth_client.get(self._url(system_template.id))
        assert response.status_code == 200
        assert response.data["result"]["owner"] == "system"

    def test_get_nonexistent(self, auth_client):
        response = auth_client.get(self._url("00000000-0000-0000-0000-000000000000"))
        assert response.status_code == 404

    def test_version_count_reflects_actual(
        self, auth_client, user_template, user, organization
    ):
        """version_count should reflect actual versions, not hardcoded 1."""
        from model_hub.models.evals_metric import EvalTemplateVersion

        # No versions yet
        response = auth_client.get(self._url(user_template.id))
        assert response.status_code == 200
        # Should still show at least 1 (default)
        assert response.data["result"]["version_count"] >= 1

        # Create a version
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
        # Set V2 as default (as the version create API would)
        v2 = EvalTemplateVersion.objects.filter(
            eval_template=user_template, version_number=2
        ).first()
        EvalTemplateVersion.objects.filter(
            eval_template=user_template, is_default=True
        ).exclude(id=v2.id).update(is_default=False)
        v2.is_default = True
        v2.save(update_fields=["is_default"])

        response = auth_client.get(self._url(user_template.id))
        assert response.data["result"]["version_count"] == 2
        assert response.data["result"]["current_version"] == "V2"

    def test_check_internet_from_config(self, auth_client, organization, workspace):
        """check_internet should be read from config, not hardcoded."""
        t = EvalTemplate.no_workspace_objects.create(
            name="internet-eval",
            organization=organization,
            workspace=workspace,
            owner=OwnerChoices.USER.value,
            config={"output": "Pass/Fail", "check_internet": True},
            visible_ui=True,
        )
        response = auth_client.get(self._url(t.id))
        assert response.status_code == 200
        assert response.data["result"]["check_internet"] is True

    def test_response_has_all_fields(self, auth_client, user_template):
        response = auth_client.get(self._url(user_template.id))
        assert response.status_code == 200
        result = response.data["result"]
        required = [
            "id",
            "name",
            "description",
            "template_type",
            "eval_type",
            "instructions",
            "model",
            "output_type",
            "pass_threshold",
            "owner",
            "created_by_name",
            "version_count",
            "current_version",
            "tags",
            "created_at",
            "updated_at",
        ]
        for field in required:
            assert field in result, f"Missing field: {field}"


# =============================================================================
# Update API
# =============================================================================


@pytest.mark.e2e
@pytest.mark.django_db
class TestEvalTemplateUpdateAPI:
    def _url(self, template_id):
        return f"/model-hub/eval-templates/{template_id}/update/"

    def test_update_name(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {"name": "updated-eval-name"},
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.name == "updated-eval-name"

    def test_update_instructions(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {"instructions": "New instructions with {{variable}}."},
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.criteria == "New instructions with {{variable}}."
        assert "variable" in user_template.config["required_keys"]

    def test_update_output_type(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {"output_type": "percentage", "pass_threshold": 0.7},
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.output_type_normalized == "percentage"
        assert user_template.pass_threshold == 0.7
        assert user_template.config["output"] == "score"

    def test_update_choice_scores(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {
                "output_type": "deterministic",
                "choice_scores": {"yes": 1.0, "no": 0.0},
            },
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.choice_scores == {"yes": 1.0, "no": 0.0}

    def test_update_description(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {"description": "Updated description"},
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.description == "Updated description"

    def test_update_tags(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {"tags": ["safety", "llm", "new-tag"]},
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert "new-tag" in user_template.eval_tags

    def test_cannot_update_system_template(self, auth_client, system_template):
        response = auth_client.put(
            self._url(system_template.id),
            {"name": "hacked"},
            format="json",
        )
        assert response.status_code == 404

    def test_update_invalid_name(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {"name": "Invalid Name"},
            format="json",
        )
        assert response.status_code == 400

    def test_update_duplicate_name(
        self, auth_client, user_template, organization, workspace
    ):
        EvalTemplate.no_workspace_objects.create(
            name="existing-name",
            organization=organization,
            workspace=workspace,
            owner=OwnerChoices.USER.value,
            config={},
            visible_ui=True,
        )
        response = auth_client.put(
            self._url(user_template.id),
            {"name": "existing-name"},
            format="json",
        )
        assert response.status_code == 400

    def test_update_instructions_updates_rule_prompt(self, auth_client, user_template):
        """Updating instructions should also update config.rule_prompt for backward compat."""
        response = auth_client.put(
            self._url(user_template.id),
            {"instructions": "New check with {{var1}} and {{var2}}."},
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert (
            user_template.config.get("rule_prompt")
            == "New check with {{var1}} and {{var2}}."
        )
        assert "var1" in user_template.config["required_keys"]
        assert "var2" in user_template.config["required_keys"]

    def test_update_choice_scores_updates_choices_map(self, auth_client, user_template):
        """Updating choice_scores should update backward-compat choices_map."""
        response = auth_client.put(
            self._url(user_template.id),
            {
                "output_type": "deterministic",
                "choice_scores": {"good": 0.9, "bad": 0.1, "ok": 0.5},
            },
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.config["choices_map"]["good"] == "pass"
        assert user_template.config["choices_map"]["bad"] == "fail"
        assert user_template.config["choices_map"]["ok"] == "neutral"
        assert isinstance(user_template.choices, list)
        assert "good" in user_template.choices

    def test_update_invalid_threshold(self, auth_client, user_template):
        response = auth_client.put(
            self._url(user_template.id),
            {"pass_threshold": 1.5},
            format="json",
        )
        assert response.status_code == 400

    def test_update_nonexistent(self, auth_client):
        response = auth_client.put(
            f"/model-hub/eval-templates/00000000-0000-0000-0000-000000000000/update/",
            {"name": "test"},
            format="json",
        )
        assert response.status_code == 404

    # --- Agent eval field updates ---

    def test_update_agent_fields(self, auth_client, user_template):
        """Update agent-specific fields through the update endpoint."""
        response = auth_client.put(
            self._url(user_template.id),
            {
                "mode": "quick",
                "tools": {"internet": True, "connectors": ["conn-1"]},
                "knowledge_bases": ["kb-uuid-1"],
                "data_injection": {"variables_only": False, "trace_context": True},
                "summary": {"type": "long"},
            },
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.config["agent_mode"] == "quick"
        assert user_template.config["tools"] == {
            "internet": True,
            "connectors": ["conn-1"],
        }
        assert user_template.config["knowledge_bases"] == ["kb-uuid-1"]
        assert user_template.config["data_injection"] == {
            "variables_only": False,
            "trace_context": True,
        }
        assert user_template.config["summary"] == {"type": "long"}

    def test_update_eval_type_switch_to_agent(self, auth_client, user_template):
        """Switching eval_type rewrites config.eval_type_id."""
        response = auth_client.put(
            self._url(user_template.id),
            {"eval_type": "agent"},
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.eval_type == "agent"
        assert user_template.config["eval_type_id"] == "AgentEvaluator"

    def test_update_eval_type_switch_to_code(self, auth_client, user_template):
        """Switching eval_type to code routes to CustomCodeEval."""
        response = auth_client.put(
            self._url(user_template.id),
            {
                "eval_type": "code",
                "code": "def evaluate(a, b):\n    return a == b\n",
                "code_language": "python",
            },
            format="json",
        )
        assert response.status_code == 200
        user_template.refresh_from_db()
        assert user_template.eval_type == "code"
        assert user_template.config["eval_type_id"] == "CustomCodeEval"
        assert (
            user_template.config["code"] == "def evaluate(a, b):\n    return a == b\n"
        )
        assert user_template.config["language"] == "python"
