# UGOKI Backend Modules

Comprehensive specification of all 11 backend modules. Each module follows the black box principle - exposing only its public interface while hiding implementation details.

---

## Quick Reference

| Module | Purpose | Tables | Endpoints |
|--------|---------|--------|-----------|
| [IDENTITY](#1-identity-module) | Authentication, JWT | 3 | 4 |
| [TIME_KEEPER](#2-time_keeper-module) | Fasting/workout timers | 1 | 8 |
| [METRICS](#3-metrics-module) | Measurements, biomarkers | 1 | 12 |
| [PROGRESSION](#4-progression-module) | XP, levels, achievements | 5 | 10 |
| [CONTENT](#5-content-module) | Workouts, exercises, recipes | 6 | 16 |
| [AI_COACH](#6-ai_coach-module) | AI chat, conversations | 5 | 12 |
| [NOTIFICATION](#7-notification-module) | Push, email, in-app | 4 | 12 |
| [PROFILE](#8-profile-module) | User data, preferences | 8 | 24 |
| [EVENT_JOURNAL](#9-event_journal-module) | Immutable audit log | 1 | 8 |
| [SOCIAL](#10-social-module) | Friends, challenges | 4 | 20 |
| [RESEARCH](#11-research-module) | PubMed, AI summaries | 3 | 8 |

---

## 1. IDENTITY Module

**Purpose:** Authentication and authorization using OAuth and JWT tokens

**Location:** `apps/api/src/modules/identity/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/authenticate` | Authenticate via OAuth or anonymous |
| POST | `/api/v1/auth/refresh` | Refresh expired access token |
| POST | `/api/v1/auth/logout` | Logout and invalidate token |
| GET | `/api/v1/auth/me` | Get current identity |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `identities` | User identities | id, identity_type, provider, external_id, last_active_at |
| `capabilities` | Permissions | id, identity_id, capability, expires_at |
| `revoked_tokens` | Token blacklist | id, jti, identity_id, token_type, expires_at |

### Interface Methods

```python
authenticate(provider, token) → AuthResult
refresh_session(identity_id) → AuthResult
logout(identity_id) → None
has_capability(identity_id, capability) → bool
grant_capability(identity_id, capability, expires_at) → None
revoke_capability(identity_id, capability) → None
get_identity(identity_id) → Identity | None
is_valid(identity_id) → bool
```

### Dependencies

None (foundational module)

---

## 2. TIME_KEEPER Module

**Purpose:** Manage time-bounded windows (fasting, eating, workouts, recovery)

**Location:** `apps/api/src/modules/time_keeper/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/time-keeper/windows` | Open new time window |
| POST | `/api/v1/time-keeper/windows/{id}/close` | Close active window |
| POST | `/api/v1/time-keeper/windows/{id}/extend` | Extend scheduled end |
| GET | `/api/v1/time-keeper/windows/active` | Get active window |
| GET | `/api/v1/time-keeper/windows/{id}` | Get specific window |
| GET | `/api/v1/time-keeper/windows` | List windows with filters |
| GET | `/api/v1/time-keeper/windows/{id}/elapsed` | Get elapsed seconds |
| GET | `/api/v1/time-keeper/windows/{id}/remaining` | Get remaining seconds |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `time_windows` | Time windows | id, identity_id, window_type, state, start_time, end_time, scheduled_end, window_metadata |

### Interface Methods

```python
open_window(identity_id, window_type, scheduled_end, metadata) → TimeWindow
close_window(window_id, end_state, metadata) → TimeWindow
extend_window(window_id, new_end) → TimeWindow
get_active_window(identity_id, window_type) → TimeWindow | None
get_window(window_id) → TimeWindow | None
get_windows(identity_id, window_type, start_time, end_time, limit, offset) → list[TimeWindow]
get_elapsed_time(window_id) → int
get_remaining_time(window_id) → int | None
```

### Dependencies

- EVENT_JOURNAL (records window lifecycle)
- PROGRESSION (updates streaks on completion)
- SOCIAL (updates challenge progress)

---

## 3. METRICS Module

**Purpose:** Store and query numeric measurements (weight, biomarkers)

**Location:** `apps/api/src/modules/metrics/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/metrics/` | Record new metric |
| GET | `/api/v1/metrics/latest` | Get most recent value |
| GET | `/api/v1/metrics/history` | Get metric history |
| GET | `/api/v1/metrics/by-prefix` | Get metrics by type prefix |
| GET | `/api/v1/metrics/trend` | Get trend analysis |
| GET | `/api/v1/metrics/aggregate` | Get aggregated value |
| GET | `/api/v1/metrics/summary` | Get summary statistics |
| GET | `/api/v1/metrics/biomarkers/grouped` | Get biomarkers by test date |
| GET | `/api/v1/metrics/{id}` | Get specific metric |
| PUT | `/api/v1/metrics/{id}` | Update metric |
| DELETE | `/api/v1/metrics/{id}` | Delete metric |
| DELETE | `/api/v1/metrics/` | Bulk delete |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `metrics` | Measurements | id, identity_id, metric_type, value, timestamp, source, unit, reference_low, reference_high, flag |

### Interface Methods

```python
record_metric(identity_id, metric_type, value, timestamp, source, unit, ...) → Metric
get_latest(identity_id, metric_type) → Metric | None
get_history(identity_id, metric_type, start_time, end_time, limit, offset) → list[Metric]
get_trend(identity_id, metric_type, period_days) → MetricTrend | None
get_aggregate(identity_id, metric_type, operation, start_time, end_time) → MetricAggregate
get_summary(identity_id, metric_type) → MetricSummary
get_by_type_prefix(identity_id, prefix, start_time, end_time, limit) → list[Metric]
delete_metric(metric_id) → bool
delete_metrics(identity_id, metric_type, before) → int
```

### Dependencies

- EVENT_JOURNAL (records metric entries)

---

## 4. PROGRESSION Module

**Purpose:** Track streaks, XP, levels, and achievements

**Location:** `apps/api/src/modules/progression/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/progression/activity` | Record streak activity |
| GET | `/api/v1/progression/streaks` | Get all streaks |
| GET | `/api/v1/progression/streaks/{type}` | Get specific streak |
| GET | `/api/v1/progression/level` | Get level and XP |
| POST | `/api/v1/progression/xp` | Award XP manually |
| GET | `/api/v1/progression/xp/history` | Get XP history |
| GET | `/api/v1/progression/achievements` | Get all achievements |
| GET | `/api/v1/progression/achievements/mine` | Get user's achievements |
| POST | `/api/v1/progression/achievements/check` | Check/unlock achievements |
| GET | `/api/v1/progression/overview` | Get complete overview |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `streaks` | Streak tracking | id, identity_id, streak_type, current_count, longest_count, last_activity_date |
| `xp_transactions` | XP history | id, identity_id, amount, transaction_type, description, related_id |
| `user_levels` | Level state | identity_id, current_level, current_xp, total_xp_earned |
| `achievements` | Definitions | id, name, description, achievement_type, xp_reward, requirement_value |
| `user_achievements` | Progress | id, identity_id, achievement_id, progress, is_unlocked, unlocked_at |

### Interface Methods

```python
record_activity(identity_id, streak_type, activity_date) → StreakResponse
get_streak(identity_id, streak_type) → Streak
get_all_streaks(identity_id) → list[Streak]
award_xp(identity_id, amount, transaction_type, description, related_id) → UserLevel
get_level(identity_id) → UserLevel
get_xp_history(identity_id, limit, offset) → list[XPTransaction]
get_achievements(include_hidden) → list[Achievement]
get_user_achievements(identity_id, unlocked_only) → list[UserAchievement]
check_achievements(identity_id) → list[Achievement]
get_progression(identity_id) → UserProgression
```

### Dependencies

- EVENT_JOURNAL (records progression events)

---

## 5. CONTENT Module

**Purpose:** Workout library, exercises, recipes, user sessions

**Location:** `apps/api/src/modules/content/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/content/categories` | List workout categories |
| GET | `/api/v1/content/categories/{id}` | Get category |
| GET | `/api/v1/content/workouts` | List workouts |
| GET | `/api/v1/content/workouts/{id}` | Get workout |
| GET | `/api/v1/content/exercises` | List exercises |
| POST | `/api/v1/content/sessions` | Start workout session |
| GET | `/api/v1/content/sessions/active` | Get active session |
| POST | `/api/v1/content/sessions/{id}/complete` | Complete workout |
| POST | `/api/v1/content/sessions/{id}/abandon` | Abandon workout |
| GET | `/api/v1/content/sessions/history` | Get workout history |
| GET | `/api/v1/content/recommendations` | Get recommendations |
| GET | `/api/v1/content/stats` | Get workout stats |
| GET | `/api/v1/content/recipes` | List recipes |
| GET | `/api/v1/content/recipes/{id}` | Get recipe |
| POST | `/api/v1/content/recipes/saved` | Save recipe |
| DELETE | `/api/v1/content/recipes/saved/{id}` | Unsave recipe |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `workout_categories` | Categories | id, name, description, icon, color |
| `workouts` | Workout definitions | id, name, workout_type, difficulty, duration_minutes, category_id |
| `exercises` | Exercises | id, workout_id, name, duration_seconds, rest_seconds, body_focus |
| `workout_sessions` | User sessions | id, identity_id, workout_id, status, started_at, completed_at, xp_earned |
| `recipes` | Recipes | id, name, meal_type, calories, protein_g, carbs_g, fat_g |
| `user_saved_recipes` | Saved recipes | id, identity_id, recipe_id, saved_at |

### Interface Methods

```python
get_workout(workout_id) → Workout | None
list_workouts(filters, limit, offset) → list[Workout]
list_categories() → list[WorkoutCategory]
start_workout(identity_id, workout_id) → WorkoutSession
complete_workout(session_id, calories_burned) → WorkoutSession
abandon_workout(session_id) → WorkoutSession
get_workout_history(identity_id, limit, offset) → list[WorkoutSession]
get_active_session(identity_id) → WorkoutSession | None
get_recommendations(identity_id, limit) → list[WorkoutRecommendation]
list_exercises(filters, limit, offset) → list[Exercise]
get_workout_stats(identity_id) → dict
```

### Dependencies

- EVENT_JOURNAL (records workout sessions)
- PROGRESSION (updates streak, awards XP)
- SOCIAL (updates challenge progress)

---

## 6. AI_COACH Module

**Purpose:** AI-powered wellness coaching with v3.0 enhancements

**Location:** `apps/api/src/modules/ai_coach/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/coach/chat` | Chat (non-streaming) |
| POST | `/api/v1/coach/chat/stream` | Stream chat (SSE) |
| GET | `/api/v1/coach/context` | Get user context |
| GET | `/api/v1/coach/insight` | Get daily insight |
| GET | `/api/v1/coach/motivation` | Get motivation message |
| PATCH | `/api/v1/coach/personality` | Set personality |
| GET | `/api/v1/coach/conversations` | List conversations |
| GET | `/api/v1/coach/conversations/{id}/messages` | Get messages |
| PATCH | `/api/v1/coach/conversations/{id}` | Update conversation |
| DELETE | `/api/v1/coach/conversations/{id}` | Delete conversation |
| GET | `/api/v1/coach/export` | Export data (GDPR) |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `coach_user_settings` | Settings | identity_id, personality |
| `coach_conversations` | Sessions | session_id, identity_id, title, summary, message_count |
| `coach_messages` | Messages | id, session_id, message (JSON), message_data |
| `coach_requests` | Rate limiting | id, identity_id, user_query, timestamp |
| `coach_documents` | RAG docs | id, content, metadata, embedding (vector) |
| `ai_coach_user_memory` | Cross-session memory (v3.0) | id, identity_id, memory_type, category, content, confidence |
| `ai_coach_evaluation` | Quality tracking (v3.0) | id, message_id, helpfulness_score, safety_score, personalization_score |

### v3.0 Components

| Component | Purpose |
|-----------|---------|
| `COACH_CONSTITUTION.md` | Values framework (4 pillars) |
| `skills/` | 5 domain skills + router |
| `memory/` | Cross-session memory extraction |
| `evaluation/` | LLM-as-Judge quality tracking |
| `context/` | Tiered context loading |

### Interface Methods

```python
chat(identity_id, request) → ChatResponse
stream_chat(identity_id, request) → AsyncIterator[StreamChunk]
get_user_context(identity_id) → UserContext
get_daily_insight(identity_id) → CoachingInsight
get_motivation(identity_id, context) → str
set_personality(identity_id, personality) → None
get_conversations(identity_id, limit, offset) → ConversationListResponse
get_conversation_messages(identity_id, session_id, limit, offset) → list[ConversationMessage]
delete_conversation(identity_id, session_id) → bool
export_coach_data(identity_id) → dict
delete_all_coach_data(identity_id) → int
```

### Dependencies

- PROFILE (user context)
- PROGRESSION (level, streaks)
- METRICS (health data)
- TIME_KEEPER (fasting state)
- EVENT_JOURNAL (records interactions)

---

## 7. NOTIFICATION Module

**Purpose:** Push notifications, email, in-app, scheduling

**Location:** `apps/api/src/modules/notification/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/notifications/send` | Send notification |
| GET | `/api/v1/notifications/` | Get history |
| GET | `/api/v1/notifications/unread-count` | Get unread count |
| POST | `/api/v1/notifications/{id}/read` | Mark as read |
| POST | `/api/v1/notifications/read-all` | Mark all read |
| POST | `/api/v1/notifications/devices` | Register device |
| DELETE | `/api/v1/notifications/devices/{token}` | Unregister device |
| GET | `/api/v1/notifications/devices` | Get devices |
| GET | `/api/v1/notifications/preferences` | Get preferences |
| PATCH | `/api/v1/notifications/preferences` | Update preferences |
| GET | `/api/v1/notifications/stats` | Get statistics |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `notifications` | Records | id, identity_id, notification_type, title, body, status, sent_at, read_at |
| `notification_preferences` | Settings | identity_id, push_enabled, quiet_hours_start, quiet_hours_end |
| `device_tokens` | Push tokens | id, identity_id, token, platform, is_active |
| `scheduled_notifications` | Recurring | id, identity_id, schedule_type, schedule_time, next_trigger |

### Interface Methods

```python
send(identity_id, request) → Notification
send_bulk(identity_ids, request) → list[Notification]
get_notifications(identity_id, unread_only, limit, offset) → list[Notification]
mark_as_read(notification_id) → Notification
mark_all_as_read(identity_id) → int
get_unread_count(identity_id) → int
register_device(identity_id, token, platform) → DeviceToken
unregister_device(identity_id, token) → bool
get_preferences(identity_id) → NotificationPreferences
update_preferences(identity_id, **updates) → NotificationPreferences
notify_fast_complete(identity_id, duration_hours) → Notification | None
notify_streak_milestone(identity_id, streak_type, days) → Notification | None
notify_achievement_unlocked(identity_id, achievement_name, xp) → Notification | None
notify_level_up(identity_id, new_level, title) → Notification | None
```

### Dependencies

Called by other modules for triggering notifications

---

## 8. PROFILE Module

**Purpose:** User profile, preferences, health info, goals, onboarding

**Location:** `apps/api/src/modules/profile/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/profile/` | Create profile |
| GET | `/api/v1/profile/` | Get profile |
| PATCH | `/api/v1/profile/` | Update profile |
| GET | `/api/v1/profile/complete` | Get complete profile |
| GET | `/api/v1/profile/goals` | Get goals |
| PATCH | `/api/v1/profile/goals` | Update goals |
| GET | `/api/v1/profile/health` | Get health profile |
| PATCH | `/api/v1/profile/health` | Update health |
| GET | `/api/v1/profile/health/fasting-safety` | Check fasting safety |
| GET | `/api/v1/profile/dietary` | Get dietary prefs |
| PATCH | `/api/v1/profile/dietary` | Update dietary |
| GET | `/api/v1/profile/workout-restrictions` | Get restrictions |
| PATCH | `/api/v1/profile/workout-restrictions` | Update restrictions |
| GET | `/api/v1/profile/social` | Get social profile |
| PATCH | `/api/v1/profile/social` | Update social |
| GET | `/api/v1/profile/social/check-username` | Check username |
| GET | `/api/v1/profile/preferences` | Get preferences |
| PATCH | `/api/v1/profile/preferences` | Update preferences |
| GET | `/api/v1/profile/onboarding` | Get onboarding status |
| POST | `/api/v1/profile/onboarding/{step}/complete` | Complete step |
| POST | `/api/v1/profile/onboarding/{step}/skip` | Skip step |
| GET | `/api/v1/profile/export` | Export data (GDPR) |
| DELETE | `/api/v1/profile/all-data` | Delete all data |
| POST | `/api/v1/profile/anonymize` | Anonymize data |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_profiles` | Core profile | identity_id, email, display_name, avatar_url, date_of_birth, gender, height_cm |
| `user_goals` | Goals | identity_id, primary_goal, target_weight_kg, weekly_workout_goal |
| `health_profiles` | Health info | identity_id, conditions, takes_medication, doctor_approved_fasting |
| `dietary_profiles` | Dietary prefs | identity_id, dietary_preference, allergies, calories_target |
| `workout_restrictions` | Restrictions | identity_id, injury_areas, avoid_high_impact, fitness_level |
| `social_profiles` | Social | identity_id, username, bio, friend_code, profile_public |
| `user_preferences` | App prefs | identity_id, unit_system, timezone, default_fasting_protocol |
| `onboarding_status` | Onboarding | identity_id, basic_profile_completed, onboarding_completed |

### Interface Methods

```python
create_profile(identity_id, request) → UserProfile
get_profile(identity_id) → UserProfile | None
update_profile(identity_id, request) → UserProfile
get_complete_profile(identity_id) → CompleteProfile | None
get_goals(identity_id) → UserGoals
update_goals(identity_id, request) → UserGoals
get_health_profile(identity_id) → HealthProfile
update_health_profile(identity_id, request) → HealthProfile
is_fasting_safe(identity_id) → tuple[bool, list[str]]
get_dietary_profile(identity_id) → DietaryProfile
get_workout_restrictions(identity_id) → WorkoutRestrictions
get_social_profile(identity_id) → SocialProfile
check_username_available(username) → bool
find_by_friend_code(friend_code) → SocialProfile | None
get_preferences(identity_id) → UserPreferences
get_onboarding_status(identity_id) → OnboardingStatus
complete_onboarding_step(identity_id, step) → OnboardingStatus
export_data(identity_id) → GDPRExport
delete_all_data(identity_id) → None
anonymize_data(identity_id) → None
```

### Dependencies

None (foundational module)

---

## 9. EVENT_JOURNAL Module

**Purpose:** Immutable audit log of all user activities

**Location:** `apps/api/src/modules/event_journal/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/events/feed` | Get activity feed |
| GET | `/api/v1/events/` | Get events with filters |
| GET | `/api/v1/events/by-related` | Get by related resource |
| GET | `/api/v1/events/summary` | Get event summary |
| GET | `/api/v1/events/count` | Count events |
| GET | `/api/v1/events/{id}` | Get specific event |
| POST | `/api/v1/events/` | Record event |
| GET | `/api/v1/events/export/all` | Export all (GDPR) |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `activity_events` | Events (immutable) | id, identity_id, event_type, category, timestamp, related_id, related_type, source, event_metadata |

### Interface Methods

```python
record_event(identity_id, event_type, related_id, related_type, source, metadata, description) → ActivityEvent
get_activity_feed(identity_id, category, limit, before) → list[EventFeedItem]
get_events(identity_id, category, event_types, start_time, end_time, limit, offset) → list[ActivityEvent]
get_events_by_related(related_id, related_type, identity_id) → list[ActivityEvent]
get_event_summary(identity_id, start_time, end_time) → ActivityEventSummary
get_event_counts(identity_id, event_type, start_time, end_time) → int
export_events(identity_id) → list[ActivityEvent]
delete_events(identity_id) → int
anonymize_events(identity_id) → int
```

### Dependencies

None (foundational audit log)

---

## 10. SOCIAL Module

**Purpose:** Friends, follows, challenges, leaderboards, sharing

**Location:** `apps/api/src/modules/social/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/social/friends/request` | Send friend request |
| GET | `/api/v1/social/friends/requests/incoming` | Incoming requests |
| GET | `/api/v1/social/friends/requests/outgoing` | Outgoing requests |
| POST | `/api/v1/social/friends/requests/{id}/respond` | Accept/decline |
| GET | `/api/v1/social/friends` | Get friends |
| DELETE | `/api/v1/social/friends/{id}` | Remove friend |
| POST | `/api/v1/social/friends/{id}/block` | Block user |
| POST | `/api/v1/social/follow/{id}` | Follow user |
| DELETE | `/api/v1/social/follow/{id}` | Unfollow |
| GET | `/api/v1/social/followers` | Get followers |
| GET | `/api/v1/social/following` | Get following |
| GET | `/api/v1/social/users/{id}` | Get public profile |
| GET | `/api/v1/social/users/search` | Search users |
| GET | `/api/v1/social/leaderboards/{type}` | Get leaderboard |
| POST | `/api/v1/social/challenges` | Create challenge |
| GET | `/api/v1/social/challenges` | List challenges |
| GET | `/api/v1/social/challenges/mine` | My challenges |
| POST | `/api/v1/social/challenges/{id}/join` | Join challenge |
| POST | `/api/v1/social/challenges/join/{code}` | Join by code |
| GET | `/api/v1/social/challenges/{id}/leaderboard` | Challenge leaderboard |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `friendships` | Friends | id, identity_id_a, identity_id_b, status, requested_by |
| `follows` | Follows | id, follower_id, following_id, created_at |
| `challenges` | Challenges | id, name, challenge_type, goal_value, start_date, end_date, join_code |
| `challenge_participants` | Participation | id, challenge_id, identity_id, current_progress, rank |

### Interface Methods

```python
send_friend_request(identity_id, friend_code, username) → Friendship
respond_to_friend_request(identity_id, request_id, accept) → Friendship | None
get_friends(identity_id, status) → list[Friendship]
remove_friend(identity_id, friend_id) → None
block_user(identity_id, user_id) → None
follow_user(identity_id, user_id) → Follow
unfollow_user(identity_id, user_id) → None
get_followers(identity_id, limit, offset) → list[Follow]
get_following(identity_id, limit, offset) → list[Follow]
get_public_profile(identity_id, user_id) → PublicUserProfile
search_users(identity_id, query, limit) → list[PublicUserProfile]
get_leaderboard(identity_id, leaderboard_type, period, limit) → Leaderboard
create_challenge(identity_id, name, challenge_type, goal_value, ...) → Challenge
join_challenge(identity_id, challenge_id) → ChallengeParticipant
join_challenge_by_code(identity_id, code) → ChallengeParticipant
get_challenge_leaderboard(identity_id, challenge_id) → list[ChallengeParticipant]
update_challenge_progress(identity_id) → None
generate_share_content(identity_id, share_type, related_id) → ShareContent
```

### Dependencies

- PROFILE (user info, privacy settings)
- PROGRESSION (level/streaks for leaderboards)
- EVENT_JOURNAL (records social activities)

---

## 11. RESEARCH Module

**Purpose:** Scientific research access with AI-powered summaries

**Location:** `apps/api/src/modules/research/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/research/search` | Search papers (quota-limited) |
| GET | `/api/v1/research/topics` | Get research topics |
| GET | `/api/v1/research/topics/{topic}` | Get papers by topic |
| GET | `/api/v1/research/papers/{id}` | Get specific paper |
| GET | `/api/v1/research/saved` | Get saved papers |
| POST | `/api/v1/research/saved` | Save paper |
| DELETE | `/api/v1/research/saved/{id}` | Unsave paper |
| GET | `/api/v1/research/quota` | Get quota status |

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `research_papers` | Papers | id, pmid, doi, title, authors, journal, topic, abstract, tldr, ai_processed_at |
| `user_saved_research` | Saved | id, identity_id, research_id, notes, saved_at |
| `user_search_quotas` | Quota | identity_id, searches_today, quota_resets_at |

### Interface Methods

```python
search(identity_id, query, topic, limit) → SearchResponse
get_topic_papers(topic, limit) → TopicResponse
get_paper(paper_id) → ResearchPaper | None
save_paper(identity_id, research_id, notes) → SavedResearch
unsave_paper(identity_id, saved_id) → bool
get_saved_papers(identity_id, limit, offset) → list[SavedResearch]
get_quota(identity_id) → UserSearchQuota
check_and_increment_quota(identity_id) → tuple[bool, int]
get_topics() → list[dict]
```

### Dependencies

None (self-contained)

---

## Cross-Module Dependencies

```
┌─────────────┐
│  IDENTITY   │ (foundational - no dependencies)
└─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PROFILE   │     │EVENT_JOURNAL│     │  RESEARCH   │
│(foundational)│     │ (audit log) │     │(self-contain)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   ▲
       │                   │
       ▼                   │
┌─────────────┐     ┌──────┴──────┐     ┌─────────────┐
│ TIME_KEEPER │────▶│ PROGRESSION │     │   METRICS   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   ▲                   │
       │                   │                   │
       ▼                   │                   ▼
┌─────────────┐     ┌──────┴──────┐     ┌─────────────┐
│   CONTENT   │────▶│   SOCIAL    │     │NOTIFICATION │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   ▲
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  AI_COACH   │
                    │  (v3.0)     │
                    └─────────────┘
```

---

## Architecture Principles

1. **Black Box Modules** - Each module exposes only its public interface. Never access another module's database directly.

2. **Immutability** - EVENT_JOURNAL is append-only for audit compliance.

3. **Rate Limiting** - Applied to: authentication, AI chat, insights, GDPR operations, research searches.

4. **Timezone Awareness** - All timestamps use UTC with timezone information.

5. **GDPR Compliance** - Export and deletion endpoints in AI_COACH, EVENT_JOURNAL, and PROFILE.

6. **Ownership Verification** - All endpoints verify resource ownership before returning data.

7. **Quota Management** - RESEARCH: 15 searches/day. AI_COACH: message limits by tier.

8. **Soft Cascade** - Deleting users cascades through dependent tables via database constraints.

---

## Total Summary

| Metric | Count |
|--------|-------|
| Modules | 11 |
| Database Tables | 41 |
| API Endpoints | 135 |
| Interface Methods | ~150 |
