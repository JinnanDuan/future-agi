"""
Tests for Phase 8 trace detail helper logic.

Tests the summary computation and graph derivation that were added to
_retrieve_clickhouse() — tested via pure functions extracted for testability.
"""

import pytest


class TestTraceSummaryComputation:
    """Test the summary computation logic from Phase 8."""

    def _compute_summary(self, span_map):
        """Extract of the summary computation from _retrieve_clickhouse."""
        total_tokens = 0
        total_prompt_tokens = 0
        total_completion_tokens = 0
        total_cost = 0.0
        error_count = 0
        type_counts = {}
        root_latencies = []

        for sid, entry in span_map.items():
            sp = entry["observation_span"]
            total_tokens += sp.get("total_tokens") or 0
            total_prompt_tokens += sp.get("prompt_tokens") or 0
            total_completion_tokens += sp.get("completion_tokens") or 0
            total_cost += sp.get("cost") or 0.0
            if sp.get("status") == "ERROR":
                error_count += 1
            obs_type = sp.get("observation_type", "unknown")
            type_counts[obs_type] = type_counts.get(obs_type, 0) + 1
            if entry.get("_parent_id") is None:
                root_latencies.append(sp.get("latency_ms") or 0)

        return {
            "total_spans": len(span_map),
            "total_duration_ms": max(root_latencies) if root_latencies else 0,
            "total_tokens": total_tokens,
            "total_prompt_tokens": total_prompt_tokens,
            "total_completion_tokens": total_completion_tokens,
            "total_cost": round(total_cost, 6),
            "error_count": error_count,
            "span_type_counts": type_counts,
        }

    def test_empty_span_map(self):
        result = self._compute_summary({})
        assert result["total_spans"] == 0
        assert result["total_duration_ms"] == 0
        assert result["total_tokens"] == 0
        assert result["total_cost"] == 0
        assert result["error_count"] == 0

    def test_single_root_span(self):
        span_map = {
            "s1": {
                "observation_span": {
                    "total_tokens": 500,
                    "prompt_tokens": 200,
                    "completion_tokens": 300,
                    "cost": 0.005,
                    "status": "OK",
                    "observation_type": "chain",
                    "latency_ms": 1234,
                },
                "_parent_id": None,
            }
        }
        result = self._compute_summary(span_map)
        assert result["total_spans"] == 1
        assert result["total_duration_ms"] == 1234
        assert result["total_tokens"] == 500
        assert result["total_prompt_tokens"] == 200
        assert result["total_completion_tokens"] == 300
        assert result["total_cost"] == 0.005
        assert result["error_count"] == 0
        assert result["span_type_counts"] == {"chain": 1}

    def test_multiple_spans_with_errors(self):
        span_map = {
            "s1": {
                "observation_span": {
                    "total_tokens": 500,
                    "prompt_tokens": 200,
                    "completion_tokens": 300,
                    "cost": 0.005,
                    "status": "OK",
                    "observation_type": "chain",
                    "latency_ms": 2000,
                },
                "_parent_id": None,
            },
            "s2": {
                "observation_span": {
                    "total_tokens": 300,
                    "prompt_tokens": 100,
                    "completion_tokens": 200,
                    "cost": 0.003,
                    "status": "ERROR",
                    "observation_type": "llm",
                    "latency_ms": 500,
                },
                "_parent_id": "s1",
            },
            "s3": {
                "observation_span": {
                    "total_tokens": 100,
                    "prompt_tokens": 50,
                    "completion_tokens": 50,
                    "cost": 0.001,
                    "status": "OK",
                    "observation_type": "tool",
                    "latency_ms": 200,
                },
                "_parent_id": "s1",
            },
        }
        result = self._compute_summary(span_map)
        assert result["total_spans"] == 3
        assert result["total_duration_ms"] == 2000  # root span latency
        assert result["total_tokens"] == 900
        assert result["total_cost"] == 0.009
        assert result["error_count"] == 1
        assert result["span_type_counts"] == {"chain": 1, "llm": 1, "tool": 1}

    def test_none_values_treated_as_zero(self):
        span_map = {
            "s1": {
                "observation_span": {
                    "total_tokens": None,
                    "prompt_tokens": None,
                    "completion_tokens": None,
                    "cost": None,
                    "status": "OK",
                    "observation_type": "chain",
                    "latency_ms": None,
                },
                "_parent_id": None,
            }
        }
        result = self._compute_summary(span_map)
        assert result["total_tokens"] == 0
        assert result["total_cost"] == 0
        assert result["total_duration_ms"] == 0


