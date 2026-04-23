"""
Session and User Analytics Tasks

Periodic tasks for:
- Updating EndUser analytics (total_sessions, total_traces, etc.)
- Updating TraceSession metrics (span_count, total_tokens, etc.)
- Session status management (marking abandoned sessions)
- User analytics rollup
"""

from datetime import timedelta
from decimal import Decimal

import structlog
from django.db import close_old_connections, transaction
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from tfc.temporal import temporal_activity

logger = structlog.get_logger(__name__)


def _get_session_metrics_from_ch(session, project_id):
    """Try to get session metrics from ClickHouse.

    Returns a dict with span_count, total_tokens, total_cost, total_duration,
    error_count, trace_count, and last_activity_at on success, or None on failure.
    """
    from tracer.services.clickhouse.query_builders.session_analytics import (
        SessionAnalyticsQueryBuilder,
    )
    from tracer.services.clickhouse.query_service import (
        AnalyticsQueryService,
        QueryType,
    )

    try:
        service = AnalyticsQueryService()
        if not service.should_use_clickhouse(QueryType.SESSION_ANALYTICS):
            return None

        builder = SessionAnalyticsQueryBuilder(project_id=str(project_id))
        query, params = builder.build_session_metrics_query([str(session.id)])
        result = service.execute_ch_query(query, params)

        if not result.data:
            return None

        row = result.data[0]
        return {
            "trace_count": int(row.get("trace_count") or 0),
            "total_tokens": int(row.get("total_tokens") or 0),
            "total_cost": row.get("total_cost") or 0,
            "ended_at": row.get("ended_at"),
        }
    except Exception:
        logger.warning(
            "ch_session_metrics_failed, falling back to postgres",
            session_id=str(session.id),
            exc_info=True,
        )
        return None


def _get_user_stats_from_ch(user, project_id):
    """Try to get user analytics from ClickHouse.

    Returns a dict with session_count, total_tokens, total_cost,
    first_seen, and last_seen on success, or None on failure.
    """
    from tracer.services.clickhouse.query_builders.session_analytics import (
        SessionAnalyticsQueryBuilder,
    )
    from tracer.services.clickhouse.query_service import (
        AnalyticsQueryService,
        QueryType,
    )

    try:
        service = AnalyticsQueryService()
        if not service.should_use_clickhouse(QueryType.SESSION_ANALYTICS):
            return None

        builder = SessionAnalyticsQueryBuilder(project_id=str(project_id))
        query, params = builder.build_user_stats_query(str(user.id))
        result = service.execute_ch_query(query, params)

        if not result.data:
            return None

        row = result.data[0]
        return {
            "session_count": int(row.get("session_count") or 0),
            "total_tokens": int(row.get("total_tokens") or 0),
            "total_cost": row.get("total_cost") or 0,
            "first_seen": row.get("first_seen"),
            "last_seen": row.get("last_seen"),
        }
    except Exception:
        logger.warning(
            "ch_user_stats_failed, falling back to postgres",
            user_id=str(user.id),
            exc_info=True,
        )
        return None


# Session timeout threshold (mark as abandoned after this period of inactivity)
SESSION_TIMEOUT_HOURS = 24


