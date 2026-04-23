from typing import Optional
from uuid import UUID

from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.formatting import key_value_block, section
from ai_tools.registry import register_tool


class UpdateEvalTemplateInput(PydanticBaseModel):
    eval_template_id: UUID = Field(
        description="The UUID of the eval template to update"
    )
    name: Optional[str] = Field(default=None, description="New name for the template")
    description: Optional[str] = Field(default=None, description="New description")
    criteria: Optional[str] = Field(
        default=None, description="New evaluation criteria/prompt"
    )
    model: Optional[str] = Field(
        default=None, description="New model to use for evaluation"
    )
    eval_tags: Optional[list[str]] = Field(
        default=None, description="New tags for the template"
    )
    choices_map: Optional[dict] = Field(
        default=None,
        description="New choices map (key=choice label, value=description)",
    )
    function_eval: Optional[bool] = Field(
        default=None, description="New function eval flag"
    )


@register_tool
class UpdateEvalTemplateTool(BaseTool):
    name = "update_eval_template"
    description = (
        "Updates a user-owned evaluation template's fields. "
        "Only USER-owned templates can be updated (not SYSTEM templates). "
        "Provide only the fields you want to change."
    )
    category = "evaluations"
    input_model = UpdateEvalTemplateInput

    def execute(
        self, params: UpdateEvalTemplateInput, context: ToolContext
    ) -> ToolResult:
        from django.utils import timezone

        from model_hub.models.choices import OwnerChoices
        from model_hub.models.evals_metric import EvalTemplate

        try:
            template = EvalTemplate.objects.get(
                id=params.eval_template_id,
                organization=context.organization,
                owner=OwnerChoices.USER.value,
                deleted=False,
            )
        except EvalTemplate.DoesNotExist:
            return ToolResult.not_found(
                "User-owned Eval Template", str(params.eval_template_id)
            )

        update_fields = ["updated_at"]

        # Validate name pattern and uniqueness
        if params.name is not None:
            import re

            clean_name = params.name.strip()
            if not re.match(r"^[0-9a-z_-]+$", clean_name):
                return ToolResult.error(
                    "Name can only contain lowercase alphabets, numbers, hyphens (-), or underscores (_).",
                    error_code="VALIDATION_ERROR",
                )
            if clean_name[0] in "-_" or clean_name[-1] in "-_":
                return ToolResult.error(
                    "Name cannot start or end with hyphens (-) or underscores (_).",
                    error_code="VALIDATION_ERROR",
                )
            if "_-" in clean_name or "-_" in clean_name:
                return ToolResult.error(
                    "Name cannot contain consecutive mixed separators (_- or -_).",
                    error_code="VALIDATION_ERROR",
                )

        if params.name is not None:
            if (
                EvalTemplate.objects.filter(
                    name=params.name,
                    organization=context.organization,
                    owner=OwnerChoices.USER.value,
                    deleted=False,
                )
                .exclude(id=params.eval_template_id)
                .exists()
            ):
                return ToolResult.error(
                    f"An eval template named '{params.name}' already exists.",
                    error_code="VALIDATION_ERROR",
                )
            template.name = params.name
            update_fields.append("name")

        if params.description is not None:
            template.description = params.description
            update_fields.append("description")

        if params.criteria is not None:
            # Validate that criteria contains at least one template variable
            # (skip if data injection is enabled — eval runs on injected data)
            import re

            variable_pattern = r"\{\{[a-zA-Z0-9_]+\}\}"
            data_injection = (template.config or {}).get("data_injection", {})
            has_data_injection = bool(
                data_injection
                and (
                    data_injection.get("full_row")
                    or data_injection.get("fullRow")
                    or not data_injection.get("variables_only", True)
                    or not data_injection.get("variablesOnly", True)
                )
            )
            if (
                not re.search(variable_pattern, params.criteria)
                and not has_data_injection
            ):
                return ToolResult.error(
                    "Criteria must contain at least one template variable "
                    "using double curly braces (e.g. {{variable_name}}), or "
                    "enable data injection to evaluate without mapping.",
                    error_code="VALIDATION_ERROR",
                )
            template.criteria = params.criteria
            update_fields.append("criteria")

        if params.eval_tags is not None:
            template.eval_tags = params.eval_tags
            update_fields.append("eval_tags")

        config = template.config

        if params.model is not None:
            config["model"] = params.model
            template.model = params.model
            update_fields.append("model")

        if params.choices_map is not None and len(params.choices_map) > 0:
            config["choices_map"] = params.choices_map
            template.choices = list(params.choices_map.keys())
            update_fields.append("choices")

        if params.function_eval is not None:
            config["function_eval"] = params.function_eval
            update_fields.append("function_eval")

        template.config = config
        if "config" not in update_fields:
            update_fields.append("config")

        template.updated_at = timezone.now()
        template.save(update_fields=update_fields)

        info = key_value_block(
            [
                ("ID", f"`{template.id}`"),
                ("Name", template.name),
                (
                    "Updated Fields",
                    ", ".join(f for f in update_fields if f != "updated_at"),
                ),
            ]
        )

        return ToolResult(
            content=section("Eval Template Updated", info),
            data={"id": str(template.id), "name": template.name},
        )
