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
- One person should be able to own one module

### Core Primitives

All data in UGOKI reduces to 5 primitive types:

| Primitive | Purpose |
|-----------|---------|
| `IDENTITY` | Who is acting (opaque reference, no PII) |
| `TIME_WINDOW` | Bounded time period (fasting, eating, workout) |
| `ACTIVITY_EVENT` | Immutable point-in-time occurrence |
| `METRIC` | Numeric measurement with timestamp |
| `PROGRESSION` | Position in ordered sequence (streaks, levels) |

### Modules (9 total)

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

---

## Tech Stack

### Backend (Python)

```
Runtime:      Python 3.12+
Package Mgr:  uv
Framework:    FastAPI
Validation:   Pydantic 2.0
ORM:          SQLAlchemy 2.0 (async)
Migrations:   Alembic
Database:     SQLite (dev) → PostgreSQL (prod)
```

### AI Layer

```
Agent Framework:  Pydantic AI
LLM:              Claude 3.5 Sonnet / Haiku (anthropic SDK)
Observability:    Logfire
Vector DB:        pgvector (when needed)
```

### Frontend (Mobile)

```
Framework:    Expo (React Native)
UI:           Tamagui or NativeWind
State:        Zustand + TanStack Query
Navigation:   Expo Router
```

> **Background Timers Note:** When the app is closed, fasting timers rely on scheduled local notifications rather than a true running timer. This is fine for fasting (notifications at intervals), but test early with `expo-notifications` and `expo-background-fetch`.

### Infrastructure

```
Hosting:      Fly.io or Railway
Storage:      Cloudflare R2
Push:         Expo Push Notifications
Email:        Resend
Monitoring:   Sentry + Logfire
```

---

## Project Structure

```
ugoki/
├── apps/
│   ├── mobile/                    # Expo React Native
│   │   ├── app/                   # Expo Router screens
│   │   │   ├── (auth)/            # Auth flow (welcome, onboarding, login)
│   │   │   ├── (tabs)/            # Main tab navigator
│   │   │   └── (modals)/          # Modal screens
│   │   ├── features/              # Feature modules
│   │   │   ├── auth/              # Auth hooks, types
│   │   │   ├── profile/           # Profile hooks, types
│   │   │   ├── fasting/           # Fasting hooks, components
│   │   │   ├── workouts/          # Workout hooks, components
│   │   │   ├── dashboard/         # Dashboard components
│   │   │   └── coach/             # AI Coach UI
│   │   ├── shared/                # Shared utilities
│   │   │   ├── api/               # API client, query keys
│   │   │   ├── stores/            # Zustand stores, MMKV storage
│   │   │   ├── components/ui/     # Base UI components
│   │   │   └── theme/             # Tamagui config
│   │   ├── config/                # App configuration
│   │   └── package.json
│   │
│   └── api/                       # Python FastAPI
│       ├── src/
│       │   ├── modules/
│       │   │   ├── identity/
│       │   │   ├── time_keeper/
│       │   │   ├── event_journal/
│       │   │   ├── metrics/
│       │   │   ├── progression/
│       │   │   ├── content/
│       │   │   ├── notification/
│       │   │   ├── profile/
│       │   │   └── ai_coach/
│       │   │       ├── agents/
│       │   │       ├── tools/
│       │   │       └── prompts/
│       │   ├── db/
│       │   ├── core/
│       │   └── main.py
│       ├── tests/
│       ├── pyproject.toml
│       └── fly.toml
│
└── packages/
    └── interfaces/                # Shared TypeScript types
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

## Key Commands

### Backend (Python)

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn src.main:app --reload --port 8000

# Run tests
uv run pytest

# Format code
uv run ruff format .

# Type check
uv run mypy src/

# Create migration
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head
```

### Mobile (Expo)

```bash
# Install dependencies
bun install

# Start development
bun run start

# iOS simulator
bun run ios

# Android emulator
bun run android

# Build for production
eas build --platform all
```

---

## Environment Variables

### Backend (.env)

```
DATABASE_URL=sqlite+aiosqlite:///./ugoki.db
ANTHROPIC_API_KEY=sk-ant-xxxxx
JWT_SECRET=your-secret-key
LOGFIRE_TOKEN=
RESEND_API_KEY=
EXPO_ACCESS_TOKEN=
```

### Mobile (.env)

```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

---

## MVP Features

### Backend (Complete)

- [x] Anonymous auth + JWT tokens (IDENTITY)
- [x] 16:8 fasting timer with pause/resume (TIME_KEEPER)
- [x] Weight tracking with trends (METRICS)
- [x] Bloodwork/biomarker upload and parsing (METRICS)
- [x] HIIT workout library - 16 workouts seeded (CONTENT)
- [x] Workout sessions with XP rewards (CONTENT)
- [x] Streak tracking - fasting, workout, app (PROGRESSION)
- [x] XP and level system with calculations (PROGRESSION)
- [x] 21 achievements seeded (PROGRESSION)
- [x] Push notification infrastructure (NOTIFICATION)
- [x] AI Coach chat endpoint (AI_COACH)
- [x] AI Coach bloodwork analysis tools (AI_COACH)
- [x] User profile with goals, health, preferences (PROFILE)
- [x] GDPR compliance - export, delete, anonymize (PROFILE)

### Mobile (In Progress)

**Phase 0 - Foundation (Complete):**
- [x] Expo Router navigation structure (auth, tabs, modals)
- [x] Tamagui UI framework with custom theme
- [x] TanStack Query with typed query keys
- [x] Zustand stores with MMKV persistence
- [x] Base UI components (AppButton, Card, Badge, ProgressRing, etc.)
- [x] API client with auth interceptors

**Phase 1 - Auth & Onboarding (Complete):**
- [x] Auth hooks (useCreateAnonymous, useLogin, useLogout, useAuthInit)
- [x] Profile hooks (useCreateProfile, useUpdateGoals, useSaveOnboarding)
- [x] Welcome screen with anonymous auth
- [x] 3-step onboarding flow (goals, experience, eating times)
- [x] Auth state management with token persistence

**Phase 2 - Fasting Timer (Complete):**
- [x] Fasting hooks (useActiveFast, useStartFast, useEndFast, useExtendFast)
- [x] Fasting store with pause/resume and offline support
- [x] FastingTimer component with animated circular progress
- [x] FastingControls with protocol selection (16:8, 18:6, 20:4)
- [x] Fasting screen with timer, controls, stats, tips
- [x] Local state persistence with MMKV

**Phase 3 - Dashboard (Complete):**
- [x] Progression hooks (useProgression, useUserLevel, useStreaks, useAchievements)
- [x] Metrics hooks (useLatestWeight, useWeightTrend, useWorkoutStats)
- [x] LevelCard with XP progress bar
- [x] StreakCard showing fasting/workout streaks
- [x] WeightCard with trend indicator
- [x] WorkoutStatsCard with totals
- [x] ActiveFastCard (live timer on dashboard)
- [x] QuickActions navigation grid
- [x] Dashboard screen with pull-to-refresh

**Phase 4 - Workouts (Complete):**
- [x] Workout hooks (useWorkouts, useWorkout, useCategories, useRecommendations)
- [x] Session hooks (useActiveSession, useStartWorkout, useCompleteWorkout, useAbandonWorkout)
- [x] WorkoutCard component (default, compact, featured variants)
- [x] WorkoutList and CategoryFilter components
- [x] Workout detail modal with exercise list
- [x] Workout player modal with animated timer
- [x] Player store with phase management (warmup, exercise, rest, complete)
- [x] Workouts tab screen with search, filters, featured, recommendations

**Phase 5 - AI Coach (Complete):**
- [x] Coach hooks (useSendMessage, useCoachContext, useDailyInsight, useMotivation, useSetPersonality)
- [x] Chat store with message persistence (last 50 messages in MMKV)
- [x] ChatBubble component with avatars and timestamps
- [x] ChatInput with send button
- [x] TypingIndicator with animated dots
- [x] QuickActions for suggested responses
- [x] WelcomeMessage with starter suggestions
- [x] Coach tab screen with full chat interface

**Phase 6 - Profile & Settings (Complete):**
- [x] Profile hooks (useProfile, useCompleteProfile, usePreferences, useGoals, useDeleteAccount)
- [x] ProfileHeader component with avatar, level, XP
- [x] SettingsItem and SettingsSection components
- [x] Profile tab screen with settings toggles
- [x] Settings modal with profile editing, goals, fasting protocol, coach personality
- [x] Sign out and delete account (GDPR) functionality

**Phase 7+ (Complete):**
- [x] Push notification handling ✅
- [x] Weight logging modal ✅
- [x] Achievements screen ✅

### Deferred (Post-MVP)

- OAuth sign-in (Google, Apple) - currently anonymous only
- Meal logging / nutrition
- Wearable integration
- Social features (friend codes ready in PROFILE)
- Extended fasting protocols
- Meditation

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

## Black Box Rules

1. **Interface Only** - Modules communicate only through interfaces
2. **Opaque References** - Never parse or construct IDs from other modules
3. **No Leaky Abstractions** - If implementation change requires interface change, redesign
4. **Single Owner** - One person can own one module entirely
5. **Testable in Isolation** - Mock dependencies for unit tests

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

---

## Documentation

- `CLAUDE.md` - This file (project context for AI)
- `UGOKI_Architecture_v2_BlackBox_Design.md` - Full architecture design
- `1_2_Ugoki_implementation.md` - Original requirements (reference only)

---

## Current Status

**Phase:** MVP COMPLETE - Ready for Production Deployment 🎉

### Backend (8/9 Modules Complete)

| Module | Status | Key Features |
|--------|--------|--------------|
| IDENTITY | ✅ Complete | JWT auth, anonymous mode, capabilities |
| TIME_KEEPER | ✅ Complete | Fasting/eating/workout timers, pause/resume |
| METRICS | ✅ Complete | Weight tracking, body metrics, trends, biomarkers, bloodwork upload |
| PROGRESSION | ✅ Complete | Streaks, XP, levels, 21 achievements seeded |
| CONTENT | ✅ Complete | 16 workouts, 10 exercises, sessions, recommendations |
| AI_COACH | ✅ Complete | Chat, context, insights, motivation, personality, bloodwork analysis |
| NOTIFICATION | ✅ Complete | Push tokens, preferences, scheduling, quiet hours |
| PROFILE | ✅ Complete | Goals, health, dietary, social, GDPR compliance, bloodwork onboarding |
| EVENT_JOURNAL | ⏳ Pending | Immutable event log (defer until needed) |

### Mobile App Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ Complete | Foundation (navigation, theme, stores, API client, base components) |
| Phase 1 | ✅ Complete | Auth & Onboarding (anonymous auth, profile creation, onboarding flow) |
| Phase 2 | ✅ Complete | Fasting Timer (animated timer, controls, protocols, offline support) |
| Phase 3 | ✅ Complete | Dashboard (level, streaks, weight, workout stats, quick actions) |
| Phase 4 | ✅ Complete | Workouts (player, sessions, recommendations, exercise timer) |
| Phase 5 | ✅ Complete | AI Coach (chat UI, message persistence, personality selection) |
| Phase 6 | ✅ Complete | Profile & Settings (profile editing, preferences, GDPR delete) |
| Phase 7 | ✅ Complete | Polish (push notifications, weight logging, achievements, EAS builds) |

### Database Tables
- `identities`, `capabilities` (IDENTITY)
- `time_windows` (TIME_KEEPER)
- `metrics` (METRICS)
- `streaks`, `xp_transactions`, `user_levels`, `achievements`, `user_achievements` (PROGRESSION)
- `workout_categories`, `workouts`, `exercises`, `workout_sessions` (CONTENT)
- `notifications`, `notification_preferences`, `device_tokens`, `scheduled_notifications` (NOTIFICATION)
- `user_profiles`, `user_goals`, `health_profiles`, `dietary_profiles`, `workout_restrictions`, `social_profiles`, `user_preferences`, `onboarding_status` (PROFILE)

### Seeded Data
- 21 achievements (streak, fasting, workout, weight, special categories)
- 5 workout categories (HIIT, strength, cardio, flexibility, recovery)
- 16 sample workouts with difficulty levels
- 10 exercises with muscle groups and equipment

### Next Steps (Production Deployment)
1. ~~Build mobile app foundation~~ ✅
2. ~~Create auth screens (anonymous mode, onboarding)~~ ✅
3. ~~Build fasting timer UI with animations~~ ✅
4. ~~Implement dashboard~~ ✅
5. ~~Build workout player with exercise timer~~ ✅
6. ~~Build AI Coach chat UI~~ ✅
7. ~~Add profile/settings screens~~ ✅
8. ~~Add push notification handling~~ ✅
9. ~~Add weight logging modal~~ ✅
10. ~~Add achievements gallery screen~~ ✅
11. ~~Set up EAS builds~~ ✅
12. Deploy backend to production (Fly.io)
13. Build iOS app via EAS (requires Apple Developer account)
14. Build Android app via EAS
15. Submit to App Store / Play Store

---

## Mobile App Architecture

### Tech Stack (Confirmed)

```
Framework:    Expo SDK 52 + React Native 0.76
UI:           Tamagui 1.141
State:        Zustand 5.0 + TanStack Query 5.0
Storage:      react-native-mmkv 3.2
Navigation:   Expo Router 4.0
Animations:   react-native-reanimated 3.16
```

### Feature Module Pattern

Each feature follows this structure:

```
features/{name}/
├── index.ts           # Re-exports
├── types.ts           # TypeScript types matching backend
├── hooks/
│   ├── index.ts       # Re-exports
│   └── use{Action}.ts # TanStack Query mutations/queries
├── components/        # Feature-specific components
└── stores/            # Feature-specific Zustand stores (if needed)
```

### Auth Flow

```
Welcome Screen → Create Anonymous Identity → Onboarding (3 steps) → Main App
                          ↓
                 POST /identity/authenticate
                 { provider: "anonymous", token: deviceId }
                          ↓
                 Store: identity, accessToken in MMKV
                          ↓
                 Onboarding saves:
                 - POST /profile (create)
                 - PATCH /profile/goals
                 - PATCH /profile/workout-restrictions
                 - PATCH /profile/preferences
