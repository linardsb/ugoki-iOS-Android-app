# UGOKI Product Requirements Document

**Version:** 1.0 | **Status:** MVP Complete | **Last Updated:** January 2026

---

## 1. Product Vision

### Mission Statement
Empower busy professionals to achieve sustainable health optimization through the synergy of Intermittent Fasting and High-Intensity Interval Training, guided by AI personalization.

### Target Users
**Primary:** Busy professionals (25-45) seeking sustainable health optimization in 15-20 minutes daily.

**User Characteristics:**
- Time-constrained, values efficiency
- Health-conscious but overwhelmed by options
- Prefers guided experiences over self-directed research
- Wants measurable progress and accountability

### Core Differentiator
The only app combining IF + HIIT with AI-powered personalization through a coaching agent that adapts to user biomarkers, preferences, and progress.

---

## 2. User Personas

### Persona 1: The Time-Starved Executive
- **Name:** Sarah, 38, Marketing Director
- **Pain Points:** No time for gym, inconsistent eating, stress eating
- **Goals:** Lose 15 lbs, more energy, sustainable routine
- **Behavior:** Uses phone during commute, prefers short interactions

### Persona 2: The Health-Curious Beginner
- **Name:** Mike, 29, Software Engineer
- **Pain Points:** Confused by diet advice, sedentary lifestyle, low motivation
- **Goals:** Build healthy habits, understand nutrition basics
- **Behavior:** Researches before acting, wants scientific backing

---

## 3. Core Features (MVP)

### 3.1 Intermittent Fasting Timer
**Status:** Complete

| Aspect | Details |
|--------|---------|
| Backend | `apps/api/src/modules/time_keeper/` |
| Mobile | `apps/mobile/features/fasting/` |
| Spec | [features/fasting.md](../features/fasting.md) |

**Capabilities:**
- Multiple protocols (16:8, 18:6, 20:4, custom)
- Pause/resume functionality
- Eating window tracking
- Progress visualization with animated timer
- Push notifications for window transitions

**Key Files:**
- `apps/api/src/modules/time_keeper/service.py` - Timer logic
- `apps/mobile/features/fasting/stores/fastingStore.ts` - State management
- `apps/mobile/features/fasting/components/FastingTimer.tsx` - UI

---

### 3.2 HIIT Workouts
**Status:** Complete

| Aspect | Details |
|--------|---------|
| Backend | `apps/api/src/modules/content/` |
| Mobile | `apps/mobile/features/workouts/` |
| Spec | [features/workouts.md](../features/workouts.md) |

**Capabilities:**
- 16 workout programs (10-20 min sessions)
- Video player with exercise instructions
- Exercise library with body focus filtering
- Difficulty levels (beginner/intermediate/advanced)
- Workout completion tracking

**Key Files:**
- `apps/api/src/modules/content/service.py` - Workout catalog
- `apps/api/scripts/seed_workouts.py` - Workout definitions
- `apps/mobile/app/(modals)/workout-player.tsx` - Player UI

---

### 3.3 AI Coach
**Status:** Complete

| Aspect | Details |
|--------|---------|
| Backend | `apps/api/src/modules/ai_coach/` |
| Mobile | `apps/mobile/features/coach/` |
| Spec | [features/ai-coach.md](../features/ai-coach.md) |

**Capabilities:**
- Conversational chat interface
- Access to user metrics, fasting data, workouts
- Biomarker-aware recommendations
- Safety filtering (blocks medical advice)
- Daily insights generation

**Key Files:**
- `apps/api/src/modules/ai_coach/agent.py` - Pydantic AI agent
- `apps/api/src/modules/ai_coach/safety.py` - Content filtering
- `apps/api/src/modules/ai_coach/tools/` - Agent tools

---

### 3.4 Research Hub
**Status:** Complete

| Aspect | Details |
|--------|---------|
| Backend | `apps/api/src/modules/research/` |
| Mobile | `apps/mobile/features/research/` |
| Spec | [features/research.md](../features/research.md) |

**Capabilities:**
- PubMed integration for scientific papers
- AI-generated summaries (Claude Haiku)
- Topic browsing (IF, HIIT, Nutrition, Sleep)
- Paper saving functionality
- 15 searches/day quota

**Key Files:**
- `apps/api/src/modules/research/sources/pubmed.py` - PubMed adapter
- `apps/api/src/modules/research/ai/summarizer.py` - AI summarization
- `apps/mobile/features/research/hooks/useResearch.ts` - React Query hooks

---

### 3.5 Bloodwork Analysis
**Status:** Complete

| Aspect | Details |
|--------|---------|
| Backend | `apps/api/src/services/bloodwork_parser.py` |
| Mobile | `apps/mobile/features/bloodwork/` |
| Spec | [features/bloodwork.md](../features/bloodwork.md) |

**Capabilities:**
- PDF/image upload of blood test results
- AI parsing of biomarkers (Claude Sonnet)
- Historical trend tracking
- Integration with AI Coach for personalized insights
- Reference range visualization

