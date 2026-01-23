# Changelog

All notable changes to UGOKI, organized by version.

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/) format.

Types of changes:
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Fixed** - Bug fixes
- **Removed** - Removed features
- **Security** - Security improvements

---

## [Unreleased]

### Added
- **Full Health Disclaimer** - Collapsible detailed health disclaimer on onboarding screen
  - "UGOKI is NOT:" section with medical device disclaimers
  - "Consult healthcare provider" section with specific conditions
  - "AI Coach Limitations" section
  - Important warning about adverse effects
- Documentation restructure with PRD, architecture docs, feature specs
- Exercise library with body focus filtering (upper, lower, core, full_body)
- Exercise difficulty metadata (beginner, intermediate, advanced)
- **Abstract Bullets** - Research papers now include 3-5 scannable bullet points ("At a Glance" view)
  - AI-generated via Claude Haiku during paper summarization
  - New `AbstractBullets` component on mobile paper detail screen
  - Backfill support for existing cached papers

### Changed
- **Onboarding Gender Selection** - Simplified to Male/Female only, removed "Other" and "Prefer not to say"
- **Onboarding UI** - Removed emoji icons from gender and goals selection screens for cleaner design

### Security
- **JWT Authentication** - All protected endpoints now validate Bearer tokens
- **Token Revocation** - Logout invalidates tokens via JTI blacklist (`revoked_tokens` table)
- **Rate Limiting** - slowapi integration with tiered limits (AUTH, AI, UPLOAD, GDPR)
- **Resource Ownership** - `verify_resource_ownership()` helper for authorization checks
- **Auth Module** - New `src/core/auth.py` with `get_current_identity` dependency
- **Security Tests** - 50 comprehensive tests in `tests/test_security.py`

### Fixed
- **BUG-012:** Auth logout not clearing Zustand persist storage - users were logged back in after signing out
- **BUG-013:** HealthSyncCard "Connect Apple Health" button too squashed - increased button height
- Research ORM datetime columns now timezone-aware (commit `0ce18294`)
- **BUG-004:** AI Coach `/stream` endpoint now uses `message` field (consistent with `/chat`)
- **BUG-005:** Time Keeper `/close` endpoint now accepts optional body (defaults to `COMPLETED` state)

### Database Seeding
- Seeded 23 workouts with 114 exercises across 5 categories
- Seeded 21 achievements (streak, fasting, workout, weight, special types)

---

## [2.1.1] - 2026-01-21

AI Coach Streaming Fixes & Production Configuration

### Fixed

#### Streaming Issues
- **BUG-008:** Fixed streaming text duplication in mobile app
  - Root cause: Pydantic AI `stream_text()` returns cumulative text, not deltas
  - Fix: Added delta extraction in `service.py:744-748`
- **BUG-009:** Fixed React Native SSE compatibility
  - Replaced native `fetch` with `react-native-sse` library for proper SSE support
- **BUG-010:** Fixed slow response times (20-40s with Ollama)
  - Added Groq as cloud LLM provider (0.3s response time)
  - Updated model to `llama-3.3-70b-versatile`
- **BUG-011:** Fixed RAG tools failing without API keys
  - Disabled web search and RAG tools by default
  - Tools must be explicitly enabled after configuring API keys

### Changed

#### Configuration
- **Production LLM Provider**: Switched from Ollama to Groq for fast inference
- **Development/Production Split**: Documented separate configurations for dev vs prod
- **RAG Tools Disabled**: Web search and document retrieval disabled by default to prevent errors when API keys not configured

#### Documentation
- Added production configuration guide to `docs/features/ai-coach.md`
- Added RAG limitations section for medical documents
- Documented provider comparison (Ollama vs Groq vs OpenAI)
- Added resolved issues section with root cause analysis

### Dependencies
- Added `react-native-sse` to mobile app for SSE streaming support

### Architecture Decisions
- **DEC-025:** Standard RAG is NOT suitable for medical document interpretation
  - Use dedicated tools with safety filters for bloodwork data
  - RAG limited to general wellness content only
  - See `docs/features/ai-coach.md#rag-limitations-for-medical-documents`

---

## [2.1.0] - 2026-01-21

AI Coach Full Upgrade: LLM + RAG + Streaming

### Added

#### AI Coach Enhancements
- **LLM in /chat Endpoint** - Real LLM responses with pattern-matching fallback
  - Uses `run_coach_response()` from Pydantic AI agent
  - Automatic fallback to pattern matching on LLM failure
