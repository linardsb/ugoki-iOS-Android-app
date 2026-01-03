# UGOKI Project Context

## What is UGOKI?

A mobile wellness app combining **Intermittent Fasting (IF)** with **High-Intensity Interval Training (HIIT)**. The core differentiator is AI-powered personalization through a coaching agent.

**Target Users:** Busy professionals seeking sustainable health optimization in 15-20 minutes daily.

---

## Architecture Overview

**Design Philosophy:** Black box modular architecture following Eskil Steenberg's principles.

- Each module is a replaceable black box with a clean interface
- Modules communicate only through defined interfaces
- Implementation details are completely hidden

### Core Primitives

| Primitive | Purpose |
|-----------|---------|
| `IDENTITY` | Who is acting (opaque reference, no PII) |
| `TIME_WINDOW` | Bounded time period (fasting, eating, workout) |
| `ACTIVITY_EVENT` | Immutable point-in-time occurrence |
| `METRIC` | Numeric measurement with timestamp |
| `PROGRESSION` | Position in ordered sequence (streaks, levels) |

### Modules (11 total)

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

## Tech Stack

### Backend
```
Python 3.12+ | FastAPI | SQLAlchemy 2.0 (async) | Pydantic 2.0 | Alembic | uv
```

### AI Layer
```
Pydantic AI | Claude 3.5 Sonnet/Haiku | Logfire
```

### Mobile
```
Expo SDK 52 | React Native | Tamagui | Zustand | TanStack Query | Expo Router
```

### Infrastructure
```
Fly.io | Cloudflare R2 | Expo Push | Resend | Sentry
```

---

## Project Structure

```
ugoki/
├── apps/
│   ├── mobile/                    # Expo React Native
│   │   ├── app/                   # Expo Router screens
│   │   │   ├── (auth)/            # Auth flow
│   │   │   ├── (tabs)/            # Main tab navigator
│   │   │   └── (modals)/          # Modal screens
│   │   ├── features/              # Feature modules
│   │   └── shared/                # Shared utilities
│   │
│   └── api/                       # Python FastAPI
│       ├── src/modules/           # Black box modules
│       └── tests/
│
└── docs/                          # Documentation (see below)
```

---

## Key Commands

### Backend
```bash
uv sync                                    # Install deps
uv run uvicorn src.main:app --reload       # Dev server
uv run pytest                              # Tests
uv run alembic upgrade head                # Migrations
```

### Mobile
```bash
bun install                                # Install deps
bun run start                              # Dev server
bun run ios                                # iOS simulator
eas build --platform all                   # Production build
```

---

## Current Status

**Phase:** MVP COMPLETE - Ready for Production Deployment 🎉

### Backend (11/11 Modules Complete)

| Module | Status | Key Features |
|--------|--------|--------------|
| IDENTITY | ✅ | JWT auth, anonymous mode |
| TIME_KEEPER | ✅ | Fasting/workout timers, pause/resume |
| METRICS | ✅ | Weight tracking, biomarkers, bloodwork |
| PROGRESSION | ✅ | Streaks, XP, levels, 21 achievements |
| CONTENT | ✅ | 16 workouts, 30 recipes |
| AI_COACH | ✅ | Chat, insights, safety filtering |
| NOTIFICATION | ✅ | Push tokens, preferences |
| PROFILE | ✅ | Goals, health, GDPR compliance |
| EVENT_JOURNAL | ✅ | Activity tracking |
| SOCIAL | ✅ | Friends, leaderboards, challenges |
| RESEARCH | ✅ | PubMed, AI summaries, 15/day quota |

### Mobile (9/9 Phases Complete)

| Phase | Description |
|-------|-------------|
| 0-1 | Foundation, Auth & Onboarding |
| 2-3 | Fasting Timer, Dashboard |
| 4-5 | Workouts, AI Coach |
| 6-7 | Profile/Settings, Polish |
| 8-9 | Social, Research Hub |

### Next Steps
1. Deploy backend to production (Fly.io)
2. Build iOS/Android via EAS
3. Submit to App Store / Play Store

---

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | Detailed architecture, patterns, conventions |
| `docs/MOBILE_GUIDE.md` | Mobile development guide, EAS builds |
| `docs/FEATURES.md` | Feature docs (Research, Bloodwork, Social, Costs) |
| `docs/CHANGELOG.md` | Development session logs |
| `docs/UGOKI_Architecture_v2_BlackBox_Design.md` | Full black box architecture design |
| `docs/1_2_Ugoki_implementation.md` | Original requirements (reference only) |

---

## Quick Reference

| Need | Command/Location |
|------|------------------|
| Run API | `uv run uvicorn src.main:app --reload` |
| Run Mobile | `bun run start` |
| Add Python dep | `uv add package-name` |
| Add JS dep | `bun add package-name` |
| Architecture | `docs/ARCHITECTURE.md` |
| Mobile guide | `docs/MOBILE_GUIDE.md` |
| Features | `docs/FEATURES.md` |
| Change history | `docs/CHANGELOG.md` |

---

## Anti-Patterns to Avoid

```
- Don't truncate text sent to LLM
- Don't hardcode API keys (use env vars)
- Don't mix concerns (single responsibility)
- Don't skip tests
- Don't expose implementation details in interfaces
```

---

## Black Box Rules

1. **Interface Only** - Modules communicate only through interfaces
2. **Opaque References** - Never parse or construct IDs from other modules
3. **No Leaky Abstractions** - If implementation change requires interface change, redesign
4. **Single Owner** - One person can own one module entirely
5. **Testable in Isolation** - Mock dependencies for unit tests
