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

### DEC-023: Multi-Provider LLM Support
**Date:** January 2026 | **Status:** Accepted

**Context:** Need flexibility in LLM provider for development vs production.

**Decision:** Support multiple LLM providers (Ollama, Groq, OpenAI, Anthropic) through configuration.

**Rationale:**
- Ollama for free local development
- Groq for fast, cheap production inference (0.3s response time)
- OpenAI/Anthropic as alternatives if needed
- All use OpenAI-compatible API format

**Consequences:**
- Environment variables control provider selection
- Pydantic AI's OpenAIProvider works with all providers
- No code changes needed to switch providers

**Reference:** [features/ai-coach.md#configuration](../features/ai-coach.md#configuration)

---

### DEC-024: SSE Streaming for AI Coach
**Date:** January 2026 | **Status:** Accepted

**Context:** Need real-time response streaming for AI Coach chat.

**Decision:** Use Server-Sent Events (SSE) for streaming responses.

**Rationale:**
- Standard HTTP-based protocol
- Works through load balancers
- React Native support via `react-native-sse` library
- Simpler than WebSockets for unidirectional data

**Implementation Details:**
- Backend yields StreamChunk objects with delta text
- Mobile app uses `react-native-sse` (not native fetch)
- Pydantic AI's `stream_text()` returns cumulative text; service extracts deltas

**Consequences:**
- Connection timeout handling needed
- Fallback to non-streaming on error
- Special handling for Pydantic AI cumulative text

**Reference:** [features/ai-coach.md#streaming-response-format](../features/ai-coach.md#streaming-response-format)

---

### DEC-025: RAG Not Suitable for Medical Documents
**Date:** January 2026 | **Status:** Accepted

**Context:** Evaluating whether standard RAG can accurately process medical documents (bloodwork, diagnoses).

**Decision:** Do NOT use standard RAG for medical document interpretation. Keep RAG for general wellness content only.

**Rationale:**
1. **Embedding limitations**: General-purpose embeddings (OpenAI, Cohere) miss medical terminology nuances
2. **Chunking problems**: Fixed-size splitting can separate conditions from critical contraindications
3. **Hallucination risk**: LLMs may confidently generate incorrect medical information
4. **Retrieval accuracy**: May retrieve partially relevant content while missing important safety caveats
5. **Liability**: Incorrect medical advice could harm users

**Medical-Grade Requirements** (not implemented):
- PubMedBERT or MedCPT embeddings
- Semantic/section-aware chunking
- Medical fine-tuned LLM
- Citation and confidence scoring

**UGOKI's Approach:**
- RAG limited to: fasting protocols, workout guidance, nutrition tips
- Bloodwork: Dedicated tools query structured METRICS data with safety filters
- Medical conditions: Pre-filtered and blocked before LLM processing

**Consequences:**
- Users cannot upload medical documents to RAG knowledge base
- Bloodwork interpretation uses dedicated tools, not semantic search
- Safety filters remain critical layer of protection

**Reference:** [features/ai-coach.md#rag-limitations-for-medical-documents](../features/ai-coach.md#rag-limitations-for-medical-documents)

---

### DEC-026: RAG Tools Disabled by Default
**Date:** January 2026 | **Status:** Accepted

**Context:** RAG tools (web search, document retrieval) require API keys that may not be configured.

**Decision:** Disable RAG tools by default in production code. Require explicit enable after configuration.

**Rationale:**
- Prevents runtime errors when API keys missing
- Avoids confusing error messages for new developers
- Explicit opt-in ensures keys are properly configured
- Agent works with simplified functionality using only fitness data tools

**Consequences:**
- Web search and RAG tools commented out in `agents/coach.py`
- Documentation explains how to enable
- Production checklist includes API key verification

**Reference:** `apps/api/src/modules/ai_coach/agents/coach.py:317-330`

---

### DEC-027: Health Device Integration (HealthKit + Health Connect)
**Date:** January 2026 | **Status:** Accepted

**Context:** Users need automated health data collection to provide context for AI Coach personalization without manual entry burden.

**Decision:** Integrate Apple HealthKit (iOS) and Google Health Connect (Android) for automatic health metric syncing with explicit user permission flow.

**Rationale:**
- **Eliminates manual entry friction** - Users don't need to manually log heart rate, sleep, steps
- **Improves personalization** - Recovery score (HRV + resting HR + sleep) enables intelligent workout/fasting recommendations
- **Privacy-first approach** - Device syncs to user's native health app first, then UGOKI with permission
- **HIPAA/GDPR compliant** - Treated as Protected Health Information (PHI) with source tracking
- **Selective sync** - Users can revoke permission anytime without losing other app data

**Alternatives Considered:**
- Manual user input only (less friction reduction, poor personalization)
- Third-party API aggregators (adds vendor lock-in, privacy concerns)

**Consequences:**
- Requires native platform permissions (iOS HealthKit, Android Health Connect)
- Development blocked on simulator (requires physical device or paid developer account)
- Health data stored with `MetricSource.DEVICE_SYNC` for audit/GDPR compliance
- Health data never logged or exposed in error messages
- Recovery score calculation enables new AI Coach capabilities (DEC-028 future decision)
- Users must explicitly grant permissions per platform

**Implementation Details:**
- `apps/mobile/features/health/hooks/useHealthSync.ts` - Unified iOS/Android abstraction
- `apps/api/src/routes/health_sync.py` - Sync and context endpoints
- Metrics stored in existing METRICS table with `health_*` prefix
- GET `/health-sync/context` returns computed recovery_score + AI insights

**Reference:** [features/health-metrics.md](../features/health-metrics.md), [standards/SECURITY.md#health-data-protection](../standards/SECURITY.md#health-data-protection-phi---protected-health-information)

---

### DEC-028: Social Module Cross-Module ORM Access
**Date:** January 2026 | **Status:** Accepted (Deferred Refactor)

**Context:** The SOCIAL module imports ORM models from PROFILE, PROGRESSION, TIME_KEEPER, and EVENT_JOURNAL modules for leaderboard queries, user search, and challenge progress calculation. This violates the black box principle (DEC-001).

**Decision:** Accept cross-module ORM access in SOCIAL module for MVP. Document as intentional exception. Defer GRAPH_SERVICE refactor to post-MVP.

**Rationale:**
- **Performance requirement**: Leaderboards need `ORDER BY xp DESC LIMIT 100` in single query
- **N+1 prevention**: Using interfaces would require 100+ individual service calls
- **Unidirectional**: Only SOCIAL imports from others (not vice versa)
- **Read-only**: Cross-module access limited to read operations
- **MVP trade-off**: Refactoring adds complexity without user-facing benefit

**Cross-Module Access Locations:**
```
social/service.py:
├── get_leaderboard (lines 549-652)
│   └── progression.UserLevelORM, progression.StreakORM, profile.SocialProfileORM
├── _get_user_profile_data (lines 1264-1294)
│   └── profile.UserProfileORM, profile.SocialProfileORM, progression.UserLevelORM
├── search_users (lines 513-543)
│   └── profile.SocialProfileORM
├── _calculate_challenge_progress (lines 1452-1509)
│   └── progression.StreakORM, time_keeper.TimeWindowORM, progression.XPTransactionORM
└── generate_share_content (lines 1010-1093)
    └── progression.AchievementORM, progression.StreakORM
```

**Alternatives Considered:**

1. **GRAPH_SERVICE module** (Proposed, deferred)
   - Dedicated module for cross-module aggregations
   - `GraphServiceInterface` with `get_leaderboard()`, `get_user_social_profile()`
   - Pros: Explicit contract, better testability, reusable
   - Cons: Same coupling moved to new location, more modules to maintain

2. **Database views** (Simpler alternative)
   - Create `leaderboard_xp` view joining required tables
   - Pros: No code changes, database owns aggregation
   - Cons: View maintenance, less flexible

3. **Extend existing interfaces** (Interface expansion)
   - Add `get_level_rankings(limit, filter_ids)` to ProgressionInterface
   - Add `get_public_profiles(identity_ids)` to ProfileInterface
   - Pros: Maintains black box principle
   - Cons: Interface bloat, still multiple queries

**When to Revisit:**
- Adding activity feeds or recommendations
- Performance degradation at scale (>100k users)
- Adding more modules that need cross-module aggregation
- Expanding leaderboard features (weekly, seasonal)

**Consequences:**
- SOCIAL module has documented exception in ANTI_PATTERNS.md:34-69
- Other modules MUST NOT follow this pattern without decision record
- Schema changes in referenced modules require SOCIAL query updates

**Reference:** [standards/ANTI_PATTERNS.md](../standards/ANTI_PATTERNS.md#accepted-exception-social-module-leaderboard-queries)

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
