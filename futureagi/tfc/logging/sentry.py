"""
Centralized Sentry configuration for all backend components.

Keep Sentry and structlog separate.
Sentry SDK integrations handle error capture automatically.

Usage:
    from tfc.logging.sentry import init_sentry

    # In Django settings.py
    init_sentry(component="django")

    # In celery.py
    init_sentry(component="celery")

    # In Temporal worker startup
    init_sentry(component="temporal", tags={"queue": "tasks_l"})
"""

import os
from typing import Any, Callable, Optional

# Environment detection
ENV_TYPE = os.getenv("ENV_TYPE", "local")
IS_PRODUCTION = ENV_TYPE in ("prod", "production")
IS_STAGING = ENV_TYPE == "staging"
SENTRY_ENABLED = ENV_TYPE in ("staging", "prod", "production")
SENTRY_DSN = os.getenv("SENTRY_DSN")

# Sample rates - configurable via env, lower in production to reduce costs
# Production: 10% sampling, Staging: 100% sampling
TRACES_SAMPLE_RATE = float(
    os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1" if IS_PRODUCTION else "1.0")
)
PROFILES_SAMPLE_RATE = float(
    os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1" if IS_PRODUCTION else "1.0")
)

_initialized_components: set = set()


def _get_before_send() -> Callable:
    """
    Create before_send hook to filter/modify events before sending to Sentry.

    This can be used to:
    - Filter out noisy/expected errors
    - Scrub sensitive data
    - Add additional context
    """

    def before_send(event: dict, hint: dict) -> Optional[dict]:
        # Filter out expected/noisy exceptions
        if "exc_info" in hint:
            exc_type, exc_value, tb = hint["exc_info"]
            exc_name = exc_type.__name__ if exc_type else ""

            # Skip common expected errors that don't need tracking
            ignored_exceptions = [
                "DisallowedHost",  # Django - invalid host header attacks
                "SuspiciousOperation",  # Django - security-related
                "ConnectionResetError",  # Client disconnected
                "BrokenPipeError",  # Client disconnected
            ]
            if exc_name in ignored_exceptions:
                return None

            # Skip 4xx client errors that are expected behavior
            if hasattr(exc_value, "status_code"):
                status_code = getattr(exc_value, "status_code", 500)
                if 400 <= status_code < 500 and status_code not in (401, 403):
                    # Skip 400, 404, 405, etc. but keep 401/403 for security monitoring
                    return None

        return event

    return before_send


def _get_traces_sampler() -> Callable:
    """
    Create a traces_sampler function for intelligent sampling.

    This allows different sample rates for different transaction types.
    """

    def traces_sampler(sampling_context: dict) -> float:
        # Get the transaction context
        transaction_context = sampling_context.get("transaction_context", {})
        transaction_name = transaction_context.get("name", "")
        op = transaction_context.get("op", "")

        # Always sample error-related transactions
        if "error" in transaction_name.lower():
            return 1.0

        # Lower sample rate for health checks and static files
        if any(
            path in transaction_name
            for path in ["/health", "/ready", "/metrics", "/static", "/favicon"]
        ):
            return 0.0  # Don't trace health checks

        # Temporal workflow and activity transactions - use configured rate
        if op.startswith("temporal."):
            return TRACES_SAMPLE_RATE

        # Higher sample rate for API endpoints
        if "/api/" in transaction_name:
            return TRACES_SAMPLE_RATE

        # Default sample rate
        return TRACES_SAMPLE_RATE

    return traces_sampler


