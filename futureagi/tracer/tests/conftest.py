"""
Conftest for tracer app tests.
Provides fixtures specific to tracer models and test data.
"""

import uuid
from datetime import datetime, timedelta

import pytest
from django.utils import timezone

from model_hub.models.ai_model import AIModel
from model_hub.models.evals_metric import EvalTemplate
from tfc.middleware.workspace_context import (
    clear_workspace_context,
    set_workspace_context,
)
from tracer.models.custom_eval_config import CustomEvalConfig
from tracer.models.eval_task import EvalTask, EvalTaskStatus, RunType
from tracer.models.monitor import UserAlertMonitor, UserAlertMonitorLog
from tracer.models.observation_span import EndUser, ObservationSpan
from tracer.models.project import Project
from tracer.models.project_version import ProjectVersion
from tracer.models.trace import Trace
from tracer.models.trace_session import TraceSession


@pytest.fixture(autouse=True)
def set_workspace_context_fixture(request):
    """Ensure workspace context is set for each test via thread-local storage.

    Only applies to tests that use the workspace and organization fixtures.
    """
    clear_workspace_context()

    if "workspace" in request.fixturenames and "organization" in request.fixturenames:
        workspace = request.getfixturevalue("workspace")
        organization = request.getfixturevalue("organization")
        set_workspace_context(workspace=workspace, organization=organization)
        yield
        clear_workspace_context()
    else:
        yield
        clear_workspace_context()


@pytest.fixture
def project(db, organization, workspace):
    """Create a test project for experiment type."""
    return Project.objects.create(
        name="Test Project",
        organization=organization,
        workspace=workspace,
        model_type=AIModel.ModelTypes.GENERATIVE_LLM,
        trace_type="experiment",
        metadata={"key": "value"},
        config=[
            {"id": "input", "name": "Input", "is_visible": True},
            {"id": "output", "name": "Output", "is_visible": True},
        ],
    )


@pytest.fixture
def observe_project(db, organization, workspace):
    """Create a test project for observe type."""
    return Project.objects.create(
        name="Test Observe Project",
        organization=organization,
        workspace=workspace,
        model_type=AIModel.ModelTypes.GENERATIVE_LLM,
        trace_type="observe",
        metadata={"key": "value"},
        session_config=[
            {"id": "session_input", "name": "Session Input", "is_visible": True},
        ],
    )


@pytest.fixture
def project_version(db, project):
    """Create a test project version."""
    return ProjectVersion.objects.create(
        project=project,
        name="Test Run",
        version="v1",
        metadata={"experiment": "test"},
    )


@pytest.fixture
def trace(db, project, project_version):
    """Create a test trace."""
    return Trace.objects.create(
        project=project,
        project_version=project_version,
        name="Test Trace",
        metadata={"trace_key": "trace_value"},
        input={"prompt": "Hello"},
        output={"response": "World"},
    )


@pytest.fixture
def trace_session(db, observe_project):
    """Create a test trace session."""
    return TraceSession.objects.create(
        project=observe_project,
        name="Test Session",
        bookmarked=False,
    )


@pytest.fixture
def session_trace(db, observe_project, trace_session):
    """Create a trace associated with a session."""
    return Trace.objects.create(
        project=observe_project,
        session=trace_session,
        name="Session Trace",
        metadata={"session_trace": True},
        input={"prompt": "Session input"},
        output={"response": "Session output"},
    )


@pytest.fixture
def observation_span(db, project, trace):
    """Create a test observation span."""
    span_id = f"span_{uuid.uuid4().hex[:16]}"
    return ObservationSpan.objects.create(
        id=span_id,
        project=project,
        trace=trace,
        name="Test Span",
        observation_type="llm",
        start_time=timezone.now() - timedelta(seconds=5),
        end_time=timezone.now(),
        input={"messages": [{"role": "user", "content": "Hello"}]},
        output={"choices": [{"message": {"content": "Hi there"}}]},
        model="gpt-4",
        prompt_tokens=10,
        completion_tokens=5,
        total_tokens=15,
        cost=0.001,
        latency_ms=500,
        status="OK",
        metadata={"key": "value"},
    )


