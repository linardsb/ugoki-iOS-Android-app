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
