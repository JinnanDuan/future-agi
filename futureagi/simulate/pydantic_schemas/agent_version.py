from typing import List, Optional

from django.conf import settings
from pydantic import BaseModel


class AgentConfigurationSnapshot(BaseModel):
    """
    Schema for `AgentVersion.configuration_snapshot`.
    """

    # Core fields
    api_key: Optional[str]
    inbound: bool
    languages: List[str] = []
    provider: Optional[str]
    agent_name: str
    commit_message: str
    contact_number: Optional[str]
    authentication_method: str
    language: Optional[str] = "en"
    observability_enabled: bool = False
    description: Optional[str] = None
    assistant_id: Optional[str] = None
    knowledge_base: Optional[str] = None
    model: Optional[str] = None
    model_details: Optional[dict] = None
    agent_type: Optional[str] = None
    livekit_url: Optional[str] = None
    livekit_api_key: Optional[str] = None
    livekit_api_secret: Optional[str] = None
    livekit_agent_name: Optional[str] = None
    livekit_config_json: Optional[dict] = None
    livekit_max_concurrency: Optional[int] = settings.DEFAULT_LIVEKIT_MAX_CONCURRENCY