@pytest.fixture
def child_span(db, project, trace, observation_span):
    """Create a child observation span."""
    span_id = f"child_span_{uuid.uuid4().hex[:16]}"
    return ObservationSpan.objects.create(
        id=span_id,
        project=project,
        trace=trace,
        parent_span_id=observation_span.id,
        name="Child Span",
        observation_type="tool",
        start_time=timezone.now() - timedelta(seconds=3),
        end_time=timezone.now() - timedelta(seconds=1),
        input={"tool": "search"},
        output={"result": "found"},
        latency_ms=200,
        status="OK",
    )


@pytest.fixture
def end_user(db, organization, workspace, project):
    """Create a test end user."""
    return EndUser.objects.create(
        organization=organization,
        workspace=workspace,
        project=project,
        user_id="test-user@example.com",
        user_id_type="email",
        metadata={"plan": "premium"},
    )


@pytest.fixture
def eval_template(db, organization, workspace):
    """Create a test eval template."""
    return EvalTemplate.objects.create(
        name="Test Eval Template",
        description="A test evaluation template",
        organization=organization,
        workspace=workspace,
        config={
            "type": "pass_fail",
            "criteria": "Test criteria",
        },
    )


@pytest.fixture
def custom_eval_config(db, project, eval_template):
    """Create a test custom eval config."""
    return CustomEvalConfig.objects.create(
        name="Test Custom Eval",
        project=project,
        eval_template=eval_template,
        config={"threshold": 0.8},
        mapping={"input": "input", "output": "output"},
        filters={},
    )


@pytest.fixture
def eval_task(db, project, custom_eval_config):
    """Create a test eval task."""
    task = EvalTask.objects.create(
        project=project,
        name="Test Eval Task",
        filters={},
        sampling_rate=1.0,
        run_type=RunType.CONTINUOUS,
        status=EvalTaskStatus.PENDING,
        spans_limit=100,
    )
    task.evals.add(custom_eval_config)
    return task


@pytest.fixture
def user_alert_monitor(db, organization, workspace, observe_project):
    """Create a test user alert monitor."""
    return UserAlertMonitor.objects.create(
        organization=organization,
        workspace=workspace,
        project=observe_project,
        name="Test Alert",
        metric_type="count_of_errors",
        threshold_operator="greater_than",
        threshold_type="static",
        critical_threshold_value=0.1,
        alert_frequency=60,
        is_mute=False,
        slack_webhook_url="https://hooks.slack.com/test",
    )


@pytest.fixture
def user_alert_log(db, user_alert_monitor):
    """Create a test alert log."""
    return UserAlertMonitorLog.objects.create(
        alert=user_alert_monitor,
        type="critical",
        message="Error rate exceeded threshold",
        resolved=False,
    )


@pytest.fixture
def multiple_traces(db, project, project_version):
    """Create multiple traces for testing pagination."""
    traces = []
    for i in range(15):
        trace = Trace.objects.create(
            project=project,
            project_version=project_version,
            name=f"Trace {i}",
            metadata={"index": i},
            input={"prompt": f"Input {i}"},
            output={"response": f"Output {i}"},
        )
        traces.append(trace)
    return traces


@pytest.fixture
def multiple_spans(db, project, trace):
    """Create multiple observation spans for testing."""
    spans = []
    for i in range(10):
        span_id = f"span_{i}_{uuid.uuid4().hex[:8]}"
        span = ObservationSpan.objects.create(
            id=span_id,
            project=project,
            trace=trace,
            name=f"Span {i}",
            observation_type="llm" if i % 2 == 0 else "tool",
            start_time=timezone.now() - timedelta(seconds=10 - i),
            end_time=timezone.now() - timedelta(seconds=9 - i),
            input={"index": i},
            output={"result": f"Output {i}"},
            model="gpt-4" if i % 2 == 0 else None,
            prompt_tokens=10 * (i + 1) if i % 2 == 0 else None,
            completion_tokens=5 * (i + 1) if i % 2 == 0 else None,
            total_tokens=15 * (i + 1) if i % 2 == 0 else None,
            cost=0.001 * (i + 1) if i % 2 == 0 else None,
            latency_ms=100 * (i + 1),
            status="OK",
        )
        spans.append(span)
    return spans
