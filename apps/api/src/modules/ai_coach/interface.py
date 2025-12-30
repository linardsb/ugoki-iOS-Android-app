"""Abstract interface for AI_COACH module."""

from abc import ABC, abstractmethod

from src.modules.ai_coach.models import (
    ChatRequest,
    ChatResponse,
    CoachingInsight,
    UserContext,
    CoachPersonality,
)


class AICoachInterface(ABC):
    """
    AI_COACH module interface.
    
    Provides AI-powered wellness coaching using LLM agents.
    """

    @abstractmethod
    async def chat(
        self,
        identity_id: str,
        request: ChatRequest,
    ) -> ChatResponse:
        """
        Chat with the AI coach.
        
        The coach has access to user's fitness data and can provide
        personalized advice, motivation, and recommendations.
        """
        pass

    @abstractmethod
    async def get_user_context(self, identity_id: str) -> UserContext:
        """
        Get the current context for a user.
        
        Aggregates data from other modules for personalized coaching.
        """
        pass

    @abstractmethod
    async def get_daily_insight(self, identity_id: str) -> CoachingInsight:
        """
        Get a personalized daily insight/tip.
        
        Based on user's current progress and goals.
        """
        pass

    @abstractmethod
    async def get_motivation(
        self,
        identity_id: str,
        context: str | None = None,
    ) -> str:
        """
        Get a motivational message.
        
        Optionally provide context (e.g., "just completed fast").
        """
        pass

    @abstractmethod
    async def set_personality(
        self,
        identity_id: str,
        personality: CoachPersonality,
    ) -> None:
        """Set the coach personality for a user."""
        pass
