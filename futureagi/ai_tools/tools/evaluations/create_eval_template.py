from typing import Optional

from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field, field_validator, model_validator

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.formatting import format_datetime, key_value_block, section
from ai_tools.registry import register_tool


class CreateEvalTemplateInput(PydanticBaseModel):
    name: str = Field(
        description=(
            "Name for the evaluation template. Must be lowercase alphanumeric "
            "with hyphens or underscores only (e.g. 'is_indian_name')."
        ),
        min_length=1,
        max_length=255,
    )

    @field_validator("name")
    @classmethod
    def validate_name_format(cls, v: str) -> str:
        from model_hub.utils.eval_validators import validate_eval_name

        return validate_eval_name(v)

    description: Optional[str] = Field(
        default=None, description="Description of what this evaluation measures"
    )
    template_type: Optional[str] = Field(
        default="Futureagi",
        description=(
            "Type of evaluation: 'Futureagi' (deterministic, uses Future AGI's "
            "own models — recommended), 'Llm' (uses external LLM like gpt-4o), "
            "or 'Function' (custom function eval)."
        ),
    )
    config: Optional[dict] = Field(
        default=None,
        description=(
            "Additional configuration dict. Can include 'model' for LLM evals, "
            "'proxy_agi', 'visible_ui', etc."
        ),
    )
    model: Optional[str] = Field(
        default=None,
        description=(
            "Model to use for evaluation. For 'Futureagi' type: 'turing_small' "
            "(recommended, fast), 'turing_large' (more capable). For 'Llm' type: "
            "'gpt-4o', 'claude-3-5-sonnet', etc."
        ),
    )
    criteria: Optional[str] = Field(
        default=None,
        description=(
            "Evaluation criteria / rule prompt. MUST include template variables "
            "using double curly braces matching the required_keys. For example: "
            "'Check if {{name}} from {{origin}} is Indian.' The variables will "
            "be replaced with actual values from the dataset columns at runtime."
        ),
    )
    eval_tags: Optional[list[str]] = Field(
        default=None,
        description="Tags to categorize this evaluation template",
    )
    output_type: Optional[str] = Field(
        default="Pass/Fail",
        description="Output type: 'Pass/Fail' (binary), 'score' (numeric), 'choices' (custom choices)",
    )
    choices: Optional[dict] = Field(
        default=None,
        description=(
            "Choices map for 'choices' output_type. Keys are choice labels, "
            "values are descriptions (e.g. {'Indian': 'Name is of Indian origin', "
            "'Not Indian': 'Name is not of Indian origin'})"
        ),
    )
    multi_choice: Optional[bool] = Field(
        default=False,
        description="Whether multiple choices can be selected (only for 'choices' output_type)",
    )
    required_keys: Optional[list[str]] = Field(
        default=None,
        description=(
            "Required input keys for the evaluation. These must match the "
            "template variables used in the criteria (e.g. ['name', 'origin']). "
            "When mapping to dataset columns, these keys map to column names."
        ),
    )

    @model_validator(mode="after")
    def validate_template_type_constraints(self):
        from model_hub.utils.eval_validators import (
            validate_choices_for_output_type,
            validate_criteria_has_variables,
            validate_length_between_config,
        )

        template_type = self.template_type or "Futureagi"

        # Criteria must have variables for non-Function types
        validate_criteria_has_variables(self.criteria or "", template_type)

        # Choices required when output_type is 'choices'
        validate_choices_for_output_type(self.output_type or "Pass/Fail", self.choices)

        # LengthBetween config validation
        validate_length_between_config(self.config)

        return self


