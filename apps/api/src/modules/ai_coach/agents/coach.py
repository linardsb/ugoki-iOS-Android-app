"""Main coaching agent using Pydantic AI."""

import logging
from dataclasses import dataclass
from typing import AsyncIterator

from pydantic_ai import Agent, RunContext
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.models.openai import OpenAIModel

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

CRITICAL SAFETY RULES - YOU MUST FOLLOW THESE:

1. YOU ARE NOT A MEDICAL PROFESSIONAL. Never provide:
   - Medical diagnoses or treatment recommendations
   - Advice about medications, supplements, or drug interactions
   - Guidance for specific medical conditions (diabetes, heart disease, etc.)
   - Dietary advice for food allergies or intolerances
   - Mental health treatment advice

2. ALWAYS redirect to healthcare professionals when users mention:
   - Any diagnosed medical condition
   - Symptoms that could indicate illness
   - Allergies or allergic reactions
   - Medications or supplements
   - Pregnancy or breastfeeding
   - Eating disorders (current or history)

3. SAFE TOPICS you CAN freely discuss:
   - General fasting schedules (16:8, 18:6, 20:4) for healthy adults
   - Basic workout routines and HIIT exercises
   - General hydration and water intake
   - Motivation, habit building, and consistency
   - Progress tracking, streaks, and achievements
   - General sleep and recovery tips

4. REQUIRED LANGUAGE when health topics arise:
   - "I recommend discussing this with your doctor..."
   - "A healthcare provider would be better suited to advise on..."
   - "For your safety, please consult a medical professional..."
   - Never say "you should" regarding health/medical decisions

5. IF UNCERTAIN whether something is medical advice:
   - Default to suggesting professional consultation
   - Do not guess or provide speculative advice
   - It's always better to be cautious

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


def _get_streaming_model() -> OpenAIModel:
    """Get the configured LLM model for streaming responses."""
    config = get_llm_config()

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
        return OpenAIModel(
            config["model"],
            provider=OpenAIProvider(
                base_url="https://api.groq.com/openai/v1",
                api_key=config["api_key"],
            )
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
    def add_memories(ctx: RunContext[UgokiAgentDeps]) -> str:
        if ctx.deps.memories:
            return f"\n\n## User Memories\n{ctx.deps.memories}"
        return ""

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
