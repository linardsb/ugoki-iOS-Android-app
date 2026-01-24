# UGOKI Documentation Index

Quick navigation hub for all project documentation.

---

## Product (What We're Building)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [PRD.md](product/PRD.md) | Product requirements, features, success metrics | Understanding what UGOKI does |
| [ROADMAP.md](product/ROADMAP.md) | Future features, priorities, phases | Planning next work |
| [DECISIONS.md](product/DECISIONS.md) | Key decisions and rationale | Understanding why choices were made |

---

## Architecture (How It's Built)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [OVERVIEW.md](architecture/OVERVIEW.md) | High-level system design | New to the codebase |
| [PRIMITIVES.md](architecture/PRIMITIVES.md) | Core data types (5 primitives) | Designing new features |
| [MODULES.md](architecture/MODULES.md) | Module specifications (11 modules) | Working on specific module |
| [PATTERNS.md](architecture/PATTERNS.md) | Code patterns, conventions | Writing new code |

---

## Guides (How to Develop)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [GETTING_STARTED.md](guides/GETTING_STARTED.md) | Setup, first run, dev workflow | First time setup |
| [BACKEND.md](guides/BACKEND.md) | API development, database, deployment | Backend work |
| [MOBILE.md](guides/MOBILE.md) | React Native, Expo, EAS builds | Mobile work |
| [TESTING.md](guides/TESTING.md) | Testing strategy, patterns | Writing tests |

---

## Standards (Best Practices)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [CODING_STANDARDS.md](standards/CODING_STANDARDS.md) | Style guide, naming, organization | Writing any code |
| [SECURITY.md](standards/SECURITY.md) | Security requirements, GDPR | Handling user data |
| [ANTI_PATTERNS.md](standards/ANTI_PATTERNS.md) | What NOT to do | Code review |

---

## Features (Specifications)

| Feature | Status | Backend | Mobile |
|---------|--------|---------|--------|
| [Fasting Timer](features/fasting.md) | Complete | `time_keeper/` | `features/fasting/` |
| [HIIT Workouts](features/workouts.md) | Complete | `content/` | `features/workouts/` |
| [AI Coach](features/ai-coach.md) | Complete | `ai_coach/` | `features/coach/` |
| [Research Hub](features/research.md) | Complete | `research/` | `features/research/` |
| [Bloodwork](features/bloodwork.md) | Complete | `metrics/` | `features/bloodwork/` |
| [Health Metrics](features/health-metrics.md) | Complete | `metrics/` | `features/health/` |
| [Social](features/social.md) | Complete | `social/` | `features/social/` |
| [Progression](features/progression.md) | Complete | `progression/` | `features/dashboard/` |

---

## Integrations (External Services)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [FITNESS_TOOLS.md](FITNESS_TOOLS.md) | Health data integration (Apple HealthKit, Android Health Connect) | Implementing device health sync |
| [AI_COACH_INTEGRATION_PLAN.md](AI_COACH_INTEGRATION_PLAN.md) | AI Coach architecture and enhancement plan | Working on AI Coach features |

---

## Tracking (Progress & Issues)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [CHANGELOG.md](tracking/CHANGELOG.md) | Version history, releases | Checking what changed |
| [BUGS.md](tracking/BUGS.md) | Known issues with code refs | Fixing bugs |
| [SESSIONS.md](tracking/SESSIONS.md) | Development session logs | Detailed work history |

---

## Archive (Reference Only)

Legacy documents kept for reference. Do not edit.

| Document | Original Purpose |
|----------|------------------|
| [1_2_Ugoki_implementation_LEGACY.md](archive/1_2_Ugoki_implementation_LEGACY.md) | Original implementation plan |
| [BlackBox_Design_v2_REFERENCE.md](archive/BlackBox_Design_v2_REFERENCE.md) | Full architecture design document |

---

## Quick Links

| Need | Location |
|------|----------|
| Run API | `uv run uvicorn src.main:app --reload` |
| Run Mobile | `bun run start` |
| Current status | [PRD.md#current-status](product/PRD.md#current-status) |
| Report bug | [BUGS.md](tracking/BUGS.md) |
| Add feature | [features/_TEMPLATE.md](features/_TEMPLATE.md) |
