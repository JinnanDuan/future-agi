"""
Management command to seed realistic Agentcc gateway test data.

Usage:
    python manage.py seed_agentcc_data
"""

import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Organization
from accounts.models.workspace import Workspace
from agentcc.models import AgentccAPIKey, AgentccRequestLog

MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
]

PROVIDERS = [
    "openai",
    "anthropic",
    "google",
]

MODEL_PROVIDER_MAP = {
    "gpt-4o": "openai",
    "gpt-4o-mini": "openai",
    "gpt-3.5-turbo": "openai",
    "claude-3-opus": "anthropic",
    "claude-3-sonnet": "anthropic",
    "claude-3-haiku": "anthropic",
    "gemini-1.5-pro": "google",
    "gemini-1.5-flash": "google",
}

COST_PER_1K_TOKENS = {
    "gpt-4o": Decimal("0.005"),
    "gpt-4o-mini": Decimal("0.00015"),
    "gpt-3.5-turbo": Decimal("0.0005"),
    "claude-3-opus": Decimal("0.015"),
    "claude-3-sonnet": Decimal("0.003"),
    "claude-3-haiku": Decimal("0.00025"),
    "gemini-1.5-pro": Decimal("0.00125"),
    "gemini-1.5-flash": Decimal("0.000075"),
}

ROUTING_STRATEGIES = [
    "round-robin",
    "least-latency",
    "cost-optimized",
    "weighted",
]

SESSION_IDS = [f"session-{uuid.uuid4().hex[:8]}" for _ in range(15)]

USER_IDS = [
    "user-alice",
    "user-bob",
    "user-carol",
    "user-dave",
    "user-eve",
]

ERROR_MESSAGES = [
    "Rate limit exceeded",
    "Context length exceeded",
    "Model not available",
    "Internal server error",
    "Authentication failed",
    "Request timeout",
]

SAMPLE_MESSAGES = [
    {"role": "user", "content": "Explain quantum computing in simple terms"},
    {"role": "user", "content": "Write a Python function to sort a list"},
    {"role": "user", "content": "What is the capital of France?"},
    {"role": "user", "content": "Summarize the latest AI research trends"},
    {"role": "user", "content": "Help me debug this JavaScript code"},
]

SAMPLE_RESPONSES = [
    {
        "role": "assistant",
        "content": "Quantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously...",
    },
    {
        "role": "assistant",
        "content": "Here's a Python function that sorts a list using the built-in sorted() function:\n\ndef sort_list(items):\n    return sorted(items)",
    },
    {"role": "assistant", "content": "The capital of France is Paris."},
    {
        "role": "assistant",
        "content": "Recent AI research trends include: 1) Large Language Models, 2) Multimodal AI, 3) AI Safety...",
    },
    {
        "role": "assistant",
        "content": "I'd be happy to help debug your JavaScript code. Please share the code and error message.",
    },
]

GUARDRAIL_RESULTS = [
    {
        "guardrails": [
            {
                "name": "pii_detection",
                "action": "warn",
                "triggered": True,
                "details": "Email address detected",
            },
        ]
    },
    {
        "guardrails": [
            {
                "name": "toxicity_filter",
                "action": "block",
                "triggered": True,
                "details": "Toxic content score 0.85",
            },
        ]
    },
    {
        "guardrails": [
            {
                "name": "prompt_injection",
                "action": "warn",
                "triggered": True,
                "details": "Potential injection attempt",
            },
        ]
    },
]


