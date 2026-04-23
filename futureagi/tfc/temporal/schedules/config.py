"""
Schedule configuration dataclass.

This module provides the ScheduleConfig dataclass used to define
Temporal schedules across all domains (model_hub, tracer, simulate, etc.).
"""

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Optional

from temporalio.client import ScheduleOverlapPolicy


@dataclass
class ScheduleConfig:
    """
    Configuration for a Temporal schedule.

    This is a general-purpose configuration that can be used by any domain
    to define recurring scheduled tasks.

    Attributes:
        schedule_id: Unique identifier for the schedule
        activity_name: Name of the activity to execute
        interval_seconds: How often to run (in seconds)
        queue: Task queue to run on (default: "default")
        description: Human-readable description
        overlap_policy: What to do if previous run is still running:
            - SKIP: Skip this trigger if previous is running (default, prevents overlap)
            - BUFFER_ONE: Buffer one pending run
            - ALLOW_ALL: Allow concurrent runs
    """

    schedule_id: str
    activity_name: str
    interval_seconds: int
    queue: str = "default"
    description: Optional[str] = None
    overlap_policy: ScheduleOverlapPolicy = field(default=ScheduleOverlapPolicy.SKIP)

    @property
    def interval(self) -> timedelta:
        """Get interval as timedelta."""
        return timedelta(seconds=self.interval_seconds)


__all__ = ["ScheduleConfig"]
