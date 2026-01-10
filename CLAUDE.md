# UGOKI Project Context

AI assistant context file. For full documentation, see [docs/INDEX.md](docs/INDEX.md).

---

## What is UGOKI?

A mobile wellness app combining **Intermittent Fasting (IF)** with **High-Intensity Interval Training (HIIT)**, powered by AI personalization.

**Target Users:** Busy professionals seeking sustainable health optimization in 15-20 minutes daily.

---

## Current Status

**Phase:** MVP Complete - Ready for Production Deployment

| Component | Status |
|-----------|--------|
| Backend | 11/11 modules complete |
| Mobile | 9/9 phases complete |
| Next | Deploy to Fly.io, EAS builds |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic 2.0 |
| AI | Pydantic AI, Claude 3.5 Sonnet/Haiku |
| Mobile | Expo SDK 52, React Native, Tamagui, Zustand, TanStack Query |
| Infra | Fly.io, PostgreSQL, Cloudflare R2, Expo Push |

---

## Quick Commands

```bash
# Backend
cd apps/api
uv sync                                    # Install deps
uv run uvicorn src.main:app --reload       # Dev server
uv run pytest                              # Tests
uv run alembic upgrade head                # Migrations

# Mobile
cd apps/mobile
bun install                                # Install deps
bun run start                              # Dev server
eas build --platform all                   # Production build
```

---

## Documentation

| Need | Location |
|------|----------|
| Documentation hub | [docs/INDEX.md](docs/INDEX.md) |
| Product requirements | [docs/product/PRD.md](docs/product/PRD.md) |
| Roadmap | [docs/product/ROADMAP.md](docs/product/ROADMAP.md) |
| Architecture | [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md) |
| Feature specs | [docs/features/](docs/features/) |
| Known bugs | [docs/tracking/BUGS.md](docs/tracking/BUGS.md) |
| Dev guides | [docs/guides/](docs/guides/) |
| Standards | [docs/standards/](docs/standards/) |

---

## Project Structure

```
ugoki_1_0/
├── apps/
│   ├── api/                       # Python FastAPI backend
│   │   └── src/modules/           # 11 black box modules
│   └── mobile/                    # Expo React Native
│       ├── app/                   # Screens (Expo Router)
│       └── features/              # Feature modules
└── docs/                          # Documentation
    ├── product/                   # PRD, roadmap, decisions
    ├── architecture/              # System design
    ├── guides/                    # How-to guides
    ├── standards/                 # Best practices
    ├── features/                  # Feature specs
    └── tracking/                  # Bugs, changelog
```

---

## Modules (11)

| Module | Purpose | Location |
|--------|---------|----------|
| IDENTITY | Auth, JWT | `src/modules/identity/` |
| TIME_KEEPER | Timers | `src/modules/time_keeper/` |
| METRICS | Measurements | `src/modules/metrics/` |
| PROGRESSION | XP, levels | `src/modules/progression/` |
| CONTENT | Workouts | `src/modules/content/` |
| AI_COACH | Chat | `src/modules/ai_coach/` |
| NOTIFICATION | Push | `src/modules/notification/` |
| PROFILE | User data | `src/modules/profile/` |
| EVENT_JOURNAL | Audit log | `src/modules/event_journal/` |
| SOCIAL | Friends | `src/modules/social/` |
| RESEARCH | Papers | `src/modules/research/` |

---

## Critical Rules

1. **Black box modules** - Never access another module's database directly
2. **Interface only** - Communicate through defined interfaces
3. **No hardcoded secrets** - Use environment variables
4. **Timezone-aware timestamps** - Always use `DateTime(timezone=True)`
5. **Safety filtering** - AI Coach filters medical advice

Full list: [docs/standards/ANTI_PATTERNS.md](docs/standards/ANTI_PATTERNS.md)
