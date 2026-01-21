"""FastAPI routes for AI_COACH module."""

import json
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import StreamingResponse
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
    ConversationSession,
    ConversationMessage,
    ConversationListResponse,
    StreamChatRequest,
    UpdateConversationRequest,
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


# ============ Streaming Chat Endpoints ============


@router.post("/stream")
@limiter.limit(RateLimits.AI_CHAT)
async def stream_chat(
    request: Request,
    chat_request: StreamChatRequest,
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> StreamingResponse:
    """
    Stream a chat response from the AI wellness coach.

    Returns Server-Sent Events (SSE) with JSON chunks:
    - `{"text": "partial...", "complete": false}`
    - First chunk of new conversation includes `session_id` and `conversation_title`
    - Final chunk has `{"text": "", "complete": true}`

    **Parameters:**
    - `query`: The user's message (required)
    - `session_id`: Continue existing conversation (optional, omit for new)
    - `personality`: Override personality for this message (optional)

    **Safety Filtering:**
    Messages are automatically checked for health-sensitive content.
    """
    async def event_generator():
        async for chunk in service.stream_chat(identity_id, chat_request):
            yield f"data: {chunk.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============ Conversation Management Endpoints ============


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_archived: bool = Query(False),
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> ConversationListResponse:
    """
    List all conversations for the current user.

    Conversations are ordered by last message time (newest first).
    """
    return await service.get_conversations(
        identity_id,
        limit=limit,
        offset=offset,
        include_archived=include_archived,
    )


@router.get("/conversations/{session_id}/messages", response_model=list[ConversationMessage])
async def get_conversation_messages(
    session_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> list[ConversationMessage]:
    """
    Get messages for a specific conversation.

    Messages are ordered by creation time (oldest first).
    """
    return await service.get_conversation_messages(
        identity_id,
        session_id,
        limit=limit,
        offset=offset,
    )


@router.patch("/conversations/{session_id}", response_model=ConversationSession)
async def update_conversation(
    session_id: str,
    update_request: UpdateConversationRequest,
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> ConversationSession:
    """
    Update a conversation's metadata (title, archived status).
    """
    result = await service.update_conversation(
        identity_id,
        session_id,
        title=update_request.title,
        is_archived=update_request.is_archived,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result


@router.delete("/conversations/{session_id}")
async def delete_conversation(
    session_id: str,
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> dict:
    """
    Delete a conversation and all its messages.

    This action is irreversible and supports GDPR data deletion requirements.
    """
    deleted = await service.delete_conversation(identity_id, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "ok", "deleted": True}


# ============ GDPR Export Endpoint ============


@router.get("/export")
async def export_coach_data(
    identity_id: str = Depends(get_current_identity),
    service: AICoachService = Depends(get_coach_service),
) -> dict:
    """
    Export all coach conversation data for the current user.

    Returns all conversations and messages in JSON format for GDPR compliance.
    """
    return await service.export_coach_data(identity_id)
