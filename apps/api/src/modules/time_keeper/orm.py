from datetime import datetime

from sqlalchemy import String, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin
from src.modules.time_keeper.models import WindowType, WindowState


class TimeWindowORM(Base, TimestampMixin):
    """Database model for TimeWindow - hidden from interface consumers."""

    __tablename__ = "time_windows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    window_type: Mapped[WindowType] = mapped_column(
        SQLEnum(WindowType), nullable=False, index=True
    )
    state: Mapped[WindowState] = mapped_column(
        SQLEnum(WindowState), nullable=False, index=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    window_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