@register_tool
class CreateEvalTemplateTool(BaseTool):
    name = "create_eval_template"
    description = (
        "Creates a new custom (user-owned) evaluation template. "
        "The template can be used to run evaluations on datasets, prompts, or traces. "
        "Use list_eval_templates to see existing templates first. "
        "Recommended: use template_type='Futureagi' with model='turing_small' "
        "Criteria is necessary and make sure a variable like {{variable_name}} is present in the criteria."
        "(Future AGI's own fast, accurate models) for best results."
    )
    category = "evaluations"
    input_model = CreateEvalTemplateInput

    def execute(
        self, params: CreateEvalTemplateInput, context: ToolContext
    ) -> ToolResult:

        from model_hub.models.choices import OwnerChoices
        from model_hub.models.evals_metric import EvalTemplate
        from model_hub.serializers.eval_runner import CustomEvalTemplateCreateSerializer

        # Check name uniqueness within organization for user-owned templates
        if EvalTemplate.objects.filter(
            name=params.name,
            organization=context.organization,
            owner=OwnerChoices.USER.value,
            deleted=False,
        ).exists():
            return ToolResult.error(
                f"An eval template named '{params.name}' already exists in this organization.",
                error_code="VALIDATION_ERROR",
            )

        # Also check against system templates
        if EvalTemplate.no_workspace_objects.filter(
            name=params.name,
            owner=OwnerChoices.SYSTEM.value,
            deleted=False,
        ).exists():
            return ToolResult.error(
                f"A system eval template named '{params.name}' already exists. "
                "Choose a different name.",
                error_code="VALIDATION_ERROR",
            )

        # Build data dict matching what the serializer expects
        serializer_data = {
            "name": params.name,
            "description": params.description or "",
            "criteria": params.criteria or "",
            "tags": params.eval_tags or [],
            "config": params.config or {},
            "template_type": params.template_type or "Futureagi",
            "output_type": params.output_type or "Pass/Fail",
            "multi_choice": params.multi_choice or False,
            "required_keys": params.required_keys or [],
            "choices": params.choices or {},
        }
        if params.model:
            serializer_data.setdefault("config", {})["model"] = params.model

        # Validate through the same serializer the view uses
        serializer = CustomEvalTemplateCreateSerializer(data=serializer_data)
        if not serializer.is_valid():
            from tfc.utils.parse_errors import parse_serialized_errors

            error_msg = parse_serialized_errors(serializer)
            return ToolResult.error(
                f"Validation failed: {error_msg}",
                error_code="VALIDATION_ERROR",
            )

        validated_data = serializer.validated_data

        # Process config through the same pipeline as the view
        try:
            from model_hub.utils.evals import prepare_user_eval_config

            validated_data = prepare_user_eval_config(validated_data, bypass=False)
        except Exception as e:
            return ToolResult.error(
                f"Failed to prepare eval config: {str(e)}",
                error_code="VALIDATION_ERROR",
            )

        # Create the template using the same pattern as CustomEvalTemplateCreateView
        try:
            template = EvalTemplate.objects.create(
                name=validated_data.get("name", params.name),
                description=validated_data.get("description", ""),
                organization=context.organization,
                workspace=context.workspace,
                owner=OwnerChoices.USER.value,
                config=(
                    validated_data.get("configuration")
                    if validated_data.get("configuration")
                    else validated_data.get("config", {})
                ),
                criteria=validated_data.get("criteria", ""),
                choices=validated_data.get("choices"),
                multi_choice=validated_data.get("multi_choice") or False,
                model=validated_data.get("config", {}).get(
                    "model", params.model or "turing_small"
                ),
                eval_tags=validated_data.get("eval_tags", params.eval_tags or []),
                proxy_agi=validated_data.get("config", {}).get("proxy_agi", True),
                visible_ui=validated_data.get("config", {}).get("visible_ui", True),
            )
        except Exception as e:
            from ai_tools.error_codes import code_from_exception

            return ToolResult.error(
                f"Failed to create eval template: {str(e)}",
                error_code=code_from_exception(e),
            )

        info = key_value_block(
            [
                ("ID", f"`{template.id}`"),
                ("Name", template.name),
                ("Owner", template.owner),
                ("Model", template.model or "—"),
                ("Output Type", params.output_type or "Pass/Fail"),
                ("Tags", ", ".join(template.eval_tags) if template.eval_tags else "—"),
                ("Created", format_datetime(template.created_at)),
            ]
        )

        content = section("Eval Template Created", info)

        if template.criteria:
            content += f"\n\n### Criteria\n\n{template.criteria[:500]}"

        content += "\n\n_Use `test_eval_template` to validate the template before running evaluations._"

        return ToolResult(
            content=content,
            data={
                "id": str(template.id),
                "name": template.name,
                "owner": template.owner,
                "config": template.config,
                "model": template.model,
                "criteria": template.criteria,
                "eval_tags": template.eval_tags,
            },
        )