**Key Files:**
- `apps/api/src/services/bloodwork_parser.py` - PDF/image parsing
- `apps/api/src/routes/uploads.py` - Upload endpoint
- `apps/mobile/app/(modals)/bloodwork/` - Bloodwork screens

---

### 3.6 Social Features
**Status:** Complete

| Aspect | Details |
|--------|---------|
| Backend | `apps/api/src/modules/social/` |
| Mobile | `apps/mobile/features/social/` |
| Spec | [features/social.md](../features/social.md) |

**Capabilities:**
- Friend connections with request/accept flow
- Follow system for one-way connections
- Global and friends leaderboards
- Challenges (fasting streak, workout count, XP, consistency)
- Join challenges via code

**Key Files:**
- `apps/api/src/modules/social/service.py` - Social logic
- `apps/mobile/features/social/hooks/useSocial.ts` - React Query hooks

---

### 3.7 Progression System
**Status:** Complete

| Aspect | Details |
|--------|---------|
| Backend | `apps/api/src/modules/progression/` |
| Mobile | `apps/mobile/features/dashboard/` |
| Spec | [features/progression.md](../features/progression.md) |

**Capabilities:**
- XP earning from activities
- Level system with thresholds
- 21 achievements across categories
- Fasting and workout streaks
- Progress dashboard

**Key Files:**
- `apps/api/src/modules/progression/service.py` - XP/level logic
- `apps/api/src/modules/progression/achievements.py` - Achievement definitions
- `apps/mobile/features/dashboard/hooks/useProgression.ts` - Queries

---

## 4. Supporting Modules

### 4.1 Identity (Authentication)
- JWT-based authentication
- Anonymous mode for onboarding
- OAuth social login (planned)
- **Backend:** `apps/api/src/modules/identity/`

### 4.2 Profile
- User PII storage (GDPR isolated)
- Goals and preferences
- Health restrictions
- Onboarding data
- **Backend:** `apps/api/src/modules/profile/`

### 4.3 Metrics
- Weight tracking
- Biomarker storage
- Trend calculations
- **Backend:** `apps/api/src/modules/metrics/`

### 4.4 Notifications
- Push notification tokens
- Preference management
- Scheduled reminders
- **Backend:** `apps/api/src/modules/notification/`

### 4.5 Event Journal
- Immutable activity log
- GDPR compliance (audit trail)
- **Backend:** `apps/api/src/modules/event_journal/`

---

## 5. Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| API response time | < 200ms (p95) |
| App launch time | < 2 seconds |
| Timer accuracy | < 100ms drift |

### Security
- JWT tokens with refresh rotation
- HTTPS only
- No PII in logs
- GDPR compliant data isolation
- Full spec: [standards/SECURITY.md](../standards/SECURITY.md)

### Reliability
- 99.9% API uptime target
- Offline timer functionality
- Graceful degradation when AI unavailable

---

## 6. Current Status

**Phase:** MVP Complete - Ready for Production Deployment

### Backend (11/11 Modules)

| Module | Status | Key Features |
|--------|--------|--------------|
| IDENTITY | Complete | JWT auth, anonymous mode |
| TIME_KEEPER | Complete | Fasting/workout timers, pause/resume |
| METRICS | Complete | Weight tracking, biomarkers, bloodwork |
| PROGRESSION | Complete | Streaks, XP, levels, 21 achievements |
| CONTENT | Complete | 16 workouts, 30 recipes, exercise library |
| AI_COACH | Complete | Chat, insights, safety filtering |
| NOTIFICATION | Complete | Push tokens, preferences |
| PROFILE | Complete | Goals, health, GDPR compliance |
| EVENT_JOURNAL | Complete | Activity tracking |
| SOCIAL | Complete | Friends, leaderboards, challenges |
| RESEARCH | Complete | PubMed, AI summaries, 15/day quota |

### Mobile (9/9 Phases)

| Phase | Description | Status |
|-------|-------------|--------|
| 0-1 | Foundation, Auth & Onboarding | Complete |
| 2-3 | Fasting Timer, Dashboard | Complete |
| 4-5 | Workouts, AI Coach | Complete |
| 6-7 | Profile/Settings, Polish | Complete |
| 8-9 | Social, Research Hub | Complete |

---

## 7. Success Metrics

### Engagement
| Metric | Target |
|--------|--------|
| DAU/MAU ratio | > 40% |
| Avg fasts completed/week | > 4 |
| Avg workouts/week | > 2 |
| AI Coach messages/user/week | > 5 |

### Retention
| Metric | Target |
|--------|--------|
| Day 1 retention | > 60% |
| Day 7 retention | > 40% |
| Day 30 retention | > 25% |

### Quality
| Metric | Target |
|--------|--------|
| App Store rating | > 4.5 |
| Crash-free sessions | > 99.5% |
| Support tickets/1K users | < 10 |

---

## 8. References

- **Roadmap:** [ROADMAP.md](ROADMAP.md)
- **Decisions:** [DECISIONS.md](DECISIONS.md)
- **Architecture:** [architecture/OVERVIEW.md](../architecture/OVERVIEW.md)
- **Known Issues:** [tracking/BUGS.md](../tracking/BUGS.md)
