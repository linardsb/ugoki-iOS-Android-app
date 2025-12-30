from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.modules.progression.models import (
    Streak,
    StreakType,
    XPTransaction,
    XPTransactionType,
    UserLevel,
    Achievement,
    UserAchievement,
    UserProgression,
    RecordActivityRequest,
    AwardXPRequest,
    StreakResponse,
)
from src.modules.progression.service import ProgressionService
from src.modules.event_journal.service import EventJournalService

router = APIRouter(tags=["progression"])


def get_event_journal_service(db: AsyncSession = Depends(get_db)) -> EventJournalService:
    return EventJournalService(db)


def get_progression_service(
    db: AsyncSession = Depends(get_db),
    event_journal: EventJournalService = Depends(get_event_journal_service),
) -> ProgressionService:
    return ProgressionService(db, event_journal=event_journal)


# =========================================================================
# Streaks
# =========================================================================

@router.post("/activity", response_model=StreakResponse, status_code=status.HTTP_201_CREATED)
async def record_activity(
    identity_id: str,  # TODO: Extract from JWT
    request: RecordActivityRequest,
    service: ProgressionService = Depends(get_progression_service),
) -> StreakResponse:
    """
    Record an activity that contributes to a streak.

    This automatically:
    - Updates the streak count
    - Awards XP for the activity
    - Checks for streak milestone bonuses
    - Unlocks any earned achievements
    """
    return await service.record_activity(
        identity_id=identity_id,
        streak_type=request.streak_type,
        activity_date=request.activity_date,
    )


@router.get("/streaks", response_model=list[Streak])
async def get_all_streaks(
    identity_id: str,  # TODO: Extract from JWT
    service: ProgressionService = Depends(get_progression_service),
) -> list[Streak]:
    """Get all streaks for the user."""
    return await service.get_all_streaks(identity_id)


@router.get("/streaks/{streak_type}", response_model=Streak)
async def get_streak(
    identity_id: str,  # TODO: Extract from JWT
    streak_type: StreakType,
    service: ProgressionService = Depends(get_progression_service),
) -> Streak:
    """Get a specific streak by type."""
    return await service.get_streak(identity_id, streak_type)


# =========================================================================
# XP & Levels
# =========================================================================

@router.get("/level", response_model=UserLevel)
async def get_level(
    identity_id: str,  # TODO: Extract from JWT
    service: ProgressionService = Depends(get_progression_service),
) -> UserLevel:
    """
    Get user's current level and XP status.

    Returns:
    - Current level and title
    - XP progress toward next level
    - Total XP earned
    """
    return await service.get_level(identity_id)


@router.post("/xp", response_model=UserLevel, status_code=status.HTTP_201_CREATED)
async def award_xp(
    identity_id: str,  # TODO: Extract from JWT
    request: AwardXPRequest,
    service: ProgressionService = Depends(get_progression_service),
) -> UserLevel:
    """
    Manually award XP to a user.

    Use this for special rewards, admin grants, etc.
    """
    return await service.award_xp(
        identity_id=identity_id,
        amount=request.amount,
        transaction_type=request.transaction_type,
        description=request.description,
        related_id=request.related_id,
    )


@router.get("/xp/history", response_model=list[XPTransaction])
async def get_xp_history(
    identity_id: str,  # TODO: Extract from JWT
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    service: ProgressionService = Depends(get_progression_service),
) -> list[XPTransaction]:
    """Get XP transaction history."""
    return await service.get_xp_history(identity_id, limit, offset)


# =========================================================================
# Achievements
# =========================================================================

@router.get("/achievements", response_model=list[Achievement])
async def get_achievements(
    include_hidden: bool = Query(False),
    service: ProgressionService = Depends(get_progression_service),
) -> list[Achievement]:
    """Get all available achievements."""
    return await service.get_achievements(include_hidden)


@router.get("/achievements/mine", response_model=list[UserAchievement])
async def get_user_achievements(
    identity_id: str,  # TODO: Extract from JWT
    unlocked_only: bool = Query(False),
    service: ProgressionService = Depends(get_progression_service),
) -> list[UserAchievement]:
    """Get user's achievements with progress."""
    return await service.get_user_achievements(identity_id, unlocked_only)


@router.post("/achievements/check", response_model=list[Achievement])
async def check_achievements(
    identity_id: str,  # TODO: Extract from JWT
    service: ProgressionService = Depends(get_progression_service),
) -> list[Achievement]:
    """
    Check and unlock any earned achievements.

    Returns list of newly unlocked achievements.
    """
    return await service.check_achievements(identity_id)


# =========================================================================
# Overview
# =========================================================================

@router.get("/overview", response_model=UserProgression)
async def get_progression(
    identity_id: str,  # TODO: Extract from JWT
    service: ProgressionService = Depends(get_progression_service),
) -> UserProgression:
    """
    Get complete progression overview.

    Includes:
    - Level and XP status
    - All streaks
    - Recent achievements
    """
    return await service.get_progression(identity_id)