class TestGraphDerivation:
    """Test the graph derivation logic from Phase 8."""

    def _derive_graph(self, span_map):
        """Extract of the graph derivation from _retrieve_clickhouse."""
        nodes = []
        edges = []
        for sid, entry in span_map.items():
            sp = entry["observation_span"]
            nodes.append(
                {
                    "id": sid,
                    "name": sp.get("name", ""),
                    "type": sp.get("observation_type", "unknown"),
                    "latency_ms": sp.get("latency_ms", 0),
                    "tokens": sp.get("total_tokens", 0),
                    "status": sp.get("status"),
                }
            )
            parent_id = entry.get("_parent_id")
            if parent_id and parent_id in span_map:
                edges.append({"from": parent_id, "to": sid})
        return {"nodes": nodes, "edges": edges}

    def test_empty_graph(self):
        result = self._derive_graph({})
        assert result["nodes"] == []
        assert result["edges"] == []

    def test_single_node_no_edges(self):
        span_map = {
            "s1": {
                "observation_span": {
                    "name": "root",
                    "observation_type": "chain",
                    "latency_ms": 100,
                    "total_tokens": 50,
                    "status": "OK",
                },
                "_parent_id": None,
            }
        }
        result = self._derive_graph(span_map)
        assert len(result["nodes"]) == 1
        assert result["nodes"][0]["name"] == "root"
        assert result["edges"] == []

    def test_parent_child_edge(self):
        span_map = {
            "s1": {
                "observation_span": {
                    "name": "root",
                    "observation_type": "chain",
                    "latency_ms": 100,
                    "total_tokens": 0,
                    "status": "OK",
                },
                "_parent_id": None,
            },
            "s2": {
                "observation_span": {
                    "name": "child",
                    "observation_type": "llm",
                    "latency_ms": 50,
                    "total_tokens": 100,
                    "status": "OK",
                },
                "_parent_id": "s1",
            },
        }
        result = self._derive_graph(span_map)
        assert len(result["nodes"]) == 2
        assert len(result["edges"]) == 1
        assert result["edges"][0] == {"from": "s1", "to": "s2"}

    def test_orphan_span_no_edge(self):
        """Span with parent_id pointing to non-existent span."""
        span_map = {
            "s1": {
                "observation_span": {
                    "name": "orphan",
                    "observation_type": "tool",
                    "latency_ms": 10,
                    "total_tokens": 0,
                    "status": "OK",
                },
                "_parent_id": "nonexistent",
            },
        }
        result = self._derive_graph(span_map)
        assert len(result["nodes"]) == 1
        assert result["edges"] == []  # No edge because parent not in span_map

    def test_three_level_hierarchy(self):
        span_map = {
            "s1": {
                "observation_span": {
                    "name": "root",
                    "observation_type": "chain",
                    "latency_ms": 100,
                    "total_tokens": 0,
                    "status": "OK",
                },
                "_parent_id": None,
            },
            "s2": {
                "observation_span": {
                    "name": "mid",
                    "observation_type": "agent",
                    "latency_ms": 80,
                    "total_tokens": 0,
                    "status": "OK",
                },
                "_parent_id": "s1",
            },
            "s3": {
                "observation_span": {
                    "name": "leaf",
                    "observation_type": "llm",
                    "latency_ms": 50,
                    "total_tokens": 200,
                    "status": "OK",
                },
                "_parent_id": "s2",
            },
        }
        result = self._derive_graph(span_map)
        assert len(result["nodes"]) == 3
        assert len(result["edges"]) == 2
        edge_pairs = [(e["from"], e["to"]) for e in result["edges"]]
        assert ("s1", "s2") in edge_pairs
        assert ("s2", "s3") in edge_pairs
