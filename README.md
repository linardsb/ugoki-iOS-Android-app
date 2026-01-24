# UGOKI

A mobile wellness app combining **Intermittent Fasting (IF)** with **High-Intensity Interval Training (HIIT)**, powered by AI coaching.

## Overview

UGOKI helps busy professionals achieve sustainable health optimization in 15-20 minutes daily. The core differentiator is an AI-powered coaching agent that provides personalized guidance.

### Key Features

- **Intermittent Fasting Timer** - Track fasting windows with multiple protocols (16:8, 18:6, 20:4)
- **HIIT Workouts** - 16 curated workouts with video player and exercise library
- **AI Coach** - Personalized guidance with constitutional AI, cross-session memory, skill-based prompts, and automated quality evaluation
- **Gamification** - Streaks, XP, levels, and 21 achievements
- **Bloodwork Analysis** - Upload blood tests, AI parses biomarkers with trend tracking
- **Research Hub** - PubMed papers with AI-generated summaries
- **Social** - Friends, followers, leaderboards, challenges

### AI Coach (v3.0)

The AI Coach uses advanced context engineering:

- **Constitutional AI** - Values-based responses prioritizing safety, evidence, and personalization
- **Skill System** - Domain expertise (workout, fasting, nutrition, motivation, research) loaded based on query type
- **User Memory** - Remembers facts, preferences, goals, and constraints across sessions
- **Context Engineering** - Tiered context loading with token budget enforcement
- **Quality Evaluation** - Automated LLM-as-Judge scoring for continuous improvement

See [docs/features/ai-coach.md](docs/features/ai-coach.md) for full specification.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic 2.0 |
| AI | Pydantic AI, Claude 3.5 Sonnet/Haiku |
| Mobile | Expo SDK 52, React Native, Tamagui, Zustand, TanStack Query |
| Infrastructure | Fly.io, PostgreSQL, Cloudflare R2, Expo Push |

## Quick Start

### Backend

```bash
cd apps/api
uv sync                                    # Install dependencies
cp .env.example .env                       # Configure environment
uv run alembic upgrade head                # Run migrations
uv run uvicorn src.main:app --reload       # Start server
```

API available at: http://localhost:8000

### Mobile

```bash
cd apps/mobile
bun install                                # Install dependencies
bun run start                              # Start Expo
```

Press `i` for iOS Simulator or `a` for Android.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/INDEX.md](docs/INDEX.md) | Documentation hub - start here |
| [docs/product/PRD.md](docs/product/PRD.md) | Product requirements |
| [docs/product/ROADMAP.md](docs/product/ROADMAP.md) | Future plans and priorities |
| [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md) | System architecture |
| [docs/guides/GETTING_STARTED.md](docs/guides/GETTING_STARTED.md) | Full setup guide |
| [docs/features/](docs/features/) | Feature specifications |
| [docs/standards/](docs/standards/) | Coding standards and best practices |

## Architecture

UGOKI follows a **black box modular architecture** with 11 independent modules:

| Module | Purpose |
|--------|---------|
| IDENTITY | Authentication, JWT, anonymous mode |
| TIME_KEEPER | Fasting/workout timers with pause/resume |
| METRICS | Weight, biomarkers, trend analysis |
| PROGRESSION | XP, levels, streaks, 21 achievements |
| CONTENT | Workouts, exercises, recipes |
| AI_COACH | Claude chat with constitution, skills, memory, evaluation |
| NOTIFICATION | Push tokens, preferences |
| PROFILE | User data, goals (GDPR isolated) |
| EVENT_JOURNAL | Immutable audit log |
| SOCIAL | Friends, leaderboards, challenges |
| RESEARCH | PubMed integration, AI summaries |

See [docs/architecture/MODULES.md](docs/architecture/MODULES.md) for detailed specifications.

## Project Structure

```
ugoki_1_0/
├── apps/
│   ├── api/                       # Python FastAPI backend
│   │   ├── src/modules/           # 11 black box modules
│   │   └── tests/
│   └── mobile/                    # Expo React Native app
│       ├── app/                   # Screens (Expo Router)
│       └── features/              # Feature modules
├── docs/                          # Documentation
│   ├── product/                   # PRD, roadmap, decisions
│   ├── architecture/              # System design
│   ├── guides/                    # Developer guides
│   ├── standards/                 # Best practices
│   ├── features/                  # Feature specs
│   └── tracking/                  # Bugs, changelog
├── CLAUDE.md                      # AI assistant context
└── README.md                      # This file
```

## Status

**Phase:** MVP Complete - Ready for Production Deployment

### Next Steps

1. Deploy backend to production (Fly.io)
2. Build iOS/Android via EAS
3. Submit to App Store / Play Store

See [docs/product/ROADMAP.md](docs/product/ROADMAP.md) for full roadmap.

## License

Private - All rights reserved.
