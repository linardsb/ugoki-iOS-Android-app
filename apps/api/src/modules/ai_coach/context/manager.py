"""Context manager for AI Coach.

Implements tiered context loading and token budget enforcement.
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    ContextTier,
    QueryType,
    ContextPart,
    ContextBudget,
    ContextSummary,
    DEFAULT_BUDGET,
    estimate_tokens,
)
from .classifier import classify_query

logger = logging.getLogger(__name__)


class ContextManager:
    """Manages context loading with tiered architecture and budget enforcement.

    Tier 1 (Always loaded, ~500 tokens):
    - Current fasting state
    - Today's workout status
    - Current streak status

    Tier 2 (Query-dependent, ~500 tokens each):
    - Workout history → loaded for workout queries
    - Weight trend → loaded for progress queries
    - Fasting history → loaded for fasting queries

    Tier 3 (On-demand via tools):
    - Detailed workout logs
    - Full biomarker history
    - Research papers
    """

    def __init__(
        self,
        db: AsyncSession,
        identity_id: str,
        budget: Optional[ContextBudget] = None,
    ):
        self._db = db
        self._identity_id = identity_id
        self._budget = budget or DEFAULT_BUDGET
        self._parts: list[ContextPart] = []
        self._summary: Optional[ContextSummary] = None

    async def build_context(
        self,
        query: str,
        skills: list[str] | None = None,
        memories: str | None = None,
        conversation_summary: str | None = None,
    ) -> tuple[str, str, str]:
        """
        Build optimized context for a query.

        Args:
            query: User's query
            skills: Activated skill names
            memories: Formatted memories string
            conversation_summary: Previous conversation summary

        Returns:
            Tuple of (user_context, health_context, memory_context)
        """
        # Classify query
        query_types = classify_query(query)

        # Load Tier 1 (always)
        tier_1_context = await self._load_tier_1()

        # Load Tier 2 (based on query)
        tier_2_context = await self._load_tier_2(query_types)

        # Load health context (always, as it's safety-critical)
        health_context = await self._load_health_context()

        # Combine and enforce budget
        user_context = self._combine_and_trim(
            tier_1_context,
            tier_2_context,
            memories or "",
            conversation_summary or "",
        )

        return user_context, health_context, memories or ""

    async def _load_tier_1(self) -> str:
        """Load Tier 1 context (always loaded)."""
        from src.modules.ai_coach.tools.fitness_tools import FitnessTools

        tools = FitnessTools(db=self._db, identity_id=self._identity_id)

        lines = ["### Current Status"]

        try:
            # Current fasting state
            active_fast = await tools.get_active_fast()
            if active_fast:
                lines.append(f"**Active Fast:** {active_fast['elapsed_hours']:.1f}h / {active_fast['target_hours']}h ({active_fast['progress_percent']}%)")
            else:
                lines.append("**Fasting:** Not currently fasting")

            # Today's workout status
            today_summary = await tools.get_today_summary()
            if today_summary.get("workouts_today"):
                lines.append(f"**Today's Workouts:** {today_summary['workouts_today']} completed")
            else:
                lines.append("**Today's Workouts:** None yet")

            # Current streaks (summary only)
            streaks = await tools.get_streaks()
            active_streaks = [
                f"{k.replace('_', ' ').title()}: {v['current']}"
                for k, v in streaks.items()
                if v.get('current', 0) > 0
            ]
            if active_streaks:
                lines.append(f"**Active Streaks:** {', '.join(active_streaks)}")

            # Level info (brief)
            level_info = await tools.get_level_info()
            lines.append(f"**Level:** {level_info['level']} - {level_info['title']}")

        except Exception as e:
            logger.warning(f"Error loading Tier 1 context: {e}")

        return "\n".join(lines)

    async def _load_tier_2(self, query_types: list[QueryType]) -> str:
        """Load Tier 2 context based on query type."""
        from src.modules.ai_coach.tools.fitness_tools import FitnessTools

        tools = FitnessTools(db=self._db, identity_id=self._identity_id)

        parts = []

        try:
            for qt in query_types:
                if qt == QueryType.WORKOUT:
                    workout_stats = await tools.get_workout_stats()
                    if workout_stats:
                        parts.append(f"**Workout Stats:** {workout_stats.get('total_workouts', 0)} total, {workout_stats.get('current_week_workouts', 0)} this week")

                elif qt == QueryType.PROGRESS:
                    weight_trend = await tools.get_weight_trend()
                    if weight_trend:
                        parts.append(f"**Weight Trend (30d):** {weight_trend['end_value']}kg ({weight_trend['change']:+.1f}kg, {weight_trend['trend_direction']})")

                elif qt == QueryType.FASTING:
                    # Fasting stats are loaded in Tier 1, add protocol info
                    parts.append("**Fasting Protocols:** 16:8, 18:6, 20:4 available")

                elif qt == QueryType.NUTRITION:
                    parts.append("**Nutrition Focus:** Meal timing and hydration")

                elif qt == QueryType.MOTIVATION:
                    level_info = await tools.get_level_info()
                    parts.append(f"**Progress:** {level_info['progress_percent']}% to next level")

        except Exception as e:
            logger.warning(f"Error loading Tier 2 context: {e}")

        if parts:
            return "\n### Relevant Context\n" + "\n".join(parts)
        return ""

    async def _load_health_context(self) -> str:
        """Load health context (always, safety-critical)."""
        from src.modules.profile.service import ProfileService

        profile_service = ProfileService(self._db)

        try:
            is_safe, warnings = await profile_service.is_fasting_safe(self._identity_id)

            if is_safe and not warnings:
                return ""

            lines = ["### Health Considerations"]
            if not is_safe:
                lines.append("**SAFETY CONCERN:** User has conditions that may make fasting unsafe.")
            for warning in warnings:
                lines.append(f"- {warning}")

            return "\n".join(lines)

        except Exception as e:
            logger.warning(f"Error loading health context: {e}")
            return ""

    def _combine_and_trim(
        self,
        tier_1: str,
        tier_2: str,
        memories: str,
        conversation: str,
    ) -> str:
        """Combine context parts and trim to budget."""
        parts = []
        trimmed = []

        # Calculate token estimates
        tier_1_tokens = estimate_tokens(tier_1)
        tier_2_tokens = estimate_tokens(tier_2)
        memories_tokens = estimate_tokens(memories)
        conv_tokens = estimate_tokens(conversation)

        # Add Tier 1 (always, trim if needed)
        if tier_1_tokens <= self._budget.max_tier_1_tokens:
            parts.append(tier_1)
        else:
            # Trim to budget
            trimmed_tier_1 = tier_1[:self._budget.max_tier_1_tokens * 4]
            parts.append(trimmed_tier_1)
            trimmed.append("tier_1")

        # Add Tier 2 (if within budget)
        if tier_2 and tier_2_tokens <= self._budget.max_tier_2_tokens:
            parts.append(tier_2)
        elif tier_2:
            trimmed.append("tier_2")

        # Add memories (if within budget)
        if memories and memories_tokens <= self._budget.max_memories_tokens:
            parts.append(memories)
        elif memories:
            trimmed.append("memories")

        # Add conversation summary (if within budget)
        if conversation and conv_tokens <= self._budget.max_conversation_tokens:
            parts.append(f"\n### Previous Conversation\n{conversation}")
        elif conversation:
            trimmed.append("conversation")

        # Calculate totals for summary
        total = sum(estimate_tokens(p) for p in parts)

        self._summary = ContextSummary(
            tier_1_tokens=tier_1_tokens,
            tier_2_tokens=tier_2_tokens,
            memories_tokens=memories_tokens,
            skills_tokens=0,  # Skills are handled separately in prompt
            conversation_tokens=conv_tokens,
            total_tokens=total,
            parts_loaded=[p[:20] + "..." for p in parts if p],
            parts_trimmed=trimmed,
            within_budget=total <= self._budget.max_total_tokens,
        )

        if trimmed:
            logger.debug(f"Context trimmed: {trimmed}")

        return "\n\n".join(parts)

    def get_summary(self) -> Optional[ContextSummary]:
        """Get summary of context loading."""
        return self._summary