class Command(BaseCommand):
    help = "Seed Agentcc gateway with realistic test data"

    def handle(self, *args, **options):
        org = Organization.objects.first()
        if not org:
            self.stderr.write("No organization found. Cannot seed data.")
            return

        workspace = Workspace.objects.filter(organization=org).first()
        if not workspace:
            self.stderr.write("No workspace found. Cannot seed data.")
            return

        self.stdout.write(f"Using org={org.id}, workspace={workspace.id}")

        # 1. Create API keys
        api_keys = []
        key_configs = [
            {"name": "Production Key", "owner": "alice", "status": "active"},
            {"name": "Development Key", "owner": "bob", "status": "active"},
            {"name": "Testing Key", "owner": "carol", "status": "active"},
            {"name": "Old Key (revoked)", "owner": "dave", "status": "revoked"},
        ]
        for kc in key_configs:
            key, created = AgentccAPIKey.objects.get_or_create(
                organization=org,
                workspace=workspace,
                name=kc["name"],
                defaults={
                    "gateway_key_id": f"pk-{uuid.uuid4().hex[:16]}",
                    "key_prefix": f"pk-...{uuid.uuid4().hex[:4]}",
                    "owner": kc["owner"],
                    "status": kc["status"],
                    "allowed_models": MODELS[:4] if kc["owner"] == "alice" else [],
                    "allowed_providers": [],
                    "metadata": {
                        "env": "production" if kc["owner"] == "alice" else "development"
                    },
                    "last_used_at": timezone.now()
                    - timedelta(hours=random.randint(0, 48)),
                },
            )
            api_keys.append(key)
            if created:
                self.stdout.write(f"  Created API key: {key.name}")

        # 2. Create request logs (past 48 hours, ~200 logs)
        now = timezone.now()
        logs_to_create = []
        num_logs = 250

        for i in range(num_logs):
            model = random.choice(MODELS)
            provider = MODEL_PROVIDER_MAP[model]
            is_error = random.random() < 0.08  # 8% error rate
            is_stream = random.random() < 0.4  # 40% streaming
            cache_hit = random.random() < 0.15  # 15% cache hit
            fallback_used = random.random() < 0.05  # 5% fallback
            guardrail_triggered = random.random() < 0.06  # 6% guardrail

            # Realistic timing spread over past 48h
            hours_ago = random.uniform(0, 48)
            started_at = now - timedelta(hours=hours_ago)

            # Realistic token counts
            input_tokens = random.randint(50, 4000)
            output_tokens = random.randint(20, 2000)
            total_tokens = input_tokens + output_tokens

            # Cost based on model
            cost_per_1k = COST_PER_1K_TOKENS[model]
            cost = cost_per_1k * Decimal(str(total_tokens)) / Decimal("1000")

            # Latency (ms) - errors tend to be faster (timeouts) or slower
            if is_error:
                latency = random.choice(
                    [
                        random.randint(50, 200),  # fast error
                        random.randint(5000, 30000),  # timeout
                    ]
                )
            elif cache_hit:
                latency = random.randint(5, 50)
            else:
                base_latency = {
                    "gpt-4o": 800,
                    "gpt-4o-mini": 300,
                    "gpt-3.5-turbo": 200,
                    "claude-3-opus": 1200,
                    "claude-3-sonnet": 600,
                    "claude-3-haiku": 150,
                    "gemini-1.5-pro": 700,
                    "gemini-1.5-flash": 200,
                }
                latency = max(
                    50,
                    int(random.gauss(base_latency[model], base_latency[model] * 0.3)),
                )

            status_code = 200
            error_message = ""
            if is_error:
                status_code = random.choice([400, 401, 429, 429, 500, 502, 503])
                error_message = random.choice(ERROR_MESSAGES)

            api_key = random.choice(api_keys[:3])  # Only active keys
            session = random.choice(SESSION_IDS) if random.random() < 0.7 else ""
            user = random.choice(USER_IDS)
            msg_idx = random.randint(0, len(SAMPLE_MESSAGES) - 1)

            log = AgentccRequestLog(
                organization=org,
                workspace=workspace,
                request_id=f"req-{uuid.uuid4().hex[:12]}",
                model=model,
                provider=provider,
                resolved_model=model,
                latency_ms=latency,
                started_at=started_at,
                input_tokens=input_tokens,
                output_tokens=output_tokens if not is_error else 0,
                total_tokens=total_tokens if not is_error else input_tokens,
                cost=cost if not is_error else Decimal("0"),
                status_code=status_code,
                is_stream=is_stream,
                is_error=is_error,
                error_message=error_message,
                cache_hit=cache_hit,
                fallback_used=fallback_used,
                guardrail_triggered=guardrail_triggered,
                api_key_id=str(api_key.gateway_key_id),
                user_id=user,
                session_id=session,
                routing_strategy=random.choice(ROUTING_STRATEGIES),
                metadata={
                    "environment": random.choice(["production", "staging"]),
                    "version": "1.0.0",
                },
                request_body={
                    "model": model,
                    "messages": [SAMPLE_MESSAGES[msg_idx]],
                    "temperature": round(random.uniform(0, 1), 1),
                    "max_tokens": random.choice([256, 512, 1024, 2048]),
                    "stream": is_stream,
                },
                response_body=(
                    {
                        "id": f"chatcmpl-{uuid.uuid4().hex[:10]}",
                        "model": model,
                        "choices": [
                            {
                                "message": SAMPLE_RESPONSES[msg_idx],
                                "finish_reason": "stop",
                            }
                        ],
                        "usage": {
                            "prompt_tokens": input_tokens,
                            "completion_tokens": output_tokens,
                            "total_tokens": total_tokens,
                        },
                    }
                    if not is_error
                    else {"error": {"message": error_message, "type": "api_error"}}
                ),
                request_headers={
                    "Content-Type": "application/json",
                    "Authorization": "Bearer pk-***",
                    "X-Request-ID": f"req-{uuid.uuid4().hex[:12]}",
                    "User-Agent": "AgentccSDK/1.0",
                },
                response_headers={
                    "Content-Type": "application/json",
                    "X-Request-ID": f"req-{uuid.uuid4().hex[:12]}",
                    "X-Latency-Ms": str(latency),
                    "X-Cache": "HIT" if cache_hit else "MISS",
                },
                guardrail_results=(
                    random.choice(GUARDRAIL_RESULTS) if guardrail_triggered else None
                ),
            )
            logs_to_create.append(log)

        AgentccRequestLog.objects.bulk_create(logs_to_create)
        self.stdout.write(
            self.style.SUCCESS(f"Created {len(logs_to_create)} request logs")
        )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\n=== Seed complete ===\n"
                f"  Organization: {org.id}\n"
                f"  API Keys: {len(api_keys)}\n"
                f"  Request Logs: {len(logs_to_create)}\n"
                f"  Sessions: {len(set(l.session_id for l in logs_to_create if l.session_id))}\n"
                f"  Models used: {len(set(l.model for l in logs_to_create))}\n"
                f"  Providers used: {len(set(l.provider for l in logs_to_create))}\n"
                f"  Error logs: {sum(1 for l in logs_to_create if l.is_error)}\n"
                f"  Cache hits: {sum(1 for l in logs_to_create if l.cache_hit)}\n"
                f"  Guardrail triggered: {sum(1 for l in logs_to_create if l.guardrail_triggered)}\n"
            )
        )
