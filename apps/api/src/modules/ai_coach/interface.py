"""Abstract interface for AI_COACH module."""

from abc import ABC, abstractmethod
from typing import AsyncIterator

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
    StreamChunk,
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

    # ============ Conversation Management ============

    @abstractmethod
    async def create_conversation(
        self,
        identity_id: str,
        title: str | None = None,
    ) -> ConversationSession:
        """Create a new conversation session."""
        pass

    @abstractmethod
    async def get_conversations(
        self,
        identity_id: str,
        limit: int = 20,
        offset: int = 0,
        include_archived: bool = False,
    ) -> ConversationListResponse:
        """Get list of conversations for a user."""
        pass

    @abstractmethod
    async def get_conversation_messages(
        self,
        identity_id: str,
        session_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ConversationMessage]:
        """Get messages for a specific conversation."""
        pass

    @abstractmethod
    async def delete_conversation(
        self,
        identity_id: str,
        session_id: str,
    ) -> bool:
        """Delete a conversation and all its messages (GDPR compliant)."""
        pass

    @abstractmethod
    async def update_conversation(
        self,
        identity_id: str,
        session_id: str,
        title: str | None = None,
        is_archived: bool | None = None,
    ) -> ConversationSession | None:
        """Update a conversation's metadata."""
        pass

    # ============ Streaming Chat ============

    @abstractmethod
    async def stream_chat(
        self,
        identity_id: str,
        request: StreamChatRequest,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream a chat response from the AI coach.

        Yields StreamChunk objects with text and metadata.
        """
        pass

    # ============ GDPR Compliance ============

    @abstractmethod
    async def export_coach_data(self, identity_id: str) -> dict:
        """Export all coach data for GDPR compliance."""
        pass

    @abstractmethod
    async def delete_all_coach_data(self, identity_id: str) -> int:
        """Delete all coach data for GDPR compliance."""
        pass