@temporal_activity(
    max_retries=2,
    time_limit=3600,
    queue="default",
)
def update_session_metrics_task():
    """
    Periodic task to recalculate session metrics from actual span data.

    Updates:
    - trace_count: Number of unique traces in the session
    - span_count: Total spans across all traces
    - total_tokens: Sum of all tokens used
    - total_cost: Sum of all costs
    - total_duration_ms: Sum of all latencies
    - error_count: Number of error spans
    - last_activity_at: Most recent span end time
    """
    from tracer.models.observation_span import ObservationSpan
    from tracer.models.trace import Trace
    from tracer.models.trace_session import SessionStatus, TraceSession

    try:
        close_old_connections()

        # Get sessions that were active in the last 24 hours
        cutoff_time = timezone.now() - timedelta(hours=SESSION_TIMEOUT_HOURS)
        active_sessions = TraceSession.objects.filter(
            Q(status=SessionStatus.ACTIVE) | Q(last_activity_at__gte=cutoff_time)
        ).select_related("project")

        updated_count = 0

        for session in active_sessions:
            try:
                # Try ClickHouse first for the read queries
                ch_metrics = _get_session_metrics_from_ch(session, session.project_id)

                if ch_metrics is not None:
                    # Use CH data for available fields, PG for the rest
                    session.trace_count = ch_metrics["trace_count"]
                    session.total_tokens = ch_metrics["total_tokens"]
                    session.total_cost = Decimal(str(ch_metrics["total_cost"]))

                    if ch_metrics.get("ended_at"):
                        session.last_activity_at = ch_metrics["ended_at"]

                    # CH doesn't provide span_count, total_duration, error_count
                    # so we still need PG for those
                    traces = Trace.objects.filter(session=session)
                    trace_ids = list(traces.values_list("id", flat=True))

                    if trace_ids:
                        extra_metrics = ObservationSpan.objects.filter(
                            trace_id__in=trace_ids
                        ).aggregate(
                            span_count=Count("id"),
                            total_duration=Sum("latency_ms"),
                            error_count=Count("id", filter=Q(status="ERROR")),
                        )
                        session.span_count = extra_metrics["span_count"] or 0
                        session.total_duration_ms = extra_metrics["total_duration"] or 0
                        session.error_count = extra_metrics["error_count"] or 0
                    else:
                        session.span_count = 0
                        session.total_duration_ms = 0
                        session.error_count = 0

                    session.save(
                        update_fields=[
                            "trace_count",
                            "span_count",
                            "total_tokens",
                            "total_cost",
                            "total_duration_ms",
                            "error_count",
                            "last_activity_at",
                        ]
                    )
                    updated_count += 1
                    continue

                # Fallback: full PG path
                # Get all traces for this session
                traces = Trace.objects.filter(session=session)
                trace_ids = list(traces.values_list("id", flat=True))

                if not trace_ids:
                    continue

                # Aggregate span metrics
                span_metrics = ObservationSpan.objects.filter(
                    trace_id__in=trace_ids
                ).aggregate(
                    span_count=Count("id"),
                    total_tokens=Sum("total_tokens"),
                    total_cost=Sum("cost"),
                    total_duration=Sum("latency_ms"),
                    error_count=Count("id", filter=Q(status="ERROR")),
                )

                # Get the most recent span end time
                latest_span = (
                    ObservationSpan.objects.filter(trace_id__in=trace_ids)
                    .order_by("-end_time")
                    .first()
                )

                # Update session
                session.trace_count = len(trace_ids)
                session.span_count = span_metrics["span_count"] or 0
                session.total_tokens = span_metrics["total_tokens"] or 0
                session.total_cost = Decimal(str(span_metrics["total_cost"] or 0))
                session.total_duration_ms = span_metrics["total_duration"] or 0
                session.error_count = span_metrics["error_count"] or 0

                if latest_span and latest_span.end_time:
                    session.last_activity_at = latest_span.end_time

                session.save(
                    update_fields=[
                        "trace_count",
                        "span_count",
                        "total_tokens",
                        "total_cost",
                        "total_duration_ms",
                        "error_count",
                        "last_activity_at",
                    ]
                )

                updated_count += 1

            except Exception as e:
                logger.warning(
                    f"Failed to update metrics for session {session.id}: {e}"
                )
                continue

        logger.info(f"Updated metrics for {updated_count} sessions")
        return {"updated_sessions": updated_count}

    except Exception as e:
        logger.exception(f"Error in update_session_metrics_task: {e}")
        raise
    finally:
        close_old_connections()


@temporal_activity(
    max_retries=2,
    time_limit=3600,
    queue="default",
)
def mark_abandoned_sessions_task():
    """
    Periodic task to mark sessions as abandoned if they've been inactive
    for longer than SESSION_TIMEOUT_HOURS.
    """
    from tracer.models.trace_session import SessionStatus, TraceSession

    try:
        close_old_connections()

        cutoff_time = timezone.now() - timedelta(hours=SESSION_TIMEOUT_HOURS)

        # Find active sessions that have been inactive
        abandoned_sessions = TraceSession.objects.filter(
            status=SessionStatus.ACTIVE, last_activity_at__lt=cutoff_time
        )

        count = abandoned_sessions.count()

        if count > 0:
            abandoned_sessions.update(
                status=SessionStatus.ABANDONED, ended_at=F("last_activity_at")
            )
            logger.info(f"Marked {count} sessions as abandoned")

        return {"abandoned_count": count}

    except Exception as e:
        logger.exception(f"Error in mark_abandoned_sessions_task: {e}")
        raise
    finally:
        close_old_connections()


