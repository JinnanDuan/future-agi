"""Phase 1 — Backend filter resolver (source_type=trace) tests.

Covers:
  - No-filter baseline
  - exclude_ids
  - Cap enforcement
  - Org isolation
  - Workspace isolation
  - Project scoping
  - User-scoped filter validation (my_annotations, annotator)
  - Filter parity with list_traces_of_session for each FilterEngine branch
"""

from __future__ import annotations

import pytest

from accounts.models.organization import Organization
from accounts.models.workspace import Workspace
from model_hub.models.ai_model import AIModel
from model_hub.services.bulk_selection import (
    ResolveResult,
    resolve_filtered_trace_ids,
)
from tracer.models.project import Project
from tracer.models.trace import Trace


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------


@pytest.fixture
def observe_project(db, organization, workspace):
    """Observe-type project in the default org/workspace."""
    return Project.objects.create(
        name="BulkSel Observe Project",
        organization=organization,
        workspace=workspace,
        model_type=AIModel.ModelTypes.GENERATIVE_LLM,
        trace_type="observe",
    )


@pytest.fixture
def seeded_traces(db, observe_project):
    """25 traces on the observe_project.

    Start time annotation falls back to ``created_at`` when there's no root
    span; traces are created in order so index 0 is the oldest and index 24
    is the newest (latest-first ordering reverses the list).
    """
    traces = []
    for i in range(25):
        t = Trace.objects.create(project=observe_project, name=f"t-{i}")
        traces.append(t)
    return traces


# --------------------------------------------------------------------------
# Baseline
# --------------------------------------------------------------------------


@pytest.mark.django_db
class TestBaseline:
    def test_no_filter_returns_all_project_traces(
        self, observe_project, seeded_traces, organization
    ):
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
        )
        assert isinstance(result, ResolveResult)
        assert result.total_matching == 25
        assert len(result.ids) == 25
        assert result.truncated is False

    def test_no_filter_ordered_by_start_time_desc(
        self, observe_project, seeded_traces, organization
    ):
        """Newest-first ordering: last-created trace is first in the result."""
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
        )
        # seeded_traces index 24 is the most-recently created
        assert result.ids[0] == seeded_traces[-1].id
        assert result.ids[-1] == seeded_traces[0].id

    def test_none_filters_equivalent_to_empty(
        self, observe_project, seeded_traces, organization
    ):
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=None,  # type: ignore[arg-type]
            organization=organization,
        )
        assert result.total_matching == 25


# --------------------------------------------------------------------------
# exclude_ids
# --------------------------------------------------------------------------


@pytest.mark.django_db
class TestExcludeIds:
    def test_excludes_given_ids_from_result(
        self, observe_project, seeded_traces, organization
    ):
        exclude = {seeded_traces[0].id, seeded_traces[1].id}
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            exclude_ids=exclude,
            organization=organization,
        )
        assert result.total_matching == 23
        assert len(result.ids) == 23
        for excluded_id in exclude:
            assert excluded_id not in result.ids

    def test_exclude_accepts_list_and_tuple(
        self, observe_project, seeded_traces, organization
    ):
        # list
        list_result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            exclude_ids=[seeded_traces[0].id],
            organization=organization,
        )
        assert list_result.total_matching == 24

        # tuple
        tuple_result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            exclude_ids=(seeded_traces[1].id,),
            organization=organization,
        )
        assert tuple_result.total_matching == 24

    def test_exclude_none_is_noop(
        self, observe_project, seeded_traces, organization
    ):
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            exclude_ids=None,
            organization=organization,
        )
        assert result.total_matching == 25


# --------------------------------------------------------------------------
# Cap enforcement
# --------------------------------------------------------------------------


@pytest.mark.django_db
class TestCap:
    def test_cap_truncates_ids(
        self, observe_project, seeded_traces, organization
    ):
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
            cap=10,
        )
        assert len(result.ids) == 10
        assert result.total_matching == 25
        assert result.truncated is True

    def test_cap_above_total_is_not_truncated(
        self, observe_project, seeded_traces, organization
    ):
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
            cap=100,
        )
        assert result.truncated is False
        assert len(result.ids) == 25

    def test_cap_returns_most_recent_first(
        self, observe_project, seeded_traces, organization
    ):
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
            cap=3,
        )
        # Last-created trace is newest → first in latest-first ordering.
        assert result.ids == [t.id for t in seeded_traces[-1:-4:-1]]


# --------------------------------------------------------------------------
# Isolation
# --------------------------------------------------------------------------


@pytest.mark.django_db
class TestIsolation:
    def test_org_isolation(
        self, observe_project, seeded_traces, organization, db
    ):
        """Traces from another org are never returned."""
        other_org = Organization.objects.create(name="Other Org")
        other_project = Project.objects.create(
            name="Other Project",
            organization=other_org,
            workspace=None,
            model_type=AIModel.ModelTypes.GENERATIVE_LLM,
            trace_type="observe",
        )
        other_trace = Trace.objects.create(
            project=other_project, name="other-trace"
        )

        # Caller from the default org, trying to "reach" into other_project
        # by passing other_project.id should fail with Project.DoesNotExist
        # (org scoping in _build_trace_base_queryset).
        with pytest.raises(Project.DoesNotExist):
            resolve_filtered_trace_ids(
                project_id=other_project.id,
                filters=[],
                organization=organization,
            )

        # Sanity: our org's call returns only our traces.
        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
        )
        assert other_trace.id not in result.ids

    def test_workspace_isolation(
        self, observe_project, seeded_traces, organization, workspace, user, db
    ):
        """Passing a different workspace excludes the project's traces."""
        other_ws = Workspace.objects.create(
            name="Other WS",
            organization=organization,
            is_default=False,
            is_active=True,
            created_by=user,
        )

        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
            workspace=other_ws,
        )
        assert result.total_matching == 0
        assert result.ids == []

    def test_project_scoping(
        self, observe_project, seeded_traces, organization, workspace
    ):
        """Only traces from the target project are returned."""
        other_project = Project.objects.create(
            name="Sibling Project",
            organization=organization,
            workspace=workspace,
            model_type=AIModel.ModelTypes.GENERATIVE_LLM,
            trace_type="observe",
        )
        sibling_trace = Trace.objects.create(
            project=other_project, name="sibling"
        )

        result = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
        )
        assert sibling_trace.id not in result.ids
        assert result.total_matching == 25


