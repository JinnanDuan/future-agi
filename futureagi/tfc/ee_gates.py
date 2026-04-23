"""Runtime EE feature gates for non-URL-bound entry points.

Use these where URL-level gating can't distinguish free vs paid traffic
(e.g. an endpoint that works for any model, but only paid models route
through EE code paths)."""

from __future__ import annotations

from rest_framework.response import Response

_TURING_MODELS = frozenset(
    {
        "turing_large",
        "turing_large_xl",
        "turing_small",
        "turing_flash",
        "protect",
        "protect_flash",
    }
)


def is_turing_model(model_name: object) -> bool:
    if not model_name:
        return False
    return str(model_name).lower() in _TURING_MODELS


def voice_sim_oss_gate_response() -> Response | None:
    """Return a 402 response if the deployment is OSS (ee/ stripped or
    `CLOUD_DEPLOYMENT`/`EE_LICENSE_KEY` unset), else None.

    Voice simulation requires livekit/vapi integration and the `ee.voice`
    module. Use at the top of any view that starts or re-runs a voice
    call."""
    try:
        from ee.usage.deployment import DeploymentMode

        if not DeploymentMode.is_oss():
            return None
    except ImportError:
        pass  # ee.usage absent → treat as OSS

    return Response(
        {
            "error": (
                "Voice simulation is not available on OSS. "
                "Upgrade to cloud or enterprise to run voice calls."
            ),
            "upgrade_required": True,
            "feature": "voice_sim",
        },
        status=402,
    )


def turing_oss_gate_response(model_name: object) -> Response | None:
    """Return a 402 response if the model is a Turing/Protect model AND
    the deployment is OSS. Return None otherwise so the caller proceeds.

    Use at the top of any view that accepts a model selection and would
    otherwise route into ee/turing code."""
    if not is_turing_model(model_name):
        return None

    try:
        from ee.usage.deployment import DeploymentMode

        if not DeploymentMode.is_oss():
            return None
    except ImportError:
        pass  # ee.usage absent → treat as OSS

    return Response(
        {
            "error": (
                "Turing and Protect models are not available on OSS. "
                "Select a different model (OpenAI, Anthropic, etc.) "
                "or upgrade your plan."
            ),
            "upgrade_required": True,
            "feature": "turing",
        },
        status=402,
    )
