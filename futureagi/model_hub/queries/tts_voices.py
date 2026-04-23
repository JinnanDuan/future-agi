import uuid
from typing import List, Optional

from django.core.exceptions import ValidationError

from agentic_eval.core_evals.run_prompt.litellm_models import LiteLLMModelManager
from agentic_eval.core_evals.run_prompt.other_services.manager import (
    OtherServicesManager,
)
from model_hub.models.tts_voices import TTSVoice
from tfc.utils.error_codes import get_error_message


def check_voice_name_exists(organization, name: str) -> bool:
    """
    Checks if a voice with the given name already exists for the organization.
    """
    return TTSVoice.objects.filter(
        organization=organization, name=name, deleted=False
    ).exists()


def check_voice_id_exists(organization, voice_id: str, provider: str) -> bool:
    """
    Checks if a voice with the given voice_id and provider already exists for the organization.
    """
    return TTSVoice.objects.filter(
        organization=organization, voice_id=voice_id, provider=provider, deleted=False
    ).exists()


def create_custom_voice(
    organization,
    name: str,
    voice_id: str,
    provider: str,
    model: str = "",
    description: str = "",
    workspace=None,
) -> TTSVoice:
    """
    Creates a new custom TTS voice.
    """
    # Check for duplicate name
    if check_voice_name_exists(organization, name):
        raise ValidationError(f"A voice with the name '{name}' already exists.")

    # Check for duplicate voice ID
    if check_voice_id_exists(organization, voice_id, provider):
        raise ValidationError(
            f"A voice with ID '{voice_id}' already exists for this provider."
        )

    # Validate voice ID if validator exists
    other_services_manager = OtherServicesManager()
    validator = other_services_manager.get_voice_validator(provider)

    if validator:
        # Fetch API key
        model_manager = LiteLLMModelManager(
            model_name="", organization_id=organization.id
        )
        api_key = model_manager.get_api_key(
            organization_id=organization.id,
            workspace_id=workspace.id if workspace else None,
            provider=provider,
        )

        # Extract key if it's a dict
        if isinstance(api_key, dict):
            if "key" in api_key:
                api_key = api_key["key"]
            elif "api_key" in api_key:
                api_key = api_key["api_key"]

        if not api_key:
            raise ValidationError(
                f"No API key found for provider '{provider}'. Please add one in Settings."
            )

        try:
            validator(voice_id, api_key)
        except ValueError as e:
            raise ValidationError(f"{get_error_message('FAILED_TO_CREATE_TTS_VOICE')}")
        except Exception as e:
            raise ValidationError(f"{get_error_message('FAILED_TO_CREATE_TTS_VOICE')}")

    return TTSVoice.objects.create(
        organization=organization,
        name=name,
        voice_id=voice_id,
        provider=provider,
        model=model,
        description=description,
        workspace=workspace,
        voice_type="custom",
    )


def get_custom_voices(organization, provider: Optional[str] = None) -> List[TTSVoice]:
    """
    Fetches custom voices for an organization, optionally filtered by provider.
    """
    qs = TTSVoice.objects.filter(organization=organization, deleted=False)
    if provider:
        qs = qs.filter(provider=provider)

    return list(qs.order_by("-created_at"))


def resolve_voice_id(voice_val: str) -> str:
    """
    Resolves a voice ID (which might be a UUID of a TTSVoice record) to its provider ID.
    If voice_val is not a valid UUID or not found, returns voice_val as is.
    """
    if not voice_val or not isinstance(voice_val, str):
        return voice_val

    try:
        uuid_obj = uuid.UUID(voice_val)
        voice = TTSVoice.objects.filter(id=uuid_obj).first()
        if voice:
            return voice.voice_id
    except (ValueError, ImportError, Exception):
        pass

    return voice_val