```

### Key Files

| File | Purpose |
|------|---------|
| `shared/theme/tamagui.config.ts` | Theme colors, tokens, fonts |
| `shared/api/client.ts` | Axios instance with auth interceptors |
| `shared/api/query-client.ts` | TanStack Query client + typed query keys |
| `shared/stores/storage.ts` | MMKV storage with typed helpers |
| `shared/stores/auth.ts` | Auth state (identity, token, isAuthenticated) |
| `features/auth/hooks/useCreateAnonymous.ts` | Anonymous auth mutation |
| `features/profile/hooks/useSaveOnboarding.ts` | Combined onboarding mutation |
| `features/fasting/stores/fastingStore.ts` | Fasting timer state with pause/resume |
| `features/fasting/components/FastingTimer.tsx` | Animated circular progress timer |
| `features/fasting/components/FastingControls.tsx` | Start/pause/end fast controls |
| `features/dashboard/hooks/useProgression.ts` | Level, streaks, achievements queries |
| `features/dashboard/components/ActiveFastCard.tsx` | Live fasting timer on dashboard |

### Base UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppButton` | `shared/components/ui/` | Primary button with variants |
| `Card` | `shared/components/ui/` | Card container with press states |
| `Badge` | `shared/components/ui/` | Status badges with colors |
| `ProgressRing` | `shared/components/ui/` | Animated circular progress (for fasting) |
| `StatCard` | `shared/components/ui/` | Stats display with trends |
| `LoadingSpinner` | `shared/components/ui/` | Loading indicator |
| `EmptyState` | `shared/components/ui/` | Empty state with action |
| `ScreenHeader` | `shared/components/ui/` | Screen header with back button |
| `Avatar` | `shared/components/ui/` | User avatar with fallback |

---

## Bloodwork Feature

Users can upload blood test results (PDF or image) during onboarding or at any time. The system parses biomarkers using Claude's vision capabilities and stores them in METRICS for AI coach analysis.

### Endpoints

```
POST /api/v1/uploads/bloodwork     # Upload PDF/JPG/PNG blood test
GET  /api/v1/uploads/bloodwork/supported-formats
GET  /api/v1/metrics/by-prefix?prefix=biomarker_   # Query all biomarkers
```

### How It Works

1. **Upload** - User uploads PDF or image of blood test results
2. **Extract** - `pdfplumber` extracts text from PDFs, Claude Vision for images
3. **Parse** - Claude parses biomarkers into structured format with:
   - Standardized name (e.g., "haemoglobin", "cholesterol")
   - Value, unit, reference range (low/high)
   - Flag (low/normal/high/abnormal)
4. **Store** - Saved in METRICS table with `biomarker_` prefix
5. **Analyze** - AI Coach tools query biomarkers for personalized insights

### Key Files

```
src/services/bloodwork_parser.py       # PDF/image parsing with Claude
src/routes/uploads.py                  # Upload endpoint
src/modules/metrics/service.py         # get_by_type_prefix() for biomarkers
src/modules/ai_coach/tools/fitness_tools.py  # Biomarker tools for AI coach
```

### AI Coach Biomarker Tools

```python
get_latest_biomarkers()          # All markers from latest upload
get_biomarker_trend(name)        # Historical trend for specific marker
get_bloodwork_summary()          # Summary by category (Lipids, Metabolic, etc.)
```

### Biomarker Storage Pattern

Biomarkers are stored in the existing METRICS table with:
- `metric_type`: `biomarker_{standardized_name}` (e.g., `biomarker_haemoglobin`)
- `unit`: The measurement unit (e.g., "g/L")
- `reference_low` / `reference_high`: Reference range
- `flag`: `low`, `normal`, `high`, or `abnormal`

### Onboarding Integration

The PROFILE module tracks `bloodwork_uploaded` as an optional onboarding step. Users can:
- Upload during registration
- Skip and upload later from settings
- Upload multiple times (new tests update the record)

---

## Cost Breakdown

### AI/LLM Costs (AI_COACH + Bloodwork Parsing)

| Provider | Cost | Notes |
|----------|------|-------|
| **Ollama** (local) | $0 | Free - runs locally, default for dev |
| **Groq** | Free tier, then ~$0.05/1K tokens | Fast, good free tier |
| **Claude API** | ~$3-15/1M tokens | Best quality |
| **OpenAI** | ~$0.50-15/1M tokens | Alternative |