@temporal_activity(
    max_retries=2,
    time_limit=3600,
    queue="default",
)
def update_end_user_analytics_task():
    """
    Periodic task to recalculate end user analytics from actual data.

    Updates:
    - total_sessions: Count of sessions for this user
    - total_traces: Count of traces for this user
    - total_tokens_used: Sum of all tokens consumed
    - total_cost: Sum of all costs attributed
    - first_seen: Earliest trace/session time
    - last_seen: Most recent activity
    """
    from tracer.models.observation_span import EndUser, ObservationSpan
    from tracer.models.trace_session import TraceSession

    try:
        close_old_connections()

        # Get users who have had recent activity (last 7 days)
        cutoff_time = timezone.now() - timedelta(days=7)
        active_users = EndUser.objects.filter(
            Q(last_seen__gte=cutoff_time) | Q(last_seen__isnull=True)
        ).select_related("project", "organization")

        updated_count = 0

        for user in active_users:
            try:
                # Try ClickHouse first for the read queries
                ch_stats = _get_user_stats_from_ch(user, user.project_id)

                if ch_stats is not None:
                    # Use CH data
                    user.total_sessions = ch_stats["session_count"]
                    user.total_tokens_used = ch_stats["total_tokens"]
                    user.total_cost = Decimal(str(ch_stats["total_cost"]))

                    # CH doesn't give trace count directly, fall back to PG
                    trace_count = (
                        ObservationSpan.objects.filter(end_user=user)
                        .values("trace_id")
                        .distinct()
                        .count()
                    )
                    user.total_traces = trace_count

                    if ch_stats.get("first_seen"):
                        if (
                            not user.first_seen
                            or ch_stats["first_seen"] < user.first_seen
                        ):
                            user.first_seen = ch_stats["first_seen"]

                    if ch_stats.get("last_seen"):
                        user.last_seen = ch_stats["last_seen"]

                    user.save(
                        update_fields=[
                            "total_sessions",
                            "total_traces",
                            "total_tokens_used",
                            "total_cost",
                            "first_seen",
                            "last_seen",
                        ]
                    )
                    updated_count += 1
                    continue

                # Fallback: full PG path
                # Count sessions for this user
                session_count = TraceSession.objects.filter(end_user=user).count()

                # Get all spans for this user
                span_metrics = ObservationSpan.objects.filter(end_user=user).aggregate(
                    total_tokens=Sum("total_tokens"),
                    total_cost=Sum("cost"),
                )

                # Count unique traces
                trace_count = (
                    ObservationSpan.objects.filter(end_user=user)
                    .values("trace_id")
                    .distinct()
                    .count()
                )

                # Get first and last seen times
                first_span = (
                    ObservationSpan.objects.filter(end_user=user)
                    .order_by("start_time")
                    .first()
                )

                last_span = (
                    ObservationSpan.objects.filter(end_user=user)
                    .order_by("-end_time")
                    .first()
                )

                # Update user analytics
                user.total_sessions = session_count
                user.total_traces = trace_count
                user.total_tokens_used = span_metrics["total_tokens"] or 0
                user.total_cost = Decimal(str(span_metrics["total_cost"] or 0))

                if first_span and first_span.start_time:
                    if not user.first_seen or first_span.start_time < user.first_seen:
                        user.first_seen = first_span.start_time

                if last_span and last_span.end_time:
                    user.last_seen = last_span.end_time

                user.save(
                    update_fields=[
                        "total_sessions",
                        "total_traces",
                        "total_tokens_used",
                        "total_cost",
                        "first_seen",
                        "last_seen",
                    ]
                )

                updated_count += 1

            except Exception as e:
                logger.warning(f"Failed to update analytics for user {user.id}: {e}")
                continue

        logger.info(f"Updated analytics for {updated_count} end users")
        return {"updated_users": updated_count}

    except Exception as e:
        logger.exception(f"Error in update_end_user_analytics_task: {e}")
        raise
    finally:
        close_old_connections()