def init_sentry(
    component: str = "django",
    tags: Optional[dict] = None,
) -> bool:
    """
    Initialize Sentry for a specific component.

    Args:
        component: Component name ("django", "celery", "temporal")
        tags: Additional tags to add to all events from this component

    Returns:
        True if Sentry was initialized, False otherwise
    """
    global _initialized_components

    # Prevent double initialization
    if component in _initialized_components:
        return True

    if not SENTRY_ENABLED or not SENTRY_DSN:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.httpx import HttpxIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        # from sentry_sdk.integrations.redis import RedisIntegration
        # Increase max string length for better error context
        try:
            sentry_sdk.utils.MAX_STRING_LENGTH = 10_000_000
        except AttributeError:
            pass  # Newer SDK versions may not have this

        integrations = [
            LoggingIntegration(
                level=20,  # INFO - capture as breadcrumbs
                event_level=40,  # ERROR - send as events
            ),
            # RedisIntegration(),
            HttpxIntegration(),  # Track outgoing HTTP requests via httpx
        ]

        # Add component-specific integrations
        if component == "django":
            import django.db.models.signals
            from sentry_sdk.integrations.django import DjangoIntegration

            integrations.append(
                DjangoIntegration(
                    transaction_style="url",
                    middleware_spans=True,
                    signals_spans=True,
                    signals_denylist=[
                        django.db.models.signals.pre_init,
                        django.db.models.signals.post_init,
                    ],
                    cache_spans=True,
                    http_methods_to_capture=("GET", "POST", "PUT", "DELETE", "PATCH"),
                )
            )

        if component in ("django", "celery"):
            from sentry_sdk.integrations.celery import CeleryIntegration

            integrations.append(
                CeleryIntegration(
                    monitor_beat_tasks=True,
                    propagate_traces=True,
                )
            )

        # Build default tags
        default_tags = {"component": component}
        if tags:
            default_tags.update(tags)

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=integrations,
            # Environment and release
            environment=ENV_TYPE,
            release=os.getenv("APP_VERSION", os.getenv("GIT_SHA", "unknown")),
            # Tracing configuration
            enable_tracing=True,
            traces_sampler=_get_traces_sampler(),
            # Profiling configuration
            profiles_sample_rate=PROFILES_SAMPLE_RATE,
            # Error capture configuration
            send_default_pii=True,
            max_request_body_size="always",  # Capture full request bodies
            max_breadcrumbs=100,
            attach_stacktrace=True,  # Attach stack traces to all messages
            include_source_context=True,  # Include source code context
            include_local_variables=True,  # Capture local variables for debugging
            # In-app marking for better stack traces
            in_app_include=[
                "tfc",
                "accounts",
                "agentic_eval",
                "simulate",
                "tracer",
                "prompts",
            ],
            in_app_exclude=["celery", "kombu", "temporalio", "django"],
            # Hooks
            before_send=_get_before_send(),
            # Debug mode in staging for troubleshooting
            debug=IS_STAGING,
            # Session tracking
            auto_session_tracking=True,
            # DB query source tracking
            enable_db_query_source=True,
            db_query_source_threshold_ms=100,  # Add source for queries > 100ms
        )

        # Set default tags for this component
        sentry_sdk.set_tags(default_tags)
        # Tag events with region for multi-region observability
        sentry_sdk.set_tag("region", os.getenv("REGION", "us"))
        sentry_sdk.set_tag(
            "cloud_deployment", os.getenv("CLOUD_DEPLOYMENT", "") or "self-hosted"
        )

        _initialized_components.add(component)
        return True

    except Exception as e:
        print(f"Failed to initialize Sentry for {component}: {e}")
        return False


def set_user_context(user_id: str, email: str = "", username: str = "") -> None:
    """Set user context for Sentry events."""
    if not SENTRY_ENABLED:
        return

    try:
        import sentry_sdk

        sentry_sdk.set_user(
            {
                "id": str(user_id),
                "email": email,
                "username": username,
            }
        )
    except Exception:
        pass


def capture_exception_with_context(
    exception: Exception,
    context: Optional[dict] = None,
    tags: Optional[dict] = None,
) -> Optional[str]:
    """
    Capture an exception with additional context.

    Args:
        exception: The exception to capture
        context: Additional context data (e.g., {"activity": {...}})
        tags: Additional tags for filtering (e.g., {"workflow": "experiment"})

    Returns:
        The Sentry event ID if captured, None otherwise
    """
    if not SENTRY_ENABLED:
        return None

    try:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_context(key, value)
            if tags:
                for key, value in tags.items():
                    scope.set_tag(key, value)
            return sentry_sdk.capture_exception(exception)
    except Exception:
        return None


def capture_message(
    message: str,
    level: str = "info",
    context: Optional[dict] = None,
    tags: Optional[dict] = None,
) -> Optional[str]:
    """
    Capture a message to Sentry.

    Args:
        message: The message to capture
        level: Log level ("debug", "info", "warning", "error", "fatal")
        context: Additional context data
        tags: Additional tags for filtering

    Returns:
        The Sentry event ID if captured, None otherwise
    """
    if not SENTRY_ENABLED:
        return None

    try:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_context(key, value)
            if tags:
                for key, value in tags.items():
                    scope.set_tag(key, value)
            return sentry_sdk.capture_message(message, level=level)
    except Exception:
        return None


def add_breadcrumb(
    message: str,
    category: str = "custom",
    level: str = "info",
    data: Optional[dict] = None,
) -> None:
    """
    Add a breadcrumb for debugging.

    Breadcrumbs are a trail of events that happened before an error.

    Args:
        message: Description of what happened
        category: Category for grouping (e.g., "http", "query", "user")
        level: Severity ("debug", "info", "warning", "error", "critical")
        data: Additional data to attach
    """
    if not SENTRY_ENABLED:
        return

    try:
        import sentry_sdk

        sentry_sdk.add_breadcrumb(
            message=message,
            category=category,
            level=level,
            data=data or {},
        )
    except Exception:
        pass


def start_transaction(
    name: str,
    op: str = "task",
    description: str = "",
) -> Any:
    """
    Start a new Sentry transaction for performance monitoring.

    Usage:
        with start_transaction(name="process_experiment", op="workflow") as txn:
            # ... do work ...
            txn.set_tag("experiment_id", exp_id)

    Args:
        name: Transaction name (e.g., "process_experiment")
        op: Operation type (e.g., "http.server", "task", "workflow")
        description: Optional description

    Returns:
        Transaction context manager (or no-op if Sentry disabled)
    """
    if not SENTRY_ENABLED:
        from contextlib import nullcontext

        return nullcontext()

    try:
        import sentry_sdk

        return sentry_sdk.start_transaction(
            name=name,
            op=op,
            description=description,
        )
    except Exception:
        from contextlib import nullcontext

        return nullcontext()
