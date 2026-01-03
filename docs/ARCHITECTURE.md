# UGOKI Architecture

Detailed architecture documentation for the UGOKI wellness app.

---

## Design Philosophy

Black box modular architecture following Eskil Steenberg's principles.

- Each module is a replaceable black box with a clean interface
- Modules communicate only through defined interfaces
- Implementation details are completely hidden
- One person should be able to own one module

---

## Core Primitives

All data in UGOKI reduces to 5 primitive types:

| Primitive | Purpose |
|-----------|---------|
| `IDENTITY` | Who is acting (opaque reference, no PII) |
| `TIME_WINDOW` | Bounded time period (fasting, eating, workout) |
| `ACTIVITY_EVENT` | Immutable point-in-time occurrence |
| `METRIC` | Numeric measurement with timestamp |
| `PROGRESSION` | Position in ordered sequence (streaks, levels) |

---

## Modules (11 total)

```
IDENTITY       → Authentication, authorization
TIME_KEEPER    → All timers (fasting, workout, eating windows)
EVENT_JOURNAL  → Immutable event log, GDPR compliance
METRICS        → Numeric data storage, trends, aggregations
PROGRESSION    → Streaks, XP, levels, achievements
CONTENT        → Workout library, recipes, recommendations
NOTIFICATION   → Push, email, scheduling
PROFILE        → User PII, preferences (GDPR isolated)
AI_COACH       → Pydantic AI agents, Claude integration
SOCIAL         → Friends, followers, leaderboards, challenges
RESEARCH       → PubMed integration, AI summaries, saved papers
```

---

## Module Interface Pattern

Each module follows this structure:

```
module_name/
├── __init__.py
├── interface.py      # Abstract interface (what it does)
├── service.py        # Implementation (how it does it)
├── routes.py         # FastAPI endpoints
├── models.py         # Pydantic models
└── tests/
```

### Interface Example

```python
# time_keeper/interface.py
from abc import ABC, abstractmethod

class TimeKeeperInterface(ABC):
    @abstractmethod
    async def open_window(self, identity_id: str, window_type: str, ...) -> TimeWindow:
        """Open a new time window (fast, workout, etc.)"""
        pass

    @abstractmethod
    async def close_window(self, window_id: str, end_state: str) -> TimeWindow:
        """Close an active window"""
        pass

    @abstractmethod
    async def get_active_window(self, identity_id: str, window_type: str | None) -> TimeWindow | None:
        """Get currently active window"""
        pass
```

---

## AI Agent Pattern (Pydantic AI)

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel

class CoachDependencies(BaseModel):
    identity_id: str
    time_keeper: TimeKeeperInterface
    metrics: MetricsInterface
    # ... other module interfaces

coach_agent = Agent(
    "anthropic:claude-3-5-sonnet-latest",
    deps_type=CoachDependencies,
    result_type=CoachResponse,
    system_prompt="You are UGOKI Coach..."
)

@coach_agent.tool
async def get_active_fast(ctx: RunContext[CoachDependencies]) -> dict | None:
    """Tool that calls TIME_KEEPER through its interface"""
    return await ctx.deps.time_keeper.get_active_window(
        ctx.deps.identity_id,
        window_type="fast"
    )
```

---

## Black Box Rules

1. **Interface Only** - Modules communicate only through interfaces
2. **Opaque References** - Never parse or construct IDs from other modules
3. **No Leaky Abstractions** - If implementation change requires interface change, redesign
4. **Single Owner** - One person can own one module entirely
5. **Testable in Isolation** - Mock dependencies for unit tests

---

## Anti-Patterns to Avoid

```
- Don't truncate text sent to LLM
- Don't limit data display artificially
- Don't add defensive JSON parsing fallbacks
- Don't hardcode API keys (use env vars)
- Don't mix concerns (single responsibility)
- Don't skip tests
- Don't expose implementation details in interfaces
```

---

## Database Conventions

### Table Naming
- Snake_case, plural: `fasting_sessions`, `user_profiles`
- Module-prefixed where ambiguous

### Column Naming
- Snake_case: `created_at`, `identity_id`
- Foreign keys: `{referenced_table}_id`
- Timestamps: `created_at`, `updated_at`, `started_at`, `ended_at`

### IDs
- UUID for all primary keys
- Opaque to other modules (treat as strings)

---

## API Conventions

### Endpoints
```
GET    /api/v1/{module}/{resource}         # List
POST   /api/v1/{module}/{resource}         # Create
GET    /api/v1/{module}/{resource}/{id}    # Read
PATCH  /api/v1/{module}/{resource}/{id}    # Update
DELETE /api/v1/{module}/{resource}/{id}    # Delete
```

### Response Format
```json
{
  "data": { ... },
  "meta": { "timestamp": "...", "request_id": "..." }
}
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

---

## Testing Strategy

### Unit Tests (70%)
- Test each module in isolation
- Mock all dependencies
- Cover all interface methods

### Integration Tests (25%)
- Test module interactions
- Use test database
- Verify interface contracts

### E2E Tests (5%)
- Full user flows
- Real (staging) services
