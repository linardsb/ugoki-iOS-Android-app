# UGOKI

A mobile wellness app combining **Intermittent Fasting (IF)** with **High-Intensity Interval Training (HIIT)**, powered by AI coaching.

## Overview

UGOKI helps busy professionals achieve sustainable health optimization in 15-20 minutes daily. The core differentiator is an AI-powered coaching agent that provides personalized guidance.

### Key Features

- **16:8 Fasting Timer** - Track fasting and eating windows
- **HIIT Workouts** - Curated video library with workout player
- **AI Coach** - Personalized guidance via Claude integration
- **Gamification** - Streaks, XP, levels, and achievements
- **Weight Tracking** - Monitor progress with trend analysis
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

### Modules

```
IDENTITY       → Authentication, authorization
TIME_KEEPER    → All timers (fasting, workout, eating windows)
EVENT_JOURNAL  → Immutable event log, GDPR compliance
METRICS        → Numeric data storage, trends, aggregations
PROGRESSION    → Streaks, XP, levels, achievements
CONTENT        → Workout library, recommendations
NOTIFICATION   → Push, email, scheduling
PROFILE        → User PII, preferences (GDPR isolated)
AI_COACH       → Pydantic AI agents, Claude integration
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

- **Framework:** Expo (React Native)
- **UI:** Tamagui or NativeWind
- **State:** Zustand + TanStack Query
- **Navigation:** Expo Router

### Infrastructure

- **Hosting:** Fly.io or Railway
- **Storage:** Cloudflare R2
- **Push:** Expo Push Notifications
- **Email:** Resend
- **Monitoring:** Sentry + Logfire

## Project Structure

```
ugoki/
├── apps/
│   ├── mobile/              # Expo React Native
│   │   ├── app/             # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/          # Zustand
│   │
│   └── api/                 # Python FastAPI
│       ├── src/
│       │   ├── modules/     # Black box modules
│       │   ├── db/
│       │   ├── core/
│       │   └── main.py
│       └── tests/
│
└── packages/
    └── interfaces/          # Shared TypeScript types
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

- `CLAUDE.md` - AI context and project instructions
- `UGOKI_Architecture_v2_BlackBox_Design.md` - Full architecture design
- `1_2_Ugoki_implementation.md` - Original requirements reference

## Status

**Phase:** Pre-development (Architecture Complete)

### MVP Roadmap

- [ ] OAuth sign-in (Google, Apple, Anonymous)
- [ ] 16:8 fasting timer
- [ ] Weight tracking
- [ ] HIIT workout library
- [ ] Workout player
- [ ] Streak tracking
- [ ] XP and level system
- [ ] Basic achievements
- [ ] Push notifications
- [ ] AI Coach chat
- [ ] Dashboard

## License

Private - All rights reserved.
