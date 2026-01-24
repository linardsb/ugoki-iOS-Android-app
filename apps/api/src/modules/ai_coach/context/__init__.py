"""Context Engineering for AI Coach.

Implements tiered context loading and token budget enforcement
for optimal use of the model's context window.

Usage:
    from src.modules.ai_coach.context import ContextManager, ContextBudget

    manager = ContextManager(db, identity_id)

    user_context, health_context, memory_context = await manager.build_context(
        query=query,
        skills=activated_skills,
        memories=formatted_memories,
        conversation_summary=summary,
    )

    summary = manager.get_summary()
    print(f"Total tokens: {summary.total_tokens}")
"""

from .models import (
    ContextTier,
    QueryType,
    ContextPart,
    ContextBudget,
    ContextSummary,
    DEFAULT_BUDGET,
    estimate_tokens,
)
from .classifier import classify_query, get_query_type_keywords
from .manager import ContextManager

__all__ = [
    # Models
    "ContextTier",
    "QueryType",
    "ContextPart",
    "ContextBudget",
    "ContextSummary",
    "DEFAULT_BUDGET",
    "estimate_tokens",
    # Classifier
    "classify_query",
    "get_query_type_keywords",
    # Manager
    "ContextManager",
]
