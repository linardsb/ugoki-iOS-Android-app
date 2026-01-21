"""AI Coach agents."""

from src.modules.ai_coach.agents.coach import (
    create_coach_agent,
    CoachDependencies,
    UgokiAgentDeps,
    stream_coach_response,
    run_coach_response,
)
from src.modules.ai_coach.agents.deps import UgokiAgentDeps
from src.modules.ai_coach.agents.prompt import COACH_SYSTEM_PROMPT, get_personalized_prompt
from src.modules.ai_coach.agents.clients import (
    get_embedding_client,
    get_http_client,
    get_brave_api_key,
    get_llm_config,
)

__all__ = [
    "create_coach_agent",
    "CoachDependencies",
    "UgokiAgentDeps",
    "stream_coach_response",
    "run_coach_response",
    "COACH_SYSTEM_PROMPT",
    "get_personalized_prompt",
    "get_embedding_client",
    "get_http_client",
    "get_brave_api_key",
    "get_llm_config",
]
