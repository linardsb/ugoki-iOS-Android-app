from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class WindowType(str, Enum):
    FAST = "fast"
    EATING = "eating"
    WORKOUT = "workout"
    RECOVERY = "recovery"


class WindowState(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TimeWindow(BaseModel):
    """
    Core TIME_WINDOW primitive.

    A bounded period with start, end, and state.
    Used for fasting sessions, eating windows, workouts, etc.
    """

    id: str = Field(..., description="Opaque window reference")
    identity_id: str = Field(..., description="Owner identity reference")
    start_time: datetime
    end_time: datetime | None = Field(None, description="None if window still open")
    scheduled_end: datetime | None = Field(None, description="Planned end time")
    window_type: WindowType
    state: WindowState
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class ConflictRule(BaseModel):
    """Rule defining how two window types interact."""

    window_type_a: WindowType
    window_type_b: WindowType
    conflict_type: str  # "mutual_exclusive", "parent_child", "independent"


# Request/Response models
class OpenWindowRequest(BaseModel):
    window_type: WindowType
    scheduled_end: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CloseWindowRequest(BaseModel):
    end_state: WindowState = WindowState.COMPLETED
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExtendWindowRequest(BaseModel):
    new_end: datetime
