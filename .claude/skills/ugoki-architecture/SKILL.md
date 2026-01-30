---
name: ugoki-architecture
description: >
  UGOKI project architecture and context. ALWAYS LOAD FIRST when starting any
  UGOKI work session or when you need to understand the system design. Use for:
  module boundaries, primitives (IDENTITY, TIME_WINDOW, ACTIVITY_EVENT, METRIC,
  PROGRESSION), black box principles, project structure, tech stack overview,
  or answering "which module owns X?" questions. Keywords: architecture, overview,
  structure, module, black box, primitive, which module, who owns, codebase,
  project structure, tech stack, data flow, interface, cross-module, monorepo,
  apps/api, apps/mobile, identity, time_keeper, metrics, progression, content,
  ai_coach, notification, profile, event_journal, social, research, UGOKI.
---

# UGOKI Architecture

## What is UGOKI?

Mobile wellness app = Intermittent Fasting + HIIT workouts for busy professionals.
Japanese "動き" (ugoki) = movement. **MVP is 100% complete.**

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), Pydantic 2.0, Alembic, uv |
| **AI** | Pydantic AI, Claude 3.5 Sonnet/Haiku, Logfire |
| **Mobile** | Expo SDK 52, React Native 0.76, Tamagui 1.141, Zustand 5.0, TanStack Query 5.0 |
| **Infra** | Fly.io, Cloudflare R2, Expo Push, Resend, Sentry |
| **DB** | SQLite (dev) → PostgreSQL (prod) |

---

## Black Box Principles (Eskil Steenberg)

> "Every module should be a black box with a clean, documented API."

### The 4 Rules

1. **Interface Only** - Module API is the ONLY way to interact. No cross-module DB queries.
2. **Opaque References** - All IDs are opaque strings. Never parse/construct them.
3. **Replaceability** - Could you reimplement from interface alone? Must be yes.
4. **Single Owner** - One person can fully own one module.

### What This Means In Practice

```python
# ❌ WRONG: Importing another module's ORM
from src.modules.metrics.orm import MetricORM
result = await db.execute(select(MetricORM).where(...))

# ✅ RIGHT: Using the module's service interface
metrics_service = MetricsService(db)
result = await metrics_service.get_latest(identity_id, "weight")
```

---

## 5 Core Primitives

Every piece of data in UGOKI is one of these:

| Primitive | What It Is | Examples |
|-----------|------------|----------|
| **IDENTITY** | Who is acting (opaque, no PII) | `id_abc123` |
| **TIME_WINDOW** | Bounded time period with state | Fasting window, workout session |
| **ACTIVITY_EVENT** | Immutable point-in-time occurrence | `fasting.completed`, `weight.logged` |
| **METRIC** | Numeric measurement + timestamp | Weight: 75.5kg, Calories: 1800 |
| **PROGRESSION** | Position in ordered sequence | Streak day 7, Level 12, XP 4500 |

See `references/primitives.md` for detailed schemas.

---

## 11 Modules

| Module | Purpose | Key Interfaces |
|--------|---------|----------------|
| **IDENTITY** | Auth, JWT, capabilities | `authenticate()`, `has_capability()` |
| **TIME_KEEPER** | Fasting/workout timers | `open_window()`, `close_window()`, `get_active()` |
| **EVENT_JOURNAL** | Immutable audit log | `record_event()`, `get_events()` |
| **METRICS** | Weight, biomarkers | `record_metric()`, `get_latest()`, `get_trend()` |
| **PROGRESSION** | Streaks, XP, achievements | `get_level()`, `get_streaks()`, `unlock_achievement()` |
| **CONTENT** | 16 workouts, 30 recipes | `get_workout()`, `get_recipes()`, `recommend()` |
| **NOTIFICATION** | Push, email, scheduling | `register_token()`, `send_push()` |
| **PROFILE** | User PII, goals (GDPR) | `get_profile()`, `update_goals()` |
| **AI_COACH** | Chat, insights, safety | `chat()`, `get_insights()` |
| **SOCIAL** | Friends, challenges | `send_friend_request()`, `get_leaderboard()` |
| **RESEARCH** | PubMed, AI summaries | `search_papers()`, `get_digest()` |

---

## Data Flow Example

```
User completes a fast:

1. TIME_KEEPER.close_window(window_id, "completed")
   │
   ├─► EVENT_JOURNAL.record_event("fasting.completed", {...})
   │
   ├─► METRICS.record_metric("fasting_hours", 16.5)
   │
   └─► PROGRESSION.check_achievements()
       │
       ├─► Updates streak
       ├─► Awards XP
       └─► NOTIFICATION.send_push("🎉 Fast complete!")
```

---

## Project Structure

```
ugoki/
├── apps/
│   ├── api/                           # Python FastAPI
│   │   ├── src/
│   │   │   ├── modules/               # 11 black box modules
│   │   │   │   └── {module}/
│   │   │   │       ├── __init__.py    # Exports
│   │   │   │       ├── interface.py   # Abstract interface
│   │   │   │       ├── models.py      # Pydantic models
│   │   │   │       ├── orm.py         # SQLAlchemy models
│   │   │   │       ├── service.py     # Business logic
│   │   │   │       └── routes.py      # FastAPI endpoints
│   │   │   ├── core/                  # Config, security, deps
│   │   │   └── main.py
│   │   ├── alembic/                   # Migrations
│   │   ├── scripts/
│   │   │   └── test_api.py            # 64-endpoint test suite
│   │   └── tests/
│   │
│   └── mobile/                        # Expo React Native
│       ├── app/
│       │   ├── (auth)/                # Login, signup, onboarding
│       │   ├── (tabs)/                # Main tabs (dashboard, fasting, etc)
│       │   └── (modals)/              # Modal screens
│       ├── features/                  # Feature modules
│       │   └── {feature}/
│       │       ├── types.ts           # Match backend models
│       │       ├── hooks/             # TanStack Query
│       │       └── components/
│       └── shared/
│           ├── api/                   # Axios client
│           ├── stores/                # Zustand + auth
│           ├── components/ui/         # Base components
│           └── theme/                 # Tamagui config
└── docs/
```

---

## "Which Module Owns This?" Quick Reference

| Feature/Data | Module |
|--------------|--------|
| User login, JWT tokens | IDENTITY |
| Fasting timer, eating windows | TIME_KEEPER |
| Workout timer | TIME_KEEPER |
| Weight tracking | METRICS |
| Bloodwork/biomarkers | METRICS |
| Streaks, XP, levels | PROGRESSION |
| Achievements | PROGRESSION |
| Workout videos, recipes | CONTENT |
| Push notifications | NOTIFICATION |
| User name, email, goals | PROFILE |
| AI chat | AI_COACH |
| Friends, followers | SOCIAL |
| Leaderboards | SOCIAL |
| Challenges | SOCIAL |
| PubMed papers | RESEARCH |

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Import ORM from another module | Use service interface |
| Parse/construct IDs | Treat as opaque strings |
| Direct cross-module DB queries | Call module's service |
| Skip EVENT_JOURNAL for actions | Record all state changes |
| Mix PII with other data | Keep in PROFILE only |
| Hardcode API keys | Use environment variables |

---

## References

- `references/primitives.md` - Full primitive schemas with all fields
- `references/module-interfaces.md` - Complete interface contracts
- `references/api-conventions.md` - REST patterns, error formats
