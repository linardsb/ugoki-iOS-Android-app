"""Memory service for storing and retrieving user memories."""

import logging
from datetime import datetime, UTC
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    UserMemory,
    MemoryType,
    MemoryCategory,
    ExtractedMemory,
    MemoryExtractionResult,
    SKILL_TO_CATEGORIES,
)
from .orm import UserMemoryORM
from .extractor import extract_memories_from_conversation

logger = logging.getLogger(__name__)


class MemoryService:
    """Service for managing user memories."""

    def __init__(self, db: AsyncSession):
        self._db = db

    async def store_memories(
        self,
        identity_id: str,
        extraction_result: MemoryExtractionResult,
    ) -> list[UserMemory]:
        """
        Store extracted memories in the database.

        Handles deduplication by checking for similar existing memories.

        Args:
            identity_id: User's identity ID
            extraction_result: Result from memory extraction

        Returns:
            List of stored UserMemory objects
        """
        stored = []

        for memory in extraction_result.memories:
            # Check for duplicate (same category and similar content)
            existing = await self._find_similar_memory(
                identity_id,
                memory.category,
                memory.content,
            )

            if existing:
                # Update confidence if new extraction is more confident
                if memory.confidence > existing.confidence:
                    existing.confidence = memory.confidence
                    existing.extracted_at = datetime.now(UTC)
                    await self._db.commit()
                    logger.debug(f"Updated existing memory confidence: {memory.category}")
                continue

            # Create new memory
            memory_orm = UserMemoryORM(
                id=str(uuid4()),
                identity_id=identity_id,
                memory_type=memory.memory_type.value,
                category=memory.category.value,
                content=memory.content,
                confidence=memory.confidence,
                source_session_id=extraction_result.session_id,
                extracted_at=extraction_result.extracted_at,
            )

            self._db.add(memory_orm)
            stored.append(UserMemory(
                id=memory_orm.id,
                identity_id=identity_id,
                memory_type=memory.memory_type,
                category=memory.category,
                content=memory.content,
                confidence=memory.confidence,
                source_session_id=extraction_result.session_id,
                extracted_at=extraction_result.extracted_at,
                verified_by_user=False,
                is_active=True,
            ))

        if stored:
            await self._db.commit()
            logger.info(f"Stored {len(stored)} new memories for user {identity_id}")

        return stored

    async def _find_similar_memory(
        self,
        identity_id: str,
        category: MemoryCategory,
        content: str,
    ) -> Optional[UserMemoryORM]:
        """Find existing memory with same category and similar content."""
        query = select(UserMemoryORM).where(
            and_(
                UserMemoryORM.identity_id == identity_id,
                UserMemoryORM.category == category.value,
                UserMemoryORM.is_active == True,
            )
        )

        result = await self._db.execute(query)
        memories = result.scalars().all()

        # Simple content similarity check (could be enhanced with embeddings)
        content_lower = content.lower()
        for memory in memories:
            if self._is_similar_content(memory.content.lower(), content_lower):
                return memory

        return None

    def _is_similar_content(self, existing: str, new: str) -> bool:
        """Check if two memory contents are similar enough to be duplicates."""
        # Simple word overlap check
        existing_words = set(existing.split())
        new_words = set(new.split())

        if not existing_words or not new_words:
            return False

        overlap = len(existing_words & new_words)
        min_len = min(len(existing_words), len(new_words))

        # Consider similar if >60% word overlap
        return overlap / min_len > 0.6

    async def get_memories_by_categories(
        self,
        identity_id: str,
        categories: list[MemoryCategory],
        include_inactive: bool = False,
    ) -> list[UserMemory]:
        """
        Get memories for specific categories.

        Args:
            identity_id: User's identity ID
            categories: List of categories to include
            include_inactive: Whether to include deactivated memories

        Returns:
            List of matching UserMemory objects
        """
        conditions = [
            UserMemoryORM.identity_id == identity_id,
            UserMemoryORM.category.in_([c.value for c in categories]),
        ]

        if not include_inactive:
            conditions.append(UserMemoryORM.is_active == True)

        query = select(UserMemoryORM).where(and_(*conditions))
        result = await self._db.execute(query)
        memories = result.scalars().all()

        return [self._orm_to_model(m) for m in memories]

    async def get_memories_for_skills(
        self,
        identity_id: str,
        skill_names: list[str],
    ) -> list[UserMemory]:
        """
        Get memories relevant to the activated skills.

        Args:
            identity_id: User's identity ID
            skill_names: List of activated skill names

        Returns:
            List of relevant UserMemory objects
        """
        # Collect categories from all skills
        categories = set()
        for skill in skill_names:
            skill_categories = SKILL_TO_CATEGORIES.get(skill, [])
            categories.update(skill_categories)

        if not categories:
            # If no skill-specific categories, load general memories
            return await self.get_all_active_memories(identity_id, limit=5)

        return await self.get_memories_by_categories(
            identity_id,
            list(categories),
        )

    async def get_all_active_memories(
        self,
        identity_id: str,
        limit: int = 20,
    ) -> list[UserMemory]:
        """
        Get all active memories for a user.

        Args:
            identity_id: User's identity ID
            limit: Maximum number of memories to return

        Returns:
            List of UserMemory objects, ordered by confidence
        """
        query = select(UserMemoryORM).where(
            and_(
                UserMemoryORM.identity_id == identity_id,
                UserMemoryORM.is_active == True,
            )
        ).order_by(UserMemoryORM.confidence.desc()).limit(limit)

        result = await self._db.execute(query)
        memories = result.scalars().all()

        return [self._orm_to_model(m) for m in memories]

    async def deactivate_memory(
        self,
        identity_id: str,
        memory_id: str,
    ) -> bool:
        """
        Deactivate a memory (soft delete).

        Args:
            identity_id: User's identity ID
            memory_id: Memory ID to deactivate

        Returns:
            True if memory was found and deactivated
        """
        query = select(UserMemoryORM).where(
            and_(
                UserMemoryORM.id == memory_id,
                UserMemoryORM.identity_id == identity_id,
            )
        )

        result = await self._db.execute(query)
        memory = result.scalar_one_or_none()

        if memory:
            memory.is_active = False
            await self._db.commit()
            return True

        return False

    async def verify_memory(
        self,
        identity_id: str,
        memory_id: str,
    ) -> bool:
        """
        Mark a memory as verified by the user.

        Args:
            identity_id: User's identity ID
            memory_id: Memory ID to verify

        Returns:
            True if memory was found and verified
        """
        query = select(UserMemoryORM).where(
            and_(
                UserMemoryORM.id == memory_id,
                UserMemoryORM.identity_id == identity_id,
            )
        )

        result = await self._db.execute(query)
        memory = result.scalar_one_or_none()

        if memory:
            memory.verified_by_user = True
            memory.confidence = 1.0  # Max confidence for verified
            await self._db.commit()
            return True

        return False

    async def extract_and_store_memories(
        self,
        identity_id: str,
        session_id: str,
        messages: list[dict],
    ) -> list[UserMemory]:
        """
        Extract memories from conversation and store them.

        Args:
            identity_id: User's identity ID
            session_id: Conversation session ID
            messages: List of message dicts

        Returns:
            List of newly stored memories
        """
        extraction_result = await extract_memories_from_conversation(
            messages=messages,
            session_id=session_id,
        )

        if extraction_result.memories:
            return await self.store_memories(identity_id, extraction_result)

        return []

    def _orm_to_model(self, orm: UserMemoryORM) -> UserMemory:
        """Convert ORM object to Pydantic model."""
        return UserMemory(
            id=orm.id,
            identity_id=orm.identity_id,
            memory_type=MemoryType(orm.memory_type),
            category=MemoryCategory(orm.category),
            content=orm.content,
            confidence=orm.confidence,
            source_session_id=orm.source_session_id,
            extracted_at=orm.extracted_at,
            verified_by_user=orm.verified_by_user,
            is_active=orm.is_active,
        )


def format_memories_for_prompt(memories: list[UserMemory]) -> str:
    """
    Format memories into a string for the system prompt.

    Args:
        memories: List of UserMemory objects

    Returns:
        Formatted string for prompt injection
    """
    if not memories:
        return ""

    lines = ["### User Information (from previous conversations)\n"]

    # Group by type for better organization
    facts = [m for m in memories if m.memory_type == MemoryType.FACT]
    preferences = [m for m in memories if m.memory_type == MemoryType.PREFERENCE]
    goals = [m for m in memories if m.memory_type == MemoryType.GOAL]
    constraints = [m for m in memories if m.memory_type == MemoryType.CONSTRAINT]

    if facts:
        lines.append("**Known Facts:**")
        for m in facts:
            verified = " (verified)" if m.verified_by_user else ""
            lines.append(f"- {m.content}{verified}")

    if preferences:
        lines.append("\n**Preferences:**")
        for m in preferences:
            lines.append(f"- {m.content}")

    if goals:
        lines.append("\n**Goals:**")
        for m in goals:
            lines.append(f"- {m.content}")

    if constraints:
        lines.append("\n**Constraints:**")
        for m in constraints:
            lines.append(f"- {m.content}")

    return "\n".join(lines)