**Bloodwork Parsing:** Uses Claude Sonnet (~$3/1M input, $15/1M output). Typical blood test = 1-2K tokens input, ~500 tokens output = ~$0.01-0.02 per upload.

**Example (Production with Claude):**
```
1,000 users × 5 AI chats/day × 30 days = 150,000 messages
~300 tokens/message = 45M tokens/month
Cost: ~$135-450/month (depending on model)
```

### Module Cost Impact

| Module | AI Cost | Notes |
|--------|---------|-------|
| IDENTITY | $0 | JWT tokens, database only |
| TIME_KEEPER | $0 | Timer logic, database only |
| METRICS | $0 | Weight/stats, database only |
| PROGRESSION | $0 | Streaks/XP, database only |
| CONTENT | $0 | Serving videos, CDN costs only |
| NOTIFICATION | $0 | Push/email, service costs only |
| PROFILE | $0 | User data, database only |
| **AI_COACH** | 💰 | **Only module with LLM costs** |

### Infrastructure Costs

| Service | Dev | Prod (1K users) | Prod (10K users) |
|---------|-----|-----------------|------------------|
| **Hosting** (Fly.io) | $0 | $5-20/mo | $50-100/mo |
| **Database** (Postgres) | $0 | $0-15/mo | $25-50/mo |
| **Push** (Expo) | $0 | $0 | $0 |
| **Email** (Resend) | $0 | $0 | $20/mo |
| **Video CDN** | $0 | $10-50/mo | $100-200/mo |
| **AI (Ollama→Claude)** | $0 | $50-200/mo | $200-1000/mo |

### Cost Optimization Strategies

```python
# 1. Rate limit AI chats per user
MAX_AI_CHATS_FREE = 10/day
MAX_AI_CHATS_PREMIUM = 50/day

# 2. Use cheaper models for simple queries
simple_questions → groq:llama-3.1-8b (free)
complex_coaching → anthropic:claude-3-5-sonnet (paid)

# 3. Cache common responses
"How long should I fast?" → cached, no AI call

# 4. Batch context efficiently
# Send user stats once, not per message
```

### Monthly Cost Summary

| Phase | Users | Estimated Cost |
|-------|-------|----------------|
| Development | 1 | $0 |
| MVP Launch | 100 | $5-50 |
| Early Growth | 1,000 | $50-300 |
| Scale | 10,000 | $300-1,500 |

---

## Quick Reference

| Need | Command/Location |
|------|------------------|
| Run API | `uv run uvicorn src.main:app --reload` |
| Run Mobile | `bun run start` |
| Add Python dep | `uv add package-name` |
| Add JS dep | `bun add package-name` |
| Architecture doc | `UGOKI_Architecture_v2_BlackBox_Design.md` |
| Module template | `src/modules/{name}/` |
| Agent definition | `src/modules/ai_coach/agents/` |

---

## Development Log

### December 28, 2025 - Mobile App Testing & Fixes

**Storage Migration (MMKV → AsyncStorage):**
- Migrated from `react-native-mmkv` to `@react-native-async-storage/async-storage` for Expo Go compatibility
- MMKV requires native modules not available in Expo Go development builds
- Updated files:
  - `shared/stores/storage.ts` - Rewrote all storage functions to use AsyncStorage
  - `shared/api/client.ts` - Added auth caching (`initApiClient`, `setApiAuthCache`) since AsyncStorage is async-only
  - `shared/stores/auth.ts` - Updated to sync API cache on auth changes
  - `features/auth/utils/device-id.ts` - Updated to use AsyncStorage
  - `app/_layout.tsx` - Added async initialization for storage

**Font Loading Fix:**
- Changed from `require('@expo-google-fonts/inter/Inter_400Regular.ttf')` to named imports
- Correct pattern: `import { Inter_400Regular } from '@expo-google-fonts/inter'`

**Portal Provider Fix:**
- Added `PortalProvider` from 'tamagui' to root layout for Sheet/Modal support
- Fixes: `'PortalDispatchContext' cannot be null` error

**Button Styling Standardization:**
- All primary action buttons now use consistent styling:
  ```tsx
  <Button
    size="$6"
    height={56}
    backgroundColor="$primary"
    borderRadius="$4"
    pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
  >
    <Text color="white" fontWeight="700" fontSize="$5">
      Button Text
    </Text>
  </Button>
  ```
- Fixed buttons in:
  - `app/(auth)/welcome.tsx` - Get Started, Sign In buttons
  - `app/(auth)/onboarding.tsx` - Goal, experience, eating time selection buttons + Continue
  - `app/(auth)/login.tsx` - Sign In button
  - `app/(auth)/signup.tsx` - Create Account button
  - `features/fasting/components/FastingControls.tsx` - Start Fast, protocol selection, End/Abandon buttons
  - `app/(modals)/workout/[id].tsx` - Start Workout button
  - `app/(modals)/workout-player.tsx` - Play/Pause, Done buttons
  - `app/(modals)/settings.tsx` - Metric/Imperial toggle buttons

**Tab Navigation Fix:**
- Added proper padding for iPhone home indicator
- `app/(tabs)/_layout.tsx`: `paddingBottom: 28`, `height: 85`

**Welcome Screen Text Fix:**
- Hardcoded dark text colors (#18181b) for light gradient background
- Theme tokens weren't resolving properly on some screens

**Placeholder Assets Created:**
- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1284x2778)
- `assets/adaptive-icon.png` (1024x1024)
- `assets/favicon.png` (48x48)
- `assets/notification-icon.png` (96x96)

### Current Testing State

**Working:**
- ✅ App launches in Expo Go on iOS
- ✅ Anonymous authentication flow
- ✅ Onboarding screens with button interactions
- ✅ Tab navigation
- ✅ All button styling consistent across app

**To Test:**
- Fasting timer functionality
- Workout player
- AI Coach chat
- Profile settings persistence
- API integration with backend

### Known Issues

1. **Web platform**: Some Tamagui theme tokens don't resolve correctly on web; use hardcoded values for critical text
2. **Expo Go limitations**: Some native features (like advanced haptics) may behave differently vs development builds

### December 28, 2025 (Continued) - Settings & Weight Logging Fixes

**Weight Logging Fix:**
- Fixed crash when saving weight - changed `source: 'manual'` to `source: 'user_input'` in `features/dashboard/hooks/useMetrics.ts`
- Backend MetricSource enum only accepts: `user_input`, `calculated`, `device_sync`

**Auth Init TypeScript Fix:**
- Fixed async storage handling in `features/auth/hooks/useAuthInit.ts`
- Added `useState` to track token loading state since AsyncStorage is async
- Token state uses `undefined` (loading) vs `null` (no token) pattern

