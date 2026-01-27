"""Service implementation for AI_COACH module."""

import json
import logging
import random
import secrets
from datetime import datetime, UTC
from typing import AsyncIterator

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.modules.ai_coach.interface import AICoachInterface
from src.modules.ai_coach.models import (
    ChatRequest,
    ChatResponse,
    CoachResponse,
    CoachingInsight,
    UserContext,
    CoachPersonality,
    QuickAction,
    ConversationSession,
    ConversationMessage,
    ConversationListResponse,
    StreamChatRequest,
    StreamChunk,
    MessageType,
)
from src.modules.ai_coach.orm import (
    CoachConversationORM,
    CoachMessageORM,
    CoachUserSettingsORM,
)
from src.modules.ai_coach.safety import (
    check_message_safety,
    SafetyAction,
    get_safety_disclaimer,
    filter_ai_response,
)
from src.modules.ai_coach.agents import (
    UgokiAgentDeps,
    stream_coach_response,
    run_coach_response,
    get_embedding_client,
    get_http_client,
    get_brave_api_key,
)
from src.modules.ai_coach.skills import route_query
from src.modules.ai_coach.memory import (
    MemoryService,
    format_memories_for_prompt,
    should_extract_memories,
)
from src.modules.ai_coach.evaluation import (
    EvaluationService,
    EvaluationRequest,
)
from src.modules.ai_coach.context import ContextManager

logger = logging.getLogger(__name__)


# Token estimation: ~4 characters per token for English text
CHARS_PER_TOKEN = 4
# Maximum tokens to use for conversation history (~80K of 128K context)
MAX_HISTORY_TOKENS = 80000
# Summarize conversations after this many messages
SUMMARIZE_AFTER_MESSAGES = 30


