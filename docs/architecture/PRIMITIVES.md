# UGOKI Core Primitives

The five fundamental data types that flow through the entire system.

---

## Philosophy

> "Identify the core 'primitive' data types that flow through your system. Design everything around these primitives."
> — Eskil Steenberg

Every data operation in UGOKI reduces to transformations of these five fundamental types.

---

## The Five Primitives

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UGOKI PRIMITIVES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. IDENTITY        - Who is acting (user reference, not user data)         │
│  2. TIME_WINDOW     - A bounded period with start, end, and state           │
│  3. ACTIVITY_EVENT  - Something that happened at a point in time            │
│  4. METRIC          - A measured value with type, value, and timestamp      │
│  5. PROGRESSION     - A state in a defined sequence (levels, streaks)       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. IDENTITY

**Purpose:** Who is acting (opaque reference, not user data)

```python
IDENTITY {
    id: opaque_reference      # Never expose internal format
    type: "authenticated" | "anonymous" | "system"
    capabilities: set<capability_token>
}
```

**Design Rationale:**
- Identity carries NO personal data
- Personal data lives in separate PROFILE module
- Enables GDPR compliance by design
- Can delete profile without breaking references

**Usage:**
- All API requests carry identity
- All data records reference identity
- Never query identity for user details (use PROFILE)

---

## 2. TIME_WINDOW

**Purpose:** A bounded period with start, end, and state

```python
TIME_WINDOW {
    id: opaque_reference
    identity: IDENTITY.id
    start_time: timestamp_utc
    end_time: timestamp_utc | null     # null = still open
    window_type: string                 # "fast", "eating", "workout", "recovery"
    state: "scheduled" | "active" | "completed" | "abandoned"
    metadata: opaque_blob              # Module-specific data
}
```

**Design Rationale:**
- Everything in wellness is time-bounded
- Fasting sessions, eating windows, workouts are all TIME_WINDOWs
- One timer implementation serves all features
- Enables unified progress calculations

**Examples:**
| window_type | Usage |
|-------------|-------|
| `fast` | 16-hour fasting window |
| `eating` | 8-hour eating window |
| `workout` | 20-minute HIIT session |
| `recovery` | Rest period between exercises |

---

## 3. ACTIVITY_EVENT

**Purpose:** Something that happened at a point in time

```python
ACTIVITY_EVENT {
    id: opaque_reference
    identity: IDENTITY.id
    timestamp: timestamp_utc
    event_type: string                  # "meal_logged", "weight_recorded", etc.
    event_data: opaque_blob            # Module-specific payload
    related_window: TIME_WINDOW.id | null
}
```

**Design Rationale:**
- Events are point-in-time facts
- Immutable (can only be created, never modified)
- Enables event sourcing for audit trails
- GDPR compliance (prove what happened when)

**Examples:**
| event_type | Usage |
|------------|-------|
| `meal_logged` | User recorded eating |
| `weight_recorded` | User logged weight |
| `exercise_completed` | User finished an exercise |
| `achievement_unlocked` | User earned achievement |
| `fast_started` | User began fasting |

---

## 4. METRIC

**Purpose:** A measured value with type, value, and timestamp

```python
METRIC {
    identity: IDENTITY.id
    metric_type: string                 # "weight_kg", "streak_days", "xp_total"
    value: number
    timestamp: timestamp_utc
    source: "user_input" | "calculated" | "device_sync"
}
```

**Design Rationale:**
- Metrics are the atomic unit of measurement
- Any module can produce metrics
- Any module can consume metrics
- Enables trend analysis, dashboards, AI insights

**Examples:**
| metric_type | source | Usage |
|-------------|--------|-------|
| `weight_kg` | user_input | User-logged weight |
| `biomarker_haemoglobin` | calculated | Parsed from bloodwork |
| `xp_total` | calculated | Progression system |
| `streak_fasting_days` | calculated | Streak counter |

---

## 5. PROGRESSION

**Purpose:** A state in a defined sequence (levels, streaks)

```python
PROGRESSION {
    identity: IDENTITY.id
    progression_type: string            # "avatar_level", "workout_streak", etc.
    current_state: string               # "level_5", "day_7", "practitioner"
    state_data: opaque_blob            # Additional context
    updated_at: timestamp_utc
}
```

**Design Rationale:**
- Tracks user progress through defined sequences
- Levels, streaks, achievements are all progressions
- State machine pattern (defined transitions)
- Enables gamification features

**Examples:**
| progression_type | states |
|------------------|--------|
| `user_level` | level_1, level_2, ... level_100 |
| `fasting_streak` | day_1, day_2, ... day_N |
| `achievement_early_bird` | locked, unlocked |

---

## Primitive Relationships

```
                    IDENTITY
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   TIME_WINDOW    METRIC      PROGRESSION
        │              │
        ▼              │
  ACTIVITY_EVENT ◄─────┘
```

- All primitives reference IDENTITY
- TIME_WINDOW contains ACTIVITY_EVENTs
- ACTIVITY_EVENTs can generate METRICs
- METRICs influence PROGRESSION

---

## Module Ownership

| Primitive | Owner Module |
|-----------|--------------|
| IDENTITY | identity |
| TIME_WINDOW | time_keeper |
| ACTIVITY_EVENT | event_journal |
| METRIC | metrics |
| PROGRESSION | progression |

---

## Anti-Patterns

**Never:**
- Parse ID formats from other modules
- Store user PII in IDENTITY
- Modify ACTIVITY_EVENTs after creation
- Mix metric types (weight in streak field)
- Access primitives outside owner module's interface

---

## References

- **Module Specs:** [MODULES.md](MODULES.md)
- **Original Design:** [archive/BlackBox_Design_v2_REFERENCE.md](../archive/BlackBox_Design_v2_REFERENCE.md)
