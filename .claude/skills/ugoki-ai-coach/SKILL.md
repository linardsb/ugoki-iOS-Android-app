---
name: ugoki-ai-coach
description: >
  UGOKI AI Coach module with Pydantic AI and Claude. Load when: working on AI
  chat, creating agent tools, modifying coach behavior, adding AI features,
  streaming responses, or safety filtering. Keywords: AI, coach, Pydantic AI,
  Claude, agent, tool, chat, streaming, safety, user insights, anthropic,
  claude-3-5-sonnet, claude-3-5-haiku, Logfire, RunContext, deps, dependencies,
  CoachDependencies, CoachResponse, system_prompt, @coach_agent.tool, run_stream,
  StreamingResponse, text/event-stream, SSE, blocked topics, medical redirect,
  BLOCKED_TOPICS, check_safety, ai_coach/, agents/, tools/, prompts/, safety.py,
  wellness, fasting advice, workout advice, personalization, suggestions.
---

# UGOKI AI Coach Development

## Tech Stack

```
Pydantic AI     - Agent framework (type-safe, dependency injection)
Claude 3.5      - Sonnet (complex), Haiku (fast/cheap)
Logfire         - Observability for AI calls
FastAPI         - Streaming responses
```

---

## Module Structure

```
src/modules/ai_coach/
├── __init__.py
├── routes.py              # FastAPI endpoints
├── agents/
│   ├── __init__.py
│   ├── coach.py           # Main coaching agent
│   └── summarizer.py      # Research summarizer (Haiku)
├── tools/
│   ├── __init__.py
│   ├── module_tools.py    # Tools that call other modules
│   └── biomarkers.py      # Bloodwork analysis tools
├── prompts/
│   └── system.py          # System prompts
└── safety.py              # Safety filtering
```

---

## Agent Pattern (Pydantic AI)

### Dependencies (Black Box Compliant)

```python
# agents/coach.py

from pydantic import BaseModel
from pydantic_ai import Agent, RunContext

class CoachDependencies(BaseModel):
    """Injected interfaces - NOT implementations"""
    identity_id: str
    time_keeper: "TimeKeeperInterface"   # Abstract interface
    metrics: "MetricsInterface"
    progression: "ProgressionInterface"
    content: "ContentInterface"
    
    class Config:
        arbitrary_types_allowed = True
```

### Agent Definition

```python
from pydantic_ai import Agent

coach_agent = Agent(
    "anthropic:claude-3-5-sonnet-latest",
    deps_type=CoachDependencies,
    result_type=CoachResponse,
    system_prompt="""
You are UGOKI Coach, a personal wellness assistant for intermittent fasting 
and HIIT workouts.

Your role:
- Provide personalized guidance based on user's actual data
- Encourage without being pushy
- Give specific, actionable suggestions
- Celebrate progress and streaks
- NEVER give medical advice for health conditions

IMPORTANT:
- Always use tools to get current user data before responding
- Never assume user's state - verify with tools
- If user mentions a medical condition, redirect to healthcare provider
"""
)
```

### Tool Definition

```python
@coach_agent.tool
async def get_active_fast(
    ctx: RunContext[CoachDependencies]
) -> dict | None:
    """Get user's currently active fasting window, if any."""
    window = await ctx.deps.time_keeper.get_active_window(
        ctx.deps.identity_id,
        window_type="fasting"
    )
    if window:
        return {
            "id": window.id,
            "started_at": window.started_at.isoformat(),
            "hours_elapsed": window.hours_elapsed,
            "state": window.state,
        }
    return None


@coach_agent.tool
async def get_fasting_streak(
    ctx: RunContext[CoachDependencies]
) -> dict:
    """Get user's current fasting streak."""
    streak = await ctx.deps.progression.get_streak(
        ctx.deps.identity_id,
        streak_type="fasting"
    )
    return {
        "current_days": streak.current_value,
        "longest_days": streak.max_value,
    }


@coach_agent.tool
async def get_recent_weight(
    ctx: RunContext[CoachDependencies],
    days: int = 7
) -> list[dict]:
    """Get user's weight measurements from the last N days."""
    metrics = await ctx.deps.metrics.get_history(
        ctx.deps.identity_id,
        metric_type="weight",
        days=days
    )
    return [
        {"value": m.value, "unit": m.unit, "date": m.recorded_at.isoformat()}
        for m in metrics
    ]


@coach_agent.tool
async def recommend_workout(
    ctx: RunContext[CoachDependencies],
    max_duration_minutes: int = 20,
    max_difficulty: int = 3
) -> dict | None:
    """Get a workout recommendation based on preferences."""
    recommendations = await ctx.deps.content.get_recommendations(
        ctx.deps.identity_id,
        content_type="workout",
        context={"duration_max": max_duration_minutes},
        limit=1
    )
    if recommendations:
        r = recommendations[0]
        return {
            "id": r.id,
            "title": r.title,
            "duration_minutes": r.duration_minutes,
            "difficulty": r.difficulty,
        }
    return None
```

---

## Response Models

