# Key Decisions & Rationale

Record of significant architectural, product, and technical decisions.

---

## Decision Format

Each decision follows this structure:
- **ID:** DEC-XXX
- **Date:** When decided
- **Status:** Accepted | Superseded | Deprecated
- **Context:** Why this decision was needed
- **Decision:** What was decided
- **Rationale:** Why this choice over alternatives
- **Consequences:** What this means going forward

---

## Architecture Decisions

### DEC-001: Black Box Modular Architecture
**Date:** December 2025 | **Status:** Accepted

**Context:** Need for maintainable, scalable architecture that allows parallel development.

**Decision:** Adopt Eskil Steenberg's black box principles with 11 isolated modules.

**Rationale:**
- Each module can be developed/tested independently
- Implementation changes don't affect other modules
- Clear ownership boundaries
- Enables future technology swaps

**Consequences:**
- All inter-module communication through defined interfaces
- No shared database tables between modules
- Slightly more initial setup for new features

**Reference:** [architecture/OVERVIEW.md](../architecture/OVERVIEW.md)

---

### DEC-002: Five Core Primitives
**Date:** December 2025 | **Status:** Accepted

**Context:** Need universal data types that all modules understand.

**Decision:** Define 5 primitives: IDENTITY, TIME_WINDOW, ACTIVITY_EVENT, METRIC, PROGRESSION.

**Rationale:**
- Everything in wellness reduces to these types
- Enables consistent APIs across modules
- Simplifies new feature development
- Reduces conceptual complexity

**Consequences:**
- All new features must map to existing primitives
- Primitives are immutable definitions

**Reference:** [architecture/PRIMITIVES.md](../architecture/PRIMITIVES.md)

---

### DEC-003: Python FastAPI for Backend
**Date:** December 2025 | **Status:** Accepted

**Context:** Backend technology selection for API.

**Decision:** Python 3.12+ with FastAPI, SQLAlchemy 2.0, Pydantic 2.0.

**Rationale:**
- FastAPI provides automatic OpenAPI docs
- Pydantic ensures type safety
- SQLAlchemy 2.0 supports async natively
- Python ecosystem strong for AI/ML integration
- Team expertise in Python

**Alternatives Considered:**
- Node.js (faster cold starts, but less type safety)
- Go (better performance, but slower development)

**Consequences:**
- Async patterns required throughout
- uv for dependency management
- Alembic for migrations

---

### DEC-004: Expo React Native for Mobile
**Date:** December 2025 | **Status:** Accepted

**Context:** Mobile framework selection.

**Decision:** Expo SDK 52 with React Native, Tamagui UI, Zustand state, TanStack Query.

**Rationale:**
- Single codebase for iOS/Android
- Expo provides managed workflow, EAS builds
- Tamagui offers performance + styling flexibility
- TanStack Query handles caching/sync elegantly
- Zustand simpler than Redux

**Alternatives Considered:**
- Flutter (Dart learning curve, smaller job market)
- Native (2x development cost)

**Consequences:**
- Some native features require ejecting
- Expo Go for rapid development
- EAS for production builds

---

## Product Decisions

### DEC-010: Anonymous-First Authentication
**Date:** December 2025 | **Status:** Accepted

**Context:** Reduce friction for new users trying the app.

**Decision:** Allow anonymous usage with device ID, optional account upgrade.

**Rationale:**
- Lower barrier to entry
- Users can try before committing
- Data preserved on account creation
- Reduces drop-off in onboarding

**Consequences:**
- Device ID storage required
- Account migration path needed
- Some features require full account

---

### DEC-011: AI Coach Safety Filtering
**Date:** December 2025 | **Status:** Accepted

**Context:** Prevent AI from providing medical advice.

**Decision:** Pre-filter user messages and post-filter AI responses for blocked topics.

**Rationale:**
- Legal liability protection
- User safety
- Maintains trust in AI recommendations
- Clear boundaries for AI capabilities

**Consequences:**
- Blocked topics list maintenance
- Some legitimate questions blocked
- Emergency redirects to 911

**Reference:** [features/ai-coach.md#safety](../features/ai-coach.md#safety)

---

### DEC-012: Research Quota System (15/day)
**Date:** December 2025 | **Status:** Accepted

**Context:** Limit AI summarization costs while providing value.

**Decision:** 15 searches per user per day, topic browsing unlimited.

**Rationale:**
- Controls Claude Haiku costs
- Encourages intentional usage
- Topic browsing provides discovery without cost
- Quota resets encourage daily return

**Consequences:**
- Quota tracking in database
- UI quota indicator
- Premium tier can increase quota

**Reference:** [features/research.md#quota](../features/research.md#quota)

---

## Technical Decisions

### DEC-020: AsyncStorage over MMKV
**Date:** December 2025 | **Status:** Accepted

**Context:** Storage solution for React Native app state.

**Decision:** Use AsyncStorage instead of MMKV.

**Rationale:**
- MMKV requires native modules
- AsyncStorage works in Expo Go
- Performance difference negligible for our use case
- Simpler development workflow

**Consequences:**
- All storage calls are async
- API client needs auth caching layer
- Slightly slower than MMKV

---

### DEC-021: Timezone-Aware Timestamps
**Date:** January 2026 | **Status:** Accepted

**Context:** Datetime mismatch errors in research module.

**Decision:** All datetime columns use `DateTime(timezone=True)` in SQLAlchemy.

**Rationale:**
- PostgreSQL requires consistent timezone handling
- Prevents runtime errors
- Users in different timezones handled correctly

**Consequences:**
- All new datetime columns must be timezone-aware
- Existing columns migrated

**Reference:** Commit `0ce18294`

---

### DEC-022: Biomarkers in Metrics Table
**Date:** December 2025 | **Status:** Accepted

**Context:** Where to store parsed bloodwork biomarkers.

**Decision:** Store in existing METRICS table with `biomarker_` prefix.

**Rationale:**
- Reuses existing infrastructure
- Trend tracking works automatically
- AI Coach tools already query METRICS
- No new table maintenance

**Consequences:**
- Prefix convention required
- Filtering by prefix for queries
- Reference ranges in metadata

**Reference:** [features/bloodwork.md](../features/bloodwork.md)

---

## Deprecated Decisions

### DEC-D01: Redux for State Management
**Date:** December 2025 | **Status:** Superseded by DEC-004

**Original Decision:** Use Redux Toolkit for mobile state.

**Why Superseded:** Zustand provides simpler API with less boilerplate for our use case.

---

## Adding New Decisions

When making significant decisions:

1. Create new entry with next ID (DEC-XXX)
2. Fill in all fields
3. Link to relevant specs/code
4. Update this file in same PR as implementation
