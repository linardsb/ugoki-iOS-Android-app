"""Models for context engineering."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ContextTier(str, Enum):
    """Context loading tiers."""

    TIER_1 = "tier_1"  # Always loaded (~500 tokens)
    TIER_2 = "tier_2"  # Query-dependent (~500 tokens each)
    TIER_3 = "tier_3"  # On-demand via tools (unlimited)


class QueryType(str, Enum):
    """Types of user queries for context selection."""

    WORKOUT = "workout"
    FASTING = "fasting"
    PROGRESS = "progress"
    NUTRITION = "nutrition"
    MOTIVATION = "motivation"
    GENERAL = "general"


class ContextPart(BaseModel):
    """A part of the context to be loaded."""

    name: str
    tier: ContextTier
    content: str
    token_estimate: int = Field(default=0)
    query_types: list[QueryType] = Field(default_factory=list)  # Empty = always load for tier


class ContextBudget(BaseModel):
    """Token budget configuration."""

    max_total_tokens: int = 8000
    max_tier_1_tokens: int = 1500
    max_tier_2_tokens: int = 3000
    max_memories_tokens: int = 1000
    max_skills_tokens: int = 1000
    max_conversation_tokens: int = 1500


class ContextSummary(BaseModel):
    """Summary of loaded context."""

    tier_1_tokens: int
    tier_2_tokens: int
    memories_tokens: int
    skills_tokens: int
    conversation_tokens: int
    total_tokens: int
    parts_loaded: list[str]
    parts_trimmed: list[str]
    within_budget: bool


# Token estimation (approximate, 4 chars = 1 token)
CHARS_PER_TOKEN = 4

# Default budget
DEFAULT_BUDGET = ContextBudget()


def estimate_tokens(text: str) -> int:
    """Estimate token count for text."""
    return len(text) // CHARS_PER_TOKEN
