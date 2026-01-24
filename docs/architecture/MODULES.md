# UGOKI Module Specifications

Detailed specifications for each of the 11 black box modules.

---

## Module Structure

Each module follows this structure:

```
module_name/
├── __init__.py           # Module exports
├── interface.py          # Abstract interface (what it does)
├── service.py            # Implementation (how it does it)
├── routes.py             # FastAPI endpoints
├── models.py             # Pydantic models (request/response)
├── orm.py                # SQLAlchemy models (database)
└── tests/                # Module tests
```

---

## 1. IDENTITY Module

**Purpose:** Authentication and authorization

**Location:** `apps/api/src/modules/identity/`

**Owns:** IDENTITY primitive

### Interface
```python
class IdentityInterface(ABC):
    async def authenticate(provider: str, token: str) -> Identity
    async def get_identity(identity_id: str) -> Identity | None
    async def validate_token(token: str) -> Identity | None
    async def refresh_token(refresh_token: str) -> TokenPair
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/identity/authenticate` | Authenticate user |
| POST | `/api/v1/identity/refresh` | Refresh JWT token |
| POST | `/api/v1/identity/logout` | Revoke token (logout) |
| GET | `/api/v1/identity/me` | Get current identity |

### Database Tables
- `identities` - Identity records
- `auth_tokens` - Refresh tokens
- `revoked_tokens` - JTI blacklist for logout

### Core Auth Module
The `src/core/auth.py` module provides authentication dependencies:
- `get_current_identity` - Validate JWT, return identity_id (401 if invalid)
- `get_optional_identity` - Same but returns None instead of 401
- `verify_resource_ownership` - Check resource belongs to user (403 if not)

---

## 2. TIME_KEEPER Module

**Purpose:** All timers (fasting, workout, eating windows)

**Location:** `apps/api/src/modules/time_keeper/`

**Owns:** TIME_WINDOW primitive

### Interface
```python
class TimeKeeperInterface(ABC):
    async def open_window(identity_id: str, window_type: str, ...) -> TimeWindow
    async def close_window(window_id: str, end_state: str) -> TimeWindow
    async def pause_window(window_id: str) -> TimeWindow
    async def resume_window(window_id: str) -> TimeWindow
    async def get_active_window(identity_id: str, window_type: str) -> TimeWindow | None
    async def get_history(identity_id: str, window_type: str, limit: int) -> list[TimeWindow]
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/time-keeper/windows` | Open new window (fast, eating, workout) |
| POST | `/api/v1/time-keeper/windows/{id}/close` | Close active window |
| POST | `/api/v1/time-keeper/windows/{id}/extend` | Extend window scheduled end |
| GET | `/api/v1/time-keeper/windows/active` | Get active window (by type) |
| GET | `/api/v1/time-keeper/windows/{id}` | Get specific window |
| GET | `/api/v1/time-keeper/windows` | List windows with filters |
| GET | `/api/v1/time-keeper/windows/{id}/elapsed` | Get elapsed seconds |
| GET | `/api/v1/time-keeper/windows/{id}/remaining` | Get remaining seconds |

### Database Tables
- `time_windows` - All time windows

---

## 3. METRICS Module

**Purpose:** Numeric data storage, trends, aggregations

**Location:** `apps/api/src/modules/metrics/`

**Owns:** METRIC primitive

### Interface
```python
class MetricsInterface(ABC):
    async def record(identity_id: str, metric_type: str, value: float, ...) -> Metric
    async def get_latest(identity_id: str, metric_type: str) -> Metric | None
    async def get_history(identity_id: str, metric_type: str, limit: int) -> list[Metric]
    async def get_trend(identity_id: str, metric_type: str) -> TrendData
    async def get_by_prefix(identity_id: str, prefix: str) -> list[Metric]
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/metrics` | Record metric |
| GET | `/api/v1/metrics/latest` | Get latest value |
| GET | `/api/v1/metrics/history` | Get history |
| GET | `/api/v1/metrics/trend` | Get trend analysis |
| GET | `/api/v1/metrics/biomarkers/grouped` | Get biomarkers by date |

### Database Tables
- `metrics` - All metric records with columns:
  - `id` (UUID, PK)
  - `identity_id` (UUID, FK)
  - `metric_type` (string) - e.g., "weight_kg", "sleep_hours", "health_heart_rate"
  - `value` (float)
  - `unit` (string) - e.g., "kg", "hours", "bpm"
  - `timestamp` (datetime with timezone)
  - `source` (enum) - "user_input", "calculated", "DEVICE_SYNC"
  - `metadata` (JSON, optional) - reference ranges, notes

### Health Data (PHI - Protected Health Information)

Health metrics from Apple HealthKit and Google Health Connect require special handling:

