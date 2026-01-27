"""Agent dependencies for UGOKI AI Coach."""

from dataclasses import dataclass

from openai import AsyncOpenAI
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class UgokiAgentDeps:
    """
    Dependencies passed to the Pydantic AI agent.

    Adapted from the reference implementation to use UGOKI's
    SQLAlchemy async session instead of Supabase client.
    """

    # Database
    db: AsyncSession

    # User context
    identity_id: str

    # AI clients
    embedding_client: AsyncOpenAI
    http_client: AsyncClient

    # Optional API keys for tools
    brave_api_key: str | None = None

    # User memories from Mem0
    memories: str = ""

    # User context for personalization
    user_context: str = ""

    # Health profile info (fasting safety, etc.)
    health_context: str = ""

    # Conversation summary from earlier messages (for context continuity)
    conversation_summary: str = ""
