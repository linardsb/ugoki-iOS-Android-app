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
- Documentation restructure with PRD, architecture docs, feature specs
- Exercise library with body focus filtering (upper, lower, core, full_body)
- Exercise difficulty metadata (beginner, intermediate, advanced)
- **Abstract Bullets** - Research papers now include 3-5 scannable bullet points ("At a Glance" view)
  - AI-generated via Claude Haiku during paper summarization
  - New `AbstractBullets` component on mobile paper detail screen
  - Backfill support for existing cached papers

### Security
- **JWT Authentication** - All protected endpoints now validate Bearer tokens
- **Token Revocation** - Logout invalidates tokens via JTI blacklist (`revoked_tokens` table)
- **Rate Limiting** - slowapi integration with tiered limits (AUTH, AI, UPLOAD, GDPR)
- **Resource Ownership** - `verify_resource_ownership()` helper for authorization checks
- **Auth Module** - New `src/core/auth.py` with `get_current_identity` dependency
- **Security Tests** - 50 comprehensive tests in `tests/test_security.py`

### Fixed
- Research ORM datetime columns now timezone-aware (commit `0ce18294`)

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
- **CONTENT** - 16 workouts, 30 recipes, exercise library
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