**Metric Type Convention:**
- Metrics from device sync must use `health_*` prefix: `health_heart_rate`, `health_hrv`, `health_resting_hr`
- Enables filtering: `SELECT * FROM metrics WHERE metric_type LIKE 'health_%'`

**Source Tracking:**
- All health metrics stored with `source=MetricSource.DEVICE_SYNC`
- Distinguishes device data from manual user input
- Required for audit logging and compliance

**Health Sync Endpoints (New):**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/health-sync` | Sync device health data (PHI) |
| GET | `/api/v1/health-sync/status` | Check sync status |
| GET | `/api/v1/metrics?source=DEVICE_SYNC` | Get all device-synced metrics |
| DELETE | `/api/v1/metrics/health` | Delete all health metrics (GDPR erasure) |

**Supported Health Metrics:**
- `health_heart_rate` - beats per minute (bpm)
- `health_resting_hr` - resting heart rate (bpm)
- `health_hrv` - heart rate variability (ms)
- `health_steps` - daily step count
- `sleep_hours` - sleep duration (hours)
- `calories_burned` - active calories (kcal)
- `weight_kg` - body weight (kg)
- `body_fat_pct` - body fat percentage (%)

**Security Requirements:**
- All health data encrypted in transit (HTTPS)
- Never logged or exposed in error messages
- Requires explicit user permission (iOS/Android dialogs)
- Audit logged via EVENT_JOURNAL module
- User can delete all health data with one request

See [../features/health-metrics.md](../features/health-metrics.md) for complete health integration specification.

---

## 4. PROGRESSION Module

**Purpose:** Streaks, XP, levels, achievements

**Location:** `apps/api/src/modules/progression/`

**Owns:** PROGRESSION primitive

### Interface
```python
class ProgressionInterface(ABC):
    async def add_xp(identity_id: str, amount: int, source: str) -> Progression
    async def get_level(identity_id: str) -> LevelInfo
    async def get_streaks(identity_id: str) -> StreakInfo
    async def check_achievements(identity_id: str) -> list[Achievement]
    async def unlock_achievement(identity_id: str, achievement_id: str) -> Achievement
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/progression` | Get full progression |
| GET | `/api/v1/progression/level` | Get level info |
| GET | `/api/v1/progression/streaks` | Get streak info |
| GET | `/api/v1/progression/achievements` | Get achievements |

### Database Tables
- `user_progression` - XP, level data
- `user_streaks` - Streak records
- `user_achievements` - Achievement unlocks

---

## 5. CONTENT Module

**Purpose:** Workout library, recipes, workout sessions, recommendations

**Location:** `apps/api/src/modules/content/`

### Interface
```python
class ContentInterface(ABC):
    async def list_workouts(filters: WorkoutFilters) -> list[Workout]
    async def get_workout(workout_id: str) -> Workout | None
    async def list_exercises(filters: ExerciseFilters) -> list[Exercise]
    async def start_workout_session(identity_id: str, workout_id: str) -> WorkoutSession
    async def complete_workout_session(session_id: str) -> WorkoutSession
    async def get_recommendations(identity_id: str) -> list[WorkoutRecommendation]
    async def list_recipes(filters: RecipeFilters) -> list[Recipe]
    async def get_recipe(recipe_id: str) -> Recipe | None
```

### Endpoints

**Workouts:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/content/categories` | List workout categories |
| GET | `/api/v1/content/categories/{id}` | Get category details |
| GET | `/api/v1/content/workouts` | List workouts (with filters) |
| GET | `/api/v1/content/workouts/{id}` | Get workout details |
| GET | `/api/v1/content/exercises` | List exercises |
| GET | `/api/v1/content/recommendations` | Get AI recommendations |
| GET | `/api/v1/content/stats` | Get workout statistics |

**Workout Sessions:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/content/sessions` | Start workout session |
| GET | `/api/v1/content/sessions/active` | Get active session |
| POST | `/api/v1/content/sessions/{id}/complete` | Complete session |
| POST | `/api/v1/content/sessions/{id}/abandon` | Abandon session |
| GET | `/api/v1/content/sessions/history` | Get session history |

**Recipes:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/content/recipes` | List recipes |
| GET | `/api/v1/content/recipes/{id}` | Get recipe |
| POST | `/api/v1/content/recipes/saved` | Save recipe |
| DELETE | `/api/v1/content/recipes/saved/{id}` | Remove saved recipe |
| GET | `/api/v1/content/recipes/saved/list` | List saved recipes |

### Database Tables
- `workout_categories` - Workout categories
- `workouts` - Workout programs
- `workout_exercises` - Exercises in workouts
- `exercises` - Exercise library
- `workout_sessions` - User workout sessions
- `recipes` - Recipe catalog
- `user_saved_recipes` - Saved recipes

---

## 6. AI_COACH Module

**Purpose:** Pydantic AI agents, Claude integration, streaming chat

**Location:** `apps/api/src/modules/ai_coach/`