class AICoachService(AICoachInterface):
    """Implementation of AI_COACH interface."""

    def __init__(self, db: AsyncSession):
        self._db = db

    async def _get_personality(self, identity_id: str) -> CoachPersonality:
        """Get user's coach personality preference from database."""
        result = await self._db.execute(
            select(CoachUserSettingsORM).where(
                CoachUserSettingsORM.identity_id == identity_id
            )
        )
        settings = result.scalar_one_or_none()
        if settings:
            try:
                return CoachPersonality(settings.personality)
            except ValueError:
                return CoachPersonality.MOTIVATIONAL
        return CoachPersonality.MOTIVATIONAL

    async def chat(
        self,
        identity_id: str,
        request: ChatRequest,
    ) -> ChatResponse:
        """Chat with the AI coach."""
        personality = request.personality or await self._get_personality(identity_id)

        # === SAFETY CHECK (Pre-request filter) ===
        safety_result = check_message_safety(request.message)

        # Log safety events for monitoring
        if safety_result.action != SafetyAction.ALLOW:
            logger.info(
                f"Safety filter triggered: action={safety_result.action.value}, "
                f"category={safety_result.category}, "
                f"keywords={safety_result.detected_keywords[:3]}"  # Log first 3 keywords
            )

        # BLOCKED: Return safety message immediately without AI processing
        if safety_result.action == SafetyAction.BLOCK:
            return ChatResponse(
                response=CoachResponse(
                    message=safety_result.redirect_message or self._get_default_safety_message(),
                    suggestions=["Ask about fasting", "Suggest a workout", "Check my progress"],
                    encouragement=None,
                ),
                context_summary=None,
                quick_actions=self._get_safe_quick_actions(),
                safety_redirected=True,
            )

        # === NORMAL PROCESSING ===
        # Use LLM for intelligent responses with pattern matching fallback
        try:
            # Route query to determine which skills to activate
            activated_skills = route_query(request.message)

            # Get agent dependencies with skill-filtered memories
            deps = await self._get_agent_deps(identity_id, skills=activated_skills)

            llm_response = await run_coach_response(
                query=request.message,
                deps=deps,
                personality=personality.value if personality else "motivational",
                skills=activated_skills,
            )

            # REDIRECT: Add disclaimer to response
            if safety_result.action == SafetyAction.REDIRECT:
                llm_response += get_safety_disclaimer()

            # Post-response filter: Check if AI response contains medical advice
            filtered_message, was_filtered = filter_ai_response(llm_response)
            if was_filtered:
                llm_response = filtered_message
                logger.info("Post-response safety filter added disclaimer")

            response = CoachResponse(
                message=llm_response,
                suggestions=["Ask about fasting", "Get workout tips", "Check my progress"],
                encouragement=None,
            )
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            # Fall back to pattern matching
            response = self._simple_response(request.message, personality)

            # REDIRECT: Add disclaimer to response
            if safety_result.action == SafetyAction.REDIRECT:
                response.message += get_safety_disclaimer()

            # Post-response filter for fallback
            filtered_message, was_filtered = filter_ai_response(response.message)
            if was_filtered:
                response.message = filtered_message

        # Generate quick actions
        quick_actions = self._get_safe_quick_actions()

        return ChatResponse(
            response=response,
            context_summary=None,
            quick_actions=quick_actions,
            safety_redirected=(safety_result.action == SafetyAction.REDIRECT),
        )

    def _get_default_safety_message(self) -> str:
        """Get a default safety redirect message."""
        return (
            "I appreciate you sharing that with me, but this sounds like something "
            "that would be best discussed with a healthcare professional. "
            "They can give you personalized guidance based on your specific situation.\n\n"
            "I'm here to help with general fasting schedules, workout ideas, "
            "and keeping you motivated on your wellness journey!"
        )

    def _get_safe_quick_actions(self) -> list[QuickAction]:
        """Get quick actions that are always safe to suggest."""
        return [
            QuickAction(
                label="Start Fast",
                action="start_fast",
                description="Begin a 16:8 intermittent fast",
            ),
            QuickAction(
                label="Quick Workout",
                action="start_workout",
                description="Start a recommended workout",
            ),
            QuickAction(
                label="Log Weight",
                action="log_weight",
                description="Track your current weight",
            ),
        ]

    def _simple_response(
        self,
        message: str,
        personality: CoachPersonality,
    ) -> CoachResponse:
        """Generate a simple response based on message patterns."""
        message_lower = message.lower()

        # Pattern matching for affirmative responses (context-sensitive)
        if message_lower.strip() in ["yes", "yeah", "yep", "sure", "ok", "okay", "let's go", "ready", "start"]:
            return CoachResponse(
                message="Let's do this! Head to the **Fasting tab** at the bottom of your screen "
                        "and tap **'Start Fast'** to begin. I recommend starting with 16:8 - "
                        "that's 16 hours fasting, 8 hours eating window. You've got this!",
                suggestions=["Go to Fasting tab", "Start 16:8 fast"],
                encouragement="The first step is always the most important!",
            )

        # Pattern matching for common queries
        if any(word in message_lower for word in ["start fast", "begin fast", "start a fast"]):
            return CoachResponse(
                message="Great choice! To start your fast:\n\n"
                        "1. Tap the **Fasting** tab at the bottom\n"
                        "2. Choose your protocol (16:8 is perfect for beginners)\n"
                        "3. Tap **'Start Fast'**\n\n"
                        "I'll be here to cheer you on!",
                suggestions=["Go to Fasting tab"],
                encouragement="Every hour of fasting brings you closer to your goals!",
            )

        elif any(word in message_lower for word in ["fast", "fasting"]):
            return CoachResponse(
                message="Fasting is a powerful tool for metabolic health! "
                        "Head to the **Fasting tab** to get started. "
                        "The 16:8 method is great for beginners - 16 hours fast, 8 hour eating window.",
                suggestions=["Go to Fasting tab", "Learn about 16:8"],
                encouragement="Every hour of fasting brings you closer to your goals!",
            )

        elif any(word in message_lower for word in ["start workout", "do workout", "begin workout"]):
            return CoachResponse(
                message="Let's get moving! To start a workout:\n\n"
                        "1. Tap the **Workouts** tab at the bottom\n"
                        "2. Browse or search for a workout\n"
                        "3. Tap any workout card to see details, then **'Start Workout'**\n\n"
                        "I recommend 'Quick HIIT Blast' for a fast calorie burn!",
                suggestions=["Go to Workouts tab"],
                workout_recommendation="Quick HIIT Blast",
                encouragement="Movement is medicine!",
            )

        elif any(word in message_lower for word in ["workout", "exercise", "hiit", "train"]):
            return CoachResponse(
                message="Let's get moving! Check out the **Workouts tab** - "
                        "we have HIIT, strength, cardio, and more. "
                        "Even 10 minutes makes a difference! Try 'Quick HIIT Blast' to start.",
                suggestions=["Go to Workouts tab", "Quick HIIT Blast"],
                workout_recommendation="Quick HIIT Blast",
                encouragement="Movement is medicine!",
            )
        
        elif any(word in message_lower for word in ["progress", "stats", "level", "xp"]):
            return CoachResponse(
                message="Your consistency is paying off! Check the **Home tab** to see "
                        "your level, XP, and streaks. Tap on the level card to see "
                        "all your achievements!",
                suggestions=["Go to Home tab", "View achievements"],
                encouragement="Every day you're getting stronger!",
            )

        elif any(word in message_lower for word in ["weight", "log weight", "track weight"]):
            return CoachResponse(
                message="Great idea to track your weight! On the **Home tab**, "
                        "tap the **weight card** to log your current weight. "
                        "Remember, weight fluctuates daily - focus on the weekly trend!",
                suggestions=["Go to Home tab", "Log weight"],
                encouragement="Trust the process!",
            )

        elif any(word in message_lower for word in ["recipe", "recipes", "food", "meal", "eat"]):
            return CoachResponse(
                message="Looking for healthy meal ideas? Go to your **Profile tab** "
                        "and tap **'Browse Recipes'** to find delicious, nutritious options! "
                        "We have meals for every preference.",
                suggestions=["Go to Profile", "Browse Recipes"],
                encouragement="Good nutrition fuels great workouts!",
            )
        
        elif any(word in message_lower for word in ["hello", "hi", "hey", "morning", "afternoon"]):
            greetings = {
                CoachPersonality.MOTIVATIONAL: "Hey champion! Ready to crush your goals today? 💪",
                CoachPersonality.CALM: "Hello there. Take a deep breath and let's make today great.",
                CoachPersonality.TOUGH: "Let's go! No time to waste. What are we working on?",
                CoachPersonality.FRIENDLY: "Hey! Good to see you! What's on your mind today?",
            }
            return CoachResponse(
                message=greetings.get(personality, greetings[CoachPersonality.MOTIVATIONAL]),
                suggestions=["Start workout", "Start fast", "Check progress"],
                encouragement="Let's make today count!",
            )
        
        elif any(word in message_lower for word in ["tired", "exhausted", "rest", "recovery"]):
            return CoachResponse(
                message="Rest is just as important as training! Your body grows stronger during recovery. "
                        "Listen to your body and take a recovery day if needed.",
                suggestions=["Recovery workout", "Stretching routine"],
                encouragement="Rest is part of the process, not a setback!",
            )
        
        elif any(word in message_lower for word in ["motivation", "motivate", "inspire", "help"]):
            motivations = [
                "You didn't come this far to only come this far!",
                "Small steps every day lead to big transformations.",
                "The only bad workout is the one that didn't happen.",
                "Discipline beats motivation every time. Show up anyway!",
            ]
            return CoachResponse(
                message=random.choice(motivations),
                suggestions=["Start workout", "Start fast"],
                encouragement="You've got this!",
            )
        
        else:
            # Generic helpful response with navigation hints
            return CoachResponse(
                message="I'm here to help! Here's what you can do:\n\n"
                        "🍽️ **Fasting tab** - Start or track your fast\n"
                        "💪 **Workouts tab** - Browse and start workouts\n"
                        "🏠 **Home tab** - See your progress and log weight\n"
                        "👤 **Profile tab** - Find recipes and settings\n\n"
                        "What would you like to do?",
                suggestions=["Start a fast", "Find a workout", "Check my progress"],
                encouragement="Consistency is the key to transformation!",
            )

    async def get_user_context(self, identity_id: str) -> UserContext:
        """Get the current context for a user."""
        # Return basic context - in production this would query other modules
        return UserContext(
            identity_id=identity_id,
            current_level=1,
            total_xp=0,
            fasting_streak=0,
            workout_streak=0,
            active_fast=False,
            fast_elapsed_hours=None,
            fast_target_hours=None,
            last_workout_date=None,
            workouts_this_week=0,
            current_weight=None,
            weight_trend=None,
            personality=await self._get_personality(identity_id),
        )

    async def get_daily_insight(self, identity_id: str) -> CoachingInsight:
        """Get a personalized daily insight/tip."""
        insights = [
            CoachingInsight(
                title="Fasting Benefits",
                content="During fasting, your body shifts to burning fat for fuel. "
                        "After 12 hours, you enter a state called ketosis!",
                category="fasting",
                priority=1,
            ),
            CoachingInsight(
                title="HIIT Power",
                content="Just 15 minutes of HIIT can boost your metabolism for hours "
                        "after your workout - that's the afterburn effect!",
                category="workout",
                priority=1,
            ),
            CoachingInsight(
                title="Consistency Wins",
                content="Small daily actions beat occasional heroic efforts. "
                        "A 10-minute workout is infinitely better than no workout!",
                category="motivation",
                priority=2,
            ),
            CoachingInsight(
                title="Hydration Tip",
                content="Drink water during your fast! It helps curb hunger and keeps "
                        "your body functioning optimally. Aim for 8 glasses daily.",
                category="fasting",
                priority=1,
            ),
            CoachingInsight(
                title="Sleep Matters",
                content="Quality sleep is crucial for recovery and weight management. "
                        "Aim for 7-9 hours per night for optimal results.",
                category="wellness",
                priority=1,
            ),
        ]
        
        return random.choice(insights)

    async def get_motivation(
        self,
        identity_id: str,
        context: str | None = None,
    ) -> str:
        """Get a motivational message."""
        personality = await self._get_personality(identity_id)
        
        motivations = {
            CoachPersonality.MOTIVATIONAL: [
                "You're absolutely crushing it! Keep that energy high!",
                "Every rep, every fast, every choice - they're all building the new you!",
                "Champions are made when no one is watching. You're a champion!",
                "Your dedication is inspiring. Don't stop now!",
            ],
            CoachPersonality.CALM: [
                "Remember, this is a journey, not a race. Be patient with yourself.",
                "Take a deep breath. You're exactly where you need to be.",
                "Progress is progress, no matter how small. Honor your efforts.",
                "Listen to your body. Rest is also part of growth.",
            ],
            CoachPersonality.TOUGH: [
                "No excuses! You know what you need to do. Now do it!",
                "Pain is temporary. Results are forever. Push through!",
                "Stop thinking, start doing. Action beats intention every time!",
                "You didn't come this far to only come this far. Keep pushing!",
            ],
            CoachPersonality.FRIENDLY: [
                "Hey, you're doing great! Seriously, be proud of yourself.",
                "We all have tough days. But you showed up, and that's what matters!",
                "You've got a friend in me - let's tackle this together!",
                "Remember why you started. You've got this, friend!",
            ],
        }
        
        messages = motivations.get(personality, motivations[CoachPersonality.MOTIVATIONAL])
        
        # Add context-specific motivation
        if context:
            context_lower = context.lower()
            if "completed fast" in context_lower:
                return "Incredible! You just completed a fast. Your discipline is paying off!"
            elif "completed workout" in context_lower:
                return "Workout done! Those endorphins are flowing. You're getting stronger!"
            elif "new streak" in context_lower:
                return "New streak milestone! Your consistency is building unstoppable momentum!"
        
        return random.choice(messages)

    async def set_personality(
        self,
        identity_id: str,
        personality: CoachPersonality,
    ) -> None:
        """Set the coach personality for a user in database."""
        result = await self._db.execute(
            select(CoachUserSettingsORM).where(
                CoachUserSettingsORM.identity_id == identity_id
            )
        )
        settings = result.scalar_one_or_none()

        if settings:
            settings.personality = personality.value
        else:
            settings = CoachUserSettingsORM(
                identity_id=identity_id,
                personality=personality.value,
            )
            self._db.add(settings)

        await self._db.commit()

    # ============ Conversation Management Methods ============

    def _generate_session_id(self, identity_id: str) -> str:
        """Generate a unique session ID in the format {identity_id}~{random_10_chars}."""
        random_part = secrets.token_urlsafe(8)[:10]
        return f"{identity_id}~{random_part}"

    async def create_conversation(
        self,
        identity_id: str,
        title: str | None = None,
    ) -> ConversationSession:
        """Create a new conversation session."""
        session_id = self._generate_session_id(identity_id)
        now = datetime.now(UTC)

        conversation = CoachConversationORM(
            session_id=session_id,
            identity_id=identity_id,
            title=title,
            last_message_at=now,
            is_archived=False,
            metadata={},
        )

        self._db.add(conversation)
        await self._db.commit()
        await self._db.refresh(conversation)

        return ConversationSession(
            session_id=conversation.session_id,
            identity_id=conversation.identity_id,
            title=conversation.title,
            created_at=conversation.created_at,
            last_message_at=conversation.last_message_at,
            is_archived=conversation.is_archived,
            message_count=0,
        )

    async def get_conversations(
        self,
        identity_id: str,
        limit: int = 20,
        offset: int = 0,
        include_archived: bool = False,
    ) -> ConversationListResponse:
        """Get list of conversations for a user."""
        # Build query
        query = select(CoachConversationORM).where(
            CoachConversationORM.identity_id == identity_id
        )

        if not include_archived:
            query = query.where(CoachConversationORM.is_archived == False)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self._db.execute(count_query)
        total = total_result.scalar() or 0

        # Get paginated results
        query = query.order_by(CoachConversationORM.last_message_at.desc())
        query = query.offset(offset).limit(limit)

        result = await self._db.execute(query)
        conversations = result.scalars().all()

        # Get message counts for each conversation
        session_ids = [c.session_id for c in conversations]
        if session_ids:
            count_query = select(
                CoachMessageORM.session_id,
                func.count(CoachMessageORM.id).label("count")
            ).where(
                CoachMessageORM.session_id.in_(session_ids)
            ).group_by(CoachMessageORM.session_id)

            count_result = await self._db.execute(count_query)
            counts = {row[0]: row[1] for row in count_result.fetchall()}
        else:
            counts = {}

        return ConversationListResponse(
            conversations=[
                ConversationSession(
                    session_id=c.session_id,
                    identity_id=c.identity_id,
                    title=c.title,
                    created_at=c.created_at,
                    last_message_at=c.last_message_at,
                    is_archived=c.is_archived,
                    message_count=counts.get(c.session_id, 0),
                )
                for c in conversations
            ],
            total=total,
            has_more=(offset + limit) < total,
        )

    async def get_conversation_messages(
        self,
        identity_id: str,
        session_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ConversationMessage]:
        """Get messages for a specific conversation."""
        # Verify ownership
        conv = await self._db.execute(
            select(CoachConversationORM).where(
                CoachConversationORM.session_id == session_id,
                CoachConversationORM.identity_id == identity_id,
            )
        )
        if not conv.scalar_one_or_none():
            return []

        # Get messages
        query = select(CoachMessageORM).where(
            CoachMessageORM.session_id == session_id
        ).order_by(CoachMessageORM.created_at.asc())
        query = query.offset(offset).limit(limit)

        result = await self._db.execute(query)
        messages = result.scalars().all()

        return [
            ConversationMessage(
                id=m.id,
                session_id=m.session_id,
                message_type=MessageType(m.message.get("type", "human")),
                content=m.message.get("content", ""),
                created_at=m.created_at,
                files=m.message.get("files"),
            )
            for m in messages
        ]

    async def delete_conversation(
        self,
        identity_id: str,
        session_id: str,
    ) -> bool:
        """Delete a conversation and all its messages (GDPR compliant)."""
        # Verify ownership and delete
        result = await self._db.execute(
            delete(CoachConversationORM).where(
                CoachConversationORM.session_id == session_id,
                CoachConversationORM.identity_id == identity_id,
            )
        )
        await self._db.commit()
        return result.rowcount > 0

    async def update_conversation(
        self,
        identity_id: str,
        session_id: str,
        title: str | None = None,
        is_archived: bool | None = None,
    ) -> ConversationSession | None:
        """Update a conversation's metadata."""
        query = select(CoachConversationORM).where(
            CoachConversationORM.session_id == session_id,
            CoachConversationORM.identity_id == identity_id,
        )
        result = await self._db.execute(query)
        conversation = result.scalar_one_or_none()

        if not conversation:
            return None

        if title is not None:
            conversation.title = title
        if is_archived is not None:
            conversation.is_archived = is_archived

        await self._db.commit()
        await self._db.refresh(conversation)

        return ConversationSession(
            session_id=conversation.session_id,
            identity_id=conversation.identity_id,
            title=conversation.title,
            created_at=conversation.created_at,
            last_message_at=conversation.last_message_at,
            is_archived=conversation.is_archived,
            message_count=0,
        )

    # ============ Streaming Chat Methods ============

    async def _save_message(
        self,
        session_id: str,
        message_type: str,
        content: str,
        message_data: str | None = None,
    ) -> int | None:
        """Save a message to the database.

        Returns:
            The message ID if saved, None otherwise
        """
        message = CoachMessageORM(
            session_id=session_id,
            message={
                "type": message_type,
                "content": content,
            },
            message_data=message_data,
        )
        self._db.add(message)
        await self._db.commit()
        await self._db.refresh(message)
        return message.id

    async def _update_conversation_timestamp(self, session_id: str) -> None:
        """Update the last_message_at timestamp for a conversation."""
        query = select(CoachConversationORM).where(
            CoachConversationORM.session_id == session_id
        )
        result = await self._db.execute(query)
        conversation = result.scalar_one_or_none()
        if conversation:
            conversation.last_message_at = datetime.now(UTC)
            await self._db.commit()

    async def _generate_title(self, query: str) -> str:
        """Generate a short title from the first message."""
        # Simple title generation - take first 50 chars
        title = query[:50].strip()
        if len(query) > 50:
            title += "..."
        return title

    # ============ Context Building Methods ============

    async def _build_user_context(self, identity_id: str) -> str:
        """
        Build user context string from fitness data.
        Uses FitnessTools to fetch current stats.
        """
        from src.modules.ai_coach.tools.fitness_tools import FitnessTools

        tools = FitnessTools(db=self._db, identity_id=identity_id)

        try:
            # Fetch all relevant user data
            level_info = await tools.get_level_info()
            streaks = await tools.get_streaks()
            active_fast = await tools.get_active_fast()
            workout_stats = await tools.get_workout_stats()
            weight_trend = await tools.get_weight_trend()

            # Build context string
            lines = ["### Current Stats"]

            # Level & XP
            lines.append(f"- **Level:** {level_info['level']} ({level_info['title']})")
            lines.append(f"- **XP:** {level_info['current_xp']} / {level_info['xp_for_next_level']} ({level_info['progress_percent']}% to next level)")
            lines.append(f"- **Total XP Earned:** {level_info['total_xp_earned']}")

            # Streaks
            if streaks:
                lines.append("\n### Streaks")
                for streak_type, data in streaks.items():
                    if data['current'] > 0:
                        lines.append(f"- **{streak_type.replace('_', ' ').title()}:** {data['current']} days (best: {data['longest']})")

            # Active fast
            if active_fast:
                lines.append("\n### Active Fast")
                lines.append(f"- **In Progress:** Yes")
                lines.append(f"- **Elapsed:** {active_fast['elapsed_hours']} hours")
                lines.append(f"- **Target:** {active_fast['target_hours']} hours")
                lines.append(f"- **Progress:** {active_fast['progress_percent']}%")
                lines.append(f"- **Remaining:** {active_fast['remaining_hours']} hours")

            # Workout stats
            if workout_stats:
                lines.append("\n### Workout Stats")
                lines.append(f"- **Total Workouts:** {workout_stats.get('total_workouts', 0)}")
                lines.append(f"- **This Week:** {workout_stats.get('current_week_workouts', 0)}")

            # Weight trend
            if weight_trend:
                lines.append("\n### Weight Trend (30 days)")
                lines.append(f"- **Current:** {weight_trend['end_value']} kg")
                lines.append(f"- **Change:** {weight_trend['change']:+.1f} kg ({weight_trend['change_percent']:+.1f}%)")
                lines.append(f"- **Trend:** {weight_trend['trend_direction']}")

            return "\n".join(lines)

        except Exception as e:
            logger.warning(f"Error building user context: {e}")
            return ""

    async def _build_user_preferences_context(self, identity_id: str) -> str:
        """
        Build user preferences context from profile module.
        Includes goals, workout preferences, and fasting targets.
        """
        from src.modules.profile.service import ProfileService

        profile_service = ProfileService(self._db)

        try:
            lines = ["### User Goals & Preferences"]

            # Get goals
            goals = await profile_service._get_goals_if_exists(identity_id)
            if goals:
                if goals.primary_goal:
                    lines.append(f"- **Primary Goal:** {goals.primary_goal.value if hasattr(goals.primary_goal, 'value') else goals.primary_goal}")
                if goals.target_weight_kg:
                    lines.append(f"- **Target Weight:** {goals.target_weight_kg} kg")
                if goals.weekly_workout_goal:
                    lines.append(f"- **Weekly Workout Goal:** {goals.weekly_workout_goal} workouts")
                if goals.target_fasting_hours:
                    lines.append(f"- **Target Fasting Hours:** {goals.target_fasting_hours} hours")

            # Get workout restrictions/preferences
            restrictions = await profile_service._get_restrictions_if_exists(identity_id)
            if restrictions:
                if restrictions.fitness_level:
                    level_val = restrictions.fitness_level.value if hasattr(restrictions.fitness_level, 'value') else restrictions.fitness_level
                    lines.append(f"- **Fitness Level:** {level_val}")
                if restrictions.injury_areas:
                    injury_list = [a.value if hasattr(a, 'value') else a for a in restrictions.injury_areas]
                    lines.append(f"- **Injury Areas to Avoid:** {', '.join(injury_list)}")
                if restrictions.max_workout_duration_minutes:
                    lines.append(f"- **Max Workout Duration:** {restrictions.max_workout_duration_minutes} minutes")
                if restrictions.home_equipment:
                    lines.append(f"- **Home Equipment:** {', '.join(restrictions.home_equipment)}")

            # Get dietary preferences
            dietary = await profile_service._get_dietary_if_exists(identity_id)
            if dietary:
                if dietary.dietary_preference:
                    lines.append(f"- **Dietary Preference:** {dietary.dietary_preference}")
                if dietary.allergies:
                    lines.append(f"- **Allergies:** {', '.join(dietary.allergies)}")

            # Get user preferences (fasting protocol, etc.)
            prefs = await profile_service.get_preferences(identity_id)
            if prefs:
                if prefs.default_fasting_protocol:
                    lines.append(f"- **Default Fasting Protocol:** {prefs.default_fasting_protocol}")

            return "\n".join(lines) if len(lines) > 1 else ""

        except Exception as e:
            logger.warning(f"Error building user preferences context: {e}")
            return ""

    async def _build_health_context(self, identity_id: str) -> str:
        """
        Build health context from profile module.
        Flags conditions that affect fasting safety.
        """
        from src.modules.profile.service import ProfileService

        profile_service = ProfileService(self._db)

        try:
            is_safe, warnings = await profile_service.is_fasting_safe(identity_id)

            if is_safe and not warnings:
                return ""

            lines = ["### Health Considerations"]

            if not is_safe:
                lines.append("**⚠️ FASTING SAFETY CONCERN:** User has conditions that may make fasting unsafe.")
                lines.append("Always recommend consulting a healthcare provider before fasting.")

            for warning in warnings:
                lines.append(f"- {warning}")

            health = await profile_service._get_health_if_exists(identity_id)
            if health:
                if health.takes_medication:
                    lines.append("- User takes medication that may need consideration")
                if health.medication_requires_food:
                    lines.append("- **Important:** Medication requires food - adjust fasting windows accordingly")

            return "\n".join(lines)

        except Exception as e:
            logger.warning(f"Error building health context: {e}")
            return ""

    # ============ Conversation History Methods ============

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for text (~4 chars per token)."""
        return len(text) // CHARS_PER_TOKEN

    async def _load_conversation_history(
        self,
        session_id: str,
        max_messages: int = 50,
    ) -> tuple[list[dict], str | None]:
        """
        Load conversation history from database.

        Implements conversation compaction:
        - If message_count >= SUMMARIZE_AFTER_MESSAGES and no summary exists,
          blocks to generate summary before proceeding
        - If summary exists, loads only recent messages (last 10)
        - Otherwise loads up to max_messages

        Returns:
            Tuple of (messages list, conversation summary if exists)
        """
        # Get conversation with summary
        conv_result = await self._db.execute(
            select(CoachConversationORM).where(
                CoachConversationORM.session_id == session_id
            )
        )
        conversation = conv_result.scalar_one_or_none()

        if not conversation:
            return [], None

        summary = conversation.summary

        # Check if we need to generate a summary (compaction)
        if conversation.message_count >= SUMMARIZE_AFTER_MESSAGES and not summary:
            logger.info(
                f"Conversation {session_id} has {conversation.message_count} messages, "
                f"generating summary (compaction)"
            )
            summary = await self._summarize_conversation(session_id)

        # Determine how many recent messages to load
        # If we have a summary, we only need recent context (last 10 messages)
        # Otherwise, load more for full context
        messages_to_load = 10 if summary else max_messages

        # Get recent messages
        query = select(CoachMessageORM).where(
            CoachMessageORM.session_id == session_id
        ).order_by(CoachMessageORM.created_at.desc()).limit(messages_to_load)

        result = await self._db.execute(query)
        messages = result.scalars().all()

        # Reverse to chronological order
        messages = list(reversed(messages))

        return [
            {
                "role": "user" if m.message.get("type") == "human" else "assistant",
                "content": m.message.get("content", ""),
            }
            for m in messages
        ], summary

    def _convert_to_pydantic_messages(
        self,
        history: list[dict],
        summary: str | None = None,
    ) -> list:
        """
        Convert database message format to Pydantic AI ModelMessage format.

        NOTE: Summary is no longer injected here as fake messages.
        Instead, it's passed to the agent deps for system prompt injection.
        This avoids confusing the model with fake conversation turns.

        Args:
            history: List of {role, content} dicts (recent messages only if compacted)
            summary: Optional conversation summary (now handled separately via deps)

        Returns:
            List of Pydantic AI message objects
        """
        from pydantic_ai.messages import (
            ModelRequest,
            ModelResponse,
            UserPromptPart,
            TextPart,
        )

        messages = []

        # Convert recent history to Pydantic AI format
        # Summary is now injected via system prompt, not as fake messages
        for msg in history:
            if msg["role"] == "user":
                messages.append(
                    ModelRequest(parts=[UserPromptPart(content=msg["content"])])
                )
            else:
                messages.append(
                    ModelResponse(parts=[TextPart(content=msg["content"])])
                )

        return messages

    async def _should_summarize(self, session_id: str) -> bool:
        """Check if conversation should be summarized based on message count."""
        conv_result = await self._db.execute(
            select(CoachConversationORM).where(
                CoachConversationORM.session_id == session_id
            )
        )
        conversation = conv_result.scalar_one_or_none()

        if not conversation:
            return False

        return conversation.message_count >= SUMMARIZE_AFTER_MESSAGES and not conversation.summary

    async def _summarize_conversation(self, session_id: str) -> str | None:
        """
        Create a summary of the conversation for context compaction.

        Called when message count exceeds SUMMARIZE_AFTER_MESSAGES threshold.
        Uses Claude Haiku for efficiency.

        The summary captures:
        - User's stated goals and preferences
        - Important facts mentioned (injuries, constraints)
        - Progress discussed
        - Commitments or action items agreed upon
        """
        # Load messages directly (avoid recursion through _load_conversation_history)
        query = select(CoachMessageORM).where(
            CoachMessageORM.session_id == session_id
        ).order_by(CoachMessageORM.created_at.asc()).limit(100)

        result = await self._db.execute(query)
        messages = result.scalars().all()

        if len(messages) < 10:
            return None

        # Build conversation text for summarization (first 30 messages)
        conv_text = "\n".join([
            f"{'User' if m.message.get('type') == 'human' else 'Coach'}: {m.message.get('content', '')[:200]}"
            for m in messages[:30]
        ])

        summarize_prompt = """Summarize this wellness coaching conversation in 3-4 sentences.

