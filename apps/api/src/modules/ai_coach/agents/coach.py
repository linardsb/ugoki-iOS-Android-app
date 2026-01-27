"""Main coaching agent using Pydantic AI."""

import logging
from dataclasses import dataclass
from typing import AsyncIterator

from pydantic_ai import Agent, RunContext
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.providers.groq import GroqProvider
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.models.anthropic import AnthropicModel

from src.modules.ai_coach.models import CoachResponse, CoachPersonality
from src.modules.ai_coach.tools.fitness_tools import FitnessTools
from src.modules.ai_coach.agents.deps import UgokiAgentDeps
from src.modules.ai_coach.agents.prompt import get_personalized_prompt
from src.modules.ai_coach.agents.clients import get_llm_config
from src.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CoachDependencies:
    """Dependencies for the coach agent."""
    fitness_tools: FitnessTools
    personality: CoachPersonality = CoachPersonality.MOTIVATIONAL


def get_system_prompt(personality: CoachPersonality) -> str:
    """Generate system prompt based on personality."""
    base_prompt = """You are UGOKI Coach, an AI wellness coach specializing in intermittent fasting and HIIT workouts.

Your role is to:
- Motivate and encourage users on their fitness journey
- Provide personalized advice based on their progress
- Answer questions about fasting, workouts, and healthy habits
- Celebrate achievements and help users stay on track
- GUIDE USERS TO TAKE ACTION in the app

You have access to the user's fitness data through tools. Use them to personalize your responses.

ACTION GUIDANCE - VERY IMPORTANT:
When users want to do something, tell them HOW to do it in the app:
- "Start a fast" → "Head to the Fasting tab and tap 'Start Fast' to begin your fasting window!"
- "Do a workout" → "Check out the Workouts tab - I recommend [specific workout]. Tap it to start!"
- "Track weight" → "You can log your weight from the Home screen - tap the weight card!"
- "See progress" → "Your streaks and level are on the Home dashboard. Keep it up!"
- "Browse recipes" → "Tap on Recipes in your Profile to find healthy meal ideas!"

Always be SPECIFIC about where to go and what to tap. Users need clear navigation instructions.

Guidelines:
- Keep responses concise and actionable (2-3 sentences typically)
- Be supportive but honest
- Focus on sustainable habits, not quick fixes
- When suggesting workouts, mention specific ones from their recommendations
- Celebrate streaks and milestones
- ALWAYS include navigation instructions when users want to take action

IMPORTANT - YOUR PRIMARY JOB:
You ARE a fitness coach. Your purpose is to give workout and fasting advice. Do NOT refuse to help with:
- Workout recommendations and exercise questions
- Fasting schedules and intermittent fasting guidance
- General fitness tips and motivation
- Questions about exercises, reps, sets, duration
These are YOUR expertise. Answer them confidently!

ONLY redirect to healthcare professionals for:
- Diagnosed medical conditions (diabetes, heart disease)
- Symptoms of illness (chest pain, dizziness, injury)
- Medications or drug interactions
- Pregnancy or eating disorders
- Allergies requiring medical attention

For normal fitness questions, BE HELPFUL and give specific advice!

CRITICAL - TOOL USAGE:
When calling tools, ONLY use the parameters explicitly documented in each tool's description.
DO NOT invent or add parameters that are not listed. If a tool has no parameters, call it with no arguments.
Example: get_recommended_workouts() should be called with only the documented optional filters (workout_type, max_duration_minutes, difficulty) or with no arguments.

"""

    personality_prompts = {
        CoachPersonality.MOTIVATIONAL: """Your style is MOTIVATIONAL:
- Use energetic, uplifting language
- Celebrate every win, no matter how small
- Use phrases like "You've got this!", "Amazing progress!"
- Be enthusiastic and encouraging""",

        CoachPersonality.CALM: """Your style is CALM:
- Use peaceful, mindful language
- Focus on the journey, not just results
- Emphasize balance and self-compassion
- Use phrases like "Take a deep breath", "Be gentle with yourself"
- Encourage mindfulness in fitness""",

        CoachPersonality.TOUGH: """Your style is TOUGH:
- Be direct and no-nonsense
- Push users to do their best
- Use phrases like "No excuses!", "Push harder!"
- Hold them accountable
- Challenge them to exceed their limits""",

        CoachPersonality.FRIENDLY: """Your style is FRIENDLY:
- Be casual and conversational
- Like a supportive friend
- Use humor when appropriate
- Be relatable and down-to-earth
- Share in their struggles and victories""",
    }

    return base_prompt + personality_prompts.get(personality, personality_prompts[CoachPersonality.MOTIVATIONAL])


