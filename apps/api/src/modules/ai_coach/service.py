"""Service implementation for AI_COACH module."""

import logging
import random
from datetime import datetime, UTC

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
)
from src.modules.ai_coach.safety import (
    check_message_safety,
    SafetyAction,
    get_safety_disclaimer,
    filter_ai_response,
)

logger = logging.getLogger(__name__)


# In-memory personality storage (would be in DB in production)
_user_personalities: dict[str, CoachPersonality] = {}


class AICoachService(AICoachInterface):
    """Implementation of AI_COACH interface."""

    def __init__(self, db: AsyncSession):
        self._db = db

    def _get_personality(self, identity_id: str) -> CoachPersonality:
        """Get user's coach personality preference."""
        return _user_personalities.get(identity_id, CoachPersonality.MOTIVATIONAL)

    async def chat(
        self,
        identity_id: str,
        request: ChatRequest,
    ) -> ChatResponse:
        """Chat with the AI coach."""
        personality = request.personality or self._get_personality(identity_id)

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
        # Simple pattern matching for mock mode
        response = self._simple_response(request.message, personality)

        # REDIRECT: Add disclaimer to response
        if safety_result.action == SafetyAction.REDIRECT:
            response.message += get_safety_disclaimer()

        # Post-response filter: Check if AI response contains medical advice
        filtered_message, was_filtered = filter_ai_response(response.message)
        if was_filtered:
            response.message = filtered_message
            logger.info("Post-response safety filter added disclaimer")

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
        
        # Pattern matching for common queries
        if any(word in message_lower for word in ["fast", "fasting"]):
            return CoachResponse(
                message="Fasting is a powerful tool for metabolic health! "
                        "The 16:8 method is a great starting point. "
                        "Ready to start a new fast?",
                suggestions=["Start 16:8 fast", "Start 18:6 fast"],
                encouragement="Every hour of fasting brings you closer to your goals!",
            )
        
        elif any(word in message_lower for word in ["workout", "exercise", "hiit", "train"]):
            return CoachResponse(
                message="Let's get moving! I recommend checking out our HIIT workouts - "
                        "they're efficient and effective. Even 10 minutes makes a difference!",
                suggestions=["Quick HIIT Blast", "Bodyweight Basics"],
                workout_recommendation="Quick HIIT Blast",
                encouragement="Movement is medicine!",
            )
        
        elif any(word in message_lower for word in ["progress", "stats", "level", "xp"]):
            return CoachResponse(
                message="Your consistency is paying off! Keep tracking your progress "
                        "with workouts and fasting to level up faster.",
                suggestions=["View achievements", "Check streaks"],
                encouragement="Every day you're getting stronger!",
            )
        
        elif any(word in message_lower for word in ["weight", "lost", "gained", "scale"]):
            return CoachResponse(
                message="Tracking your weight helps you see the bigger picture. "
                        "Remember, weight fluctuates daily - focus on the weekly trend!",
                suggestions=["Log weight", "View trend"],
                encouragement="Trust the process!",
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
            # Generic helpful response
            return CoachResponse(
                message="I'm here to help you on your wellness journey! "
                        "You can ask me about fasting, workouts, tracking your progress, "
                        "or just chat when you need motivation.",
                suggestions=["Start workout", "Start fast", "Check progress"],
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
            personality=self._get_personality(identity_id),
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
        personality = self._get_personality(identity_id)
        
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
        """Set the coach personality for a user."""
        _user_personalities[identity_id] = personality
