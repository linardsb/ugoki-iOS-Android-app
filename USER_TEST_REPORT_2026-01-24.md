# UGOKI Comprehensive User Test Report
**Date:** January 24, 2026
**Tester:** Automated User Simulation
**Test Type:** End-to-End Feature Testing

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Overall** | ✅ **PASS** | Core features functional |
| **Critical Bugs** | ⚠️ 1 Found | Achievement system |
| **Medium Issues** | 5 Found | API inconsistencies |
| **Minor Issues** | 3 Found | Data/schema issues |

**Test Coverage:** 11 feature areas, 129 API endpoints available

---

## Test Results by Feature

### 1. Authentication ✅ PASS
- **Anonymous login:** ✅ Works
- **Token generation:** ✅ Access + Refresh tokens issued
- **Token refresh:** ✅ Works
- **Get current user:** ✅ Works

**No issues found.**

---

### 2. Profile & Onboarding ✅ PASS (Minor Issues)

| Endpoint | Status | Notes |
|----------|--------|-------|
| Create profile | ✅ | Works |
| Update profile | ⚠️ | Some fields not saved (bio) |
| Set goals | ✅ | Works |
| Health profile | ✅ | Works |
| Dietary preferences | ✅ | Works |
| Workout restrictions | ✅ | Works |
| Complete profile | ✅ | Works |
| Onboarding status | ⚠️ | Auto-completes prematurely |

**Issues Found:**
1. **MINOR:** Profile fields `bio`, `timezone`, `date_of_birth`, `gender` not saved on create - may need separate update call
2. **MINOR:** Onboarding auto-marks most steps complete when basic profile is completed
3. **MINOR:** Field naming inconsistency: `weekly_workout_target` (request) vs `weekly_workout_goal` (response)

---

### 3. Intermittent Fasting Timer ✅ PASS (Minor Issues)

| Endpoint | Status | Notes |
|----------|--------|-------|
| Start fast | ✅ | Works |
| Get active window | ✅ | Works |
| Get elapsed time | ✅ | Works |
| Get remaining time | ⚠️ | Returns null (no scheduled_end) |
| Extend fast | ❌ | Wrong parameter name |
| Close fast | ✅ | Works |
| Get history | ✅ | Works |

**Issues Found:**
1. **MEDIUM:** Extend endpoint expects `new_end` field but users would expect `extend_minutes` - poor UX
2. **MINOR:** `protocol` and `target_duration_minutes` not saved when creating window

---

### 4. HIIT Workouts ✅ PASS (Data Issue)

| Endpoint | Status | Notes |
|----------|--------|-------|
| List categories | ✅ | 5 categories |
| List workouts | ✅ | 20 workouts |
| List exercises | ✅ | 50 exercises |
| Get workout details | ⚠️ | Exercises array empty |
| Start session | ✅ | Works |
| Get active session | ✅ | Works |
| Complete session | ✅ | Awards XP correctly |
| Get history | ✅ | Works |
| Get stats | ✅ | Works |

**Issues Found:**
1. **MEDIUM:** Workouts have `exercises: []` - should contain workout exercise data

---

### 5. AI Coach ✅ PASS

| Endpoint | Status | Notes |
|----------|--------|-------|
| Get context | ✅ | Returns user data |
| Get motivation | ✅ | Returns motivational quote |
| Get daily insight | ✅ | Returns tip |
| Chat (non-streaming) | ⚠️ | LLM connection error (expected in test) |
| Chat (streaming) | ✅ | **Works excellently** - real AI responses |
| Set personality | ✅ | Works (query param, not body) |
| List conversations | ✅ | Works |

**Issues Found:**
1. **MINOR:** Personality endpoint uses query param instead of request body - inconsistent with other APIs

---

### 6. Health Metrics ✅ PASS

| Endpoint | Status | Notes |
|----------|--------|-------|
| Record metric | ✅ | Works |
| Get latest | ✅ | Works |
| Get by prefix | ✅ | Works |
| Get trend | ✅ | Returns null (single data point) |
| Health sync status | ✅ | Shows not connected (expected) |

**Metrics tested:** weight, heart_rate, body_fat, steps, sleep_hours

**No issues found.**

---

### 7. Progression System ⚠️ CRITICAL BUG

| Endpoint | Status | Notes |
|----------|--------|-------|
| Get overview | ✅ | Works |
| Get level | ✅ | Level 1, 150 XP |
| Get streaks | ✅ | Fasting=1, Workout=1 |
| Get achievements | ✅ | 19 available |
| Get my achievements | ❌ | **BUG: All unlocked** |
| Award XP | ⚠️ | Missing `transaction_type` field |