def get_model_name() -> str:
    """Get the model name based on settings."""
    provider = settings.ai_provider
    
    if provider == "ollama":
        return f"ollama:{settings.ollama_model}"
    elif provider == "groq":
        return f"groq:{settings.groq_model}"
    elif provider == "anthropic":
        return f"anthropic:{settings.anthropic_model}"
    elif provider == "openai":
        return f"openai:{settings.openai_model}"
    else:
        # Mock/test mode - use a simple response
        return "test"


def create_coach_agent(personality: CoachPersonality = CoachPersonality.MOTIVATIONAL) -> Agent[CoachDependencies, CoachResponse]:
    """Create a coach agent with the specified personality."""

    model_name = get_model_name()
    system_prompt = get_system_prompt(personality)

    agent = Agent(
        model_name,
        deps_type=CoachDependencies,
        output_type=CoachResponse,
        system_prompt=system_prompt,
    )

    @agent.tool
    async def get_active_fast(ctx: RunContext[CoachDependencies]) -> dict | None:
        """Get the user's currently active fast with elapsed time and progress."""
        return await ctx.deps.fitness_tools.get_active_fast()

    @agent.tool
    async def get_streaks(ctx: RunContext[CoachDependencies]) -> dict:
        """Get all user streaks (fasting, workout, logging, app usage)."""
        return await ctx.deps.fitness_tools.get_streaks()

    @agent.tool
    async def get_level_info(ctx: RunContext[CoachDependencies]) -> dict:
        """Get user's current level, XP, and progress to next level."""
        return await ctx.deps.fitness_tools.get_level_info()

    @agent.tool
    async def get_workout_stats(ctx: RunContext[CoachDependencies]) -> dict:
        """Get user's workout statistics including total workouts and this week's count."""
        return await ctx.deps.fitness_tools.get_workout_stats()

    @agent.tool
    async def get_recommended_workouts(ctx: RunContext[CoachDependencies]) -> list[dict]:
        """Get personalized workout recommendations for the user."""
        return await ctx.deps.fitness_tools.get_recommended_workouts()

    @agent.tool
    async def get_weight_trend(ctx: RunContext[CoachDependencies]) -> dict | None:
        """Get user's weight trend over the last 30 days."""
        return await ctx.deps.fitness_tools.get_weight_trend()

    @agent.tool
    async def get_today_summary(ctx: RunContext[CoachDependencies]) -> dict:
        """Get a complete summary of the user's current status and today's activities."""
        return await ctx.deps.fitness_tools.get_today_summary()

    # Biomarker tools
    @agent.tool
    async def get_latest_biomarkers(ctx: RunContext[CoachDependencies]) -> dict:
        """
        Get user's most recent bloodwork results.

        Returns all biomarkers from the latest upload with values,
        reference ranges, and flags indicating if out of range.

        Use this when:
        - User asks about their bloodwork
        - User wants health insights based on blood tests
        - User asks about specific markers (cholesterol, iron, etc.)
        """
        return await ctx.deps.fitness_tools.get_latest_biomarkers()

    @agent.tool
    async def get_biomarker_trend(ctx: RunContext[CoachDependencies], biomarker_name: str) -> dict:
        """
        Get historical trend for a specific biomarker over the past year.

        Args:
            biomarker_name: Name of biomarker (e.g., "haemoglobin", "cholesterol")

        Use this when:
        - User asks how a marker has changed over time
        - User wants to see if a value is improving
        - User mentions previous blood tests
        """
        return await ctx.deps.fitness_tools.get_biomarker_trend(biomarker_name)

    @agent.tool
    async def get_bloodwork_summary(ctx: RunContext[CoachDependencies]) -> dict:
        """
        Get a high-level summary of user's bloodwork status by category.

        Returns categories with status indicators (normal/needs_attention).

        Use this when:
        - User asks for an overview of their health
        - Starting a conversation about bloodwork
        - User asks "how are my blood tests looking"
        """
        return await ctx.deps.fitness_tools.get_bloodwork_summary()

    return agent