**Global AppSwitch Component:**
- Created `shared/components/ui/AppSwitch.tsx` - custom toggle switch component
- Features:
  - Size: 50×28px (slightly bigger than default)
  - Light green (#22c55e) when on, gray (#e4e4e7) when off
  - White 24px circular thumb with shadow
  - Haptic feedback on tap
  - Proper disabled state handling
- Replaced all Tamagui Switch components with AppSwitch for consistent styling
- Updated files:
  - `shared/components/ui/index.ts` - exported AppSwitch
  - `app/(modals)/settings.tsx` - replaced 7 Switch instances
  - `features/profile/components/SettingsItem.tsx` - replaced Switch

**Settings Screen Improvements:**
- Reordered sections for better visibility:
  1. Profile
  2. Notifications (moved up from bottom)
  3. Goals
  4. Fasting
  5. Units
  6. AI Coach
- Made Notifications section collapsible:
  - Default: Push Notifications toggle + "Customize Notifications" button
  - Expanded: All individual toggles (Fasting, Workout, Streak, Achievement, Daily Motivation, Quiet Hours)
- Changed Settings modal to `fullScreenModal` presentation for proper scrolling
- Switched from Tamagui ScrollView to React Native ScrollView for reliable scrolling
- Added `paddingBottom: 50` for scroll space at bottom

**Files Modified:**
- `features/dashboard/hooks/useMetrics.ts` - weight logging fix
- `features/auth/hooks/useAuthInit.ts` - async storage fix
- `shared/components/ui/AppSwitch.tsx` - new component
- `shared/components/ui/index.ts` - export AppSwitch
- `app/(modals)/settings.tsx` - UI improvements, collapsible notifications
- `features/profile/components/SettingsItem.tsx` - use AppSwitch
- `app/(modals)/_layout.tsx` - fullScreenModal for settings

**API Testing Verified:**
- Weight logging endpoint: POST /api/v1/metrics ✅
- Notification preferences: GET/PATCH /api/v1/notifications/preferences ✅

### December 28, 2025 (Continued) - Bloodwork Upload Feature

**Mobile Bloodwork Upload Implemented:**
- Full mobile UI for uploading and viewing blood test results
- Connects to existing backend bloodwork parsing API

**New Files Created:**
- `features/bloodwork/types.ts` - TypeScript types for biomarkers and upload responses
- `features/bloodwork/hooks/useBloodwork.ts` - React Query hooks:
  - `useUploadBloodwork()` - Upload PDF/image, returns parsed biomarkers
  - `useSupportedFormats()` - Get supported file formats
  - `useLatestBiomarkers()` - Get user's stored biomarkers
  - `categorizeBiomarkers()` - Helper to group markers by category
- `features/bloodwork/hooks/index.ts` - Hook exports
- `features/bloodwork/components/BloodworkResults.tsx` - Results display:
  - Summary card with normal/attention/total counts
  - Categorized biomarker list (Blood Count, Lipids, Metabolic, etc.)
  - Color-coded flags (green=normal, amber=low, red=high/abnormal)
  - Reference range display
- `features/bloodwork/components/index.ts` - Component exports
- `features/bloodwork/index.ts` - Feature exports
- `app/(modals)/bloodwork.tsx` - Upload screen with:
  - Three upload options: PDF, Photo Library, Camera
  - File preview before upload
  - Loading state during AI analysis
  - Full results display after parsing

**Files Modified:**
- `app/(modals)/_layout.tsx` - Added bloodwork route
- `app/(modals)/settings.tsx` - Added "Health Data" section with Bloodwork entry

**Dependencies Added:**
- `expo-document-picker@13.0.3` - For PDF file selection

**Feature Flow:**
1. User opens Settings → Health Data → Bloodwork
2. Chooses upload method (PDF, photo library, or camera)
3. Previews selected file
4. Taps "Upload & Analyze"
5. Backend parses with Claude AI (~5-10 seconds)
6. Results displayed with categorized biomarkers and flags
7. User can upload another or close

**Integration:**
- Uses existing backend endpoint: POST /api/v1/uploads/bloodwork
- Biomarkers stored in METRICS table with `biomarker_` prefix
- AI Coach can query biomarkers for personalized health insights

### December 28, 2025 (Continued) - Critical Scrolling Fix

**Root Cause Identified:**
- `react-native-gesture-handler` was missing from dependencies
- This package is **required** for all touch/scroll gestures in React Native
- Without it, ScrollView and FlatList components cannot respond to touch events

**Fix Applied:**
1. Installed `react-native-gesture-handler@2.20.2` (SDK 52 compatible)
2. Added `GestureHandlerRootView` wrapper to root layout with `style={{ flex: 1 }}`

**Files Modified:**
- `app/_layout.tsx` - Added GestureHandlerRootView as outermost wrapper:
  ```tsx
  import { GestureHandlerRootView } from 'react-native-gesture-handler';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {/* ... rest of providers */}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
  ```

**Dependencies Added:**
- `react-native-gesture-handler@2.20.2` - Essential for touch gestures

**Screens Now Scrollable:**
- Dashboard (index.tsx)
- Fasting (fasting.tsx)
- Workouts (workouts.tsx)
- Profile (profile.tsx)
- Coach (coach.tsx)
- Settings modal (settings.tsx)

**Important Note:**
After installing `react-native-gesture-handler`, always restart Expo with cache clear:
```bash
bunx expo start --clear
```

### December 28, 2025 (Continued) - ScrollView Gesture Handler Fix

**Issue:**
Despite adding `GestureHandlerRootView` wrapper, ScrollViews weren't responding to touch events on multiple screens.

**Root Cause:**
The `ScrollView` component from `react-native` doesn't properly integrate with `react-native-gesture-handler` when nested inside `GestureHandlerRootView`. Must use `ScrollView` from `react-native-gesture-handler` instead.

**Fix Applied:**
Changed all screens from:
```tsx
import { ScrollView, RefreshControl } from 'react-native';
```
To:
```tsx
import { ScrollView } from 'react-native-gesture-handler';
import { RefreshControl } from 'react-native';
```

**Files Modified:**
- `app/(tabs)/index.tsx` - Dashboard
- `app/(tabs)/fasting.tsx` - Fasting timer
- `app/(tabs)/workouts.tsx` - Workouts list
- `app/(tabs)/profile.tsx` - Profile/settings
- `app/(tabs)/coach.tsx` - AI Coach chat
- `app/(modals)/settings.tsx` - Settings modal
- `app/(modals)/bloodwork.tsx` - Bloodwork upload

**Key Rule (SUPERSEDED - see below):**
~~Always import `ScrollView` from `react-native-gesture-handler`, NOT from `react-native`, when using Expo Router with gesture handler.~~

### December 28, 2025 (Continued) - Complete ScrollView Fix

**Issue:** Previous ScrollView fix using react-native-gesture-handler didn't resolve scrolling issues.

**Root Cause:** Multiple layout issues preventing proper scroll behavior:
1. Stack screenOptions missing `flex: 1` in contentStyle
2. ScrollViews not wrapped in proper flex containers
3. Missing scroll configuration props

**Complete Fix Applied:**

1. **Root Layout** (`app/_layout.tsx`):
   - Added `flex: 1` to Stack screenOptions contentStyle:
   ```tsx
   contentStyle: { backgroundColor: 'transparent', flex: 1 }
   ```

2. **All Tab & Modal Screens**:
   - Use native `ScrollView` from `react-native` (NOT gesture handler)
   - Wrap in `View` container with `flex: 1`
   - Add comprehensive scroll props:
   ```tsx
   import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';

   return (
     <View style={[styles.container, { backgroundColor: theme.background.val }]}>
       <ScrollView
         style={styles.scrollView}
         contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
         showsVerticalScrollIndicator={true}
         bounces={true}
         nestedScrollEnabled={true}
         keyboardShouldPersistTaps="handled"
         keyboardDismissMode="on-drag"
         scrollEventThrottle={16}
         refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
       >
         {/* Content */}
       </ScrollView>
     </View>
   );

   const styles = StyleSheet.create({
     container: { flex: 1 },
     scrollView: { flex: 1 },
   });
   ```

**Files Modified:**
- `app/_layout.tsx` - Added flex: 1 to contentStyle
- `app/(tabs)/index.tsx` - Dashboard
- `app/(tabs)/fasting.tsx` - Fasting timer
- `app/(tabs)/workouts.tsx` - Workouts list (removed stickyHeaderIndices)
- `app/(tabs)/profile.tsx` - Profile/settings
- `app/(tabs)/coach.tsx` - AI Coach chat
- `app/(modals)/settings.tsx` - Settings modal
- `app/(modals)/bloodwork.tsx` - Bloodwork upload

**Key ScrollView Props:**
- `bounces={true}` - Enable iOS bounce effect
- `nestedScrollEnabled={true}` - Allow nested scrolling
- `keyboardShouldPersistTaps="handled"` - Proper touch handling
- `keyboardDismissMode="on-drag"` - Dismiss keyboard on scroll
- `scrollEventThrottle={16}` - Smooth scroll events

**Critical Pattern:**
Always wrap ScrollView in a View with `flex: 1`, and ensure the ScrollView also has `flex: 1` in its style.

### December 28, 2025 (Continued) - ACTUAL Root Cause: Missing Peer Dependencies

**Issue:** ScrollView/FlatList not responding to touch/scroll gestures in Expo Go, despite all previous fixes.

**Root Cause:** Missing required peer dependencies for `expo-router`:
- `expo-constants` - Required by expo-router
- `expo-linking` - Required by expo-router

Without these dependencies, expo-router's navigation and gesture handling were broken.

**Fix Applied:**
```bash
npx expo install expo-constants expo-linking
```

**Diagnosis Tool:**
Run `npx expo-doctor@latest` to check for missing peer dependencies and compatibility issues.

**Key Takeaway:**
When scrolling doesn't work in Expo, run `npx expo-doctor@latest` FIRST to check for missing dependencies before debugging ScrollView configurations.

**Layout Configuration (Confirmed Working):**
- Root layout: `GestureHandlerRootView` wrapper with `style={{ flex: 1 }}`
- Stack screenOptions: `contentStyle: { flex: 1 }`
- Tabs screenOptions: `sceneStyle: { flex: 1 }`
- Use native `ScrollView` from `react-native` (not gesture-handler)

### December 29, 2025 - Avatar Upload & Branding Updates

**Avatar Photo Upload Feature (Complete):**

Backend:
- Added Cloudflare R2 storage service (`apps/api/src/services/storage.py`)
- R2 configuration in `apps/api/src/core/config.py`:
  ```python
  r2_account_id: str
  r2_access_key_id: str
  r2_secret_access_key: str
  r2_bucket_name: str = "ugoki-assets"
  r2_public_url: str  # e.g., https://pub-xxx.r2.dev
  ```
- Avatar upload endpoint: `POST /api/v1/uploads/avatar`
- Avatar delete endpoint: `DELETE /api/v1/uploads/avatar`
- Auto-updates `profile.avatar_url` on upload
- Server-side resize to 400x400, center crop, JPEG at 85% quality
- Dependencies added: `boto3`, `Pillow`

Mobile:
- Created `features/profile/hooks/useUploadAvatar.ts`:
  - `useUploadAvatar()` - Upload mutation
  - `useDeleteAvatar()` - Delete mutation
  - `pickImageFromLibrary()` - Helper function
  - `takePhoto()` - Helper function
  - Client-side compression: 400x400 JPEG at 80%
- Created `app/(modals)/avatar-picker.tsx` - Modal screen for avatar selection
- Updated `ProfileHeader.tsx` - Uses React Native Image for reliable sizing
- Updated `app/(tabs)/_layout.tsx` - Profile tab icon shows user avatar

**Branding & Theme Updates:**

Color scheme changed:
- **Primary**: Teal `#14b8a6` (was orange `#f97316`)
- **Secondary**: Orange `#f97316` (was teal)
- **Text color**: `#2B2B32` (dark charcoal)
- Updated in `shared/theme/tamagui.config.ts`

App assets updated:
- `assets/splash.png` - UGOKI logo on white background
- `assets/icon.png` - UGOKI logo
- `assets/adaptive-icon.png` - UGOKI logo for Android
- Notification accent color updated to teal in `app.json`

**UI Fixes:**

LevelCard progress bar:
- Replaced Tamagui `Progress` component with custom React Native `View`
- Fixed visual artifact/border issue
- File: `features/dashboard/components/LevelCard.tsx`
```tsx
<View style={{ height: 8, backgroundColor: '#e4e4e7', borderRadius: 4, overflow: 'hidden' }}>
  <View style={{ height: '100%', width: `${percent}%`, backgroundColor: '#14b8a6', borderRadius: 4 }} />
</View>
```

"View Achievements" text:
- Increased from `fontSize="$2"` to `fontSize="$3"`
- Increased `fontWeight` from `500` to `600`
- Icon size from 14 to 16

**Bloodwork Modal Enhancements:**

- Added PDF upload option using `expo-document-picker`
- Added `handlePickPDF()` function
- Improved camera error handling for Expo Go (camera unavailable in simulator)
- Updated tips to recommend PDF format
- File type detection shows different icons (PDF vs Image)

**Files Created:**
- `apps/api/src/services/storage.py` - R2 storage service
- `apps/mobile/features/profile/hooks/useUploadAvatar.ts` - Avatar hooks
- `apps/mobile/app/(modals)/avatar-picker.tsx` - Avatar picker modal

**Files Modified:**
- `apps/api/src/core/config.py` - R2 config vars
- `apps/api/src/routes/uploads.py` - Avatar endpoints
- `apps/api/pyproject.toml` - boto3, Pillow deps
- `apps/mobile/shared/theme/tamagui.config.ts` - Color theme
- `apps/mobile/features/profile/components/ProfileHeader.tsx` - Avatar display
- `apps/mobile/features/profile/hooks/index.ts` - Export avatar hooks
- `apps/mobile/features/profile/index.ts` - Export avatar hooks
- `apps/mobile/app/(tabs)/_layout.tsx` - Profile tab icon
- `apps/mobile/app/(modals)/_layout.tsx` - Avatar picker route
- `apps/mobile/app/(modals)/bloodwork.tsx` - PDF upload, camera fix
- `apps/mobile/features/dashboard/components/LevelCard.tsx` - Progress bar fix
- `apps/mobile/app.json` - Splash, icons, notification color

**Environment Variables Required (Backend):**
```bash
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=ugoki-assets
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

**Dependencies Added:**
- Backend: `boto3`, `Pillow`
- Mobile: `expo-image-picker`, `expo-image-manipulator` (for avatar)
- Mobile: `expo-document-picker` (for PDF bloodwork upload)

### December 29, 2025 (Continued) - App Icons & MVP Completion

**Square App Icon Created:**
- Used Pillow to create 1024x1024 square icons from rectangular logo (933x425)
- Logo scaled to 75% width, centered on white background
- Generated assets:
  - `assets/icon.png` (1024x1024) - Main app icon
  - `assets/adaptive-icon.png` (1024x1024) - Android adaptive icon
  - `assets/favicon.png` (48x48) - Web favicon
  - `assets/notification-icon.png` (96x96) - Push notification icon

**Push Notifications - Verified Complete:**
- `NotificationProvider` already fully implemented
- Features working:
  - Foreground display (alert, sound, badge)
  - Device token registration with backend
  - Tap handling with navigation routing
  - Cold start handling (app opened from notification)
- Updated Android notification channel color to teal (`#14b8a6`)

**MVP Status: FEATURE COMPLETE** 🎉
- All 7 phases complete
- All core features implemented and working
- Ready for production builds and deployment

**EAS Build Configuration:**
- Installed EAS CLI globally
- Created EAS project: `@linards/ugoki`
- Project ID: `838f33cf-4bab-4cd9-b306-d6d4633f51cb`
- Configured build profiles (development, preview, production)
- Added iOS encryption compliance settings

**Files Modified:**
- `assets/icon.png` - Square 1024x1024 app icon
- `assets/adaptive-icon.png` - Square 1024x1024 Android icon
- `assets/favicon.png` - 48x48 web favicon
- `assets/notification-icon.png` - 96x96 notification icon
- `features/notifications/components/NotificationProvider.tsx` - Updated channel color
- `app.json` - Added EAS project ID, encryption compliance
- `eas.json` - Created build profiles

---

## EAS Build Setup

EAS (Expo Application Services) is configured for building and deploying the mobile app.

### Configuration Files

**eas.json** - Build profiles:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

**app.json** - Project linked to EAS:
- Project ID: `838f33cf-4bab-4cd9-b306-d6d4633f51cb`
- iOS encryption compliance: `usesNonExemptEncryption: false`

### Build Commands

```bash
cd apps/mobile

# Development build (with dev tools, for device testing)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (for TestFlight / internal testing)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production build (for App Store / Play Store)
eas build --profile production --platform ios
eas build --profile production --platform android

# Build both platforms
eas build --profile preview --platform all
```

### Build Profiles

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Dev client with debugging, hot reload | Internal (device) |
| `preview` | TestFlight / Internal testing | Internal |
| `production` | App Store / Play Store submission | Store |

### Prerequisites

1. **EAS CLI installed**: `npm install -g eas-cli`
2. **Logged into Expo**: `eas login`
3. **Apple Developer Account** (for iOS builds):
   - Must be active with no pending agreements
   - Visit https://developer.apple.com to resolve issues
4. **Google Play Console** (for Android production):
   - Service account key for automated submissions

### Troubleshooting

**"Apple Developer account needs to be updated"**
- Go to https://developer.apple.com
- Accept any new agreements
- Update payment/contact info if prompted

**Build without Apple account (alternatives):**
```bash
# Android build (no Apple needed)
eas build --profile preview --platform android

# Local iOS simulator build
eas build --profile development --platform ios --local
```

### Environment Variables

Build profiles use different API URLs:
- `development`: `http://localhost:8000`
- `preview`: `https://api.ugoki.app`
- `production`: `https://api.ugoki.app`

Set via `env` in eas.json or EAS dashboard.

---

### December 29, 2025 (Continued) - Recipes Feature

**Full Recipe System Implemented:**

Backend:
- Added recipe models to CONTENT module (`models.py`):
  - `MealType` enum: breakfast, lunch, dinner, snack
  - `DietTag` enum: high_protein, low_carb, keto, vegan, vegetarian, gluten_free, dairy_free, paleo, mediterranean, meal_prep, quick, post_workout
  - `NutritionInfo`: calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g
  - `Ingredient`: name, amount, notes
  - `Recipe`, `RecipeSummary`, `RecipeFilter`, `UserSavedRecipe`
- Added ORM models (`orm.py`): `RecipeORM`, `UserSavedRecipeORM`
- Added service methods (`service.py`):
  - `get_recipe()`, `list_recipes()` - with filtering
  - `save_recipe()`, `unsave_recipe()`, `get_saved_recipes()` - user favorites
- Added API endpoints (`routes.py`):
  - `GET /content/recipes` - List with filters (meal_type, diet_tags, max_prep_time, max_calories, min_protein, is_featured, search)
  - `GET /content/recipes/{id}` - Full recipe details
  - `POST /content/recipes/saved` - Save recipe
  - `DELETE /content/recipes/saved/{id}` - Unsave recipe
  - `GET /content/recipes/saved/list` - User's saved recipes
- Created database migration: `2a037d15a76b_add_recipe_tables.py`
- Seeded 30 curated recipes in `scripts/seed_recipes.py`:
  - 10 breakfast recipes (Greek yogurt bowl, protein pancakes, overnight oats, etc.)
  - 10 lunch recipes (Caesar salad, Buddha bowl, Mediterranean pita, etc.)
  - 7 dinner recipes (grilled salmon, turkey meatballs, stuffed peppers, etc.)
  - 3 snacks (protein energy balls, cucumber hummus bites, apple almond butter)
  - All with real nutritional data, ingredients, instructions, and diet tags

Mobile:
- Created `features/recipes/` module:
  - `types.ts` - TypeScript types matching backend
  - `hooks/useRecipes.ts` - React Query hooks:
    - `useRecipes()` - List with filters
    - `useRecipe()` - Single recipe details
    - `useFeaturedRecipes()` - Featured recipes
    - `useSavedRecipes()` - User's saved recipes
    - `useSaveRecipe()`, `useUnsaveRecipe()`, `useToggleSaveRecipe()` - Save/unsave mutations
  - `components/RecipeCard.tsx` - Recipe card (default/compact variants)
  - `components/MealTypeFilter.tsx` - Meal type filter pills
- Created recipe screens:
  - `app/(modals)/recipes/index.tsx` - Recipe list with search, meal type filter
  - `app/(modals)/recipes/[id].tsx` - Full recipe detail with nutrition, ingredients, instructions
- Updated Dashboard QuickActions:
  - Reorganized to 2x3 grid layout
  - Added: Recipes (pink), Weight (cyan), Achievements (amber)
  - File: `features/dashboard/components/QuickActions.tsx`
- Updated Profile screen:
  - Added "Content" section with Browse Recipes and Saved Recipes
  - Shows saved count badge
  - File: `app/(tabs)/profile.tsx`

**Recipe Categories:**
| Meal Type | Count | Featured |
|-----------|-------|----------|
| Breakfast | 10 | 4 |
| Lunch | 10 | 4 |
| Dinner | 7 | 3 |
| Snack | 3 | 1 |

**Files Created:**
- `apps/api/scripts/seed_recipes.py` - Recipe seeder
- `apps/api/alembic/versions/2a037d15a76b_add_recipe_tables.py` - Migration
- `apps/mobile/features/recipes/types.ts`
- `apps/mobile/features/recipes/hooks/useRecipes.ts`
- `apps/mobile/features/recipes/hooks/index.ts`
- `apps/mobile/features/recipes/components/RecipeCard.tsx`
- `apps/mobile/features/recipes/components/MealTypeFilter.tsx`
- `apps/mobile/features/recipes/components/index.ts`
- `apps/mobile/features/recipes/index.ts`
- `apps/mobile/app/(modals)/recipes/index.tsx`
- `apps/mobile/app/(modals)/recipes/[id].tsx`

**Files Modified:**
- `apps/api/src/modules/content/models.py` - Recipe Pydantic models
- `apps/api/src/modules/content/orm.py` - Recipe ORM models
- `apps/api/src/modules/content/service.py` - Recipe service methods
- `apps/api/src/modules/content/routes.py` - Recipe API endpoints
- `apps/mobile/app/(modals)/_layout.tsx` - Recipe routes
- `apps/mobile/features/dashboard/components/QuickActions.tsx` - 2x3 grid with Recipes
- `apps/mobile/app/(tabs)/profile.tsx` - Content section with recipes

### December 29, 2025 (Continued) - UI Fixes & Recipe Navigation

**Auth Screens UI Fixes (Login/Signup):**

Fixed input field visibility and styling issues:
- Changed input `backgroundColor` from theme token to hardcoded `white`
- Changed `borderColor` to `#d1d5db` with explicit `borderWidth={1}`
- Added `placeholderTextColor="#9ca3af"` for visible placeholders
- Added `color="#2B2B32"` for input text
- Added `height={52}` to all input fields for proper touch targets
- Changed link buttons from Tamagui `Button` to React Native `Pressable` to fix text rendering artifacts
- Hardcoded link colors: `#14b8a6` (teal) for "Forgot password?", "Sign up", "Sign in"

Files modified:
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`

**MealTypeFilter Font Rendering Fix:**

Issue: Filter button text showing as dashes/lines instead of "Breakfast", "Lunch", etc.

Root Cause: Custom font `InterBold` wasn't rendering reliably. React Native with custom fonts requires using explicit font family names, not `fontWeight`.

Fix:
- Changed from Tamagui `Text`/`View` to React Native native components
- Changed `fontFamily: 'InterBold'` to `fontFamily: 'InterSemiBold'` (more reliable)
- Increased padding: `paddingLeft: 20`, `paddingVertical: 16`
- Larger font size: `fontSize: 16`
- Darker text color for unselected: `#1f2937`
- Wrapped ScrollView in View container for better layout control

File modified: `features/recipes/components/MealTypeFilter.tsx`

**RecipeCard Nutrition Metrics Fix:**

Increased font sizes for calories/protein/time display:
- Numbers: `fontSize={22}` (was `$5` which was too small)
- Labels: `fontSize={13}` (was `$1` which was unreadable)

File modified: `features/recipes/components/RecipeCard.tsx`

**RecipeCard Diet Tags Fix:**

Increased diet tag sizes:
- Padding: `paddingHorizontal="$3"`, `paddingVertical="$2"`
- Font: `fontSize="$3"` with `fontWeight="500"`

Files modified:
- `features/recipes/components/RecipeCard.tsx`
- `app/(modals)/recipes/[id].tsx`

**Saved Recipes Screen (New):**

Created separate screen for viewing only saved recipes:
- `app/(modals)/saved-recipes.tsx` - Shows only user's saved recipes
- Updated profile to navigate to `/saved-recipes` instead of `/recipes`
- Added route to `app/(modals)/_layout.tsx`

**ScreenHeader Safe Area Fix:**

Issue: Header overlapping with status bar/notch on recipe detail screen.

Fix:
- Added `useSafeAreaInsets` to ScreenHeader component
- Changed `paddingVertical="$3"` to `paddingTop={insets.top + 8}` + `paddingBottom="$3"`
- Added `paddingHorizontal="$4"` for consistent spacing

File modified: `shared/components/ui/ScreenHeader.tsx`

**RecipeCard Navigation Fix:**

Issue: Tapping recipe cards didn't navigate to detail screen.

Root Causes:
1. Nested `Pressable` components (card + bookmark) causing touch conflicts
2. `e.stopPropagation()` not working reliably in React Native
3. Route parameter extraction issue with `useLocalSearchParams`

Fixes:
1. Changed from `Pressable` to `TouchableOpacity` for both card and bookmark
2. Removed `e.stopPropagation()` (doesn't work in RN)
3. Changed `hitSlop` to object format: `{ top: 12, bottom: 12, left: 12, right: 12 }`
4. Fixed ID parameter handling in detail screen:
   ```tsx
   const params = useLocalSearchParams<{ id: string }>();
   const id = Array.isArray(params.id) ? params.id[0] : params.id;
   ```
5. Added error state handling with visual feedback
6. Added ScreenHeader to loading/error states for navigation

Files modified:
- `features/recipes/components/RecipeCard.tsx`
- `app/(modals)/recipes/[id].tsx`

**Files Created:**
- `app/(modals)/saved-recipes.tsx` - Saved recipes screen

**Files Modified:**
- `app/(auth)/login.tsx` - Input styling, link buttons
- `app/(auth)/signup.tsx` - Input styling, link buttons
- `features/recipes/components/MealTypeFilter.tsx` - Font rendering fix
- `features/recipes/components/RecipeCard.tsx` - Nutrition sizes, TouchableOpacity
- `app/(modals)/recipes/index.tsx` - Route path fix
- `app/(modals)/recipes/[id].tsx` - ID param handling, error states
- `app/(modals)/_layout.tsx` - Added saved-recipes route
- `app/(tabs)/profile.tsx` - Navigate to saved-recipes
- `shared/components/ui/ScreenHeader.tsx` - Safe area insets

---

## Current Status (December 29, 2025)

**Mobile App - FULLY FUNCTIONAL:**
- ✅ Authentication (anonymous mode)
- ✅ Onboarding flow (3 steps)
- ✅ Fasting timer with protocols (16:8, 18:6, 20:4)
- ✅ Dashboard with level, streaks, weight, workout stats
- ✅ Workouts browser and player
- ✅ AI Coach chat
- ✅ Profile and settings
- ✅ Push notifications
- ✅ Weight logging
- ✅ Bloodwork upload and analysis
- ✅ Avatar upload (Cloudflare R2)
- ✅ **Recipes feature** - 30 curated recipes with navigation working
- ✅ Saved recipes functionality

**Backend API - ALL MODULES COMPLETE:**
- ✅ IDENTITY - JWT auth, anonymous mode
- ✅ TIME_KEEPER - Fasting/workout timers
- ✅ METRICS - Weight, body metrics, biomarkers
- ✅ PROGRESSION - Streaks, XP, levels, achievements
- ✅ CONTENT - Workouts (16) + Recipes (30)
- ✅ AI_COACH - Chat, insights, bloodwork analysis
- ✅ NOTIFICATION - Push tokens, preferences
- ✅ PROFILE - User data, GDPR compliance

**Ready for:**
- EAS builds (development, preview, production)
- TestFlight / Internal testing
- App Store / Play Store submission

**Key Learnings from Today's Bug Fixes:**

1. **Font rendering in React Native**: Use explicit font family names (`InterSemiBold`) not `fontWeight`. Custom fonts require exact family name matching.

2. **Nested touch handlers**: Use `TouchableOpacity` instead of `Pressable` for better nested touch handling. Don't rely on `stopPropagation()`.

3. **Route parameters**: Always handle potential array values from `useLocalSearchParams` - extract first element if array.

4. **Safe area**: ScreenHeader and other header components MUST use `useSafeAreaInsets` for proper notch/status bar handling.

5. **Tamagui vs React Native**: When Tamagui components have rendering issues (colors not applying, text not visible), switch to React Native native components with explicit style objects.

### December 30, 2025 - AI Coach Safety Filtering & Health Disclaimers

**AI Coach Safety Module Implemented (Backend):**

Created comprehensive safety filtering system to prevent AI coach from providing medical advice:

- **New File: `src/modules/ai_coach/safety.py`**
  - `SafetyAction` enum: ALLOW, REDIRECT, BLOCK
  - `SafetyResult` dataclass with action, detected keywords, category, redirect message
  - Keyword detection for dangerous topics:
    - **Blocked Medical Conditions**: diabetes, heart disease, cancer, eating disorders, pregnancy, breastfeeding
    - **Blocked Emergencies**: chest pain, difficulty breathing, suicidal thoughts (redirects to 911)
    - **Blocked Allergies**: food allergies, celiac, anaphylaxis, epipen
    - **Blocked Medications**: medication questions, drug interactions, insulin, prescriptions
    - **Redirected Health Concerns**: inflammation, thyroid, depression, blood pressure (adds disclaimer)
  - `check_message_safety()` - Pre-filters user messages before AI processing
  - `filter_ai_response()` - Post-filters AI responses for medical advice patterns
  - `get_safety_disclaimer()` - Returns standard health disclaimer text

- **Updated: `src/modules/ai_coach/agents/coach.py`**
  - Added critical safety rules to system prompt:
    ```
    CRITICAL SAFETY RULES - YOU MUST FOLLOW THESE:
    1. YOU ARE NOT A MEDICAL PROFESSIONAL
    2. ALWAYS redirect to healthcare professionals for medical topics
    3. SAFE TOPICS: fasting schedules, workouts, motivation, habit building
    ```

- **Updated: `src/modules/ai_coach/models.py`**
  - Added `safety_redirected: bool = False` to `ChatResponse` model
  - Flag indicates when response was safety-filtered

- **Updated: `src/modules/ai_coach/service.py`**
  - Integrated safety filter in `chat()` method
  - Blocked messages return friendly redirect without calling AI
  - Redirected messages add disclaimer to AI response

- **New File: `tests/test_ai_coach_safety.py`**
  - 38 comprehensive unit tests:
    - 6 tests for blocked medical conditions
    - 3 tests for emergency detection
    - 3 tests for allergy blocking
    - 3 tests for medication blocking
    - 4 tests for health concern redirects
    - 7 tests for allowed safe topics
    - 4 edge case tests
    - 4 response filtering tests
    - 3 integration tests
  - All tests passing

**Mobile Health Disclaimers Implemented:**

- **Updated: `app/(auth)/onboarding.tsx`**
  - Added new Step 0: Health Disclaimer (REQUIRED)
  - Total onboarding steps increased from 4 to 5
  - Scrollable disclaimer content with sections:
    - "UGOKI is NOT" (medical device, substitute for medical advice)
    - "Consult healthcare provider if you have" (diabetes, eating disorders, pregnancy, etc.)
    - "AI Coach Limitations" (general wellness only)
    - "Safety Warning" (discontinue use if adverse effects)
  - Checkbox acknowledgment required to continue
  - Cannot be skipped (Skip button only appears on Step 2+)

- **Updated: `app/(modals)/settings.tsx`**
  - Added "Legal & Health" section at bottom of settings
  - Expandable health disclaimer (collapsed by default)
  - Same disclaimer content as onboarding
  - Allows existing users to review health information

- **Updated: `features/coach/components/WelcomeMessage.tsx`**
  - Added subtle disclaimer at bottom of coach welcome screen:
    ```
    For general wellness guidance only. Not medical advice.
    ```

**Bug Fixes:**

- **Fixed: Duplicate Index Definition in Recipe ORM**
  - Issue: `ix_recipes_meal_type` was defined twice:
    1. `index=True` on `meal_type` column (line 138)
    2. Explicit `Index("ix_recipes_meal_type", "meal_type")` in `__table_args__` (line 167)
  - Both generated same index name, causing "index already exists" error in tests
  - Fix: Removed `index=True` from column definition, kept explicit Index
  - File: `src/modules/content/orm.py`

- **Fixed: Test Fixture Isolation**
  - Updated `tests/conftest.py` to use file-based test database
  - Ensures clean database state for each test function
  - Properly disposes engine after test completion

**Git Repository Setup:**

- Initialized git repository in `ugoki_1_0` project directory
- Added `.gitignore` with standard Python/Node/Expo exclusions
- Created initial commit with all project files
- Added remote: `https://github.com/linardsb/ugoki-iOS-Android-app.git`
- Pushed to GitHub on `main` branch

**Files Created:**
- `apps/api/src/modules/ai_coach/safety.py` - Safety filtering module
- `apps/api/tests/test_ai_coach_safety.py` - 38 safety filter tests

**Files Modified:**
- `apps/api/src/modules/ai_coach/agents/coach.py` - Safety instructions in system prompt
- `apps/api/src/modules/ai_coach/models.py` - Added `safety_redirected` flag
- `apps/api/src/modules/ai_coach/service.py` - Integrated safety filter
- `apps/api/src/modules/ai_coach/routes.py` - Updated documentation
- `apps/api/src/modules/content/orm.py` - Fixed duplicate index
- `apps/api/tests/conftest.py` - Improved test isolation
- `apps/mobile/app/(auth)/onboarding.tsx` - Health disclaimer step
- `apps/mobile/app/(modals)/settings.tsx` - Expandable health disclaimer
- `apps/mobile/features/coach/components/WelcomeMessage.tsx` - Small disclaimer

**Test Results:**
```
tests/test_ai_coach_safety.py ......................................  [97%]
tests/test_health.py .                                                [100%]

============================== 39 passed in 0.17s ==============================
```

### December 30, 2025 (Continued) - AI Coach UX Improvements

**Workout Seeding Script:**

- **New File: `apps/api/scripts/seed_workouts.py`**
  - 5 workout categories: HIIT, Strength, Cardio, Flexibility, Recovery
  - 16 complete workouts with varying difficulty levels
  - 78 exercises with durations, rest times, and order
  - Featured workouts marked for homepage display
  - Run with: `uv run python scripts/seed_workouts.py`

**AI Coach Response Improvements (Backend):**

- **Updated: `src/modules/ai_coach/agents/coach.py`**
  - Added "ACTION GUIDANCE" section to system prompt
  - Coach now provides specific navigation instructions
  - Examples: "Head to the Fasting tab and tap 'Start Fast'"

- **Updated: `src/modules/ai_coach/service.py`**
  - Added pattern matching for affirmative responses ("yes", "yeah", "ok", "ready", "start")
  - All responses now include specific navigation instructions
  - Added step-by-step guides for starting fasts and workouts
  - Added recipe navigation guidance
  - Improved generic fallback with navigation overview
  - Uses bold markdown for UI elements (`**Fasting tab**`, `**Start Fast**`)

**AI Coach Header UI Updates (Mobile):**

- **Updated: `apps/mobile/app/(tabs)/coach.tsx`**
  - Replaced trash icon with "End Chat" text button
  - Light red background (#fee2e2) to indicate destructive action
  - Red text (#dc2626) for clear visual indication
  - Button centered between title and settings using 3-section flex layout
  - Fixed gear icon visibility on light theme (hardcoded #2B2B32)
  - Changed gear icon weight from "thin" to "regular"
  - Alert dialog updated from "Clear Chat" to "End Chat"
  - Used TouchableOpacity with native Text for reliable rendering

**Commits:**
```
08485724 Add workout seeding script
7428416c Improve AI coach responses with actionable navigation guidance
c7dc3916 Update AI Coach header UI
```

### December 30, 2025 (Continued) - Activity Navigation & Icon Visibility Fixes

**Activity Item Navigation (New Feature):**

Added click-to-navigate functionality for activity feed items. Tapping any activity now navigates to the relevant screen.

- **New Functions in `features/activity/components/ActivityFeedItem.tsx`:**
  - `getActivityNavigation()` - Determines navigation destination based on event category/metadata
  - `navigateToActivity()` - Performs the navigation using expo-router

- **Navigation Mapping:**
  | Activity Category | Navigation Destination |
  |-------------------|------------------------|
  | Workout Started/Completed | Workouts tab (or specific workout detail if workout_id in metadata) |
  | Recipe Saved | Specific recipe page (or Saved Recipes list) |
  | Fasting events | Fasting tab |
  | Progress events (XP, Level Up, Streak) | Achievements modal |
  | Metrics (Weight, Biomarkers) | Dashboard (or Bloodwork modal) |
  | Profile changes | Settings modal |
  | Coach messages | Coach tab |
  | Auth events | No navigation (not meaningful) |

- **Updated `ActivityFeedItem` Component:**
  - Added `navigateOnPress` prop (defaults to `true`)
  - Items are automatically pressable when they have a navigation destination
  - Uses `useRouter` hook internally for navigation

- **Updated `RecentActivityCard` Component:**
  - Dashboard activity items now clickable with navigation
  - Added CaretRight chevron indicator for navigable items

**Icon Visibility Fixes (Light Mode):**

Fixed all navigation icons (X close buttons, arrows, chevrons) that were invisible or hard to see on light mode.

**Root Cause:** Phosphor icons with `weight="thin"` and theme tokens like `$color`/`$colorMuted` were too faint on light backgrounds.

**Fix:** Changed all navigation icons to use:
- `weight="regular"` instead of `weight="thin"`
- Hardcoded colors instead of theme tokens:
  - Dark icons (close, back): `#2B2B32`
  - Muted icons (chevrons): `#6b7280`
  - Primary icons (teal): `#14b8a6`

**Files Modified:**

| File | Icons Fixed |
|------|-------------|
| `shared/components/ui/ScreenHeader.tsx` | ArrowLeft, X |
| `app/(auth)/login.tsx` | ArrowLeft back button |
| `app/(auth)/signup.tsx` | ArrowLeft back button |
| `features/profile/components/SettingsItem.tsx` | CaretRight chevron |
| `app/(modals)/workout/[id].tsx` | X close (×2), CaretRight |
| `app/(modals)/settings.tsx` | X close, CaretUp/Down (×5 sections), CaretRight |
| `app/(tabs)/profile.tsx` | Question, ChatText, Shield, SignOut icons |
| `features/dashboard/components/LevelCard.tsx` | CaretRight "View Achievements" |
| `features/activity/components/ActivityFeedItem.tsx` | Added navigation imports |
| `features/activity/components/RecentActivityCard.tsx` | Added navigation + chevron indicators |
| `features/activity/components/index.ts` | Export navigation functions |
| `features/activity/index.ts` | Export navigation functions |

**Exports Added:**
- `getActivityNavigation` - Get navigation route for activity item
- `navigateToActivity` - Navigate to activity destination

### December 30, 2025 (Continued) - Theme-Aware Icons & UI Polish

**Dark Theme Icon Visibility Fix:**

Made all icons theme-aware so they display correctly in both light and dark modes.

- **Pattern Used:** `useTheme()` from Tamagui to get theme colors:
  ```tsx
  const theme = useTheme();
  const iconColor = theme.color.val;
  const mutedIconColor = theme.colorMuted.val;
  ```

**Files Updated for Theme-Aware Icons:**
| File | Changes |
|------|---------|
| `shared/components/ui/ScreenHeader.tsx` | ArrowLeft, X icons use `iconColor` |
| `app/(auth)/login.tsx` | Back arrow uses theme color |
| `app/(auth)/signup.tsx` | Back arrow uses theme color |
| `app/(modals)/settings.tsx` | All CaretUp/Down/Right icons use `mutedIconColor` |
| `app/(modals)/workout/[id].tsx` | X close and CaretRight use theme colors |
| `features/profile/components/SettingsItem.tsx` | CaretRight uses `mutedIconColor` |
| `app/(tabs)/profile.tsx` | All menu icons use theme colors |
| `app/(tabs)/coach.tsx` | Gear icon uses `iconColor` |
| `features/activity/components/RecentActivityCard.tsx` | CaretRight uses `mutedIconColor` |
| `features/dashboard/components/LevelCard.tsx` | CaretRight uses theme color |

**WorkoutCard Icon Improvements:**

- **File: `features/workouts/components/WorkoutCard.tsx`**
  - Changed fixed colors to theme-aware: `iconColor` and `mutedIconColor`
  - Increased icon sizes for better visibility:
    - Main workout type icon: 24px → 28px
    - Clock icon: 12px → 16px
    - Fire (calories) icon: 14px → 18px
  - Kept `weight="thin"` for consistent style

**Welcome Screen Redesign:**

- **File: `app/(auth)/welcome.tsx`**
  - Replaced system font "UGOKI" text with actual logo image from `assets/splash.png`
  - Created `FeatureBadge` component with colored circles and Phosphor icons
  - Added staggered entrance animations using react-native-reanimated

- **Feature Badges:**
  | Icon | Color | Text |
  |------|-------|------|
  | `Timer` | Teal (#14b8a6) | Personalized fasting protocols |
  | `Lightning` | Orange (#f97316) | 15-minute HIIT workouts |
  | `Sparkle` | Purple (#8b5cf6) | AI-powered coaching |

- **Animations:**
  - Logo: fade in + scale spring animation
  - Tagline: delayed fade in (400ms)
  - Feature badges: staggered slide-in from left (600ms, 750ms, 900ms delays)

**Gender Dropdown Update:**

- **File: `app/(modals)/settings.tsx`**
  - Replaced emojis with Phosphor gender symbol icons
  - Options simplified to Male and Female only:
    | Option | Icon |
    |--------|------|
    | Male | `GenderMale` (♂) |
    | Female | `GenderFemale` (♀) |
  - Icons: 20px size, `weight="regular"`, white when selected, gray (#6b7280) when not

### December 31, 2025 - Coach Personality Icons & Fasting Metrics Integration

**Coach Personality Icons Update:**

Replaced generic emojis with unique Phosphor icons for AI coach personalities:

- **File: `features/coach/types.ts`**
  - Changed `emoji` field to `iconName` in PersonalityInfo interface
  - Updated PERSONALITIES array with icon names

- **File: `app/(modals)/settings.tsx`**
  - Added icon imports: `Sparkle`, `Mountains`, `Anchor`, `SmileyWink`
  - Created `PERSONALITY_ICONS` map for rendering
  - Updated personality buttons to display icons

- **File: `app/(tabs)/coach.tsx`**
  - Added icon imports and rendering in header

| Personality | New Icon | Meaning |
|-------------|----------|---------|
| Motivational | `Sparkle` | Energetic and encouraging |
| Calm | `Mountains` | Zen and mindful approach |
| Tough | `Anchor` | Drill sergeant style |
| Friendly | `SmileyWink` | Casual supportive friend |

**Fasting Metrics Integration (Backend → Mobile):**

Previously, fasting stats (Current Streak, This Week, Longest Fast) were hardcoded. Now they fetch real data.

- **Backend: `apps/api/src/modules/time_keeper/routes.py`**
  - Added ProgressionService integration
  - When fast/workout is **completed**, calls `progression.record_activity()`
  - Awards XP: 50 for fast, 75 for workout
  - Updates streak count and checks for milestone bonuses

- **Mobile: `apps/mobile/app/(tabs)/fasting.tsx`**
  - Added imports: `useFastingHistory`, `useStreaks`
  - Added `useMemo` calculations for metrics:
    - **Current Streak**: `fastingStreak?.current_count` from progression API
    - **This Week**: Count completed fasts in last 7 days from fasting history
    - **Longest Fast**: Max duration (HH:MM:SS) from completed fasts
  - Combined `handleRefresh()` for pull-to-refresh updates all metrics
  - StatCards display real values with proper singular/plural grammar

**Data Flow:**
```
Complete Fast → Backend closes window → progression.record_activity()
                                     ↓
                              Updates streak + awards XP
                                     ↓
Mobile pull-to-refresh → useStreaks() + useFastingHistory()
                                     ↓
                    Calculate & display real metrics
```

**Tab Navigation with Swipe Gestures:**

Replaced Expo Router's default Tabs with Material Top Tabs for swipe navigation:

- **Dependencies Added:**
  - `@react-navigation/material-top-tabs@7.4.11`
  - `react-native-pager-view@6.5.1`

- **File: `apps/mobile/app/(tabs)/_layout.tsx`**
  - Used `withLayoutContext` to integrate Material Top Tabs with Expo Router
  - Set `tabBarPosition: 'bottom'` to keep tabs at bottom
  - Enabled `swipeEnabled: true` for swipe between tabs
  - Enabled `animationEnabled: true` for slide transitions
  - Added teal indicator at top of tab bar
  - Preserved all existing icons (House, Timer, Barbell, Chat, User/Avatar)

- **Features:**
  - Swipe left/right between tabs
  - Smooth slide animation on tab press
  - Same visual design as before

- **Performance Optimizations:**
  - `lazy: false` - All screens pre-loaded for instant switching
  - `initialLayout: { width }` - Prevents layout jump on first render
  - `tabBarBounces: false` - No bounce on tab bar
  - `tabBarPressColor: 'transparent'` - Clean press effect

**Coach Disclaimer Font Fix:**

- **File: `features/coach/components/WelcomeMessage.tsx`**
  - Increased disclaimer font from `fontSize="$1"` to `fontSize="$3"`
  - Increased opacity from 0.7 to 0.8 for better readability

**Gender Dropdown Update:**

- **File: `app/(modals)/settings.tsx`**
  - Replaced generic icons with Phosphor gender symbols (GenderMale, GenderFemale)
  - Removed "Other" and "Prefer not to say" options

---

## Current Status (December 31, 2025)

**Mobile App - FULLY FUNCTIONAL:**
- ✅ Authentication (anonymous mode)
- ✅ Onboarding flow (4 steps + required health disclaimer)
- ✅ Fasting timer with protocols (16:8, 18:6, 20:4)
- ✅ **Fasting metrics** - streak, weekly count, longest fast (live data)
- ✅ Dashboard with level, streaks, weight, workout stats
- ✅ Workouts browser and player
- ✅ AI Coach chat with safety filtering + **custom personality icons**
- ✅ Profile and settings with health disclaimer
- ✅ Push notifications
- ✅ Weight logging
- ✅ Bloodwork upload and analysis
- ✅ Avatar upload (Cloudflare R2)
- ✅ Recipes feature - 30 curated recipes
- ✅ Saved recipes functionality
- ✅ Activity feed with click-to-navigate
- ✅ **Swipeable tab navigation** - slide between tabs with gestures

**Backend API - ALL MODULES COMPLETE:**
- ✅ IDENTITY - JWT auth, anonymous mode
- ✅ TIME_KEEPER - Fasting/workout timers, **auto-updates progression on completion**
- ✅ METRICS - Weight, body metrics, biomarkers
- ✅ PROGRESSION - Streaks, XP, levels, achievements
- ✅ CONTENT - Workouts (16) + Recipes (30)
- ✅ AI_COACH - Chat, insights, bloodwork analysis, **safety filtering**
- ✅ NOTIFICATION - Push tokens, preferences
- ✅ PROFILE - User data, GDPR compliance

**Safety & Compliance:**
- ✅ AI coach blocks medical condition queries
- ✅ AI coach blocks allergy/medication questions
- ✅ Emergency detection with 911 redirect
- ✅ Health disclaimers in onboarding (required)
- ✅ Health disclaimers in settings (expandable)
- ✅ Coach welcome screen disclaimer
- ✅ 39 backend tests passing

**Repository:**
- GitHub: https://github.com/linardsb/ugoki-iOS-Android-app
