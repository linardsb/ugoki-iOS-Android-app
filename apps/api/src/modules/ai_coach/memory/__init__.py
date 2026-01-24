"""User Memory System for AI Coach.

Extracts and stores facts, preferences, goals, and constraints
from coaching conversations for cross-session personalization.

Usage:
    from src.modules.ai_coach.memory import MemoryService, format_memories_for_prompt

    # Extract and store memories after a conversation
    service = MemoryService(db)
    memories = await service.extract_and_store_memories(
        identity_id=user_id,
        session_id=session_id,
        messages=conversation_messages,
    )

    # Get relevant memories for a query
    memories = await service.get_memories_for_skills(
        identity_id=user_id,
        skill_names=["workout"],
    )

    # Format for prompt
    memory_context = format_memories_for_prompt(memories)
"""

from .models import (
    MemoryType,
    MemoryCategory,
    ExtractedMemory,
    UserMemory,
    MemoryExtractionResult,
    SKILL_TO_CATEGORIES,
    WORKOUT_CATEGORIES,
    FASTING_CATEGORIES,
    NUTRITION_CATEGORIES,
    MOTIVATION_CATEGORIES,
)
from .orm import UserMemoryORM
from .service import MemoryService, format_memories_for_prompt
from .extractor import (
    extract_memories_from_conversation,
    should_extract_memories,
)

__all__ = [
    # Models
    "MemoryType",
    "MemoryCategory",
    "ExtractedMemory",
    "UserMemory",
    "MemoryExtractionResult",
    # Category mappings
    "SKILL_TO_CATEGORIES",
    "WORKOUT_CATEGORIES",
    "FASTING_CATEGORIES",
    "NUTRITION_CATEGORIES",
    "MOTIVATION_CATEGORIES",
    # ORM
    "UserMemoryORM",
    # Service
    "MemoryService",
    "format_memories_for_prompt",
    # Extractor
    "extract_memories_from_conversation",
    "should_extract_memories",
]