### Interface
```python
class AICoachInterface(ABC):
    async def chat(identity_id: str, request: ChatRequest) -> ChatResponse
    async def stream_chat(identity_id: str, request: StreamChatRequest) -> AsyncIterator[StreamChunk]
    async def get_user_context(identity_id: str) -> UserContext
    async def get_daily_insight(identity_id: str) -> CoachingInsight
    async def set_personality(identity_id: str, personality: CoachPersonality) -> None
    async def get_conversations(identity_id: str, ...) -> ConversationListResponse
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/coach/chat` | Send message (non-streaming) |
| POST | `/api/v1/coach/stream` | Stream chat response (SSE) |
| GET | `/api/v1/coach/context` | Get user context for coach |
| GET | `/api/v1/coach/insight` | Get daily insight/tip |
| GET | `/api/v1/coach/motivation` | Get quick motivational message |
| PUT | `/api/v1/coach/personality` | Set coach personality style |
| GET | `/api/v1/coach/conversations` | List conversations |
| GET | `/api/v1/coach/conversations/{id}/messages` | Get conversation messages |
| PATCH | `/api/v1/coach/conversations/{id}` | Update conversation metadata |
| DELETE | `/api/v1/coach/conversations/{id}` | Delete conversation (GDPR) |
| GET | `/api/v1/coach/export` | Export all coach data (GDPR) |

### Key Components
- `agents/` - Pydantic AI agent definitions
- `safety.py` - Content filtering for medical advice
- `tools/` - Agent tools for data access
- `prompts/` - System prompts

### Database Tables
- `coach_user_settings` - Personality preferences
- `coach_conversations` - Conversation sessions
- `coach_messages` - Individual messages
- `coach_requests` - Rate limiting/usage tracking
- `coach_documents` - RAG documents with vector embeddings

---

## 7. NOTIFICATION Module

**Purpose:** Push notifications, email, scheduling

**Location:** `apps/api/src/modules/notification/`

### Interface
```python
class NotificationInterface(ABC):
    async def register_token(identity_id: str, token: str, platform: str) -> None
    async def send_push(identity_id: str, title: str, body: str) -> None
    async def get_preferences(identity_id: str) -> NotificationPreferences
    async def update_preferences(identity_id: str, prefs: NotificationPreferences) -> None
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/notifications/token` | Register push token |
| GET | `/api/v1/notifications/preferences` | Get preferences |
| PATCH | `/api/v1/notifications/preferences` | Update preferences |

### Database Tables
- `push_tokens` - Device tokens
- `notification_preferences` - User preferences

---

## 8. PROFILE Module

**Purpose:** User PII, preferences (GDPR isolated)

**Location:** `apps/api/src/modules/profile/`

### Interface
```python
class ProfileInterface(ABC):
    async def create(identity_id: str, data: ProfileCreate) -> Profile
    async def get(identity_id: str) -> Profile | None
    async def update(identity_id: str, data: ProfileUpdate) -> Profile
    async def delete(identity_id: str) -> None  # GDPR right to erasure
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/profile` | Create profile |
| GET | `/api/v1/profile` | Get profile |
| PATCH | `/api/v1/profile` | Update profile |
| DELETE | `/api/v1/profile` | Delete profile (GDPR) |
| PATCH | `/api/v1/profile/goals` | Update goals |
| PATCH | `/api/v1/profile/preferences` | Update preferences |

### Database Tables
- `user_profiles` - Profile data (PII)
- `user_goals` - Goal settings
- `user_preferences` - App preferences

---

## 9. EVENT_JOURNAL Module

**Purpose:** Immutable event log, GDPR compliance

**Location:** `apps/api/src/modules/event_journal/`

**Owns:** ACTIVITY_EVENT primitive

### Interface
```python
class EventJournalInterface(ABC):
    async def record(identity_id: str, event_type: str, data: dict) -> ActivityEvent
    async def get_events(identity_id: str, event_type: str, limit: int) -> list[ActivityEvent]
    async def get_audit_trail(identity_id: str) -> list[ActivityEvent]
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/events` | Get user events |
| GET | `/api/v1/events/audit` | Get audit trail |

### Database Tables
- `activity_events` - Immutable event log

---

## 10. SOCIAL Module

**Purpose:** Friends, followers, leaderboards, challenges, sharing

**Location:** `apps/api/src/modules/social/`

### Interface
```python
class SocialInterface(ABC):
    async def send_friend_request(from_id: str, to_id: str) -> FriendRequest
    async def respond_to_request(request_id: str, accept: bool) -> Friendship
    async def get_friends(identity_id: str) -> list[Friend]
    async def block_user(identity_id: str, blocked_id: str) -> None
    async def follow_user(identity_id: str, followed_id: str) -> Follow
    async def get_leaderboard(board_type: str, scope: str) -> list[LeaderboardEntry]
    async def create_challenge(data: ChallengeCreate) -> Challenge
    async def join_challenge(identity_id: str, challenge_id: str) -> Participant
```