- **RAG Document Retrieval** - pgvector-powered semantic search
  - New `coach_documents` table with Vector(1536) embeddings
  - HNSW index for fast cosine similarity search
  - `retrieve_relevant_documents` tool for agent
- **Embedding Cache** - In-memory TTL cache for query embeddings
  - 1-hour TTL, 1000 entry max size
  - ~100x speedup on cache hits
  - `get_embedding_cache_stats()` and `clear_embedding_cache()` utilities
- **Document Ingestion Script** - CLI for populating knowledge base
  - `scripts/ingest_documents.py` with chunking and overlap
  - Supports .md, .txt, .py, .rst, .json files
- **Mobile Streaming** - Coach screen now uses streaming responses
  - Switched from `useSendMessage` to `useStreamMessage`
  - Real-time character-by-character display

#### Database
- **Migration:** `d2e3f4a5b6c7_add_coach_documents.py`
  - pgvector extension enabled
  - `coach_documents` table with vector embeddings
  - HNSW index for similarity search

#### Dependencies
- Added `pgvector>=0.2.4` to backend dependencies

### Changed
- Mobile coach screen imports `useStreamMessage` instead of `useSendMessage`
- Scroll behavior updated to follow streaming content
- `.env.example` updated with LLM/embedding configuration

### Performance
| Metric | Before | After (cache hit) |
|--------|--------|-------------------|
| RAG retrieval | ~105ms | ~6ms |
| Embedding | ~100ms | ~0.1ms |

---

## [1.0.0] - 2026-01-10

MVP Complete - Ready for Production Deployment

### Added

#### Backend (11 Modules)
- **IDENTITY** - JWT authentication, anonymous mode
- **TIME_KEEPER** - Fasting/workout timers with pause/resume
- **METRICS** - Weight tracking, biomarkers, trends
- **PROGRESSION** - XP, levels, streaks, 21 achievements
- **CONTENT** - 23 workouts, 114 exercises, 30 recipes
- **AI_COACH** - Claude integration, safety filtering, tools
- **NOTIFICATION** - Push token management, preferences
- **PROFILE** - User data, goals, GDPR compliance
- **EVENT_JOURNAL** - Immutable activity log
- **SOCIAL** - Friends, leaderboards, challenges
- **RESEARCH** - PubMed integration, AI summaries, quotas

#### Mobile (9 Phases)
- Phase 0-1: Foundation, Auth & Onboarding
- Phase 2-3: Fasting Timer, Dashboard
- Phase 4-5: Workouts, AI Coach
- Phase 6-7: Profile/Settings, Polish
- Phase 8-9: Social, Research Hub

#### Features
- Intermittent Fasting Timer (16:8, 18:6, 20:4)
- HIIT Workout Library with video player
- AI Coach with biomarker awareness
- Research Hub with PubMed search
- Bloodwork upload and analysis
- Social challenges and leaderboards
- Full progression system

### Infrastructure
- FastAPI backend with SQLAlchemy 2.0
- Expo React Native mobile app
- Tamagui UI framework
- TanStack Query for data fetching
- Zustand for state management

---

## [0.9.0] - 2026-01-08

### Added
- Bloodwork history view with trend tracking
- Developer debug section in profile (DEV mode only)
- Dark mode support for user profile modal

### Changed
- Bloodwork upload now uses Claude Sonnet 4

### Fixed
- Weight logging source field validation

---

## [0.5.0] - 2025-12-28

### Added
- Mobile app testing framework
- Custom AppSwitch component
- Collapsible notifications section

### Changed
- Migrated from MMKV to AsyncStorage
- Settings modal to fullScreenModal

### Fixed
- Font loading with named imports
- Portal provider for Sheet/Modal
- Button styling standardization
- Tab navigation padding

---

## [0.1.0] - 2025-12-28

### Added
- Initial project setup
- Black box architecture design
- Core module structure
- Database schema design

---

## Version Numbering

UGOKI follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.x.x) - Breaking changes
- **MINOR** (x.1.x) - New features, backwards compatible
- **PATCH** (x.x.1) - Bug fixes, backwards compatible

---

## References

- **Session Logs:** [SESSIONS.md](SESSIONS.md) - Detailed development history
- **Roadmap:** [ROADMAP.md](../product/ROADMAP.md) - Future plans