```python
from pydantic import BaseModel
from typing import List, Optional

class Suggestion(BaseModel):
    action: str          # What to do
    reason: str          # Why it helps
    priority: int        # 1-3 (1 = most important)

class CoachResponse(BaseModel):
    message: str                    # Main response
    suggestions: List[Suggestion]   # Actionable items
    tools_used: List[str]           # For debugging/logging
    
class InsightResponse(BaseModel):
    insight_type: str    # "pattern", "milestone", "recommendation"
    title: str
    description: str
    data: Optional[dict] = None
```

---

## FastAPI Routes

### Standard Chat

```python
# routes.py

from fastapi import APIRouter, Depends
from .agents.coach import coach_agent, CoachDependencies

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])

@router.post("/chat", response_model=CoachResponse)
async def chat(
    message: str,
    identity: str = Depends(get_current_identity),
    time_keeper: TimeKeeperService = Depends(get_time_keeper),
    metrics: MetricsService = Depends(get_metrics),
    progression: ProgressionService = Depends(get_progression),
    content: ContentService = Depends(get_content),
):
    deps = CoachDependencies(
        identity_id=identity,
        time_keeper=time_keeper,
        metrics=metrics,
        progression=progression,
        content=content,
    )
    
    result = await coach_agent.run(message, deps=deps)
    return result.data
```

### Streaming Chat

```python
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def chat_stream(
    message: str,
    identity: str = Depends(get_current_identity),
    # ... other deps
):
    deps = CoachDependencies(...)

    async def generate():
        async with coach_agent.run_stream(message, deps=deps) as result:
            async for text in result.stream():
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        generate(), 
        media_type="text/event-stream"
    )
```

---

## Safety Filtering

```python
# safety.py

BLOCKED_TOPICS = [
    "diabetes",
    "eating disorder",
    "anorexia",
    "bulimia",
    "pregnancy",
    "medication",
    "prescription",
    "diagnosis",
]

MEDICAL_REDIRECT = """
I appreciate you sharing that with me. For questions related to {topic}, 
I'd recommend speaking with a healthcare provider who can give you 
personalized medical advice. 

Is there anything else about your fasting or workout routine I can help with?
"""

def check_safety(message: str) -> tuple[bool, str | None]:
    """Returns (is_safe, redirect_message)"""
    message_lower = message.lower()
    
    for topic in BLOCKED_TOPICS:
        if topic in message_lower:
            return False, MEDICAL_REDIRECT.format(topic=topic)
    
    return True, None
```

### Using in Routes

```python
@router.post("/chat")
async def chat(message: str, ...):
    # Safety check first
    is_safe, redirect = check_safety(message)
    if not is_safe:
        return CoachResponse(
            message=redirect,
            suggestions=[],
            tools_used=["safety_filter"]
        )
    
    # Proceed with agent
    result = await coach_agent.run(message, deps=deps)
    return result.data
```

---

## Using Claude Haiku (Fast/Cheap)

```python
# For simpler tasks like summarization
summarizer_agent = Agent(
    "anthropic:claude-3-5-haiku-latest",  # Much cheaper
    result_type=SummaryResponse,
    system_prompt="Summarize research papers into actionable insights..."
)
```

---

## Logfire Observability

```python
# In main.py or config
import logfire

logfire.configure()  # Reads LOGFIRE_TOKEN from env

# Pydantic AI automatically logs to Logfire:
# - Agent runs
# - Tool calls
# - Token usage
# - Latency
```

---

## Testing Agents

```python
import pytest
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_coach_with_mocked_deps():
    # Mock the dependencies
    mock_time_keeper = AsyncMock()
    mock_time_keeper.get_active_window.return_value = None
    
    mock_progression = AsyncMock()
    mock_progression.get_streak.return_value = MockStreak(current_value=5)
    
    deps = CoachDependencies(
        identity_id="test_123",
        time_keeper=mock_time_keeper,
        metrics=AsyncMock(),
        progression=mock_progression,
        content=AsyncMock(),
    )
    
    result = await coach_agent.run(
        "How's my fasting going?",
        deps=deps
    )
    
    assert result.data.message
    assert "streak" in result.data.message.lower()
```

---

## Common Patterns

### Tool that Returns "No Data"

```python
@coach_agent.tool
async def get_latest_bloodwork(ctx: RunContext[CoachDependencies]) -> dict | None:
    """Get user's most recent bloodwork results."""
    biomarkers = await ctx.deps.metrics.get_latest_biomarkers(ctx.deps.identity_id)
    
    if not biomarkers:
        return None  # Agent will mention no bloodwork on file
    
    return {
        "test_date": biomarkers.test_date.isoformat(),
        "markers": [
            {"name": m.name, "value": m.value, "unit": m.unit, "flag": m.flag}
            for m in biomarkers.markers
        ]
    }
```

### Structured Output from Agent

```python
class MealPlanResponse(BaseModel):
    meals: List[MealSuggestion]
    total_calories: int
    fasting_compatible: bool
    
meal_planner = Agent(
    "anthropic:claude-3-5-sonnet-latest",
    result_type=MealPlanResponse,  # Forces structured output
    ...
)
```

---

## References

- `references/prompts.md` - System prompt variations
- `references/tools-catalog.md` - All available tools
- `references/safety-rules.md` - Complete safety filtering rules
