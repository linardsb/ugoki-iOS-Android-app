# UGOKI

A mobile wellness app combining **Intermittent Fasting (IF)** with **High-Intensity Interval Training (HIIT)**, powered by AI coaching.

## Overview

UGOKI helps busy professionals achieve sustainable health optimization in 15-20 minutes daily. The core differentiator is an AI-powered coaching agent that provides personalized guidance.

### Key Features

- **16:8 Fasting Timer** - Track fasting and eating windows with pause/resume
- **HIIT Workouts** - 16 curated workouts with video player
- **AI Coach** - Personalized guidance via Claude integration with safety filtering
- **Gamification** - Streaks, XP, levels, and 21 achievements
- **Weight & Metrics** - Track progress with trend analysis
- **Bloodwork** - Upload blood tests, AI parses biomarkers
- **Recipes** - 30 curated recipes with nutritional info
- **Research Hub** - PubMed papers with AI-generated summaries
- **Social** - Friends, followers, leaderboards, challenges
- **Push Notifications** - Stay on track with smart reminders

## Architecture

UGOKI follows a **black box modular architecture** based on Eskil Steenberg's design principles:

- Each module is a replaceable black box with a clean interface
- Modules communicate only through defined interfaces
- Implementation details are completely hidden
- One person can own one module entirely

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
IDENTITY       → Authentication, authorization, JWT, anonymous mode
TIME_KEEPER    → All timers (fasting, workout, eating windows)
EVENT_JOURNAL  → Immutable event log, GDPR compliance
METRICS        → Weight tracking, biomarkers, bloodwork
PROGRESSION    → Streaks, XP, levels, 21 achievements
CONTENT        → 16 workouts, 30 recipes, recommendations
NOTIFICATION   → Push tokens, preferences, scheduling
PROFILE        → User PII, goals, health info, GDPR isolated
AI_COACH       → Chat, insights, safety filtering, Claude integration
SOCIAL         → Friends, followers, leaderboards, challenges
RESEARCH       → PubMed integration, AI summaries, 15/day quota
```

## Tech Stack

### Backend

- **Runtime:** Python 3.12+
- **Package Manager:** uv
- **Framework:** FastAPI
- **Validation:** Pydantic 2.0
- **ORM:** SQLAlchemy 2.0 (async)
- **Migrations:** Alembic
- **Database:** SQLite (dev) → PostgreSQL (prod)

### AI Layer

- **Agent Framework:** Pydantic AI
- **LLM:** Claude 3.5 Sonnet / Haiku
- **Observability:** Logfire

### Frontend

- **Framework:** Expo SDK 52 (React Native)
- **UI:** Tamagui
- **State:** Zustand + TanStack Query
- **Navigation:** Expo Router

### Infrastructure

- **Hosting:** Fly.io
- **Storage:** Cloudflare R2
- **Push:** Expo Push Notifications
- **Email:** Resend
- **Monitoring:** Sentry + Logfire

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
│   │   │   ├── auth/
│   │   │   ├── fasting/
│   │   │   ├── workouts/
│   │   │   ├── coach/
│   │   │   ├── dashboard/
│   │   │   ├── profile/
│   │   │   ├── social/
│   │   │   ├── research/
│   │   │   └── ...
│   │   └── shared/                # Shared utilities
│   │
│   └── api/                       # Python FastAPI
│       ├── src/
│       │   ├── modules/           # Black box modules (11)
│       │   ├── db/
│       │   ├── core/
│       │   └── main.py
│       └── tests/
│
└── docs/                          # Documentation
```

## Getting Started

### Prerequisites

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) - Python package manager
- [Bun](https://bun.sh/) - JavaScript runtime
- Node.js 18+

### Backend Setup

```bash
# Navigate to API directory
cd apps/api

# Install dependencies
uv sync

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
uv run alembic upgrade head

# Start development server
uv run uvicorn src.main:app --reload --port 8000
```

### Mobile Setup

```bash
# Navigate to mobile directory
cd apps/mobile

# Install dependencies
bun install

# Start Expo development server
bun run start

# Run on iOS simulator
bun run ios

# Run on Android emulator
bun run android
```

## Development

### Backend Commands

```bash
uv run uvicorn src.main:app --reload    # Dev server
uv run pytest                            # Run tests
uv run ruff format .                     # Format code
uv run mypy src/                         # Type check
uv run alembic revision --autogenerate -m "description"  # New migration
uv run alembic upgrade head              # Apply migrations
```

### Mobile Commands

```bash
bun run start      # Start Expo
bun run ios        # iOS simulator
bun run android    # Android emulator
eas build          # Production build
```

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | Detailed architecture, patterns, conventions |
| `docs/MOBILE_GUIDE.md` | Mobile development guide, EAS builds |
| `docs/FEATURES.md` | Feature docs (Research, Bloodwork, Social, Costs) |
| `docs/CHANGELOG.md` | Development session logs |

## Status

**Phase:** MVP Complete - Ready for Production Deployment

### Completed Features

- [x] OAuth sign-in (Google, Apple, Anonymous)
- [x] 16:8 fasting timer with pause/resume
- [x] Weight & metrics tracking
- [x] Bloodwork upload & AI parsing
- [x] HIIT workout library (16 workouts)
- [x] Workout player
- [x] Recipe library (30 recipes)
- [x] Streak tracking
- [x] XP and level system
- [x] 21 achievements
- [x] Push notifications
- [x] AI Coach chat with safety filtering
- [x] Dashboard
- [x] Research Hub with PubMed integration
- [x] Social (friends, leaderboards, challenges)

### Next Steps

1. Deploy backend to production (Fly.io)
2. Build iOS/Android via EAS
3. Submit to App Store / Play Store

## License

Private - All rights reserved.
