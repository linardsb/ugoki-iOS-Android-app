from datetime import datetime, date, timedelta, UTC
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.progression.interface import ProgressionInterface
from src.modules.progression.models import (
    Streak,
    StreakType,
    XPTransaction,
    XPTransactionType,
    UserLevel,
    Achievement,
    AchievementType,
    UserAchievement,
    UserProgression,
    StreakResponse,
)
from src.modules.progression.orm import (
    StreakORM,
    XPTransactionORM,
    UserLevelORM,
    AchievementORM,
    UserAchievementORM,
)

if TYPE_CHECKING:
    from src.modules.event_journal.service import EventJournalService


class ProgressionService(ProgressionInterface):
    """Implementation of the Progression module."""

    # XP rewards for activities
    XP_REWARDS = {
        XPTransactionType.FAST_COMPLETED: 50,
        XPTransactionType.WORKOUT_COMPLETED: 75,
        XPTransactionType.WEIGHT_LOGGED: 10,
        XPTransactionType.DAILY_LOGIN: 5,
    }

    # Streak milestone bonuses (streak_count: bonus_xp)
    STREAK_BONUSES = {
        3: 25,
        7: 50,
        14: 100,
        30: 250,
        60: 500,
        90: 1000,
        180: 2500,
        365: 5000,
    }

    # Level titles
    LEVEL_TITLES = {
        1: "Beginner",
        5: "Apprentice",
        10: "Practitioner",
        15: "Dedicated",
        20: "Committed",
        25: "Warrior",
        30: "Champion",
        40: "Master",
        50: "Grandmaster",
        75: "Legend",
        100: "Transcendent",
    }

    def __init__(
        self,
        db: AsyncSession,
        event_journal: "EventJournalService | None" = None,
    ):
        self._db = db
        self._event_journal = event_journal

    # =========================================================================
    # Streaks
    # =========================================================================

    async def record_activity(
        self,
        identity_id: str,
        streak_type: StreakType,
        activity_date: date | None = None,
    ) -> StreakResponse:
        today = activity_date or date.today()
        streak = await self._get_or_create_streak(identity_id, streak_type)

        xp_earned = 0
        achievements_unlocked: list[Achievement] = []

        # Determine streak action based on last activity
        if streak.last_activity_date is None:
            # First activity ever - start streak
            streak.current_count = 1
            streak.started_at = datetime.now(UTC)
        elif streak.last_activity_date == today:
            # Already logged today - no change
            pass
        elif streak.last_activity_date == today - timedelta(days=1):
            # Consecutive day - increment streak
            streak.current_count += 1
        else:
            # Missed a day - reset streak
            streak.current_count = 1
            streak.started_at = datetime.now(UTC)

        streak.last_activity_date = today
        streak.longest_count = max(streak.longest_count, streak.current_count)

        # Update ORM
        await self._update_streak_orm(streak)

        # Award base XP for the activity
        xp_type = self._streak_to_xp_type(streak_type)
        if xp_type:
            base_xp = self.XP_REWARDS.get(xp_type, 10)
            xp_earned += base_xp
            await self._record_xp_transaction(
                identity_id, base_xp, xp_type,
                f"{streak_type.value} completed"
            )

        # Check for streak milestone bonuses
        if streak.current_count in self.STREAK_BONUSES:
            bonus = self.STREAK_BONUSES[streak.current_count]
            xp_earned += bonus
            await self._record_xp_transaction(
                identity_id, bonus, XPTransactionType.STREAK_BONUS,
                f"{streak.current_count}-day {streak_type.value} streak!"
            )

        # Update level and check for level up
        level_before = await self.get_level(identity_id)
        level_after = await self._recalculate_level(identity_id)
        level_up = level_after.current_level > level_before.current_level

        # Check achievements
        achievements_unlocked = await self.check_achievements(identity_id)

        # Record events
        await self._record_streak_event(
            identity_id=identity_id,
            streak_type=streak_type,
            current_count=streak.current_count,
            was_reset=(streak.current_count == 1 and streak.last_activity_date != today),
        )

        if level_up:
            await self._record_level_up_event(
                identity_id=identity_id,
                new_level=level_after.current_level,
                total_xp=level_after.total_xp_earned,
            )

        return StreakResponse(
            streak=streak,
            xp_earned=xp_earned,
            level_up=level_up,
            new_level=level_after.current_level if level_up else None,
            achievements_unlocked=achievements_unlocked,
        )

    async def get_streak(
        self,
        identity_id: str,
        streak_type: StreakType,
    ) -> Streak:
        return await self._get_or_create_streak(identity_id, streak_type)

    async def get_all_streaks(self, identity_id: str) -> list[Streak]:
        result = await self._db.execute(
            select(StreakORM).where(StreakORM.identity_id == identity_id)
        )
        streaks = [self._streak_to_model(orm) for orm in result.scalars()]

        # Ensure all streak types exist
        existing_types = {s.streak_type for s in streaks}
        for streak_type in StreakType:
            if streak_type not in existing_types:
                streak = await self._get_or_create_streak(identity_id, streak_type)
                streaks.append(streak)

        return streaks

    # =========================================================================
    # XP & Levels
    # =========================================================================

    async def award_xp(
        self,
        identity_id: str,
        amount: int,
        transaction_type: XPTransactionType,
        description: str | None = None,
        related_id: str | None = None,
    ) -> UserLevel:
        await self._record_xp_transaction(
            identity_id, amount, transaction_type, description, related_id
        )

        # Record XP event
        await self._record_xp_event(
            identity_id=identity_id,
            amount=amount,
            reason=description or transaction_type.value,
            related_id=related_id,
        )

        return await self._recalculate_level(identity_id)

    async def get_level(self, identity_id: str) -> UserLevel:
        result = await self._db.execute(
            select(UserLevelORM).where(UserLevelORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if not orm:
            # Create default level
            orm = UserLevelORM(
                identity_id=identity_id,
                current_level=1,
                current_xp=0,
                total_xp_earned=0,
            )
            self._db.add(orm)
            await self._db.flush()

        return self._level_to_model(orm)

    async def get_xp_history(
        self,
        identity_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[XPTransaction]:
        result = await self._db.execute(
            select(XPTransactionORM)
            .where(XPTransactionORM.identity_id == identity_id)
            .order_by(XPTransactionORM.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [self._xp_to_model(orm) for orm in result.scalars()]

    # =========================================================================
    # Achievements
    # =========================================================================

    async def get_achievements(
        self,
        include_hidden: bool = False,
    ) -> list[Achievement]:
        query = select(AchievementORM)
        if not include_hidden:
            query = query.where(AchievementORM.is_hidden == False)  # noqa: E712

        result = await self._db.execute(query)
        return [self._achievement_to_model(orm) for orm in result.scalars()]

    async def get_user_achievements(
        self,
        identity_id: str,
        unlocked_only: bool = False,
    ) -> list[UserAchievement]:
        # Get ALL achievements including hidden ones (UI will show them as locked)
        all_achievements = await self.get_achievements(include_hidden=True)

        # Get user's progress records
        progress_result = await self._db.execute(
            select(UserAchievementORM).where(
                UserAchievementORM.identity_id == identity_id
            )
        )

        # Create a map of achievement_id -> user progress
        progress_map = {
            orm.achievement_id: orm for orm in progress_result.scalars()
        }

        user_achievements = []

        for achievement in all_achievements:
            user_progress = progress_map.get(achievement.id)

            is_unlocked = user_progress.is_unlocked if user_progress else False
            progress = user_progress.progress if user_progress else 0
            unlocked_at = user_progress.unlocked_at if user_progress else None

            # Filter by unlocked_only if requested
            if unlocked_only and not is_unlocked:
                continue

            user_achievements.append(UserAchievement(
                id=user_progress.id if user_progress else f"pending_{achievement.id}",
                identity_id=identity_id,
                achievement_id=achievement.id,
                achievement=achievement,
                progress=progress,
                is_unlocked=is_unlocked,
                unlocked_at=unlocked_at or datetime.now(UTC),
            ))

        return user_achievements

    async def check_achievements(
        self,
        identity_id: str,
    ) -> list[Achievement]:
        """Check and unlock achievements based on current progress."""
        unlocked: list[Achievement] = []

        # Get all achievements
        all_achievements = await self.get_achievements(include_hidden=True)

        # Get user's current stats
        streaks = await self.get_all_streaks(identity_id)
        level = await self.get_level(identity_id)

        for achievement in all_achievements:
            # Check if already unlocked
            user_ach = await self._get_user_achievement(identity_id, achievement.id)
            if user_ach and user_ach.is_unlocked:
                continue

            # Check conditions based on achievement type
            progress = 0
            should_unlock = False

            if achievement.achievement_type == AchievementType.STREAK:
                # Check streak achievements
                for streak in streaks:
                    if streak.longest_count >= achievement.requirement_value:
                        should_unlock = True
                        progress = streak.longest_count
                        break
                    progress = max(progress, streak.longest_count)

            elif achievement.achievement_type == AchievementType.FASTING:
                # Check fasting streak specifically
                fasting_streak = next(
                    (s for s in streaks if s.streak_type == StreakType.FASTING), None
                )
                if fasting_streak:
                    progress = fasting_streak.longest_count
                    should_unlock = progress >= achievement.requirement_value

            # Update or create user achievement
            if user_ach:
                user_ach.progress = progress
                if should_unlock and not user_ach.is_unlocked:
                    user_ach.is_unlocked = True
                    user_ach.unlocked_at = datetime.now(UTC)
                    unlocked.append(achievement)
                    # Award XP
                    await self._record_xp_transaction(
                        identity_id, achievement.xp_reward,
                        XPTransactionType.ACHIEVEMENT_UNLOCKED,
                        f"Unlocked: {achievement.name}",
                        achievement.id,
                    )
                await self._update_user_achievement_orm(user_ach)
            elif progress > 0 or should_unlock:
                await self._create_user_achievement(
                    identity_id, achievement.id, progress, should_unlock
                )
                if should_unlock:
                    unlocked.append(achievement)
                    await self._record_xp_transaction(
                        identity_id, achievement.xp_reward,
                        XPTransactionType.ACHIEVEMENT_UNLOCKED,
                        f"Unlocked: {achievement.name}",
                        achievement.id,
                    )

        # Record achievement events
        for achievement in unlocked:
            await self._record_achievement_event(
                identity_id=identity_id,
                achievement=achievement,
            )

        return unlocked

    # =========================================================================
    # Overview
    # =========================================================================

    async def get_progression(self, identity_id: str) -> UserProgression:
        level = await self.get_level(identity_id)
        streaks = await self.get_all_streaks(identity_id)
        achievements = await self.get_user_achievements(identity_id, unlocked_only=True)
        total = len(await self.get_achievements(include_hidden=False))

        return UserProgression(
            identity_id=identity_id,
            level=level,
            streaks=streaks,
            recent_achievements=achievements[:5],
            total_achievements=total,
        )

    # =========================================================================
    # Private Helpers
    # =========================================================================

    def _xp_for_level(self, level: int) -> int:
        """Calculate XP required to reach a level."""
        # Formula: 100 * level^1.5
        return int(100 * (level ** 1.5))

    def _level_from_xp(self, total_xp: int) -> tuple[int, int, int]:
        """Calculate level, current XP, and XP for next level from total XP."""
        level = 1
        xp_used = 0

        while True:
            xp_for_next = self._xp_for_level(level + 1)
            if xp_used + xp_for_next > total_xp:
                break
            xp_used += xp_for_next
            level += 1

        current_xp = total_xp - xp_used
        xp_for_next = self._xp_for_level(level + 1)

        return level, current_xp, xp_for_next

    def _get_title(self, level: int) -> str:
        """Get title for a level."""
        title = "Beginner"
        for lvl, t in sorted(self.LEVEL_TITLES.items()):
            if level >= lvl:
                title = t
        return title

    def _streak_to_xp_type(self, streak_type: StreakType) -> XPTransactionType | None:
        """Map streak type to XP transaction type."""
        mapping = {
            StreakType.FASTING: XPTransactionType.FAST_COMPLETED,
            StreakType.WORKOUT: XPTransactionType.WORKOUT_COMPLETED,
            StreakType.LOGGING: XPTransactionType.WEIGHT_LOGGED,
            StreakType.APP_USAGE: XPTransactionType.DAILY_LOGIN,
        }
        return mapping.get(streak_type)

    async def _get_or_create_streak(
        self, identity_id: str, streak_type: StreakType
    ) -> Streak:
        result = await self._db.execute(
            select(StreakORM).where(
                StreakORM.identity_id == identity_id,
                StreakORM.streak_type == streak_type,
            )
        )
        orm = result.scalar_one_or_none()

        if not orm:
            orm = StreakORM(
                id=str(uuid4()),
                identity_id=identity_id,
                streak_type=streak_type,
                current_count=0,
                longest_count=0,
            )
            self._db.add(orm)
            await self._db.flush()

        return self._streak_to_model(orm)

    async def _update_streak_orm(self, streak: Streak) -> None:
        result = await self._db.execute(
            select(StreakORM).where(StreakORM.id == streak.id)
        )
        orm = result.scalar_one()
        orm.current_count = streak.current_count
        orm.longest_count = streak.longest_count
        orm.last_activity_date = streak.last_activity_date
        orm.started_at = streak.started_at
        await self._db.flush()

    async def _record_xp_transaction(
        self,
        identity_id: str,
        amount: int,
        transaction_type: XPTransactionType,
        description: str | None = None,
        related_id: str | None = None,
    ) -> None:
        orm = XPTransactionORM(
            id=str(uuid4()),
            identity_id=identity_id,
            amount=amount,
            transaction_type=transaction_type,
            description=description,
            related_id=related_id,
            created_at=datetime.now(UTC),
        )
        self._db.add(orm)
        await self._db.flush()

    async def _recalculate_level(self, identity_id: str) -> UserLevel:
        # Get total XP
        result = await self._db.execute(
            select(func.sum(XPTransactionORM.amount)).where(
                XPTransactionORM.identity_id == identity_id
            )
        )
        total_xp = result.scalar() or 0

        level, current_xp, xp_for_next = self._level_from_xp(total_xp)

        # Update or create level record
        result = await self._db.execute(
            select(UserLevelORM).where(UserLevelORM.identity_id == identity_id)
        )
        orm = result.scalar_one_or_none()

        if orm:
            orm.current_level = level
            orm.current_xp = current_xp
            orm.total_xp_earned = total_xp
        else:
            orm = UserLevelORM(
                identity_id=identity_id,
                current_level=level,
                current_xp=current_xp,
                total_xp_earned=total_xp,
            )
            self._db.add(orm)

        await self._db.flush()
        return self._level_to_model(orm)

    async def _get_user_achievement(
        self, identity_id: str, achievement_id: str
    ) -> UserAchievement | None:
        result = await self._db.execute(
            select(UserAchievementORM).where(
                UserAchievementORM.identity_id == identity_id,
                UserAchievementORM.achievement_id == achievement_id,
            )
        )
        orm = result.scalar_one_or_none()
        if not orm:
            return None

        return UserAchievement(
            id=orm.id,
            identity_id=orm.identity_id,
            achievement_id=orm.achievement_id,
            progress=orm.progress,
            is_unlocked=orm.is_unlocked,
            unlocked_at=orm.unlocked_at or datetime.now(UTC),
        )

    async def _create_user_achievement(
        self,
        identity_id: str,
        achievement_id: str,
        progress: int,
        is_unlocked: bool,
    ) -> None:
        orm = UserAchievementORM(
            id=str(uuid4()),
            identity_id=identity_id,
            achievement_id=achievement_id,
            progress=progress,
            is_unlocked=is_unlocked,
            unlocked_at=datetime.now(UTC) if is_unlocked else None,
        )
        self._db.add(orm)
        await self._db.flush()

    async def _update_user_achievement_orm(self, user_ach: UserAchievement) -> None:
        result = await self._db.execute(
            select(UserAchievementORM).where(UserAchievementORM.id == user_ach.id)
        )
        orm = result.scalar_one()
        orm.progress = user_ach.progress
        orm.is_unlocked = user_ach.is_unlocked
        orm.unlocked_at = user_ach.unlocked_at
        await self._db.flush()

    # Model converters
    def _streak_to_model(self, orm: StreakORM) -> Streak:
        def ensure_tz(dt: datetime | None) -> datetime | None:
            if dt is None:
                return None
            return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt

        return Streak(
            id=orm.id,
            identity_id=orm.identity_id,
            streak_type=orm.streak_type,
            current_count=orm.current_count,
            longest_count=orm.longest_count,
            last_activity_date=orm.last_activity_date,
            started_at=ensure_tz(orm.started_at),
            created_at=ensure_tz(orm.created_at) or datetime.now(UTC),
            updated_at=ensure_tz(orm.updated_at) or datetime.now(UTC),
        )

    def _xp_to_model(self, orm: XPTransactionORM) -> XPTransaction:
        created = orm.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=UTC)

        return XPTransaction(
            id=orm.id,
            identity_id=orm.identity_id,
            amount=orm.amount,
            transaction_type=orm.transaction_type,
            description=orm.description,
            related_id=orm.related_id,
            created_at=created or datetime.now(UTC),
        )

    def _level_to_model(self, orm: UserLevelORM) -> UserLevel:
        level, current_xp, xp_for_next = self._level_from_xp(orm.total_xp_earned)
        progress = (current_xp / xp_for_next * 100) if xp_for_next > 0 else 0

        return UserLevel(
            identity_id=orm.identity_id,
            current_level=level,
            current_xp=current_xp,
            xp_for_next_level=xp_for_next,
            xp_progress_percent=round(progress, 1),
            total_xp_earned=orm.total_xp_earned,
            title=self._get_title(level),
        )

    def _achievement_to_model(self, orm: AchievementORM) -> Achievement:
        return Achievement(
            id=orm.id,
            name=orm.name,
            description=orm.description,
            achievement_type=orm.achievement_type,
            xp_reward=orm.xp_reward,
            icon=orm.icon,
            requirement_value=orm.requirement_value,
            is_hidden=orm.is_hidden,
        )

    # =========================================================================
    # Event Journal Integration
    # =========================================================================

    async def _record_streak_event(
        self,
        identity_id: str,
        streak_type: StreakType,
        current_count: int,
        was_reset: bool,
    ) -> None:
        """Record a streak event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        event_type = EventType.STREAK_RESET if was_reset else EventType.STREAK_INCREMENTED

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=event_type,
            source=EventSource.API,
            metadata={
                "streak_type": streak_type.value,
                "current_count": current_count,
            },
        )

    async def _record_xp_event(
        self,
        identity_id: str,
        amount: int,
        reason: str,
        related_id: str | None = None,
    ) -> None:
        """Record an XP earned event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=EventType.XP_EARNED,
            related_id=related_id,
            source=EventSource.API,
            metadata={
                "amount": amount,
                "reason": reason,
            },
        )

    async def _record_level_up_event(
        self,
        identity_id: str,
        new_level: int,
        total_xp: int,
    ) -> None:
        """Record a level up event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=EventType.LEVEL_UP,
            source=EventSource.API,
            metadata={
                "new_level": new_level,
                "total_xp": total_xp,
                "title": self._get_title(new_level),
            },
        )

    async def _record_achievement_event(
        self,
        identity_id: str,
        achievement: Achievement,
    ) -> None:
        """Record an achievement unlocked event in the event journal."""
        if not self._event_journal:
            return

        from src.modules.event_journal.models import EventType, EventSource

        await self._event_journal.record_event(
            identity_id=identity_id,
            event_type=EventType.ACHIEVEMENT_UNLOCKED,
            related_id=achievement.id,
            related_type="achievement",
            source=EventSource.API,
            metadata={
                "achievement_name": achievement.name,
                "achievement_type": achievement.achievement_type.value,
                "xp_reward": achievement.xp_reward,
            },
        )
