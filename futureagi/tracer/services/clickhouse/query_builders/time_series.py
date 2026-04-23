"""
Time-Series Query Builder for ClickHouse.

Replaces ``get_all_system_metrics()`` and ``get_system_metric_data()`` from
``tracer.utils.graphs_optimized`` with ClickHouse-native queries.

Strategy:
- Unfiltered dashboard queries read from the ``span_metrics_hourly``
  pre-aggregated table using ``sumMerge`` / ``quantilesMerge`` combinators.
- When attribute filters are present, falls back to scanning the
  denormalized ``spans`` table.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from tracer.services.clickhouse.query_builders.base import BaseQueryBuilder
from tracer.services.clickhouse.query_builders.filters import ClickHouseFilterBuilder


class TimeSeriesQueryBuilder(BaseQueryBuilder):
    """Build time-series metric queries for the dashboard.

    Returns all four metrics in a single query: latency, tokens, cost,
    and traffic.  The output format matches the dict returned by
    ``get_all_system_metrics()``::

        {
            "latency": [{"timestamp": "...", "value": 0, "latency": 0}, ...],
            "tokens":  [{"timestamp": "...", "value": 0, "tokens": 0}, ...],
            "cost":    [{"timestamp": "...", "value": 0, "cost": 0}, ...],
            "traffic": [{"timestamp": "...", "traffic": 0}, ...],
        }

    Args:
        project_id: Project UUID string.
        filters: Frontend filter list (may be empty).
        interval: Time bucket interval (``"hour"``, ``"day"``, ``"week"``,
            ``"month"``).
        system_metric_filters: Additional keyword filters (currently unused;
            reserved for future per-model breakdowns).
    """

    # Pre-aggregated table (AggregatingMergeTree)
    AGG_TABLE = "span_metrics_hourly"
    # Denormalized raw table (for filtered queries)
    RAW_TABLE = "spans"

    def __init__(
        self,
        project_id: str,
        filters: Optional[List[Dict]] = None,
        interval: str = "hour",
        system_metric_filters: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(project_id, **kwargs)
        self.filters = filters or []
        self.interval = interval
        self.system_metric_filters = system_metric_filters or {}
        self.start_date: Optional[datetime] = None
        self.end_date: Optional[datetime] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build(self) -> Tuple[str, Dict[str, Any]]:
        """Build the time-series query.

        Returns:
            A ``(query_string, params)`` tuple.
        """
        self.start_date, self.end_date = self.parse_time_range(self.filters)
        self.params["start_date"] = self.start_date
        self.params["end_date"] = self.end_date

        # Determine if we have attribute filters that prevent using the
        # pre-aggregated table.
        filter_builder = ClickHouseFilterBuilder(table=self.RAW_TABLE)
        extra_where, extra_params = filter_builder.translate(self.filters)
        self.params.update(extra_params)

        if extra_where:
            return self._build_raw_query(extra_where)
        else:
            return self._build_agg_query()

    def format_result(
        self,
        rows: List[Tuple],
        columns: List[str],
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Post-process raw ClickHouse rows into the standard response dict.

        Expected columns from the query:
        ``time_bucket, avg_latency, total_tokens, avg_cost, traffic_count``

        Args:
            rows: Rows returned by ClickHouse.
            columns: Column name list.

        Returns:
            Dict with keys ``latency``, ``tokens``, ``cost``, ``traffic``.
        """
        assert self.start_date is not None and self.end_date is not None

        # Build per-metric data lists
        latency_data: List[Dict[str, Any]] = []
        tokens_data: List[Dict[str, Any]] = []
        cost_data: List[Dict[str, Any]] = []
        traffic_data: List[Dict[str, Any]] = []

        for row in rows:
            # Support both dict rows (from execute_ch_query) and tuple rows
            if isinstance(row, dict):
                ts = row.get(
                    "time_bucket", row.get(columns[0] if columns else "time_bucket")
                )
                avg_lat = row.get("avg_latency", 0)
                total_tok = row.get("total_tokens", 0)
                avg_cst = row.get("avg_cost", 0)
                count = row.get("traffic_count", 0)
            else:
                ts = row[0]
                avg_lat = row[1] if len(row) > 1 else 0
                total_tok = row[2] if len(row) > 2 else 0
                avg_cst = row[3] if len(row) > 3 else 0
                count = row[4] if len(row) > 4 else 0
            ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

            latency_data.append(
                {
                    "timestamp": ts_str,
                    "value": round(avg_lat, 2) if avg_lat else 0,
                    "latency": round(avg_lat, 2) if avg_lat else 0,
                }
            )
            tokens_data.append(
                {
                    "timestamp": ts_str,
                    "value": round(total_tok, 2) if total_tok else 0,
                    "tokens": round(total_tok, 2) if total_tok else 0,
                }
            )
            cost_data.append(
                {
                    "timestamp": ts_str,
                    "value": round(avg_cst, 9) if avg_cst else 0,
                    "cost": round(avg_cst, 9) if avg_cst else 0,
                }
            )
            traffic_data.append(
                {
                    "timestamp": ts_str,
                    "traffic": count or 0,
                }
            )

        # Helper to extract values from dict or tuple rows
        def _get(r, key, idx, default=0):
            if isinstance(r, dict):
                return r.get(key, default)
            return r[idx] if len(r) > idx else default

        # Zero-fill missing buckets for each metric
        latency_data = self.format_time_series(
            rows=[(_get(r, "time_bucket", 0), _get(r, "avg_latency", 1)) for r in rows],
            columns=["time_bucket", "value", "latency"],
            interval=self.interval,
            start_date=self.start_date,
            end_date=self.end_date,
            value_keys=["value", "latency"],
        )
        tokens_data = self.format_time_series(
            rows=[
                (_get(r, "time_bucket", 0), _get(r, "total_tokens", 2)) for r in rows
            ],
            columns=["time_bucket", "value", "tokens"],
            interval=self.interval,
            start_date=self.start_date,
            end_date=self.end_date,
            value_keys=["value", "tokens"],
        )
        cost_data = self.format_time_series(
            rows=[(_get(r, "time_bucket", 0), _get(r, "avg_cost", 3)) for r in rows],
            columns=["time_bucket", "value", "cost"],
            interval=self.interval,
            start_date=self.start_date,
            end_date=self.end_date,
            value_keys=["value", "cost"],
        )
        traffic_data = self.format_time_series(
            rows=[
                (_get(r, "time_bucket", 0), _get(r, "traffic_count", 4)) for r in rows
            ],
            columns=["time_bucket", "traffic"],
            interval=self.interval,
            start_date=self.start_date,
            end_date=self.end_date,
            value_keys=["traffic"],
        )

        # Additional metrics: prompt_tokens, completion_tokens, error_rate
        prompt_tokens_data = self.format_time_series(
            rows=[
                (_get(r, "time_bucket", 0), _get(r, "prompt_tokens", 5)) for r in rows
            ],
            columns=["time_bucket", "value"],
            interval=self.interval,
            start_date=self.start_date,
            end_date=self.end_date,
            value_keys=["value"],
        )
        completion_tokens_data = self.format_time_series(
            rows=[
                (_get(r, "time_bucket", 0), _get(r, "completion_tokens", 6))
                for r in rows
            ],
            columns=["time_bucket", "value"],
            interval=self.interval,
            start_date=self.start_date,
            end_date=self.end_date,
            value_keys=["value"],
        )
        error_rate_data = self.format_time_series(
            rows=[(_get(r, "time_bucket", 0), _get(r, "error_rate", 7)) for r in rows],
            columns=["time_bucket", "value"],
            interval=self.interval,
            start_date=self.start_date,
            end_date=self.end_date,
            value_keys=["value"],
        )

        return {
            "latency": latency_data,
            "tokens": tokens_data,
            "cost": cost_data,
            "traffic": traffic_data,
            "prompt_tokens": prompt_tokens_data,
            "completion_tokens": completion_tokens_data,
            "input_tokens": prompt_tokens_data,
            "output_tokens": completion_tokens_data,
            "total_tokens": tokens_data,
            "error_rate": error_rate_data,
        }

    # ------------------------------------------------------------------
    # Private query builders
    # ------------------------------------------------------------------

    def _build_agg_query(self) -> Tuple[str, Dict[str, Any]]:
        """Build a query against the pre-aggregated ``span_metrics_hourly`` table.

        Uses ``sumMerge`` / ``quantilesMerge`` aggregate combinators
        to reconstruct metrics from the ``AggregatingMergeTree`` state.
        """
        bucket_fn = self.time_bucket_expr(self.interval)

        query = f"""
        SELECT
            {bucket_fn}(hour) AS time_bucket,
            (quantilesMerge(0.5, 0.90, 0.95, 0.99)(latency_quantile))[1]
                AS avg_latency,
            sum(total_tokens) AS total_tokens,
            sum(total_cost) / greatest(sum(span_count), 1)
                AS avg_cost,
            sum(span_count) AS traffic_count,
            sum(total_prompt_tokens) AS prompt_tokens,
            sum(total_completion_tokens) AS completion_tokens,
            sum(error_count) * 100.0 / greatest(sum(span_count), 1)
                AS error_rate
        FROM {self.AGG_TABLE}
        WHERE project_id = %(project_id)s
          AND hour >= %(start_date)s
          AND hour < %(end_date)s
        GROUP BY time_bucket
        ORDER BY time_bucket
        """
        return query, self.params

    def _build_raw_query(self, extra_where: str) -> Tuple[str, Dict[str, Any]]:
        """Build a query against the raw ``spans`` table with filters applied."""
        bucket_fn = self.time_bucket_expr(self.interval)

        query = f"""
        SELECT
            {bucket_fn}(start_time) AS time_bucket,
            avg(latency_ms) AS avg_latency,
            sum(total_tokens) AS total_tokens,
            avg(cost) AS avg_cost,
            count() AS traffic_count,
            sum(prompt_tokens) AS prompt_tokens,
            sum(completion_tokens) AS completion_tokens,
            countIf(status = 'ERROR') * 100.0 / greatest(count(), 1)
                AS error_rate
        FROM {self.RAW_TABLE}
        {self.project_where()}
          AND start_time >= %(start_date)s
          AND start_time < %(end_date)s
          AND {extra_where}
        GROUP BY time_bucket
        ORDER BY time_bucket
        """
        return query, self.params
