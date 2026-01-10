"""FastAPI routes for AI_COACH module."""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.core.auth import get_current_identity
from src.core.rate_limit import limiter, RateLimits
from src.modules.ai_coach.models import (
    ChatRequest,
    ChatResponse,
    CoachingInsight,
    UserContext,
    CoachPersonality,
)
from src.modules.ai_coach.service import AICoachService

router = APIRouter(tags=["ai-coach"])


def get_coach_service(db: AsyncSession = Depends(get_db)) -> AICoachService:
    return AICoachService(db)


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(RateLimits.AI_CHAT)
async def chat(
    request: Request,
    chat_request: ChatRequest,
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> ChatResponse:
    """
    Chat with the AI wellness coach.

    The coach has access to your fitness data and provides personalized:
    - Motivation and encouragement
    - Fasting advice and progress updates
    - Workout recommendations
    - General wellness guidance

    Optionally set a personality style for this message.

    **Safety Filtering:**
    Messages are automatically checked for health-sensitive content.
    - Medical conditions, allergies, medications → Redirected to healthcare professionals
    - The response will include `safety_redirected: true` if filtered
    - Emergency keywords trigger immediate safety response

    **Note:** This coach provides general wellness guidance only, not medical advice.
    """
    return await service.chat(identity_id, chat_request)


@router.get("/context", response_model=UserContext)
async def get_context(
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> UserContext:
    """
    Get the current user context.
    
    Returns aggregated data about the user's:
    - Level and XP
    - Current streaks
    - Active fast status
    - Workout statistics
    - Weight trend
    """
    return await service.get_user_context(identity_id)


@router.get("/insight", response_model=CoachingInsight)
@limiter.limit(RateLimits.AI_INSIGHT)
async def get_daily_insight(
    request: Request,
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> CoachingInsight:
    """
    Get a personalized daily insight or tip.
    
    Based on the user's current progress and activities,
    returns contextual advice about fasting, workouts, or motivation.
    """
    return await service.get_daily_insight(identity_id)


@router.get("/motivation", response_model=str)
async def get_motivation(
    context: str | None = Query(None, description="Optional context like 'completed fast'"),
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> str:
    """
    Get a quick motivational message.
    
    Optionally provide context for more relevant motivation:
    - "completed fast"
    - "completed workout"
    - "new streak"
    """
    return await service.get_motivation(identity_id, context)


@router.put("/personality")
async def set_personality(
    personality: CoachPersonality,
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> dict:
    """
    Set the coach personality style.
    
    Styles:
    - motivational: Energetic, encouraging ("You've got this!")
    - calm: Zen, mindful ("Be gentle with yourself")
    - tough: Drill sergeant ("No excuses!")
    - friendly: Casual, supportive friend
    """
    await service.set_personality(identity_id, personality)
    return {"status": "ok", "personality": personality}
