"""Pydantic models for AI_COACH module."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    """Role in a chat conversation."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class CoachPersonality(str, Enum):
    """Coach personality styles."""
    MOTIVATIONAL = "motivational"  # Energetic, encouraging
    CALM = "calm"                  # Zen, mindful approach
    TOUGH = "tough"                # Drill sergeant style
    FRIENDLY = "friendly"          # Casual, supportive friend


class ChatMessage(BaseModel):
    """A single chat message."""
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConversationContext(BaseModel):
    """Context for the AI coach conversation."""
    identity_id: str
    messages: list[ChatMessage] = []
    personality: CoachPersonality = CoachPersonality.MOTIVATIONAL


class CoachResponse(BaseModel):
    """Response from the AI coach."""
    message: str
    suggestions: list[str] = []  # Quick action suggestions
    workout_recommendation: str | None = None
    encouragement: str | None = None


class UserContext(BaseModel):
    """User context for personalized coaching."""
    identity_id: str
    current_level: int = 1
    total_xp: int = 0
    
    # Streaks
    fasting_streak: int = 0
    workout_streak: int = 0
    
    # Recent activity
    active_fast: bool = False
    fast_elapsed_hours: float | None = None
    fast_target_hours: float | None = None
    
    last_workout_date: str | None = None
    workouts_this_week: int = 0
    
    # Weight tracking
    current_weight: float | None = None
    weight_trend: str | None = None  # "up", "down", "stable"
    
    # Preferences
    personality: CoachPersonality = CoachPersonality.MOTIVATIONAL


class QuickAction(BaseModel):
    """A quick action the user can take."""
    label: str
    action: str  # e.g., "start_fast", "start_workout", "log_weight"
    description: str | None = None


class CoachingInsight(BaseModel):
    """An insight or tip from the coach."""
    title: str
    content: str
    category: str  # "fasting", "workout", "nutrition", "motivation"
    priority: int = 0  # Higher = more important


# Request/Response models
class ChatRequest(BaseModel):
    """Request to chat with the coach."""
    message: str
    personality: CoachPersonality | None = None


class ChatResponse(BaseModel):
    """Full chat response."""
    response: CoachResponse
    context_summary: str | None = None
    quick_actions: list[QuickAction] = []
    safety_redirected: bool = False  # True if response was safety-filtered