Focus on:
1. User's stated goals and progress
2. Important facts (injuries, constraints, preferences mentioned)
3. Key advice given or commitments made

Be concise but preserve critical context for future conversations.

Conversation:
"""

        try:
            # Use Anthropic directly for summarization with Haiku for efficiency
            import anthropic

            client = anthropic.AsyncAnthropic()

            response = await client.messages.create(
                model="claude-3-5-haiku-20241022",  # Use Haiku for efficiency
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": f"{summarize_prompt}\n{conv_text}"
                    }
                ]
            )

            summary = response.content[0].text if response.content else None

            if summary:
                # Save summary to database
                conv_result = await self._db.execute(
                    select(CoachConversationORM).where(
                        CoachConversationORM.session_id == session_id
                    )
                )
                conversation = conv_result.scalar_one_or_none()
                if conversation:
                    conversation.summary = summary[:1000]  # Limit summary length
                    await self._db.commit()
                    logger.info(f"Generated summary for conversation {session_id}")

            return summary

        except Exception as e:
            logger.warning(f"Error summarizing conversation: {e}")
            return None

    async def _increment_message_count(self, session_id: str) -> None:
        """Increment the message count for a conversation."""
        conv_result = await self._db.execute(
            select(CoachConversationORM).where(
                CoachConversationORM.session_id == session_id
            )
        )
        conversation = conv_result.scalar_one_or_none()
        if conversation:
            conversation.message_count += 1
            await self._db.commit()

    async def _get_agent_deps(
        self,
        identity_id: str,
        skills: list[str] | None = None,
        conversation_summary: str | None = None,
    ) -> UgokiAgentDeps:
        """Create agent dependencies for streaming with full user context.

        Args:
            identity_id: User's identity ID
            skills: Optional list of activated skills for memory filtering
            conversation_summary: Optional summary from earlier conversation for context continuity
        """
        # Build all context in parallel
        user_context = await self._build_user_context(identity_id)
        prefs_context = await self._build_user_preferences_context(identity_id)
        health_context = await self._build_health_context(identity_id)

        # Load memories relevant to activated skills
        memory_context = await self._build_memory_context(identity_id, skills)

        # Combine user context and preferences
        combined_user_context = user_context
        if prefs_context:
            combined_user_context = f"{user_context}\n\n{prefs_context}" if user_context else prefs_context

        return UgokiAgentDeps(
            db=self._db,
            identity_id=identity_id,
            embedding_client=get_embedding_client(),
            http_client=get_http_client(),
            brave_api_key=get_brave_api_key(),
            memories=memory_context,
            user_context=combined_user_context,
            health_context=health_context,
            conversation_summary=conversation_summary or "",
        )

    async def _build_memory_context(
        self,
        identity_id: str,
        skills: list[str] | None = None,
    ) -> str:
        """
        Build memory context from stored user memories.

        Args:
            identity_id: User's identity ID
            skills: Optional list of activated skills for filtering

        Returns:
            Formatted memory string for prompt injection
        """
        try:
            memory_service = MemoryService(self._db)

            if skills:
                memories = await memory_service.get_memories_for_skills(identity_id, skills)
            else:
                memories = await memory_service.get_all_active_memories(identity_id, limit=10)

            return format_memories_for_prompt(memories)

        except Exception as e:
            logger.warning(f"Error loading memories: {e}")
            return ""

    async def _get_optimized_context(
        self,
        identity_id: str,
        query: str,
        skills: list[str] | None = None,
        memories: str | None = None,
        conversation_summary: str | None = None,
    ) -> tuple[str, str, str]:
        """
        Build optimized context using the ContextManager.

        Uses tiered loading and token budget enforcement for
        optimal context window usage.

        Args:
            identity_id: User's identity ID
            query: User's query for context classification
            skills: Activated skill names
            memories: Formatted memories string
            conversation_summary: Previous conversation summary

        Returns:
            Tuple of (user_context, health_context, memory_context)
        """
        manager = ContextManager(self._db, identity_id)
        return await manager.build_context(
            query=query,
            skills=skills,
            memories=memories,
            conversation_summary=conversation_summary,
        )

    async def _maybe_extract_memories(
        self,
        identity_id: str,
        session_id: str,
    ) -> None:
        """
        Extract and store memories from conversation if extraction threshold is met.

        Extraction triggers:
        - After first 5 messages
        - Every 10 messages thereafter

        Args:
            identity_id: User's identity ID
            session_id: Conversation session ID
        """
        try:
            # Get conversation message count
            conv_result = await self._db.execute(
                select(CoachConversationORM).where(
                    CoachConversationORM.session_id == session_id
                )
            )
            conversation = conv_result.scalar_one_or_none()

            if not conversation:
                return

            message_count = conversation.message_count

            # Check if we should extract memories
            # Extract after 5 messages initially, then every 10 messages
            last_extraction = conversation.session_metadata.get("last_memory_extraction_count")

            if not should_extract_memories(message_count, last_extraction):
                return

            logger.info(f"Triggering memory extraction for conversation {session_id} at {message_count} messages")

            # Load recent messages
            history, _ = await self._load_conversation_history(session_id, max_messages=20)

            if not history:
                return

            # Extract and store memories
            memory_service = MemoryService(self._db)
            await memory_service.extract_and_store_memories(
                identity_id=identity_id,
                session_id=session_id,
                messages=history,
            )

            # Update last extraction count in metadata
            metadata = conversation.session_metadata or {}
            metadata["last_memory_extraction_count"] = message_count
            conversation.session_metadata = metadata
            await self._db.commit()

        except Exception as e:
            logger.warning(f"Error extracting memories: {e}")

    async def _maybe_evaluate_response(
        self,
        session_id: str,
        message_id: int,
        user_query: str,
        coach_response: str,
        user_context: str | None = None,
    ) -> None:
        """
        Evaluate a response if sampling criteria are met.

        Uses LLM-as-Judge to assess response quality on helpfulness,
        safety, and personalization dimensions.

        Args:
            session_id: Conversation session ID
            message_id: ID of the saved AI response message
            user_query: The user's original query
            coach_response: The AI coach's response
            user_context: Optional user context summary
        """
        try:
            evaluation_service = EvaluationService(self._db)

            # Check if we should evaluate (sampling + minimum length)
            if not evaluation_service.should_evaluate(len(coach_response)):
                return

            logger.debug(f"Evaluating response for message {message_id}")

            # Build evaluation request
            request = EvaluationRequest(
                user_query=user_query,
                coach_response=coach_response,
                user_context_summary=user_context[:500] if user_context else None,
                session_id=session_id,
                message_id=message_id,
            )

            # Evaluate and store (async but awaited to ensure completion)
            result = await evaluation_service.evaluate_and_store(request)

            if result:
                logger.info(
                    f"Evaluated message {message_id}: overall={result.overall_score:.2f}, "
                    f"safety={result.safety_score:.1f}"
                )

        except Exception as e:
            # Evaluation errors should not affect the user experience
            logger.warning(f"Error evaluating response: {e}")

    async def stream_chat(
        self,
        identity_id: str,
        request: StreamChatRequest,
    ) -> AsyncIterator[StreamChunk]:
        """
        Stream a chat response from the AI coach.

        Args:
            identity_id: User's identity ID
            request: Stream chat request with query and optional session_id

        Yields:
            StreamChunk objects with text and metadata
        """
        personality = request.personality or await self._get_personality(identity_id)

        # Safety check first
        safety_result = check_message_safety(request.message)

        if safety_result.action == SafetyAction.BLOCK:
            yield StreamChunk(
                text=safety_result.redirect_message or self._get_default_safety_message(),
                complete=True,
            )
            return

        # Create or get conversation
        session_id = request.session_id
        is_new_conversation = session_id is None

        if is_new_conversation:
            conversation = await self.create_conversation(identity_id)
            session_id = conversation.session_id
            title = await self._generate_title(request.message)
            # Update title
            await self.update_conversation(identity_id, session_id, title=title)
        else:
            # Verify ownership
            query = select(CoachConversationORM).where(
                CoachConversationORM.session_id == session_id,
                CoachConversationORM.identity_id == identity_id,
            )
            result = await self._db.execute(query)
            if not result.scalar_one_or_none():
                yield StreamChunk(
                    text="Conversation not found.",
                    error="conversation_not_found",
                    complete=True,
                )
                return
            title = None

        # Save user message
        await self._save_message(session_id, "human", request.message)
        await self._increment_message_count(session_id)

        # Load conversation history for existing conversations
        message_history = None
        conversation_summary = None
        if not is_new_conversation:
            history, conversation_summary = await self._load_conversation_history(session_id)
            # Exclude the current message we just saved (last item)
            if history and len(history) > 1:
                # Summary is now passed to deps, not injected as fake messages
                message_history = self._convert_to_pydantic_messages(history[:-1])

        # Route query to determine which skills to activate (progressive disclosure)
        activated_skills = route_query(request.message)
        if activated_skills:
            logger.debug(f"Activated skills for query: {activated_skills}")

        # Get agent dependencies with skill-filtered memories and conversation summary
        deps = await self._get_agent_deps(
            identity_id,
            skills=activated_skills,
            conversation_summary=conversation_summary,
        )

        # Stream response from agent
        full_response = ""
        prev_length = 0
        first_chunk = True

        try:
            async for text_chunk in stream_coach_response(
                query=request.message,
                deps=deps,
                personality=personality.value if personality else "motivational",
                message_history=message_history,
                skills=activated_skills,
            ):
                # Pydantic AI stream_text() returns cumulative text, not deltas
                # Extract just the new part (delta) to send to the client
                full_response = text_chunk
                delta = text_chunk[prev_length:]
                prev_length = len(text_chunk)

                # Skip empty deltas
                if not delta:
                    continue

                # Send chunk with session info on first chunk
                if first_chunk:
                    yield StreamChunk(
                        text=delta,
                        session_id=session_id if is_new_conversation else None,
                        conversation_title=title if is_new_conversation else None,
                        complete=False,
                    )
                    first_chunk = False
                else:
                    yield StreamChunk(
                        text=delta,
                        complete=False,
                    )

            # Apply post-response safety filter
            filtered_response, was_filtered = filter_ai_response(full_response)
            if was_filtered:
                # Add disclaimer at the end
                disclaimer = get_safety_disclaimer()
                yield StreamChunk(
                    text=disclaimer,
                    complete=False,
                )
                full_response = filtered_response

            # Save AI response and get message ID for evaluation
            message_id = await self._save_message(session_id, "ai", full_response)
            await self._increment_message_count(session_id)
            await self._update_conversation_timestamp(session_id)

            # Note: Summarization is now handled synchronously in _load_conversation_history
            # when the conversation exceeds SUMMARIZE_AFTER_MESSAGES threshold.
            # This ensures the summary is available before loading context for the next message.

            # Trigger memory extraction periodically
            await self._maybe_extract_memories(identity_id, session_id)

            # Trigger evaluation (sampled, async)
            if message_id:
                await self._maybe_evaluate_response(
                    session_id=session_id,
                    message_id=message_id,
                    user_query=request.message,
                    coach_response=full_response,
                    user_context=deps.user_context,
                )

            # Final chunk to signal completion
            yield StreamChunk(
                text="",
                complete=True,
            )

        except Exception as e:
            logger.error(f"Error streaming chat: {e}")
            # Fall back to pattern matching
            fallback_response = self._simple_response(request.message, personality)
            await self._save_message(session_id, "ai", fallback_response.message)
            await self._increment_message_count(session_id)
            await self._update_conversation_timestamp(session_id)

            yield StreamChunk(
                text=fallback_response.message,
                session_id=session_id if is_new_conversation else None,
                conversation_title=title if is_new_conversation else None,
                complete=True,
            )

    # ============ GDPR Export Methods ============

    async def export_coach_data(self, identity_id: str) -> dict:
        """Export all coach data for GDPR compliance."""
        # Get all conversations
        conversations_result = await self._db.execute(
            select(CoachConversationORM).where(
                CoachConversationORM.identity_id == identity_id
            )
        )
        conversations = conversations_result.scalars().all()

        export_data = {
            "conversations": [],
            "exported_at": datetime.now(UTC).isoformat(),
        }

        for conv in conversations:
            # Get messages for this conversation
            messages_result = await self._db.execute(
                select(CoachMessageORM).where(
                    CoachMessageORM.session_id == conv.session_id
                ).order_by(CoachMessageORM.created_at.asc())
            )
            messages = messages_result.scalars().all()

            export_data["conversations"].append({
                "session_id": conv.session_id,
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
                "last_message_at": conv.last_message_at.isoformat(),
                "is_archived": conv.is_archived,
                "messages": [
                    {
                        "type": m.message.get("type"),
                        "content": m.message.get("content"),
                        "created_at": m.created_at.isoformat(),
                    }
                    for m in messages
                ],
            })

        return export_data

    async def delete_all_coach_data(self, identity_id: str) -> int:
        """Delete all coach data for GDPR compliance. Returns count of deleted conversations."""
        result = await self._db.execute(
            delete(CoachConversationORM).where(
                CoachConversationORM.identity_id == identity_id
            )
        )
        await self._db.commit()
        return result.rowcount
