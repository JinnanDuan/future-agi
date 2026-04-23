import structlog

from agentic_eval.core_evals.run_prompt.litellm_models import LiteLLMModelManager
from model_hub.models.choices import ProviderLogoUrls

logger = structlog.get_logger(__name__)


def get_provider_for_model(
    model_name: str, organization_id: str = None, workspace_id: str = None
) -> str:
    """Get the provider name for a given model."""
    model_manager = LiteLLMModelManager(
        model_name=model_name, organization_id=organization_id
    )
    return model_manager.get_provider(
        model_name=model_name,
        organization_id=organization_id,
        workspace_id=workspace_id,
    )


def get_provider_logo_url(
    model_name: str, organization_id: str = None, workspace_id: str = None
) -> str | None:
    """Get the provider logo URL for a given model."""
    provider = get_provider_for_model(model_name, organization_id, workspace_id)
    return ProviderLogoUrls.get_url_by_provider(provider)