# ============ Streaming Agent Functions ============


def _get_streaming_model() -> OpenAIModel | GroqModel | AnthropicModel:
    """Get the configured LLM model for streaming responses."""
    config = get_llm_config()
    logger.info(f"[Coach] Using LLM provider: {config['provider']}, model: {config.get('model', 'unknown')}")

    if config["provider"] == "openai":
        return OpenAIModel(
            config["model"],
            provider=OpenAIProvider(
                base_url=config.get("base_url", "https://api.openai.com/v1"),
                api_key=config["api_key"],
            )
        )
    elif config["provider"] == "ollama":
        return OpenAIModel(
            config["model"],
            provider=OpenAIProvider(
                base_url=config.get("base_url", "http://localhost:11434") + "/v1",
                api_key="ollama",
            )
        )
    elif config["provider"] == "groq":
        # Use native GroqModel with GroqProvider for proper API compatibility
        return GroqModel(
            config["model"],
            provider=GroqProvider(api_key=config["api_key"]),
        )
    elif config["provider"] == "anthropic":
        # Use AnthropicModel for Claude models - best for tool calling and context
        return AnthropicModel(
            config["model"],
            provider=AnthropicProvider(api_key=config["api_key"]),
        )
    else:
        # Default fallback to ollama
        logger.warning(f"Using fallback model for provider: {config['provider']}")
        return OpenAIModel(
            "llama3.2",
            provider=OpenAIProvider(
                base_url="http://localhost:11434/v1",
                api_key="ollama",
            )
        )


def _create_simple_agent(personality: str = "motivational") -> Agent[UgokiAgentDeps, str]:
    """Create a simple agent WITHOUT tools for fallback when tool calling fails."""
    model = _get_streaming_model()
    system_prompt = get_personalized_prompt(personality, skills=None)

    agent = Agent(
        model,
        deps_type=UgokiAgentDeps,
        output_type=str,
        system_prompt=system_prompt + "\n\nNote: Use the user context provided to give personalized advice. Do not attempt to call any tools.",
        retries=1,
    )

    # Add dynamic system prompts for context
    @agent.system_prompt
    def add_user_context(ctx: RunContext[UgokiAgentDeps]) -> str:
        if ctx.deps.user_context:
            return f"\n\n## User Context\n{ctx.deps.user_context}"
        return ""

    @agent.system_prompt
    def add_health_context(ctx: RunContext[UgokiAgentDeps]) -> str:
        if ctx.deps.health_context:
            return f"\n\n## Health Considerations\n{ctx.deps.health_context}"
        return ""

    return agent


