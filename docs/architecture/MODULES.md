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
| POST | `/api/v1/fasting/start` | Start fasting window |
| POST | `/api/v1/fasting/end` | End fasting window |
| POST | `/api/v1/fasting/pause` | Pause active fast |
| POST | `/api/v1/fasting/resume` | Resume paused fast |
| GET | `/api/v1/fasting/active` | Get active fast |
| GET | `/api/v1/fasting/history` | Get fasting history |

### Database Tables
- `time_windows` - All time windows
- `window_pauses` - Pause records

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
- `metrics` - All metric records

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

**Purpose:** Workout library, recipes, recommendations

**Location:** `apps/api/src/modules/content/`

### Interface
```python
class ContentInterface(ABC):
    async def list_workouts(filters: WorkoutFilters) -> list[Workout]
    async def get_workout(workout_id: str) -> Workout | None
    async def list_exercises(filters: ExerciseFilters) -> list[Exercise]
    async def list_recipes(filters: RecipeFilters) -> list[Recipe]
    async def get_recipe(recipe_id: str) -> Recipe | None
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/content/workouts` | List workouts |
| GET | `/api/v1/content/workouts/{id}` | Get workout |
| GET | `/api/v1/content/exercises` | List exercises |
| GET | `/api/v1/content/recipes` | List recipes |
| GET | `/api/v1/content/recipes/{id}` | Get recipe |

### Database Tables
- `workouts` - Workout programs
- `exercises` - Exercise library
- `recipes` - Recipe catalog

---

## 6. AI_COACH Module

**Purpose:** Pydantic AI agents, Claude integration

**Location:** `apps/api/src/modules/ai_coach/`

### Interface
```python
class AICoachInterface(ABC):
    async def chat(identity_id: str, message: str, history: list) -> CoachResponse
    async def get_insights(identity_id: str) -> list[Insight]
    async def get_recommendations(identity_id: str) -> list[Recommendation]
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/coach/chat` | Send message to coach |
| GET | `/api/v1/coach/insights` | Get daily insights |
| GET | `/api/v1/coach/history` | Get chat history |

### Key Components
- `agent.py` - Pydantic AI agent definition
- `safety.py` - Content filtering
- `tools/` - Agent tools for data access

### Database Tables
- `chat_messages` - Conversation history

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

**Purpose:** Friends, followers, leaderboards, challenges

**Location:** `apps/api/src/modules/social/`

### Interface
```python
class SocialInterface(ABC):
    async def send_friend_request(from_id: str, to_id: str) -> FriendRequest
    async def respond_to_request(request_id: str, accept: bool) -> Friendship
    async def get_friends(identity_id: str) -> list[Friend]
    async def get_leaderboard(board_type: str, scope: str) -> list[LeaderboardEntry]
    async def create_challenge(data: ChallengeCreate) -> Challenge
    async def join_challenge(identity_id: str, challenge_id: str) -> Participant
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/friends/request` | Send friend request |
| POST | `/api/v1/social/friends/requests/{id}/respond` | Accept/decline |
| GET | `/api/v1/social/friends` | List friends |
| GET | `/api/v1/social/leaderboards/{type}` | Get leaderboard |
| POST | `/api/v1/social/challenges` | Create challenge |
| POST | `/api/v1/social/challenges/{id}/join` | Join challenge |

### Database Tables
- `friendships` - Friend connections
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
| GET | `/api/v1/research/topics` | List topics |
| GET | `/api/v1/research/topics/{topic}` | Get papers by topic |
| GET | `/api/v1/research/search` | Search papers |
| GET | `/api/v1/research/papers/{id}` | Get paper details |
| POST | `/api/v1/research/saved` | Save paper |
| GET | `/api/v1/research/saved` | Get saved papers |
| GET | `/api/v1/research/quota` | Check quota |

### Database Tables
- `research_papers` - Cached papers
- `user_saved_research` - Saved papers
- `user_search_quotas` - Daily quotas

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
