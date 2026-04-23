from typing import Optional
from uuid import UUID

from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.formatting import key_value_block, section, truncate
from ai_tools.registry import register_tool


class TestEvalTemplateInput(PydanticBaseModel):
    eval_template_id: UUID = Field(description="The UUID of the eval template to test")
    mapping: dict = Field(
        description=(
            "Mapping of template keys to test values. "
            'Example: {"response": "The capital of France is Paris.", "query": "What is the capital of France?"}'
        )
    )
    model: Optional[str] = Field(
        default=None,
        description="Override model for the test run",
    )


@register_tool
class TestEvalTemplateTool(BaseTool):
    name = "test_eval_template"
    description = (
        "Runs a dry-run test of an evaluation template with provided input data. "
        "Returns the evaluation result without persisting anything. "
        "Use this to validate template configuration before applying to datasets."
    )
    category = "evaluations"
    input_model = TestEvalTemplateInput

    def execute(
        self, params: TestEvalTemplateInput, context: ToolContext
    ) -> ToolResult:
        from django.db.models import Q

        from model_hub.models.evals_metric import EvalTemplate

        # Look up the user template
        try:
            user_template = EvalTemplate.no_workspace_objects.get(
                Q(organization=context.organization) | Q(organization__isnull=True),
                id=params.eval_template_id,
            )
        except EvalTemplate.DoesNotExist:
            return ToolResult.not_found("Eval Template", str(params.eval_template_id))

        config = user_template.config or {}
        template_type = config.get("template_type", "")
        required_keys = config.get("required_keys", [])

        # Validate required keys are present in mapping
        missing_keys = [k for k in required_keys if k not in params.mapping]
        if missing_keys:
            return ToolResult.error(
                f"Missing required keys in mapping: {', '.join(f'`{k}`' for k in missing_keys)}. "
                f"Required: {', '.join(f'`{k}`' for k in required_keys)}",
                error_code="VALIDATION_ERROR",
            )

        # Build eval config
        eval_config = {
            "mapping": params.mapping,
            "config": config.get("config", {}),
            "output": config.get("output", "Pass/Fail"),
        }

        if user_template.criteria:
            eval_config["criteria"] = user_template.criteria
        if user_template.choices:
            eval_config["choices"] = user_template.choices

        model = params.model or user_template.model

        # Try to run the evaluation
        try:
            from model_hub.models.evals_metric import EvalTemplate as ET
            from model_hub.views.separate_evals import (
                prepare_user_eval_config,
                run_eval_func,
            )

            # Get the deterministic_evals base template
            try:
                base_template = ET.no_workspace_objects.get(name="deterministic_evals")
            except ET.DoesNotExist:
                return ToolResult.error(
                    "System eval template 'deterministic_evals' not found.",
                    error_code="CONFIGURATION_ERROR",
                )

            # Build the validated_data structure that prepare_user_eval_config expects
            validated_data = {
                "template_type": template_type or "futureagi",
                "config": eval_config,
                "model": model,
                "input_data_types": {},
            }

            prepared_config = prepare_user_eval_config(validated_data, True)
            prepared_config["output"] = config.get("output", "Pass/Fail")

            if template_type == "llm":
                data_config = prepared_config.get("config", {})
                data_config["organization_id"] = str(context.organization.id)
                prepared_config["config"] = data_config
                eval_id = "CustomPromptEvaluator"
            else:
                eval_id = "DeterministicEvaluator"

            response = run_eval_func(
                prepared_config,
                params.mapping,
                base_template,
                context.organization,
                input_data_types={},
                type="user_built",
                model=model,
                eval_id=eval_id,
                test=True,
                source="mcp_tool_test",
                workspace=context.workspace,
            )

            # Format the response
            result_info = []
            if isinstance(response, dict):
                for key, value in response.items():
                    result_info.append((key, truncate(str(value), 200)))
            else:
                result_info.append(("Result", truncate(str(response), 500)))

            info = key_value_block(
                [
                    (
                        "Template",
                        f"{user_template.name} (`{str(user_template.id)}`)",
                    ),
                    ("Model", model or "default"),
                ]
                + result_info
            )

            return ToolResult(
                content=section("Eval Template Test Result", info),
                data={"template_id": str(user_template.id), "result": response},
            )

        except Exception as e:
            from ai_tools.error_codes import code_from_exception

            return ToolResult.error(
                f"Test execution failed: {str(e)}",
                error_code=code_from_exception(e),
            )
