from pydantic import BaseModel as PydanticBaseModel
from pydantic import Field

from ai_tools.base import BaseTool, ToolContext, ToolResult
from ai_tools.formatting import (
    format_datetime,
    key_value_block,
    section,
    truncate,
)
from ai_tools.registry import register_tool


class GetEvalTemplateInput(PydanticBaseModel):
    eval_template_id: str = Field(
        description="Name or UUID of the eval template to retrieve"
    )


@register_tool
class GetEvalTemplateTool(BaseTool):
    name = "get_eval_template"
    description = (
        "Returns detailed information about an evaluation template including "
        "its criteria, choices, configuration schema, required/optional keys, "
        "and output type. Use this to understand how to configure an evaluation."
    )
    category = "evaluations"
    input_model = GetEvalTemplateInput

    def execute(self, params: GetEvalTemplateInput, context: ToolContext) -> ToolResult:

        from ai_tools.resolvers import resolve_eval_template
        from model_hub.models.evals_metric import EvalTemplate
        from model_hub.utils.eval_validators import validate_eval_template_org_access

        template_obj, err = resolve_eval_template(
            params.eval_template_id, context.organization
        )
        if err:
            return ToolResult.error(err, error_code="NOT_FOUND")

        try:
            template = EvalTemplate.objects.get(id=template_obj.id)
        except EvalTemplate.DoesNotExist:
            return ToolResult.not_found("Eval Template", str(template_obj.id))

        config = template.config or {}
        output_type = config.get("output", "—") if isinstance(config, dict) else "—"
        required_keys = (
            config.get("required_keys", []) if isinstance(config, dict) else []
        )
        optional_keys = (
            config.get("optional_keys", []) if isinstance(config, dict) else []
        )

        tags = ", ".join(template.eval_tags) if template.eval_tags else "—"

        info = key_value_block(
            [
                ("ID", f"`{template.id}`"),
                ("Name", template.name),
                ("Owner", template.owner or "—"),
                ("Output Type", output_type),
                ("Tags", tags),
                ("Multi-Choice", "Yes" if template.multi_choice else "No"),
                ("Model", template.model or "—"),
                ("Created", format_datetime(template.created_at)),
            ]
        )

        content = section(f"Eval Template: {template.name}", info)

        if template.description:
            content += f"\n\n### Description\n\n{truncate(template.description, 500)}"

        if template.criteria:
            content += f"\n\n### Criteria\n\n{truncate(template.criteria, 1000)}"

        if template.choices:
            content += "\n\n### Choices\n\n"
            if isinstance(template.choices, list):
                for choice in template.choices:
                    content += f"- {choice}\n"
            else:
                content += f"```json\n{truncate(str(template.choices), 500)}\n```"

        if required_keys:
            content += f"\n\n### Required Parameters\n\n{', '.join(f'`{k}`' for k in required_keys)}"

        if optional_keys:
            content += f"\n\n### Optional Parameters\n\n{', '.join(f'`{k}`' for k in optional_keys)}"

        # Config params descriptions
        config_params = config.get("config", {}) if isinstance(config, dict) else {}
        if config_params and isinstance(config_params, dict):
            content += "\n\n### Parameter Details\n\n"
            for param_name, param_info in list(config_params.items())[:10]:
                desc = param_info if isinstance(param_info, str) else str(param_info)
                content += f"- **{param_name}**: {truncate(desc, 200)}\n"

        data = {
            "id": str(template.id),
            "name": template.name,
            "owner": template.owner,
            "description": template.description,
            "output_type": output_type,
            "required_keys": required_keys,
            "optional_keys": optional_keys,
            "tags": template.eval_tags,
            "criteria": template.criteria,
            "choices": template.choices,
            "multi_choice": template.multi_choice,
        }

        return ToolResult(content=content, data=data)
