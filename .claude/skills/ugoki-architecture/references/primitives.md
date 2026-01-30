# UGOKI Primitives Reference

Detailed schemas for all 5 core primitives.

---

## 1. IDENTITY

```python
class Identity:
    id: str              # Opaque: "id_abc123xyz" (never parse!)
    provider: str        # "google" | "apple" | "anonymous"
    created_at: datetime
    capabilities: list[str]  # Feature flags: ["premium", "beta"]
```

### Rules
- **Never** contains PII (that's in PROFILE module)
- ID is opaque - never parse, construct, or assume format
- Capabilities control feature access
- Anonymous mode uses device_id as token

### Auth Flow
```
POST /identity/authenticate
{
  "provider": "anonymous",
  "token": "<device_id>"
}
→ {
  "identity_id": "id_abc123",
  "access_token": "eyJhbG...",
  "refresh_token": "..."
}
```

---

## 2. TIME_WINDOW

```python
class TimeWindow:
    id: str                      # "win_xyz789"
    identity_id: str
    window_type: str             # "fasting" | "eating" | "workout"
    state: str                   # "active" | "paused" | "completed" | "abandoned"
    started_at: datetime
    scheduled_end: datetime | None
    actual_end: datetime | None
    paused_at: datetime | None
    total_paused_seconds: int
    metadata: dict               # Type-specific data
```

### Window Types

| Type | Purpose | Conflict Rule |
|------|---------|---------------|
| `fasting` | Fasting timer | Mutual exclusive with `eating` |
| `eating` | Eating window | Mutual exclusive with `fasting` |
| `workout` | Exercise session | Independent (can workout while fasting) |

### State Transitions
```
       ┌─────────┐
       │ active  │
       └────┬────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌───────┐      ┌──────────┐
│paused │      │completed │
└───┬───┘      └──────────┘
    │               ▲
    └───────────────┘
            
active → paused → active → completed
active → abandoned (any time)
```

### Elapsed Time Calculation
```python
if state == "active":
    elapsed = (now - started_at).seconds - total_paused_seconds
elif state == "paused":
    elapsed = (paused_at - started_at).seconds - total_paused_seconds
elif state in ["completed", "abandoned"]:
    elapsed = (actual_end - started_at).seconds - total_paused_seconds
```

---

## 3. ACTIVITY_EVENT

```python
class ActivityEvent:
    id: str                    # "evt_def456"
    identity_id: str
    event_type: str            # Namespaced: "fasting.completed"
    occurred_at: datetime
    data: dict                 # Event-specific payload (immutable!)
    idempotency_key: str | None
```

### Event Types

```
# Fasting
fasting.started      {window_id, protocol}
fasting.paused       {window_id}
fasting.resumed      {window_id}
fasting.completed    {window_id, duration_hours}
fasting.abandoned    {window_id, reason}

# Workouts
workout.started      {window_id, workout_id}
workout.completed    {window_id, duration_minutes, calories}

# Metrics
weight.logged        {metric_id, value, unit}
biomarker.logged     {metric_id, biomarker_type, value}

# Progression
achievement.unlocked {achievement_id, xp_awarded}
level.up             {old_level, new_level}
streak.broken        {streak_type, previous_days}

# Social
challenge.joined     {challenge_id}
challenge.completed  {challenge_id, rank}
friend.added         {friend_identity_id}
```

### Rules
- **Append-only** - Events are never updated or deleted
- **GDPR compliance** - Delete by anonymizing identity_id, not removing
- **Idempotency** - Same idempotency_key = ignored duplicate
- **Audit trail** - All state changes should create an event

---

## 4. METRIC

```python
class Metric:
    id: str                 # "met_ghi012"
    identity_id: str
    metric_type: str        # "weight" | "fasting_hours" | "biomarker.xyz"
    value: float
    unit: str               # "kg" | "lbs" | "hours" | "g/L"
    recorded_at: datetime
    source: str             # ⚠️ ONLY: "user_input" | "calculated" | "device_sync"
    metadata: dict
```

### Metric Types

| Type | Unit | Source |
|------|------|--------|
| `weight` | kg, lbs | user_input, device_sync |
| `fasting_hours` | hours | calculated |
| `workouts_completed` | count | calculated |
| `calories_burned` | kcal | calculated, device_sync |
| `biomarker.haemoglobin` | g/L | user_input |
| `biomarker.glucose` | mmol/L | user_input |
| `biomarker.cholesterol` | mmol/L | user_input |

### ⚠️ Source Values (Critical!)

```python
# ✅ VALID sources
source = "user_input"    # User manually entered
source = "calculated"    # System computed
source = "device_sync"   # From wearable/HealthKit

# ❌ INVALID - Will crash!
source = "manual"        # This is WRONG
```

---

## 5. PROGRESSION

```python
class Progression:
    id: str                  # Composite key or "prog_jkl345"
    identity_id: str
    progression_type: str    # "fasting_streak" | "level" | "achievement.xyz"
    current_value: int
    max_value: int | None    # For bounded progressions
    last_updated: datetime
    metadata: dict
```

### Progression Types

| Type | Range | Resets? |
|------|-------|---------|
| `fasting_streak` | 0-∞ days | Yes, if missed |
| `workout_streak` | 0-∞ days | Yes, if missed |
| `level` | 1-50 | No |
| `xp` | 0-∞ | No |
| `achievement.{id}` | 0 or 1 | No |

### XP System

**Level XP Requirements:**

| Level | XP to Next | Total XP |
|-------|------------|----------|
| 1 | 100 | 0 |
| 2 | 150 | 100 |
| 3 | 200 | 250 |
| 5 | 300 | 700 |
| 10 | 750 | 3,700 |
| 20 | 2,000 | 19,200 |
| 50 | — | 182,200 |

**XP Awards:**

| Action | XP |
|--------|-----|
| Complete fast | 50 |
| Complete workout | 75 |
| Log weight | 10 |
| 7-day streak bonus | 200 |
| 30-day streak bonus | 500 |
| Unlock achievement | varies |

### Achievements (21 total)

| ID | Name | Requirement | XP |
|----|------|-------------|-----|
| `first_fast` | First Fast | Complete 1 fast | 50 |
| `first_workout` | First Workout | Complete 1 workout | 50 |
| `week_warrior` | Week Warrior | 7-day streak | 200 |
| `early_bird` | Early Bird | Workout before 7am | 100 |
| `night_owl` | Night Owl | Workout after 9pm | 100 |
| `perfect_week` | Perfect Week | 7 workouts in 7 days | 300 |
| `fasting_master` | Fasting Master | 30-day fasting streak | 500 |
| ... | (14 more) | ... | ... |

---

## ID Prefixes

| Entity | Prefix | Example |
|--------|--------|---------|
| Identity | `id_` | `id_abc123xyz` |
| Time Window | `win_` | `win_def456ghi` |
| Event | `evt_` | `evt_jkl789mno` |
| Metric | `met_` | `met_pqr012stu` |
| Progression | `prog_` | `prog_vwx345yz` |
| Workout | `wkt_` | `wkt_abc678def` |
| Recipe | `rcp_` | `rcp_ghi901jkl` |
| Challenge | `chl_` | `chl_mno234pqr` |
| Profile | `prof_` | `prof_stu567vwx` |