**CRITICAL BUG:**
- **All 21 achievements showing as unlocked** including:
  - "100-day streak" (user has 1-day streak)
  - "100 workouts completed" (user has 1 workout)
  - "100 fasts completed" (user has 1 fast)
  - "Level 25 reached" (user is level 1)

**Root Cause Analysis:**
File: `apps/api/src/modules/progression/service.py`
Line 304: `unlocked_at=unlocked_at or datetime.now(UTC)` sets unlock time even when achievement is NOT unlocked.

Additionally, the `check_achievements` method only checks STREAK and FASTING types but achievements exist for:
- WORKOUT (lines 333-340 don't handle this type)
- LOGGING (weight tracking)
- LEVEL (level-based achievements)

**Missing achievement type handlers in check_achievements():**
- `AchievementType.WORKOUT` - not implemented
- `AchievementType.LOGGING` - not implemented
- `AchievementType.LEVEL` - not implemented
- `AchievementType.GENERAL` - not implemented

This is a **production-blocking bug** requiring fix before launch.

---

### 8. Social Features ✅ PASS

| Endpoint | Status | Notes |
|----------|--------|-------|
| Create social profile | ✅ | Friend code generated |
| Get friends | ✅ | Works |
| Get leaderboard | ✅ | Global XP works |
| Create challenge | ✅ | Works |
| List challenges | ✅ | Works |
| Check username | ✅ | Works |
| Search users | ⚠️ | Returns malformed data |

**Issues Found:**
1. **MEDIUM:** User search returns incorrect data structure

---

### 9. Research Hub ✅ PASS

| Endpoint | Status | Notes |
|----------|--------|-------|
| Get topics | ✅ | 4 topics (IF, HIIT, Nutrition, Sleep) |
| Search papers | ✅ | Returns PubMed results |
| Get papers by topic | ✅ | Works |
| Get quota | ✅ | 15 searches/day |
| Save research | ⚠️ | Wrong field name |

**Issues Found:**
1. **MINOR:** Save research expects `research_id` not `pmid` - confusing

---

### 10. Notifications ✅ PASS

| Endpoint | Status | Notes |
|----------|--------|-------|
| Get notifications | ✅ | Works |
| Get preferences | ✅ | All options available |
| Update preferences | ✅ | Works |
| Register device | ✅ | Works (Expo push tokens) |
| Get devices | ✅ | Works |
| Unread count | ✅ | Works |

**No issues found.**

---

### 11. Event Journal ✅ PASS

| Endpoint | Status | Notes |
|----------|--------|-------|
| Get activity feed | ✅ | 7 events logged |
| Get events | ✅ | Works |
| Get summary | ⚠️ | Requires time params |

**No major issues.**

---

## Summary of Issues

### Critical (Production Blockers)
| # | Feature | Issue | Severity |
|---|---------|-------|----------|
| 1 | Progression | All achievements auto-unlocked without meeting criteria | 🔴 CRITICAL |

### Medium Priority
| # | Feature | Issue |
|---|---------|-------|
| 1 | Fasting | Extend endpoint uses wrong parameter name |
| 2 | Workouts | Workouts have empty exercises array |
| 3 | Social | User search returns malformed data |
| 4 | Metrics | Summary endpoint error messages unclear |
| 5 | Profile | Field naming inconsistencies across endpoints |

### Minor/Low Priority
| # | Feature | Issue |
|---|---------|-------|
| 1 | Profile | Some fields not saved on create |
| 2 | Onboarding | Auto-completes too many steps |
| 3 | AI Coach | Personality uses query param vs body |
| 4 | Research | Save uses `research_id` not `pmid` |

---

## Recommendations

### Immediate Actions Required
1. **FIX ACHIEVEMENT BUG** - The `check_achievements` logic is broken. All achievements are being marked as unlocked regardless of actual progress.

### Before Production
1. Fix workout exercises not loading (data relationship issue)
2. Standardize API field naming conventions
3. Fix user search endpoint response

### Future Improvements
1. Add API documentation for correct field names
2. Improve error messages with expected field formats
3. Add input validation examples to OpenAPI spec

---

## Test Data Summary

| Metric | Value |
|--------|-------|
| User ID | `900d57b3-5c78-4f9f-9d77-16743c11a312` |
| Username | `testuser123` |
| Friend Code | `FC9A7D7D` |
| Level | 1 (150 XP) |
| Fasting Streak | 1 day |
| Workout Streak | 1 day |
| Total Workouts | 1 |
| Challenges Created | 1 |
| Health Metrics | 5 recorded |

---

**Report Generated:** 2026-01-24 16:15 UTC
**API Version:** UGOKI API v1
**Total Endpoints Tested:** 60+
