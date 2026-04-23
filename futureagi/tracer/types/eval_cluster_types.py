"""
Typed dataclasses for the eval clustering pipeline.

Mirrors scan_types.py — single source of truth for eval clustering.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ClusterableEvalResult:
    """Failing eval result with context needed for clustering."""

    eval_logger_id: str
    trace_id: str
    project_id: str
    eval_name: str  # CustomEvalConfig.name — partition key
    eval_config_id: str  # FK for TraceErrorGroup.eval_config
    explanation: str  # eval_explanation text — embedding input
    score: Optional[float] = None  # output_float if available

    @property
    def embedding_text(self) -> str:
        return self.explanation


@dataclass
class EvalClusteringSummary:
    """Result of an eval clustering run."""

    clustered: int = 0
    new_clusters: int = 0
    assigned: int = 0
