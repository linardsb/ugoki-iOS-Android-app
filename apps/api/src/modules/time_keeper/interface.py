from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from src.modules.time_keeper.models import TimeWindow, WindowType, WindowState


class TimeKeeperInterface(ABC):
    """
    TIME_KEEPER Module Interface (v1)

    Purpose: Manage all time-bounded windows (fasting, eating, workouts, recovery).

    This interface hides:
    - Timer implementation (setInterval, cron, database polling)
    - Storage mechanism (SQL, NoSQL, in-memory)
    - Time zone handling complexity
    - Offline sync logic
    - Conflict resolution algorithms

    Consumers never know:
    - Internal window_id format
    - Database schema
    - How "approaching end" detection works
    - Timezone conversion implementation
    """

    # =========================================================================
    # Window Lifecycle
    # =========================================================================

    @abstractmethod
    async def open_window(
        self,
        identity_id: str,
        window_type: WindowType,
        scheduled_end: datetime | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> TimeWindow:
        """
        Open a new time window.

        Args:
            identity_id: Opaque identity reference
            window_type: Type of window (fast, eating, workout, etc.)
            scheduled_end: Optional planned end time
            metadata: Optional module-specific data

        Returns:
            The created TimeWindow

        Raises:
            ConflictError: If a conflicting window is already open
        """
        pass

    @abstractmethod
    async def close_window(
        self,
        window_id: str,
        end_state: WindowState = WindowState.COMPLETED,
        metadata: dict[str, Any] | None = None,
    ) -> TimeWindow:
        """
        Close an active window.

        Args:
            window_id: Opaque window reference
            end_state: Final state (completed or abandoned)
            metadata: Optional additional metadata

        Returns:
            The closed TimeWindow

        Raises:
            NotFoundError: If window doesn't exist
            InvalidStateError: If window is not active
        """
        pass

    @abstractmethod
    async def extend_window(
        self,
        window_id: str,
        new_end: datetime,
    ) -> TimeWindow:
        """
        Extend an active window's scheduled end time.

        Args:
            window_id: Opaque window reference
            new_end: New scheduled end timestamp

        Returns:
            The updated TimeWindow

        Raises:
            NotFoundError: If window doesn't exist
            InvalidStateError: If window is not active
        """
        pass

    # =========================================================================
    # Window Queries
    # =========================================================================

    @abstractmethod
    async def get_active_window(
        self,
        identity_id: str,
        window_type: WindowType | None = None,
    ) -> TimeWindow | None:
        """
        Get currently active window for an identity.

        Args:
            identity_id: Opaque identity reference
            window_type: Optional filter by type (None = any type)

        Returns:
            Active TimeWindow or None if no active window
        """
        pass

    @abstractmethod
    async def get_window(self, window_id: str) -> TimeWindow | None:
        """
        Get a specific window by ID.

        Args:
            window_id: Opaque window reference

        Returns:
            TimeWindow if found, None otherwise
        """
        pass

    @abstractmethod
    async def get_windows(
        self,
        identity_id: str,
        window_type: WindowType | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[TimeWindow]:
        """
        Get windows for an identity with optional filters.

        Args:
            identity_id: Opaque identity reference
            window_type: Optional filter by type
            start_time: Optional filter by start time (after)
            end_time: Optional filter by end time (before)
            limit: Maximum results
            offset: Pagination offset

        Returns:
            List of matching TimeWindows
        """
        pass

    # =========================================================================
    # Utility Methods
    # =========================================================================

    @abstractmethod
    async def get_elapsed_time(self, window_id: str) -> int:
        """
        Get elapsed time in seconds for an active window.

        Args:
            window_id: Opaque window reference

        Returns:
            Elapsed seconds since window started

        Raises:
            NotFoundError: If window doesn't exist
        """
        pass

    @abstractmethod
    async def get_remaining_time(self, window_id: str) -> int | None:
        """
        Get remaining time in seconds until scheduled end.

        Args:
            window_id: Opaque window reference

        Returns:
            Remaining seconds, or None if no scheduled end

        Raises:
            NotFoundError: If window doesn't exist
        """
        pass