### Endpoints

**Friends:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/friends/request` | Send friend request |
| GET | `/api/v1/social/friends/requests/incoming` | List incoming requests |
| GET | `/api/v1/social/friends/requests/outgoing` | List outgoing requests |
| POST | `/api/v1/social/friends/requests/{id}/respond` | Accept/decline request |
| GET | `/api/v1/social/friends` | List friends |
| DELETE | `/api/v1/social/friends/{id}` | Remove friend |
| POST | `/api/v1/social/friends/{id}/block` | Block user |
| DELETE | `/api/v1/social/friends/{id}/block` | Unblock user |

**Follows:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/follow/{id}` | Follow user |
| DELETE | `/api/v1/social/follow/{id}` | Unfollow user |
| GET | `/api/v1/social/followers` | List followers |
| GET | `/api/v1/social/following` | List following |

**Users:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/social/users/{id}` | Get public profile |
| GET | `/api/v1/social/users/search` | Search users |

**Leaderboards:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/social/leaderboards/{type}` | Get leaderboard |

**Challenges:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/challenges` | Create challenge |
| GET | `/api/v1/social/challenges` | List public challenges |
| GET | `/api/v1/social/challenges/mine` | List my challenges |
| GET | `/api/v1/social/challenges/{id}` | Get challenge details |
| POST | `/api/v1/social/challenges/{id}/join` | Join by ID |
| POST | `/api/v1/social/challenges/join/{code}` | Join by invite code |
| DELETE | `/api/v1/social/challenges/{id}/leave` | Leave challenge |
| GET | `/api/v1/social/challenges/{id}/leaderboard` | Challenge leaderboard |
| POST | `/api/v1/social/challenges/update-progress` | Update progress |

**Sharing:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/share/generate` | Generate share content |

### Database Tables
- `friendships` - Friend connections
- `friend_requests` - Pending requests
- `blocked_users` - Blocked relationships
- `follows` - Follow relationships
- `challenges` - Challenge definitions
- `challenge_participants` - Challenge membership

---

## 11. RESEARCH Module

**Purpose:** PubMed integration, AI summaries, saved papers

**Location:** `apps/api/src/modules/research/`

### Interface
```python
class ResearchInterface(ABC):
    async def search(query: str, identity_id: str) -> list[ResearchPaper]
    async def get_by_topic(topic: str) -> list[ResearchPaper]
    async def get_paper(paper_id: str) -> ResearchPaper | None
    async def save_paper(identity_id: str, paper_id: str) -> None
    async def get_saved(identity_id: str) -> list[ResearchPaper]
    async def get_quota(identity_id: str) -> QuotaInfo
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/research/search` | Search papers (with AI summary) |
| GET | `/api/v1/research/topics` | List available topics |
| GET | `/api/v1/research/topics/{topic}` | Get papers by topic |
| GET | `/api/v1/research/papers/{id}` | Get paper details |
| GET | `/api/v1/research/saved` | Get user's saved papers |
| POST | `/api/v1/research/saved` | Save a paper |
| DELETE | `/api/v1/research/saved/{id}` | Remove saved paper |
| GET | `/api/v1/research/quota` | Check daily quota status |

### Database Tables
- `research_papers` - Cached papers with AI summaries
- `user_saved_research` - User's saved papers
- `user_search_quotas` - Daily search quotas

---

---

## Additional Routes (Non-Module)

Routes that span multiple modules or provide shared services:

### Uploads Route

**Location:** `apps/api/src/routes/uploads.py`

**Purpose:** File uploads for bloodwork, avatars, etc.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/uploads/bloodwork` | Upload bloodwork PDF/image |
| POST | `/api/v1/uploads/avatar` | Upload avatar image |

### Health Sync Route

**Location:** `apps/api/src/routes/health_sync.py`

**Purpose:** Sync health data from Apple HealthKit and Android Health Connect

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/health-sync` | Sync health metrics from device |
| GET | `/api/v1/health-sync/status` | Get sync status |

---

## Cross-Module Communication

Modules communicate through interfaces only:

```python
# Example: AI Coach accessing other modules
class CoachDependencies:
    identity: IdentityInterface
    time_keeper: TimeKeeperInterface
    metrics: MetricsInterface
    progression: ProgressionInterface
    profile: ProfileInterface
```

**Rules:**
1. Never import from another module's `orm.py`
2. Never query another module's tables directly
3. Always go through the interface
4. Mock interfaces for testing

---

## References

- **Primitives:** [PRIMITIVES.md](PRIMITIVES.md)
- **Patterns:** [PATTERNS.md](PATTERNS.md)
- **Feature Specs:** [features/](../features/)