@temporal_activity(
    max_retries=2,
    time_limit=1800,
    queue="default",
)
def complete_sessions_with_trace_completion_task():
    """
    Task to mark sessions as completed when their traces have completed.

    A session is considered complete when:
    - It has at least one trace
    - No new spans have been added in the last hour
    - The last span has status OK or ERROR (not UNSET)
    """
    from tracer.models.observation_span import ObservationSpan
    from tracer.models.trace import Trace
    from tracer.models.trace_session import SessionStatus, TraceSession

    try:
        close_old_connections()

        # Find active sessions with recent activity that might be complete
        one_hour_ago = timezone.now() - timedelta(hours=1)

        potentially_complete = TraceSession.objects.filter(
            status=SessionStatus.ACTIVE,
            last_activity_at__lt=one_hour_ago,
            trace_count__gt=0,
        )

        completed_count = 0

        for session in potentially_complete:
            try:
                # Check if the last span for this session has a final status
                traces = Trace.objects.filter(session=session)
                trace_ids = list(traces.values_list("id", flat=True))

                if not trace_ids:
                    continue

                last_span = (
                    ObservationSpan.objects.filter(trace_id__in=trace_ids)
                    .order_by("-end_time")
                    .first()
                )

                if last_span and last_span.status in ["OK", "ERROR"]:
                    # Check if there have been any recent spans
                    recent_spans = ObservationSpan.objects.filter(
                        trace_id__in=trace_ids, created_at__gte=one_hour_ago
                    ).exists()

                    if not recent_spans:
                        # Mark as completed or error based on last span status
                        if last_span.status == "ERROR":
                            session.status = SessionStatus.ERROR
                        else:
                            session.status = SessionStatus.COMPLETED

                        session.ended_at = last_span.end_time
                        session.save(update_fields=["status", "ended_at"])
                        completed_count += 1

            except Exception as e:
                logger.warning(
                    f"Failed to check session {session.id} for completion: {e}"
                )
                continue

        logger.info(f"Marked {completed_count} sessions as completed")
        return {"completed_count": completed_count}

    except Exception as e:
        logger.exception(f"Error in complete_sessions_with_trace_completion_task: {e}")
        raise
    finally:
        close_old_connections()


@temporal_activity(
    max_retries=2,
    time_limit=3600,
    queue="default",
)
def recalculate_project_user_analytics_task(project_id: str):
    """
    Recalculate all user analytics for a specific project.

    Useful for:
    - Initial migration/backfill
    - Fixing data inconsistencies
    - After bulk data operations

    Args:
        project_id: UUID of the project to recalculate

    Returns:
        Dict with project_id and updated_users count
    """
    from tracer.models.observation_span import EndUser, ObservationSpan
    from tracer.models.trace_session import TraceSession

    try:
        close_old_connections()

        users = EndUser.objects.filter(project_id=project_id)
        updated_count = 0

        for user in users:
            try:
                with transaction.atomic():
                    # Try ClickHouse first for the read queries
                    ch_stats = _get_user_stats_from_ch(user, project_id)

                    if ch_stats is not None:
                        user.total_sessions = ch_stats["session_count"]
                        user.total_tokens_used = ch_stats["total_tokens"]
                        user.total_cost = Decimal(str(ch_stats["total_cost"]))

                        # Trace count still from PG
                        trace_count = (
                            ObservationSpan.objects.filter(end_user=user)
                            .values("trace_id")
                            .distinct()
                            .count()
                        )
                        user.total_traces = trace_count

                        if ch_stats.get("first_seen"):
                            user.first_seen = ch_stats["first_seen"]

                        if ch_stats.get("last_seen"):
                            user.last_seen = ch_stats["last_seen"]

                        user.save()
                        updated_count += 1
                        continue

                    # Fallback: full PG path
                    # Session count
                    session_count = TraceSession.objects.filter(end_user=user).count()

                    # Span metrics
                    span_metrics = ObservationSpan.objects.filter(
                        end_user=user
                    ).aggregate(
                        total_tokens=Sum("total_tokens"),
                        total_cost=Sum("cost"),
                    )

                    # Trace count
                    trace_count = (
                        ObservationSpan.objects.filter(end_user=user)
                        .values("trace_id")
                        .distinct()
                        .count()
                    )

                    # First/last seen
                    first_span = (
                        ObservationSpan.objects.filter(end_user=user)
                        .order_by("start_time")
                        .first()
                    )

                    last_span = (
                        ObservationSpan.objects.filter(end_user=user)
                        .order_by("-end_time")
                        .first()
                    )

                    # Update
                    user.total_sessions = session_count
                    user.total_traces = trace_count
                    user.total_tokens_used = span_metrics["total_tokens"] or 0
                    user.total_cost = Decimal(str(span_metrics["total_cost"] or 0))

                    if first_span and first_span.start_time:
                        user.first_seen = first_span.start_time

                    if last_span and last_span.end_time:
                        user.last_seen = last_span.end_time

                    user.save()
                    updated_count += 1

            except Exception as e:
                logger.warning(
                    f"Failed to recalculate analytics for user {user.id}: {e}"
                )
                continue

        logger.info(
            f"Recalculated analytics for {updated_count} users in project {project_id}"
        )
        return {"project_id": project_id, "updated_users": updated_count}

    except Exception as e:
        logger.exception(f"Error in recalculate_project_user_analytics_task: {e}")
        raise
    finally:
        close_old_connections()
