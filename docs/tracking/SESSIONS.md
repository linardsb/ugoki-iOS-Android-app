# Development Sessions

Detailed logs of development sessions. For summarized changes, see [CHANGELOG.md](CHANGELOG.md).

---

## January 2026

### January 10, 2026 - Documentation Restructure

**Focus:** Documentation reorganization for better development flow

**Completed:**
- Created new documentation structure with categorized folders
- Added PRD.md with all features and code references
- Added ROADMAP.md with priorities and phases
- Added DECISIONS.md for architectural decisions
- Created architecture docs (OVERVIEW, PRIMITIVES, MODULES, PATTERNS)
- Created developer guides (GETTING_STARTED, BACKEND, MOBILE, TESTING)
- Created standards docs (CODING_STANDARDS, SECURITY, ANTI_PATTERNS)
- Created feature specifications for all 7 features
- Created tracking docs (BUGS.md, CHANGELOG.md, SESSIONS.md)
- Updated CLAUDE.md to reference new structure

**Files Created:**
- `docs/INDEX.md`
- `docs/product/PRD.md`
- `docs/product/ROADMAP.md`
- `docs/product/DECISIONS.md`
- `docs/architecture/OVERVIEW.md`
- `docs/architecture/PRIMITIVES.md`
- `docs/architecture/MODULES.md`
- `docs/architecture/PATTERNS.md`
- `docs/guides/GETTING_STARTED.md`
- `docs/guides/BACKEND.md`
- `docs/guides/MOBILE.md`
- `docs/guides/TESTING.md`
- `docs/standards/CODING_STANDARDS.md`
- `docs/standards/SECURITY.md`
- `docs/standards/ANTI_PATTERNS.md`
- `docs/features/*.md` (7 features + template)
- `docs/tracking/BUGS.md`
- `docs/tracking/CHANGELOG.md`
- `docs/tracking/SESSIONS.md`

---

### January 10, 2026 - Research ORM Timezone Fix

**Focus:** Fix timezone mismatch errors in research module

**Issue:** Research endpoint returning 500 error due to timezone-naive datetime comparison

**Root Cause:** SQLAlchemy DateTime columns weren't timezone-aware, conflicting with PostgreSQL TIMESTAMP WITH TIME ZONE

**Solution:** Updated 4 datetime columns to use `DateTime(timezone=True)`:
- `ResearchPaperORM.ai_processed_at`
- `UserSavedResearchORM.saved_at`
- `UserSearchQuotaORM.last_search_at`
- `UserSearchQuotaORM.quota_resets_at`

**Commits:**
- `0ce18294` - Fix research ORM datetime columns to use timezone-aware timestamps

---

### January 10, 2026 - Exercise Library Enhancement

**Focus:** Add body focus and difficulty metadata to exercises

**Completed:**
- Added `body_focus` field (upper, lower, core, full_body)
- Added `difficulty` field (beginner, intermediate, advanced)
- Added `equipment` field (none, dumbbells, resistance_band)
- Implemented exercise listing endpoint with filtering
- Added deduplication for exercise catalog

**Files Modified:**
- `apps/api/src/modules/content/service.py`
- `apps/api/src/modules/content/routes.py`
- `apps/api/scripts/seed_workouts.py`

**Commits:**
- `1eb28c8a` - Add exercise library with body focus and difficulty metadata

---

## December 2025

### December 28, 2025 - Bloodwork History & Dark Mode

**Focus:** Bloodwork history feature and dark mode support

**Completed:**
- Bloodwork history view grouped by test date
- Individual biomarker trend tracking
- Edit/delete biomarker functionality
- Manual biomarker entry
- Dark mode for user profile modal

**New Screens:**
- `app/(modals)/bloodwork/index.tsx` - Upload + History tabs
- `app/(modals)/bloodwork/[date].tsx` - Test details
- `app/(modals)/bloodwork/trend/[biomarker].tsx` - Trend chart

**New Hooks:**
- `useBloodworkHistory()`
- `useBiomarkersForDate(date)`
- `useBiomarkerTrend(name)`
- `useUpdateBiomarker()`
- `useDeleteBiomarker()`
- `useAddBiomarker()`

---

### December 28, 2025 - Mobile App Testing & Fixes

**Focus:** Fix issues found during mobile testing

**Storage Migration:**
- Migrated from MMKV to AsyncStorage for Expo Go compatibility
- Added auth caching layer for async storage

**Fixes:**
- Font loading with named imports
- Portal provider for Sheet/Modal support
- Button styling standardization across app
- Tab navigation padding for iPhone
- Welcome screen text colors

**Created Assets:**
- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1284x2778)
- `assets/adaptive-icon.png` (1024x1024)
- `assets/favicon.png` (48x48)
- `assets/notification-icon.png` (96x96)

---

### December 28, 2025 - Settings & Weight Logging Fixes

**Focus:** Fix settings screen issues

**Fixes:**
- Weight logging source field (`manual` → `user_input`)
- Async storage handling in auth init

**New Components:**
- `AppSwitch` - Custom toggle switch component

**UI Improvements:**
- Reordered settings sections
- Collapsible notifications section
- fullScreenModal for settings

---

### December 28, 2025 - Bloodwork Upload Feature

**Focus:** Implement bloodwork upload on mobile

**Completed:**
- Camera/gallery image picker
- PDF upload support
- Results display with categorization
- Integration with backend parsing API

**Files Created:**
- `features/bloodwork/types.ts`
- `features/bloodwork/hooks/useBloodwork.ts`
- `features/bloodwork/components/BloodworkResults.tsx`

---

## Earlier Development

For development history before December 28, 2025, see the archived changelog in [archive/](../archive/).

---

## Session Template

When logging a new session:

```markdown
### [Date] - [Focus Area]

**Focus:** [One-line description]

**Completed:**
- Item 1
- Item 2

**Files Modified:**
- `path/to/file.py`

**Commits:**
- `hash` - Message

**Notes:**
[Any additional context]
```