def _create_streaming_agent(
    personality: str = "motivational",
    skills: list[str] | None = None,
) -> Agent[UgokiAgentDeps, str]:
    """Create an agent configured for streaming with web search and RAG tools.

    Args:
        personality: Coach personality style
        skills: Optional list of skill names to activate for this query
    """
    model = _get_streaming_model()
    system_prompt = get_personalized_prompt(personality, skills=skills)

    agent = Agent(
        model,
        deps_type=UgokiAgentDeps,
        output_type=str,
        system_prompt=system_prompt,
        retries=2,
    )

    # Add dynamic system prompts
    @agent.system_prompt
    def add_conversation_summary(ctx: RunContext[UgokiAgentDeps]) -> str:
        """Inject conversation summary for context continuity across long conversations."""
        if ctx.deps.conversation_summary:
            return (
                f"\n\n## Earlier Conversation Context\n"
                f"This is a summary of our earlier conversation. Use it to maintain continuity:\n"
                f"{ctx.deps.conversation_summary}\n"
                f"---\n"
                f"Continue naturally from this context when responding."
            )
        return ""

    @agent.system_prompt
    def add_memories(ctx: RunContext[UgokiAgentDeps]) -> str:
        if ctx.deps.memories:
            return f"\n\n## User Memories (from previous sessions)\nIMPORTANT - Use this information to personalize your responses:\n{ctx.deps.memories}"
        return ""

    @agent.system_prompt
    def add_user_context(ctx: RunContext[UgokiAgentDeps]) -> str:
        if ctx.deps.user_context:
            return f"\n\n## Current User Stats\nRefer to these stats when giving personalized advice:\n{ctx.deps.user_context}"
        return ""

    @agent.system_prompt
    def add_health_context(ctx: RunContext[UgokiAgentDeps]) -> str:
        if ctx.deps.health_context:
            return f"\n\n## Health Considerations\nIMPORTANT safety information - always respect these:\n{ctx.deps.health_context}"
        return ""

    # ============ Fitness Tools ============
    # These tools give the AI access to user's fitness data for personalized responses

    @agent.tool
    async def get_active_fast(
        ctx: RunContext[UgokiAgentDeps],
        user_id: str | None = None,
        date: str | None = None,
        include_history: bool | None = None,
    ) -> dict | None:
        """Get the user's currently active fast with elapsed time and progress.

        Args:
            user_id: Optional (ignored, uses authenticated user)
            date: Optional date filter (ignored)
            include_history: Optional (ignored)

        Use this when user asks about their current fast or fasting status.
        """
        try:
            tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
            return await tools.get_active_fast()
        except Exception as e:
            logger.error(f"Error in get_active_fast tool: {e}", exc_info=True)
            return {"error": str(e), "is_active": False}

    @agent.tool
    async def get_streaks(
        ctx: RunContext[UgokiAgentDeps],
        streak_type: str | None = None,
    ) -> dict:
        """Get user streaks (fasting, workout, logging, app usage).

        Args:
            streak_type: Optional filter - 'fasting', 'workout', 'logging', or 'app_usage'.
                         If not provided, returns all streaks.

        Use this when user asks about their streaks, consistency, or progress.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        all_streaks = await tools.get_streaks()
        # Filter if specific type requested
        if streak_type and streak_type in all_streaks:
            return {streak_type: all_streaks[streak_type]}
        return all_streaks

    @agent.tool
    async def get_level_info(ctx: RunContext[UgokiAgentDeps]) -> dict:
        """Get user's current level, XP, and progress to next level.

        Use this when user asks about their level, XP, or achievements.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        return await tools.get_level_info()

    @agent.tool
    async def get_workout_stats(
        ctx: RunContext[UgokiAgentDeps],
        period: str | None = None,
    ) -> dict:
        """Get user's workout statistics including total workouts and current period count.

        Args:
            period: Time period - 'week', 'month', or 'all' (default 'week')

        Use this when user asks about their workout history or progress.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        # Note: period filtering not yet implemented in FitnessTools
        return await tools.get_workout_stats()

    @agent.tool
    async def get_recommended_workouts(
        ctx: RunContext[UgokiAgentDeps],
        workout_type: str | None = None,
        type: str | None = None,
        max_duration_minutes: int | None = None,
        max_duration: int | None = None,
        duration: int | None = None,
        duration_minutes: int | None = None,
        difficulty: str | None = None,
        level: str | None = None,
        user_fitness_level: str | None = None,
        fitness_level: str | None = None,
        goal_target: str | None = None,
        goal: str | None = None,
        activity_type: str | None = None,
        category: str | None = None,
        intensity: str | None = None,
        date: str | None = None,
        user_id: str | None = None,
        limit: int | None = None,
        count: int | None = None,
    ) -> list[dict]:
        """Get personalized workout recommendations for the user.

        Call this function with NO parameters for best results.
        All parameters are optional and currently ignored.

        Returns a list of recommended workouts.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        return await tools.get_recommended_workouts()

    @agent.tool
    async def get_weight_trend(
        ctx: RunContext[UgokiAgentDeps],
        days: int | None = None,
    ) -> dict | None:
        """Get user's weight trend over a specified period.

        Args:
            days: Number of days to analyze (default 30, max 365)

        Use this when user asks about their weight progress or body composition.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        period = min(days or 30, 365)  # Default 30, cap at 365
        return await tools.get_weight_trend(days=period)

    @agent.tool
    async def get_today_summary(
        ctx: RunContext[UgokiAgentDeps],
        user_id: str | None = None,
        date: str | None = None,
        include_details: bool | None = None,
    ) -> dict:
        """Get a complete summary of the user's current status and today's activities.

        Args:
            user_id: Optional (ignored, uses authenticated user)
            date: Optional date (ignored, always returns today)
            include_details: Optional (ignored)

        Use this for general status questions or when starting a conversation.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        return await tools.get_today_summary()

    @agent.tool
    async def get_recovery_status(
        ctx: RunContext[UgokiAgentDeps],
        user_id: str | None = None,
        date: str | None = None,
    ) -> dict:
        """Assess user's recovery readiness based on health data (HRV, sleep, resting HR).

        Args:
            user_id: Optional (ignored, uses authenticated user)
            date: Optional date (ignored)

        Use this when deciding workout intensity or when user asks if they should rest.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        return await tools.get_recovery_status()

    @agent.tool
    async def get_latest_biomarkers(
        ctx: RunContext[UgokiAgentDeps],
        user_id: str | None = None,
        marker_type: str | None = None,
        date: str | None = None,
    ) -> dict:
        """Get user's most recent bloodwork results with values and reference ranges.

        Args:
            user_id: Optional (ignored, uses authenticated user)
            marker_type: Optional filter (not yet implemented)
            date: Optional date filter (ignored)

        Use this when user asks about their bloodwork or health markers.
        """
        tools = FitnessTools(db=ctx.deps.db, identity_id=ctx.deps.identity_id)
        return await tools.get_latest_biomarkers()

    # NOTE: Web search and RAG tools are disabled until API keys are configured
    # To enable, set BRAVE_API_KEY and EMBEDDING_API_KEY in .env
    #
    # @agent.tool
    # async def web_search(ctx: RunContext[UgokiAgentDeps], query: str) -> str:
    #     """Search the web for fitness/wellness information."""
    #     from src.modules.ai_coach.tools.web_search import perform_web_search
    #     return await perform_web_search(query, ctx.deps.http_client, ctx.deps.brave_api_key)
    #
    # @agent.tool
    # async def retrieve_relevant_documents(ctx: RunContext[UgokiAgentDeps], user_query: str) -> str:
    #     """Search knowledge base using RAG."""
    #     from src.modules.ai_coach.tools.documents import retrieve_documents
    #     return await retrieve_documents(user_query, ctx.deps.db, ctx.deps.embedding_client)

    return agent


async def stream_coach_response(
    query: str,
    deps: UgokiAgentDeps,
    personality: str = "motivational",
    message_history: list | None = None,
    skills: list[str] | None = None,
) -> AsyncIterator[str]:
    """
    Stream responses from the coach agent.

    Args:
        query: User's message
        deps: Agent dependencies
        personality: Coach personality style
        message_history: Optional list of previous messages for multi-turn context
        skills: Optional list of skill names to activate for this query

    Yields:
        Text chunks as they're generated
    """
    agent = _create_streaming_agent(personality, skills=skills)

    try:
        async with agent.run_stream(
            query,
            deps=deps,
            message_history=message_history,
        ) as result:
            async for text in result.stream_text():
                yield text
    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"[Coach] First attempt failed: {error_str[:200]}")

        # Check if this is a tool-related error
        is_tool_error = any(x in error_str for x in [
            "tool call validation",
            "failed to call a function",
            "did not match schema",
            "additionalproperties",
            "parameters for tool",
        ])

        if is_tool_error:
            logger.info(f"[Coach] Tool error, using simple fallback agent")
            try:
                # Use a simple agent without tools as fallback
                fallback_agent = _create_simple_agent(personality)
                async with fallback_agent.run_stream(
                    query,
                    deps=deps,
                    message_history=message_history,
                ) as result:
                    async for text in result.stream_text():
                        yield text
                return
            except Exception as fallback_e:
                logger.error(f"[Coach] Fallback also failed: {fallback_e}")

        logger.error(f"Error streaming coach response: {e}")
        yield f"I'm having trouble connecting right now. Please try again in a moment."


async def run_coach_response(
    query: str,
    deps: UgokiAgentDeps,
    personality: str = "motivational",
    message_history: list | None = None,
    skills: list[str] | None = None,
) -> str:
    """
    Run the coach agent and return the full response.

    Args:
        query: User's message
        deps: Agent dependencies
        personality: Coach personality style
        message_history: Optional list of previous messages for multi-turn context
        skills: Optional list of skill names to activate for this query

    Returns:
        Complete response from the coach
    """
    agent = _create_streaming_agent(personality, skills=skills)

    try:
        result = await agent.run(query, deps=deps, message_history=message_history)
        return result.output
    except Exception as e:
        logger.error(f"Error running coach response: {e}")
        return "I'm having trouble connecting right now. Please try again in a moment."
