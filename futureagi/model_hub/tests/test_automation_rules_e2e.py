"""
End-to-end tests for automation rules — evaluate_rule scoping, filtering,
soft-delete exclusion, dry-run preview, org isolation, field mapping, and
computed-field annotations across all source types (trace, span, session,
simulation, dataset_row).
"""

import uuid
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from accounts.models import Organization, User
from accounts.models.workspace import Workspace
from model_hub.models.annotation_queues import (
    AnnotationQueue,
    AutomationRule,
    QueueItem,
)
from model_hub.models.choices import DatasetSourceChoices, SourceChoices, StatusType
from model_hub.models.develop_dataset import Cell, Column, Dataset, Row
from tfc.middleware.workspace_context import set_workspace_context

QUEUE_URL = "/model-hub/annotation-queues/"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
# NOTE: organization, user, workspace, auth_client come from the root
# conftest.py. The previous local overrides used a plain APIClient which did
# not inject request.organization, so the evaluate_rule view raised
# AttributeError and the test only "passed" when a previous test leaked the
# WorkspaceAwareAPIClient APIView.initial patch into process state. Using the
# shared fixtures keeps thread-local workspace context and request.organization
# correctly scoped to this test's org, preventing the FK-violation cascade
# that the stale patch produced during teardown.


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_queue(auth_client, name, **extra):
    payload = {"name": name, **extra}
    resp = auth_client.post(QUEUE_URL, payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED, resp.data
    return resp.data["id"]


def _create_label(organization, workspace, name, label_type="categorical"):
    from model_hub.models.develop_annotations import AnnotationsLabels

    label_settings = {}
    if label_type == "categorical":
        label_settings = {
            "options": [{"label": "Positive"}, {"label": "Negative"}],
            "multi_choice": False,
            "rule_prompt": "",
            "auto_annotate": False,
            "strategy": None,
        }
    elif label_type == "star":
        label_settings = {"no_of_stars": 5}
    elif label_type == "numeric":
        label_settings = {
            "min": 0,
            "max": 100,
            "step_size": 1,
            "display_type": "slider",
        }
    elif label_type == "text":
        label_settings = {"placeholder": "", "min_length": 0, "max_length": 1000}
    return AnnotationsLabels.objects.create(
        name=name,
        type=label_type,
        organization=organization,
        workspace=workspace,
        settings=label_settings,
    )


def _create_project(organization, workspace, name="Test Project"):
    from tracer.models.project import Project

    return Project.objects.create(
        name=name,
        organization=organization,
        workspace=workspace,
        model_type="GenerativeLLM",
        trace_type="observe",
    )


def _create_trace(project, name="test trace"):
    from tracer.models.trace import Trace

    return Trace.objects.create(
        name=name,
        project=project,
        input={"message": "hello"},
        output={"response": "world"},
    )


def _rules_url(queue_id):
    return f"{QUEUE_URL}{queue_id}/automation-rules/"


def _rule_detail_url(queue_id, rule_id):
    return f"{QUEUE_URL}{queue_id}/automation-rules/{rule_id}/"


def _items_url(queue_id):
    return f"{QUEUE_URL}{queue_id}/items/"


# ===========================================================================
# Tests
# ===========================================================================


@pytest.mark.django_db
class TestAutomationRulesE2E:
    """End-to-end tests for automation rule evaluation."""

    # -----------------------------------------------------------------------
    # 1. Basic trace source evaluation
    # -----------------------------------------------------------------------
    def test_evaluate_rule_with_trace_source(
        self, auth_client, organization, workspace
    ):
        """Create 3 traces, evaluate a rule with no conditions, assert all 3
        are added as queue items."""
        project = _create_project(organization, workspace)
        t1 = _create_trace(project, name="trace-1")
        t2 = _create_trace(project, name="trace-2")
        t3 = _create_trace(project, name="trace-3")

        queue_id = _create_queue(auth_client, name="Trace Q1")
        # Scope queue to this project so we only pick up our traces
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "All traces",
                "source_type": "trace",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 3
        assert result["added"] == 3
        assert result["duplicates"] == 0

    # -----------------------------------------------------------------------
    # 2. Conditions-based filtering
    # -----------------------------------------------------------------------
    def test_evaluate_rule_with_conditions(self, auth_client, organization, workspace):
        """Create traces with different names, filter by name contains 'good',
        assert only matching traces added."""
        project = _create_project(organization, workspace, name="Cond Project")
        _create_trace(project, name="good trace 1")
        _create_trace(project, name="good trace 2")
        _create_trace(project, name="bad trace 1")

        queue_id = _create_queue(auth_client, name="Cond Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Good only",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {"field": "name", "op": "contains", "value": "good"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2
        assert result["added"] == 2

    # -----------------------------------------------------------------------
    # 3. Project-scoped queue
    # -----------------------------------------------------------------------
    def test_evaluate_rule_project_scoped_queue(
        self, auth_client, organization, workspace
    ):
        """Queue scoped to project1 must NOT include project2 traces."""
        project1 = _create_project(organization, workspace, name="Project One")
        project2 = _create_project(organization, workspace, name="Project Two")

        _create_trace(project1, name="p1-trace-1")
        _create_trace(project1, name="p1-trace-2")
        _create_trace(project2, name="p2-trace-1")

        queue_id = _create_queue(auth_client, name="Scoped Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project1)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Project1 only",
                "source_type": "trace",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2
        assert result["added"] == 2

        # Verify items belong to project1 traces only
        items_resp = auth_client.get(_items_url(queue_id))
        assert items_resp.status_code == status.HTTP_200_OK
        items = items_resp.data.get("results", items_resp.data)
        for item in items:
            qi = QueueItem.objects.get(pk=item["id"])
            assert qi.trace.project_id == project1.pk

    # -----------------------------------------------------------------------
    # 4. Dataset-scoped queue
    # -----------------------------------------------------------------------
    def test_evaluate_rule_dataset_scoped_queue(
        self, auth_client, organization, workspace
    ):
        """Queue scoped to dataset1 must NOT include dataset2 rows."""
        ds1 = Dataset.objects.create(
            name="DS One", organization=organization, workspace=workspace
        )
        ds2 = Dataset.objects.create(
            name="DS Two", organization=organization, workspace=workspace
        )
        Row.objects.create(dataset=ds1, order=1, metadata={})
        Row.objects.create(dataset=ds1, order=2, metadata={})
        Row.objects.create(dataset=ds2, order=1, metadata={})

        queue_id = _create_queue(auth_client, name="DS Scoped Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(dataset=ds1)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "DS1 only",
                "source_type": "dataset_row",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2
        assert result["added"] == 2

    # -----------------------------------------------------------------------
    # 5. Soft-deleted records excluded
    # -----------------------------------------------------------------------
    def test_evaluate_rule_filters_deleted_records(
        self, auth_client, organization, workspace
    ):
        """Soft-deleted traces must NOT be matched by evaluate_rule."""
        project = _create_project(organization, workspace, name="Del Project")
        t1 = _create_trace(project, name="alive-trace")
        t2 = _create_trace(project, name="dead-trace")

        # Soft-delete t2
        t2.deleted = True
        t2.deleted_at = timezone.now()
        t2.save(update_fields=["deleted", "deleted_at"])

        queue_id = _create_queue(auth_client, name="Del Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "No deleted",
                "source_type": "trace",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 6. Dry-run / preview
    # -----------------------------------------------------------------------
    def test_evaluate_rule_dry_run(self, auth_client, organization, workspace):
        """Preview endpoint should report matches without creating items."""
        project = _create_project(organization, workspace, name="Preview Project")
        _create_trace(project, name="preview-trace-1")
        _create_trace(project, name="preview-trace-2")

        queue_id = _create_queue(auth_client, name="Preview Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Preview rule",
                "source_type": "trace",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.get(
            f"{_rule_detail_url(queue_id, rule_id)}preview/",
        )
        assert resp.status_code == status.HTTP_200_OK
        result = resp.data.get("result", resp.data)
        assert result["matched"] >= 1
        assert result["added"] == 0

        # Verify no queue items were created
        assert QueueItem.objects.filter(queue_id=queue_id, deleted=False).count() == 0

    # -----------------------------------------------------------------------
    # 7. Org isolation
    # -----------------------------------------------------------------------
    def test_evaluate_rule_org_isolation(self, auth_client, organization, workspace):
        """Rule for org1 must NOT pick up org2's traces."""
        # Org 1 data
        project1 = _create_project(organization, workspace, name="Org1 Project")
        _create_trace(project1, name="org1-trace")

        # Org 2 data
        org2 = Organization.objects.create(name="Other Org")
        user2 = User.objects.create_user(
            email="org2user@futureagi.com",
            password="testpassword123",
            name="Org2 User",
            organization=org2,
        )
        ws2 = Workspace.objects.create(
            name="Org2 Workspace",
            organization=org2,
            is_default=True,
            created_by=user2,
        )
        project2 = _create_project(org2, ws2, name="Org2 Project")
        _create_trace(project2, name="org2-trace")

        # Create queue + rule for org1
        queue_id = _create_queue(auth_client, name="Iso Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project1)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Org1 only",
                "source_type": "trace",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 8. project__name filter in conditions
    # -----------------------------------------------------------------------
    def test_rule_with_project_name_filter(self, auth_client, organization, workspace):
        """Condition field 'project__name' should filter by project name."""
        proj_a = _create_project(organization, workspace, name="MyProject")
        proj_b = _create_project(organization, workspace, name="OtherProject")
        _create_trace(proj_a, name="a-trace")
        _create_trace(proj_b, name="b-trace")

        queue_id = _create_queue(auth_client, name="ProjName Q1")

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "By project name",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {
                            "field": "project__name",
                            "op": "eq",
                            "value": "MyProject",
                        },
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 9. Disallowed field is rejected / ignored
    # -----------------------------------------------------------------------
    def test_disallowed_field_is_rejected(self, auth_client, organization, workspace):
        """A condition with a disallowed field (e.g. user__password) should be
        silently ignored — not crash — and the matched count reflects no
        filtering by that field."""
        project = _create_project(organization, workspace, name="Reject Project")
        _create_trace(project, name="reject-trace-1")
        _create_trace(project, name="reject-trace-2")

        queue_id = _create_queue(auth_client, name="Reject Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Disallowed field rule",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {
                            "field": "user__password",
                            "op": "eq",
                            "value": "secret",
                        },
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        result = resp.data.get("result", resp.data)
        # The disallowed field is skipped, so all records match
        assert result["matched"] == 2

    # -----------------------------------------------------------------------
    # 10. Rule stats updated after evaluation
    # -----------------------------------------------------------------------
    def test_evaluate_rule_updates_stats(self, auth_client, organization, workspace):
        """After evaluation, rule.last_triggered_at should be set and
        trigger_count incremented."""
        project = _create_project(organization, workspace, name="Stats Project")
        _create_trace(project, name="stats-trace")

        queue_id = _create_queue(auth_client, name="Stats Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Stats rule",
                "source_type": "trace",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]

        rule = AutomationRule.objects.get(pk=rule_id)
        assert rule.last_triggered_at is None
        assert rule.trigger_count == 0

        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        rule.refresh_from_db()
        assert rule.last_triggered_at is not None
        assert rule.trigger_count == 1

        # Evaluate again — trigger_count should increment
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/",
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        rule.refresh_from_db()
        assert rule.trigger_count == 2

    # -----------------------------------------------------------------------
    # 11. Long-form operators from frontend LLMFilterBox
    # -----------------------------------------------------------------------
    def test_evaluate_rule_with_long_form_operators(
        self, auth_client, organization, workspace
    ):
        """Frontend sends long-form operators (equals, contains, not_equals).
        Backend must handle them correctly."""
        project = _create_project(organization, workspace, name="LongOp Project")
        _create_trace(project, name="alpha trace")
        _create_trace(project, name="beta trace")
        _create_trace(project, name="gamma trace")

        queue_id = _create_queue(auth_client, name="LongOp Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        # Test "equals" operator
        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Equals rule",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {"field": "name", "op": "equals", "value": "alpha trace"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 12. not_equals operator
    # -----------------------------------------------------------------------
    def test_evaluate_rule_not_equals(self, auth_client, organization, workspace):
        """not_equals should exclude matching records."""
        project = _create_project(organization, workspace, name="NotEq Project")
        _create_trace(project, name="keep-me")
        _create_trace(project, name="exclude-me")

        queue_id = _create_queue(auth_client, name="NotEq Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Not equals rule",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {"field": "name", "op": "not_equals", "value": "exclude-me"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 13. camelCase field IDs (traceName) — new frontend format
    # -----------------------------------------------------------------------
    def test_evaluate_rule_camelcase_traceName(
        self, auth_client, organization, workspace
    ):
        """Frontend sends camelCase field IDs like 'traceName'.
        Backend FIELD_MAPPING must resolve them to Django ORM fields."""
        project = _create_project(organization, workspace, name="Camel Project")
        _create_trace(project, name="camel-yes")
        _create_trace(project, name="camel-no")

        queue_id = _create_queue(auth_client, name="Camel Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "CamelCase traceName",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {"field": "traceName", "op": "contains", "value": "yes"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 14. camelCase projectName filter
    # -----------------------------------------------------------------------
    def test_evaluate_rule_camelcase_projectName(
        self, auth_client, organization, workspace
    ):
        """projectName should map to project__name."""
        proj_a = _create_project(organization, workspace, name="AlphaProject")
        proj_b = _create_project(organization, workspace, name="BetaProject")
        _create_trace(proj_a, name="a-trace")
        _create_trace(proj_b, name="b-trace")

        queue_id = _create_queue(auth_client, name="ProjName Camel Q1")

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "By projectName",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {
                            "field": "projectName",
                            "op": "equals",
                            "value": "AlphaProject",
                        },
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 15. Annotated trace fields: nodeType and status
    # -----------------------------------------------------------------------
    def test_evaluate_rule_trace_node_type_and_status(
        self, auth_client, organization, workspace
    ):
        """nodeType and status are annotated from root spans.
        Filtering by these computed fields must work."""
        from tracer.models.observation_span import ObservationSpan

        project = _create_project(organization, workspace, name="Annotated Project")
        t1 = _create_trace(project, name="chain-trace")
        t2 = _create_trace(project, name="llm-trace")

        # Create root spans with different types/statuses
        ObservationSpan.objects.create(
            id=str(uuid.uuid4()),
            trace=t1,
            name="root-1",
            observation_type="chain",
            status="OK",
            project=project,
            parent_span_id=None,
        )
        ObservationSpan.objects.create(
            id=str(uuid.uuid4()),
            trace=t2,
            name="root-2",
            observation_type="llm",
            status="ERROR",
            project=project,
            parent_span_id=None,
        )

        queue_id = _create_queue(auth_client, name="NodeType Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        # Filter by nodeType = chain
        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Chain only",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {"field": "nodeType", "op": "equals", "value": "chain"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

        # Filter by status = ERROR
        queue_id2 = _create_queue(auth_client, name="Status Q1")
        AnnotationQueue.objects.filter(pk=queue_id2).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id2),
            {
                "name": "Errors only",
                "source_type": "trace",
                "conditions": {
                    "rules": [
                        {"field": "status", "op": "equals", "value": "ERROR"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id2 = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id2, rule_id2)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 16. Span source type with camelCase filters
    # -----------------------------------------------------------------------
    def test_evaluate_rule_span_source_with_filters(
        self, auth_client, organization, workspace
    ):
        """Span rules should filter by observation_type via nodeType mapping,
        and traceName should resolve to trace__name."""
        from tracer.models.observation_span import ObservationSpan

        project = _create_project(organization, workspace, name="Span Project")
        t1 = _create_trace(project, name="my-trace")
        t2 = _create_trace(project, name="other-trace")

        ObservationSpan.objects.create(
            id=str(uuid.uuid4()),
            trace=t1,
            name="span-1",
            observation_type="llm",
            status="OK",
            project=project,
            parent_span_id=None,
        )
        ObservationSpan.objects.create(
            id=str(uuid.uuid4()),
            trace=t1,
            name="span-2",
            observation_type="tool",
            status="OK",
            project=project,
            parent_span_id=None,
        )
        ObservationSpan.objects.create(
            id=str(uuid.uuid4()),
            trace=t2,
            name="span-3",
            observation_type="llm",
            status="ERROR",
            project=project,
            parent_span_id=None,
        )

        queue_id = _create_queue(auth_client, name="Span Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        # Filter spans by nodeType = llm
        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "LLM spans only",
                "source_type": "observation_span",
                "conditions": {
                    "rules": [
                        {"field": "nodeType", "op": "equals", "value": "llm"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2  # span-1 and span-3
        assert result["added"] == 2

        # Filter spans by traceName
        queue_id2 = _create_queue(auth_client, name="Span TraceName Q1")
        AnnotationQueue.objects.filter(pk=queue_id2).update(project=project)

        resp = auth_client.post(
            _rules_url(queue_id2),
            {
                "name": "Spans from my-trace",
                "source_type": "observation_span",
                "conditions": {
                    "rules": [
                        {"field": "traceName", "op": "equals", "value": "my-trace"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id2 = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id2, rule_id2)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2  # span-1 and span-2
        assert result["added"] == 2

    # -----------------------------------------------------------------------
    # 17. Session source type with computed filters
    # -----------------------------------------------------------------------
    def test_evaluate_rule_session_source(self, auth_client, organization, workspace):
        """Session rules should work with basic evaluation and projectName."""
        from tracer.models.trace_session import TraceSession

        project = _create_project(organization, workspace, name="Session Project")
        s1 = TraceSession.objects.create(project=project, name="session-1")
        s2 = TraceSession.objects.create(project=project, name="session-2")

        queue_id = _create_queue(auth_client, name="Session Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        # No conditions — should match all sessions
        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "All sessions",
                "source_type": "trace_session",
                "conditions": {},
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2
        assert result["added"] == 2

    # -----------------------------------------------------------------------
    # 18. Session projectName filter
    # -----------------------------------------------------------------------
    def test_evaluate_rule_session_project_name(
        self, auth_client, organization, workspace
    ):
        """Session rules with projectName filter."""
        from tracer.models.trace_session import TraceSession

        proj_a = _create_project(organization, workspace, name="SessionProjA")
        proj_b = _create_project(organization, workspace, name="SessionProjB")
        TraceSession.objects.create(project=proj_a, name="s-a")
        TraceSession.objects.create(project=proj_b, name="s-b")

        queue_id = _create_queue(auth_client, name="Session ProjName Q1")

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Sessions in ProjA",
                "source_type": "trace_session",
                "conditions": {
                    "rules": [
                        {
                            "field": "projectName",
                            "op": "equals",
                            "value": "SessionProjA",
                        },
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 19. Session computed fields (totalCost, startTime)
    # -----------------------------------------------------------------------
    def test_evaluate_rule_session_computed_fields(
        self, auth_client, organization, workspace
    ):
        """Session computed fields (totalCost, startTime) are annotated
        from span aggregates and should be filterable."""
        from tracer.models.observation_span import ObservationSpan
        from tracer.models.trace_session import TraceSession

        project = _create_project(organization, workspace, name="SessComp Project")
        s1 = TraceSession.objects.create(project=project, name="expensive-session")
        s2 = TraceSession.objects.create(project=project, name="cheap-session")

        # Create traces in each session
        t1 = _create_trace(project, name="s1-trace")
        t1.session = s1
        t1.save(update_fields=["session"])
        t2 = _create_trace(project, name="s2-trace")
        t2.session = s2
        t2.save(update_fields=["session"])

        now = timezone.now()
        # Expensive session spans
        ObservationSpan.objects.create(
            id=str(uuid.uuid4()),
            trace=t1,
            name="expensive-span",
            observation_type="llm",
            project=project,
            cost=5.0,
            start_time=now - timedelta(hours=1),
            end_time=now,
        )
        # Cheap session spans
        ObservationSpan.objects.create(
            id=str(uuid.uuid4()),
            trace=t2,
            name="cheap-span",
            observation_type="llm",
            project=project,
            cost=0.01,
            start_time=now - timedelta(minutes=5),
            end_time=now,
        )

        queue_id = _create_queue(auth_client, name="SessComp Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(project=project)

        # Filter sessions with totalCost > 1.0
        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Expensive sessions",
                "source_type": "trace_session",
                "conditions": {
                    "rules": [
                        {
                            "field": "totalCost",
                            "op": "greater_than",
                            "value": "1.0",
                        },
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 20. Simulation (call_execution) source with filters
    # -----------------------------------------------------------------------
    def test_evaluate_rule_simulation_source(
        self, auth_client, organization, workspace
    ):
        """CallExecution rules should filter by status and callType."""
        from simulate.models import AgentDefinition, Scenarios
        from simulate.models.run_test import RunTest
        from simulate.models.simulator_agent import SimulatorAgent
        from simulate.models.test_execution import CallExecution, TestExecution

        # Build the FK chain: AgentDefinition → SimulatorAgent → RunTest →
        #   TestExecution → CallExecution
        agent_def = AgentDefinition.objects.create(
            agent_name="Test Agent",
            agent_type=AgentDefinition.AgentTypeChoices.VOICE,
            contact_number="+1234567890",
            inbound=True,
            description="Test agent",
            organization=organization,
            workspace=workspace,
            languages=["en"],
        )
        sim_agent = SimulatorAgent.objects.create(
            name="Test Sim Agent",
            prompt="You are a test sim agent.",
            voice_provider="elevenlabs",
            voice_name="marissa",
            model="gpt-4",
            organization=organization,
            workspace=workspace,
        )
        ds = Dataset.objects.create(
            name="Sim DS",
            organization=organization,
            workspace=workspace,
            source=DatasetSourceChoices.SCENARIO.value,
        )
        col = Column.objects.create(
            dataset=ds,
            name="situation",
            data_type="text",
            source=SourceChoices.OTHERS.value,
        )
        row = Row.objects.create(dataset=ds, order=0)
        Cell.objects.create(dataset=ds, column=col, row=row, value="Test sit")
        scenario = Scenarios.objects.create(
            name="Test Scenario",
            description="desc",
            source="test",
            scenario_type=Scenarios.ScenarioTypes.DATASET,
            organization=organization,
            workspace=workspace,
            dataset=ds,
            agent_definition=agent_def,
            status=StatusType.COMPLETED.value,
        )
        run_test = RunTest.objects.create(
            name="Test Run",
            description="desc",
            agent_definition=agent_def,
            simulator_agent=sim_agent,
            organization=organization,
            workspace=workspace,
        )
        run_test.scenarios.add(scenario)
        test_exec = TestExecution.objects.create(
            run_test=run_test,
            status=TestExecution.ExecutionStatus.PENDING,
            total_scenarios=1,
            total_calls=3,
            simulator_agent=sim_agent,
            agent_definition=agent_def,
        )

        # Create call executions with different statuses and types
        CallExecution.objects.create(
            test_execution=test_exec,
            scenario=scenario,
            status="completed",
            simulation_call_type="voice",
        )
        CallExecution.objects.create(
            test_execution=test_exec,
            scenario=scenario,
            status="failed",
            simulation_call_type="voice",
        )
        CallExecution.objects.create(
            test_execution=test_exec,
            scenario=scenario,
            status="completed",
            simulation_call_type="text",
        )

        queue_id = _create_queue(auth_client, name="Sim Q1")
        AnnotationQueue.objects.filter(pk=queue_id).update(agent_definition=agent_def)

        # Filter by status = completed
        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "Completed calls",
                "source_type": "call_execution",
                "conditions": {
                    "rules": [
                        {"field": "status", "op": "equals", "value": "completed"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2
        assert result["added"] == 2

        # Filter by callType = voice
        queue_id2 = _create_queue(auth_client, name="Sim CallType Q1")
        AnnotationQueue.objects.filter(pk=queue_id2).update(agent_definition=agent_def)

        resp = auth_client.post(
            _rules_url(queue_id2),
            {
                "name": "Voice calls",
                "source_type": "call_execution",
                "conditions": {
                    "rules": [
                        {"field": "callType", "op": "equals", "value": "voice"},
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id2 = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id2, rule_id2)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 2
        assert result["added"] == 2

    # -----------------------------------------------------------------------
    # 21. Dataset row with camelCase filters
    # -----------------------------------------------------------------------
    def test_evaluate_rule_dataset_row_camelcase(
        self, auth_client, organization, workspace
    ):
        """Dataset row rules with camelCase field IDs (datasetName)."""
        ds1 = Dataset.objects.create(
            name="FilterableDS", organization=organization, workspace=workspace
        )
        ds2 = Dataset.objects.create(
            name="OtherDS", organization=organization, workspace=workspace
        )
        Row.objects.create(dataset=ds1, order=1, metadata={})
        Row.objects.create(dataset=ds2, order=1, metadata={})

        queue_id = _create_queue(auth_client, name="DS Camel Q1")

        resp = auth_client.post(
            _rules_url(queue_id),
            {
                "name": "FilterableDS rows",
                "source_type": "dataset_row",
                "conditions": {
                    "rules": [
                        {
                            "field": "datasetName",
                            "op": "equals",
                            "value": "FilterableDS",
                        },
                    ]
                },
                "enabled": True,
            },
            format="json",
        )
        rule_id = resp.data["id"]
        resp = auth_client.post(
            f"{_rule_detail_url(queue_id, rule_id)}evaluate/", format="json"
        )
        result = resp.data.get("result", resp.data)
        assert result["matched"] == 1
        assert result["added"] == 1

    # -----------------------------------------------------------------------
    # 22. FIELD_MAPPING completeness — verify all source types have mappings
    # -----------------------------------------------------------------------
    def test_field_mapping_covers_all_source_types(self, db):
        """Every source type in SOURCE_MODEL_MAP must have a FIELD_MAPPING."""
        from model_hub.utils.annotation_queue_helpers import (
            FIELD_MAPPING,
            SOURCE_MODEL_MAP,
        )

        for source_type in SOURCE_MODEL_MAP:
            assert (
                source_type in FIELD_MAPPING
            ), f"FIELD_MAPPING missing for source_type={source_type}"
            assert (
                len(FIELD_MAPPING[source_type]) > 0
            ), f"FIELD_MAPPING for {source_type} is empty"