# --------------------------------------------------------------------------
# User-scoped filter validation
# --------------------------------------------------------------------------


@pytest.mark.django_db
class TestUserScopedFilters:
    def test_raises_when_my_annotations_without_user(
        self, observe_project, organization
    ):
        with pytest.raises(ValueError, match="user-scoped"):
            resolve_filtered_trace_ids(
                project_id=observe_project.id,
                filters=[
                    {
                        "column_id": "my_annotations",
                        "filter_config": {
                            "filter_type": "boolean",
                            "filter_op": "equals",
                            "filter_value": True,
                        },
                    }
                ],
                organization=organization,
                user=None,
            )

    def test_raises_when_annotator_without_user(
        self, observe_project, organization
    ):
        with pytest.raises(ValueError, match="user-scoped"):
            resolve_filtered_trace_ids(
                project_id=observe_project.id,
                filters=[
                    {
                        "column_id": "annotator",
                        "filter_config": {
                            "filter_type": "string",
                            "filter_op": "equals",
                            "filter_value": "alice",
                        },
                    }
                ],
                organization=organization,
                user=None,
            )

    def test_user_scoped_accepts_camelcase_column_id(
        self, observe_project, organization
    ):
        """camelCase form of the column_id must also trip the guard."""
        with pytest.raises(ValueError, match="user-scoped"):
            resolve_filtered_trace_ids(
                project_id=observe_project.id,
                filters=[
                    {
                        "columnId": "my_annotations",
                        "filter_config": {
                            "filter_type": "boolean",
                            "filter_op": "equals",
                            "filter_value": True,
                        },
                    }
                ],
                organization=organization,
                user=None,
            )

    def test_validator_silent_when_user_provided(self, user):
        """Validator does not raise when user is provided for user-scoped cols."""
        from model_hub.services.bulk_selection import _validate_user_scoped_filters

        _validate_user_scoped_filters(
            [
                {
                    "column_id": "my_annotations",
                    "filter_config": {
                        "filter_type": "boolean",
                        "filter_op": "equals",
                        "filter_value": True,
                    },
                }
            ],
            user=user,
        )  # must not raise

    def test_validator_silent_when_no_user_scoped_columns(self):
        """No user-scoped columns present → no user required, no error."""
        from model_hub.services.bulk_selection import _validate_user_scoped_filters

        _validate_user_scoped_filters(
            [{"column_id": "latency", "filter_config": {}}], user=None
        )  # must not raise


# --------------------------------------------------------------------------
# Filter parity with list endpoint (one per FilterEngine branch)
# --------------------------------------------------------------------------


def _list_endpoint_ids(auth_client, project_id, filters):
    """Fetch trace IDs from the list endpoint for the given filter payload.

    The list_traces_of_session response shape uses ``trace_id`` (not ``id``)
    as the row identifier — see ``tracer/views/trace.py:3208``.
    """
    import json

    resp = auth_client.get(
        "/tracer/trace/list_traces_of_session/",
        {
            "project_id": str(project_id),
            "filters": json.dumps(filters),
            "page_number": 0,
            "page_size": 200,
        },
    )
    assert resp.status_code == 200, resp.data
    return {r["trace_id"] for r in (resp.data.get("result") or {}).get("table", [])}


@pytest.mark.django_db
class TestParityWithListEndpoint:
    def test_parity_no_filter(
        self, auth_client, observe_project, seeded_traces, organization
    ):
        """Empty filter: resolver set equals list-endpoint set."""
        resolver = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            organization=organization,
        )
        list_ids = _list_endpoint_ids(auth_client, observe_project.id, [])
        assert {str(i) for i in resolver.ids} == list_ids

    def test_parity_empty_filter_after_exclude(
        self, auth_client, observe_project, seeded_traces, organization
    ):
        """exclude_ids parity: resolver's non-excluded set matches list endpoint."""
        excluded = {seeded_traces[0].id, seeded_traces[5].id}
        resolver = resolve_filtered_trace_ids(
            project_id=observe_project.id,
            filters=[],
            exclude_ids=excluded,
            organization=organization,
        )
        list_ids = _list_endpoint_ids(auth_client, observe_project.id, [])
        expected = list_ids - {str(i) for i in excluded}
        assert {str(i) for i in resolver.ids} == expected


# NOTE: FilterEngine-branch parity tests (system metric, non-system metric,
# span attribute, voice-call annotation, has_eval, has_annotation) are
# deferred. Each requires a known-good filter payload captured from the
# frontend — without that, any synthesized payload can drift from the
# frontend's actual shape. Follow-up: capture real payloads from devtools
# for each FilterEngine branch and add one parity test per branch.
