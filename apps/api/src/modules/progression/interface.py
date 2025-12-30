from abc import ABC, abstractmethod
from datetime import date

from src.modules.progression.models import (
    Streak,
    StreakType,
    XPTransaction,
    XPTransactionType,
    UserLevel,
    Achievement,
    UserAchievement,
    UserProgression,
    StreakResponse,
)


class ProgressionInterface(ABC):
    """
    PROGRESSION Module Interface (v1)

    Purpose: Track streaks, XP, levels, and achievements.

    This interface hides:
    - XP calculation formulas
    - Level thresholds
    - Streak reset logic
    - Achievement unlock conditions

    Consumers never know:
    - Internal ID formats
    - Database schema
    - How bonuses are calculated
    """

    # =========================================================================
    # Streaks
    # =========================================================================

    @abstractmethod
    async def record_activity(
        self,
        identity_id: str,
        streak_type: StreakType,
        activity_date: date | None = None,
    ) -> StreakResponse:
        """
        Record an activity that contributes to a streak.

        Automatically:
        - Increments streak if consecutive day
        - Resets streak if day was missed
        - Awards XP for the activity
        - Awards bonus XP for streak milestones
        - Checks for achievement unlocks

        Args:
            identity_id: Opaque identity reference
            streak_type: Type of streak
            activity_date: Date of activity (defaults to today)

        Returns:
            StreakResponse with updated streak and any rewards
        """
        pass

    @abstractmethod
    async def get_streak(
        self,
        identity_id: str,
        streak_type: StreakType,
    ) -> Streak:
        """
        Get current streak for a type.

        Args:
            identity_id: Opaque identity reference
            streak_type: Type of streak

        Returns:
            Current Streak (creates if doesn't exist)
        """
        pass

    @abstractmethod
    async def get_all_streaks(self, identity_id: str) -> list[Streak]:
        """
        Get all streaks for a user.

        Args:
            identity_id: Opaque identity reference

        Returns:
            List of all Streaks
        """
        pass

    # =========================================================================
    # XP & Levels
    # =========================================================================

    @abstractmethod
    async def award_xp(
        self,
        identity_id: str,
        amount: int,
        transaction_type: XPTransactionType,
        description: str | None = None,
        related_id: str | None = None,
    ) -> UserLevel:
        """
        Award XP to a user.

        Args:
            identity_id: Opaque identity reference
            amount: XP amount to award
            transaction_type: Reason for XP
            description: Optional description
            related_id: Optional related entity ID

        Returns:
            Updated UserLevel (may include level up)
        """
        pass

    @abstractmethod
    async def get_level(self, identity_id: str) -> UserLevel:
        """
        Get user's current level and XP.

        Args:
            identity_id: Opaque identity reference

        Returns:
            UserLevel with current stats
        """
        pass

    @abstractmethod
    async def get_xp_history(
        self,
        identity_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[XPTransaction]:
        """
        Get XP transaction history.

        Args:
            identity_id: Opaque identity reference
            limit: Maximum results
            offset: Pagination offset

        Returns:
            List of XPTransactions
        """
        pass

    # =========================================================================
    # Achievements
    # =========================================================================

    @abstractmethod
    async def get_achievements(
        self,
        include_hidden: bool = False,
    ) -> list[Achievement]:
        """
        Get all available achievements.

        Args:
            include_hidden: Include hidden achievements

        Returns:
            List of Achievements
        """
        pass

    @abstractmethod
    async def get_user_achievements(
        self,
        identity_id: str,
        unlocked_only: bool = False,
    ) -> list[UserAchievement]:
        """
        Get user's achievement progress.

        Args:
            identity_id: Opaque identity reference
            unlocked_only: Only return unlocked achievements

        Returns:
            List of UserAchievements with progress
        """
        pass

    @abstractmethod
    async def check_achievements(
        self,
        identity_id: str,
    ) -> list[Achievement]:
        """
        Check and unlock any earned achievements.

        Args:
            identity_id: Opaque identity reference

        Returns:
            List of newly unlocked Achievements
        """
        pass

    # =========================================================================
    # Overview
    # =========================================================================

    @abstractmethod
    async def get_progression(self, identity_id: str) -> UserProgression:
        """
        Get complete progression overview.

        Args:
            identity_id: Opaque identity reference

        Returns:
            UserProgression with level, streaks, achievements
        """
        pass
