# UGOKI Black Box Architecture Design

**A Replaceable, Modular System Design Following Eskil Steenberg's Principles**
**Version:** 2.0 | December 2025
**Status:** Architecture Design Phase (No Code Implementation)

---

## Critical Analysis of v1.0 Implementation Plan

Before presenting the improved architecture, we must acknowledge the fundamental flaws in the original `1_2_Ugoki_implementation.md` that this document addresses:

### Architectural Anti-Patterns Identified

| Issue | Location in v1.0 | Problem | Black Box Violation |
|-------|------------------|---------|---------------------|
| **Implementation-First Thinking** | Section 5.2 (SQL Schemas) | Defines database tables before establishing interfaces | Exposes "HOW" before defining "WHAT" |
| **Technology Lock-in** | Section 2.2-2.7 | Hardcodes React Native, PostgreSQL, TimescaleDB as requirements | No abstraction layer; impossible to swap technologies |
| **Mixed Concerns** | Throughout | User flows, database design, API specs, and business logic intertwined | Violates single responsibility; modules have multiple reasons to change |
| **Missing Primitives** | Entire document | No identification of core data types that flow through system | Cannot design stable interfaces without primitives |
| **Coupled Services** | Section 2.3 Backend Stack | Services reference each other directly (e.g., Fasting Service → User Service) | No clear boundaries; replacement requires understanding internals |
| **Over-Specified Interfaces** | Section 5.5 API Endpoints | APIs expose internal implementation details (TimescaleDB aggregates, JSONB structures) | Interface reveals too much about storage mechanism |
| **No Tooling Strategy** | Absent | No mention of debugging, simulation, or testing infrastructure | Eskil: "Build tooling to test your black boxes" |

### The Core Mistake

The v1.0 document answers **"How do we build UGOKI?"** when it should first answer **"What does UGOKI do?"**

This document corrects that by:
1. Identifying the **primitives** that flow through the system
2. Defining **black box interfaces** that hide all implementation
3. Making every module **replaceable** from interface specification alone
4. Ensuring **one person can own one module** without understanding the whole system

---

## Part 1: Core Primitives

> "Identify the core 'primitive' data types that flow through your system. Design everything around these primitives."
> — Eskil Steenberg

### 1.1 The Five UGOKI Primitives

Every data operation in UGOKI reduces to transformations of these five fundamental types:

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

### 1.2 Primitive Definitions

#### Primitive 1: IDENTITY

```
IDENTITY {
    id: opaque_reference      // Never expose internal format
    type: "authenticated" | "anonymous" | "system"
    capabilities: set<capability_token>
}

// CRITICAL: Identity carries NO personal data
// Personal data lives in a separate, isolated module
// This enables GDPR compliance by design
```

**Design Rationale:** Identity is just a reference token. It says "who can act" without revealing "who they are." The user's name, email, and preferences are in a completely separate system that can be queried when needed, deleted without breaking references, and encrypted independently.

#### Primitive 2: TIME_WINDOW

```
TIME_WINDOW {
    id: opaque_reference
    identity: IDENTITY.id
    start_time: timestamp_utc
    end_time: timestamp_utc | null     // null = still open
    window_type: string                 // "fast", "eating", "workout", "recovery"
    state: "scheduled" | "active" | "completed" | "abandoned"
    metadata: opaque_blob              // Module-specific data, never parsed by others
}

// TIME_WINDOW is the universal container for:
// - Fasting sessions (16-hour fast = TIME_WINDOW)
// - Eating windows (8-hour window = TIME_WINDOW)
// - Workout sessions (20-minute HIIT = TIME_WINDOW)
// - Any future time-bounded activity
```

**Design Rationale:** Everything in a wellness app is time-bounded. Rather than creating separate "FastingSession," "WorkoutSession," and "MeditationSession" entities, we recognize they're all the same primitive: a window of time with a state. This enables:
- One timer implementation for all features
- Unified progress calculations
- Future feature addition without new data types

#### Primitive 3: ACTIVITY_EVENT

```
ACTIVITY_EVENT {
    id: opaque_reference
    identity: IDENTITY.id
    timestamp: timestamp_utc
    event_type: string                  // "meal_logged", "weight_recorded", "exercise_completed"
    event_data: opaque_blob            // Module-specific payload
    related_window: TIME_WINDOW.id | null
}

// ACTIVITY_EVENT captures discrete occurrences:
// - User logged a meal
// - User recorded weight
// - User completed an exercise
// - User unlocked achievement
```

**Design Rationale:** Events are point-in-time facts. They're immutable (can only be created, never modified). This enables event sourcing for audit trails, GDPR compliance (we can prove what happened when), and analytics without affecting operations.

#### Primitive 4: METRIC

```
METRIC {
    identity: IDENTITY.id
    metric_type: string                 // "weight_kg", "streak_days", "xp_total"
    value: number
    timestamp: timestamp_utc
    source: "user_input" | "calculated" | "device_sync"
}

// METRIC is always:
// - A single numeric value
// - At a specific point in time
// - Attributed to an identity
// - Typed for semantic meaning
```

**Design Rationale:** Metrics are the atomic unit of measurement. Complex dashboards are composed of metrics. Trend analysis queries metrics. Gamification reads and writes metrics. By making METRIC a first-class primitive, we enable any module to produce metrics and any other module to consume them without coupling.

#### Primitive 5: PROGRESSION

```
PROGRESSION {
    identity: IDENTITY.id
    progression_type: string            // "avatar_level", "workout_streak", "fasting_streak"
    current_state: string               // "level_5", "day_7", "practitioner"
    next_state: string | null           // null = max level reached
    progress_toward_next: number        // 0.0 to 1.0
    state_metadata: opaque_blob
}

// PROGRESSION tracks position in ordered sequences:
// - Avatar level (1 → 2 → 3 → ... → max)
// - Streak count (0 → 1 → 2 → ...)
// - User tier (beginner → intermediate → advanced)
```

**Design Rationale:** Gamification, streaks, and leveling are all the same pattern: moving through an ordered sequence of states. By recognizing this primitive, we avoid building three separate systems for "streaks," "levels," and "achievements" when they're fundamentally identical.

### 1.3 Primitive Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        UGOKI PRIMITIVE DATA FLOW                              │
│                                                                               │
│   User Action                                                                 │
│       │                                                                       │
│       ▼                                                                       │
│   ┌──────────┐    creates     ┌─────────────────┐                            │
│   │ IDENTITY │ ─────────────► │ ACTIVITY_EVENT  │                            │
│   └──────────┘                └────────┬────────┘                            │
│       │                                │                                      │
│       │ opens/closes                   │ triggers                             │
│       ▼                                ▼                                      │
│   ┌─────────────┐              ┌────────────┐     updates    ┌─────────────┐ │
│   │ TIME_WINDOW │ ───────────► │   METRIC   │ ─────────────► │ PROGRESSION │ │
│   └─────────────┘   produces   └────────────┘                └─────────────┘ │
│                                                                               │
│   Example: User completes a fast                                              │
│   1. IDENTITY "user_xyz" triggers action                                      │
│   2. TIME_WINDOW (fast) changes state to "completed"                          │
│   3. ACTIVITY_EVENT "fast_completed" is recorded                              │
│   4. METRIC "fasting_hours" is incremented                                    │
│   5. PROGRESSION "fasting_streak" advances to next state                      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Black Box Module Architecture

> "Every module should be a black box with a clean, documented API. Implementation details must be completely hidden."
> — Eskil Steenberg

### 2.1 Module Boundary Principles

Before defining modules, we establish the rules that govern all boundaries:

```
BLACK BOX RULES (Non-Negotiable)
════════════════════════════════════════════════════════════════════════════════

RULE 1: Interface Only
        A module's API is the ONLY way to interact with it.
        No direct database queries. No shared memory. No internal types exposed.

RULE 2: Opaque References
        All IDs returned by a module are opaque strings.
        Consumers must NEVER parse, construct, or assume format of IDs.

RULE 3: Version Contracts
        Every interface is versioned (v1, v2, v3...).
        Old versions are deprecated, never broken.

RULE 4: No Leaky Abstractions
        If changing the implementation requires changing the interface,
        the interface is wrong. Redesign it.

RULE 5: Single Owner
        One person (or small team) owns one module entirely.
        They can rewrite internals without coordinating with others.

RULE 6: Testable in Isolation
        Every module can be tested with mock implementations of its dependencies.
        No integration required to verify correctness.
```

### 2.2 Module Inventory

UGOKI consists of 8 core modules, each a complete black box:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              UGOKI MODULES                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐              │
│  │    IDENTITY     │   │   TIME_KEEPER   │   │  EVENT_JOURNAL  │              │
│  │    (Module 1)   │   │    (Module 2)   │   │    (Module 3)   │              │
│  │                 │   │                 │   │                 │              │
│  │ Authentication  │   │ All time-based  │   │ Immutable event │              │
│  │ Authorization   │   │ windows (fasts, │   │ log for all     │              │
│  │ Session mgmt    │   │ workouts, etc)  │   │ user actions    │              │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘              │
│                                                                                │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐              │
│  │    METRICS      │   │   PROGRESSION   │   │    CONTENT      │              │
│  │    (Module 4)   │   │    (Module 5)   │   │    (Module 6)   │              │
│  │                 │   │                 │   │                 │              │
│  │ Numeric data    │   │ Streaks, levels │   │ Workouts, meals │              │
│  │ storage, trends │   │ achievements    │   │ library items   │              │
│  │ aggregations    │   │ avatar state    │   │ recommendations │              │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘              │
│                                                                                │
│  ┌─────────────────┐   ┌─────────────────┐                                    │
│  │   NOTIFICATION  │   │    PROFILE      │                                    │
│  │    (Module 7)   │   │    (Module 8)   │                                    │
│  │                 │   │                 │                                    │
│  │ Push, email,    │   │ User PII,       │                                    │
│  │ in-app alerts   │   │ preferences     │                                    │
│  │ scheduling      │   │ GDPR isolated   │                                    │
│  └─────────────────┘   └─────────────────┘                                    │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Module Interface Specifications

> "Design APIs that will work even if the implementation changes completely."
> — Eskil Steenberg

### 3.1 Module 1: IDENTITY

**Purpose:** Authenticate users and authorize actions. Nothing else.

**Owns Primitives:** IDENTITY

**Interface Contract (v1):**

```
INTERFACE: Identity.v1
════════════════════════════════════════════════════════════════════════════════

// Authentication

authenticate(provider: "google" | "apple" | "anonymous", token: opaque)
    → Result<IDENTITY, AuthError>

    // Returns an IDENTITY primitive or error
    // The IDENTITY is opaque - consumers cannot see internal user_id format

refresh_session(identity_id: opaque_ref)
    → Result<IDENTITY, AuthError>

logout(identity_id: opaque_ref)
    → Result<void, Error>


// Authorization

has_capability(identity_id: opaque_ref, capability: string)
    → boolean

    // Examples:
    // has_capability(id, "premium_features")
    // has_capability(id, "workout_download")

grant_capability(identity_id: opaque_ref, capability: string, expires: timestamp | null)
    → Result<void, Error>

revoke_capability(identity_id: opaque_ref, capability: string)
    → Result<void, Error>


// Session queries

get_identity(identity_id: opaque_ref)
    → Result<IDENTITY, NotFound>

is_valid(identity_id: opaque_ref)
    → boolean


════════════════════════════════════════════════════════════════════════════════
WHAT THIS MODULE HIDES:
- How tokens are validated (JWT, opaque, etc.)
- Where sessions are stored (Redis, database, memory)
- OAuth flow details
- Password hashing (if ever added)
- Rate limiting implementation

WHAT CONSUMERS NEVER KNOW:
- Internal user_id format
- Session token structure
- Database schema
- Which OAuth library is used
════════════════════════════════════════════════════════════════════════════════
```

**Replaceability Test:** Could a new developer implement this module from the interface alone, using Firebase Auth instead of custom OAuth? **Yes.** The interface says nothing about how authentication works internally.

---

### 3.2 Module 2: TIME_KEEPER

**Purpose:** Manage all time-bounded windows (fasting, eating, workouts, recovery).

**Owns Primitives:** TIME_WINDOW

**Interface Contract (v1):**

```
INTERFACE: TimeKeeper.v1
════════════════════════════════════════════════════════════════════════════════

// Window lifecycle

open_window(
    identity_id: opaque_ref,
    window_type: string,          // "fast", "eating", "workout", "meditation"
    scheduled_end: timestamp | null,
    metadata: opaque_blob | null
) → Result<TIME_WINDOW, ConflictError>

    // ConflictError if a conflicting window is already open
    // (e.g., can't start fast while eating window is open)

close_window(
    window_id: opaque_ref,
    end_state: "completed" | "abandoned",
    metadata: opaque_blob | null
) → Result<TIME_WINDOW, NotFoundError>

extend_window(
    window_id: opaque_ref,
    new_end: timestamp
) → Result<TIME_WINDOW, Error>


// Window queries

get_active_window(identity_id: opaque_ref, window_type: string | null)
    → Result<TIME_WINDOW | null, Error>

    // Returns currently open window, or null if none
    // If window_type is null, returns any active window

get_windows(
    identity_id: opaque_ref,
    window_type: string | null,
    time_range: { start: timestamp, end: timestamp },
    limit: number,
    cursor: opaque_ref | null
) → Result<{ windows: TIME_WINDOW[], next_cursor: opaque_ref | null }, Error>

get_window(window_id: opaque_ref)
    → Result<TIME_WINDOW, NotFoundError>


// Conflict rules (configurable per deployment)

set_conflict_rule(
    window_type_a: string,
    window_type_b: string,
    conflict_type: "mutual_exclusive" | "parent_child" | "independent"
) → Result<void, Error>

    // Examples:
    // "fast" and "eating" are mutual_exclusive
    // "workout" and "fast" are independent (can workout while fasting)


// Timer hooks (for notifications)

on_window_state_change(callback: (window: TIME_WINDOW, old_state, new_state) → void)
    → subscription_id: opaque_ref

on_window_approaching_end(callback: (window: TIME_WINDOW, minutes_remaining: number) → void)
    → subscription_id: opaque_ref

unsubscribe(subscription_id: opaque_ref)
    → void


════════════════════════════════════════════════════════════════════════════════
WHAT THIS MODULE HIDES:
- Timer implementation (setInterval, cron, database polling)
- Storage mechanism (SQL, NoSQL, in-memory)
- Time zone handling complexity
- Offline sync logic
- Conflict resolution algorithms

WHAT CONSUMERS NEVER KNOW:
- Internal window_id format
- Database schema
- How "approaching end" detection works
- Timezone conversion implementation
════════════════════════════════════════════════════════════════════════════════
```

**Replaceability Test:** Could we replace the PostgreSQL + TimescaleDB implementation with SQLite for local-first mobile? **Yes.** The interface makes no assumptions about storage.

---

### 3.3 Module 3: EVENT_JOURNAL

**Purpose:** Record immutable events for audit, analytics, and GDPR compliance.

**Owns Primitives:** ACTIVITY_EVENT

**Interface Contract (v1):**

```
INTERFACE: EventJournal.v1
════════════════════════════════════════════════════════════════════════════════

// Event recording (append-only, never modify)

record_event(
    identity_id: opaque_ref,
    event_type: string,
    event_data: opaque_blob,
    related_window: opaque_ref | null,
    idempotency_key: string | null       // Prevents duplicate events
) → Result<ACTIVITY_EVENT, Error>


// Event queries

get_events(
    identity_id: opaque_ref,
    event_types: string[] | null,         // Filter by type, null = all
    time_range: { start: timestamp, end: timestamp },
    limit: number,
    cursor: opaque_ref | null
) → Result<{ events: ACTIVITY_EVENT[], next_cursor: opaque_ref | null }, Error>

get_event(event_id: opaque_ref)
    → Result<ACTIVITY_EVENT, NotFoundError>


// Event subscriptions (for real-time reactions)

subscribe_to_events(
    event_types: string[],
    callback: (event: ACTIVITY_EVENT) → void
) → subscription_id: opaque_ref

unsubscribe(subscription_id: opaque_ref)
    → void


// GDPR compliance

export_user_events(identity_id: opaque_ref)
    → Result<{ events: ACTIVITY_EVENT[], export_timestamp: timestamp }, Error>

    // Returns ALL events for user in portable format

purge_user_events(identity_id: opaque_ref, before: timestamp | null)
    → Result<{ events_deleted: number }, Error>

    // Permanently deletes events (for right-to-erasure)
    // If before is null, deletes ALL events


════════════════════════════════════════════════════════════════════════════════
WHAT THIS MODULE HIDES:
- Event storage format (JSON, protobuf, etc.)
- Database technology (PostgreSQL, EventStore, Kafka)
- Retention policies
- Compression/archival strategies
- Subscription delivery mechanism (websocket, polling, SSE)

CRITICAL INVARIANT:
- Events are IMMUTABLE after recording
- No update or delete of individual events (only bulk purge for GDPR)
- Idempotency guaranteed via idempotency_key
════════════════════════════════════════════════════════════════════════════════
```

---

### 3.4 Module 4: METRICS

**Purpose:** Store and query numeric measurements over time.

**Owns Primitives:** METRIC

**Interface Contract (v1):**

```
INTERFACE: Metrics.v1
════════════════════════════════════════════════════════════════════════════════

// Recording metrics

record_metric(
    identity_id: opaque_ref,
    metric_type: string,         // "weight_kg", "calories_consumed", "workout_minutes"
    value: number,
    timestamp: timestamp,
    source: "user_input" | "calculated" | "device_sync"
) → Result<METRIC, Error>


// Querying metrics

get_latest(identity_id: opaque_ref, metric_type: string)
    → Result<METRIC | null, Error>

get_history(
    identity_id: opaque_ref,
    metric_type: string,
    time_range: { start: timestamp, end: timestamp },
    granularity: "raw" | "hourly" | "daily" | "weekly"
) → Result<METRIC[], Error>

    // When granularity != "raw", returns aggregated values
    // Aggregation method is determined by metric_type configuration


// Derived metrics (calculated from other metrics)

get_trend(
    identity_id: opaque_ref,
    metric_type: string,
    period_days: number
) → Result<{ direction: "up" | "down" | "stable", change_percent: number }, Error>

get_aggregate(
    identity_id: opaque_ref,
    metric_type: string,
    time_range: { start: timestamp, end: timestamp },
    operation: "sum" | "avg" | "min" | "max" | "count"
) → Result<number, Error>


// Metric type configuration

configure_metric_type(
    metric_type: string,
    config: {
        aggregation_default: "sum" | "avg" | "last",
        precision: number,
        unit: string | null
    }
) → Result<void, Error>


// GDPR compliance

export_user_metrics(identity_id: opaque_ref)
    → Result<{ metrics: METRIC[], export_timestamp: timestamp }, Error>

purge_user_metrics(identity_id: opaque_ref)
    → Result<{ metrics_deleted: number }, Error>


════════════════════════════════════════════════════════════════════════════════
WHAT THIS MODULE HIDES:
- Time-series database specifics (TimescaleDB, InfluxDB, etc.)
- Aggregation algorithms
- Data compression
- Downsampling strategies for old data
- Cache layers for recent queries

REPLACEABILITY NOTE:
Could be implemented with:
- TimescaleDB (current plan)
- InfluxDB
- Simple PostgreSQL with materialized views
- In-memory for testing
All would satisfy this interface.
════════════════════════════════════════════════════════════════════════════════
```

---

### 3.5 Module 5: PROGRESSION

**Purpose:** Track advancement through ordered sequences (streaks, levels, achievements).

**Owns Primitives:** PROGRESSION

**Interface Contract (v1):**

```
INTERFACE: Progression.v1
════════════════════════════════════════════════════════════════════════════════

// Reading progression state

get_progression(identity_id: opaque_ref, progression_type: string)
    → Result<PROGRESSION, NotFoundError>

    // Example progression_types:
    // "avatar_level", "fasting_streak", "workout_streak", "total_xp"

get_all_progressions(identity_id: opaque_ref)
    → Result<PROGRESSION[], Error>


// Advancing progression (usually triggered by events, not direct calls)

advance(identity_id: opaque_ref, progression_type: string, amount: number)
    → Result<PROGRESSION, Error>

    // Moves forward by amount (e.g., +1 day for streak, +50 for XP)
    // Returns new state after advancement

reset(identity_id: opaque_ref, progression_type: string)
    → Result<PROGRESSION, Error>

    // Resets progression to initial state (e.g., streak broken)

set_state(identity_id: opaque_ref, progression_type: string, new_state: string)
    → Result<PROGRESSION, Error>

    // Directly sets state (for admin/system use)


// Progression definitions (configurable)

define_progression(
    progression_type: string,
    states: string[],                    // Ordered list: ["level_1", "level_2", ...]
    thresholds: number[],                // Progress needed: [0, 100, 250, 500, ...]
    initial_state: string
) → Result<void, Error>


// Achievement checks

check_unlocks(identity_id: opaque_ref)
    → Result<{ newly_unlocked: PROGRESSION[] }, Error>

    // Evaluates all progression rules and returns any new unlocks


// Progression hooks

on_progression_change(
    callback: (identity_id: opaque_ref, progression: PROGRESSION, change_type: "advanced" | "reset" | "unlocked") → void
) → subscription_id: opaque_ref

unsubscribe(subscription_id: opaque_ref)
    → void


════════════════════════════════════════════════════════════════════════════════
WHAT THIS MODULE HIDES:
- State machine implementation
- Achievement rule evaluation logic
- XP calculation formulas
- Streak grace period logic (freeze tokens)
- Database storage of progression states

CONSUMERS DON'T NEED TO KNOW:
- How "check_unlocks" evaluates conditions
- What happens internally when streak breaks
- How freeze tokens work
- Database schema for progressions
════════════════════════════════════════════════════════════════════════════════
```

---

### 3.6 Module 6: CONTENT

**Purpose:** Manage workout library, meal database, and content recommendations.

**Interface Contract (v1):**

```
INTERFACE: Content.v1
════════════════════════════════════════════════════════════════════════════════

// Content retrieval

get_content(content_id: opaque_ref)
    → Result<ContentItem, NotFoundError>

search_content(
    query: string | null,
    content_type: "workout" | "meal" | "meditation" | null,
    filters: { [key: string]: any },
    limit: number,
    cursor: opaque_ref | null
) → Result<{ items: ContentItem[], next_cursor: opaque_ref | null }, Error>


// Personalized recommendations

get_recommendations(
    identity_id: opaque_ref,
    content_type: "workout" | "meal" | "meditation",
    context: {
        current_time_window: opaque_ref | null,    // Are they fasting?
        time_of_day: "morning" | "afternoon" | "evening",
        duration_preference_minutes: number | null
    },
    limit: number
) → Result<ContentItem[], Error>


// Content item structure (returned by all queries)

ContentItem {
    id: opaque_ref
    content_type: string
    title: string
    description: string
    duration_minutes: number | null
    difficulty: 1 | 2 | 3 | 4 | 5 | null
    media_url: string | null
    thumbnail_url: string | null
    tags: string[]
    metadata: opaque_blob               // Type-specific data
}


// Content management (admin only)

create_content(content_type: string, data: ContentInput) → Result<ContentItem, Error>
update_content(content_id: opaque_ref, data: Partial<ContentInput>) → Result<ContentItem, Error>
archive_content(content_id: opaque_ref) → Result<void, Error>


// Barcode lookup (for meal content)

lookup_by_barcode(barcode: string)
    → Result<ContentItem | null, Error>


════════════════════════════════════════════════════════════════════════════════
WHAT THIS MODULE HIDES:
- Content storage (CMS, database, headless API)
- Search implementation (Elasticsearch, PostgreSQL full-text, Algolia)
- Recommendation algorithm (rule-based, ML, collaborative filtering)
- Video hosting details (S3, Cloudflare, YouTube)
- Caching strategy

FUTURE-PROOFING:
- Recommendation could start as rule-based and evolve to ML
- Search could start as PostgreSQL and migrate to Elasticsearch
- Interface stays the same through all these changes
════════════════════════════════════════════════════════════════════════════════
```

---

### 3.7 Module 7: NOTIFICATION

**Purpose:** Deliver messages through any channel (push, email, in-app).

**Interface Contract (v1):**

```
INTERFACE: Notification.v1
════════════════════════════════════════════════════════════════════════════════

// Immediate notifications

send_now(
    identity_id: opaque_ref,
    channel: "push" | "email" | "in_app" | "sms",
    notification_type: string,          // For template lookup
    data: { [key: string]: any },       // Template variables
    priority: "low" | "normal" | "high"
) → Result<opaque_ref, Error>           // Returns notification_id


// Scheduled notifications

schedule(
    identity_id: opaque_ref,
    channel: "push" | "email" | "in_app",
    notification_type: string,
    data: { [key: string]: any },
    scheduled_time: timestamp,
    conditions: NotificationCondition[] | null   // Cancel if conditions not met
) → Result<opaque_ref, Error>           // Returns schedule_id

cancel_scheduled(schedule_id: opaque_ref)
    → Result<void, NotFoundError>


// Notification conditions (for smart delivery)

NotificationCondition {
    type: "window_still_active" | "window_not_started" | "user_active_recently" | "custom"
    params: opaque_blob
}

// Example: Schedule "fast ending soon" notification
// with condition: window_still_active (cancel if user already broke fast)


// User preferences

get_preferences(identity_id: opaque_ref)
    → Result<NotificationPreferences, Error>

update_preferences(identity_id: opaque_ref, preferences: Partial<NotificationPreferences>)
    → Result<NotificationPreferences, Error>

NotificationPreferences {
    channels_enabled: { push: boolean, email: boolean, sms: boolean }
    quiet_hours: { start: time, end: time } | null
    frequency_limits: { [notification_type: string]: number }   // Max per day
}


// Delivery status

get_delivery_status(notification_id: opaque_ref)
    → Result<"pending" | "delivered" | "failed" | "cancelled", Error>


════════════════════════════════════════════════════════════════════════════════
WHAT THIS MODULE HIDES:
- Push notification providers (FCM, APNs, OneSignal)
- Email service (SendGrid, SES, Mailgun)
- Template storage and rendering
- Queue implementation (Bull, SQS, Redis)
- Retry logic for failed deliveries

REPLACEABILITY:
- Start with Firebase Cloud Messaging, swap to OneSignal later
- Start with SendGrid, migrate to SES
- Interface unchanged
════════════════════════════════════════════════════════════════════════════════
```

---

### 3.8 Module 8: PROFILE

**Purpose:** Store and manage user PII, completely isolated for GDPR compliance.

**Interface Contract (v1):**

```
INTERFACE: Profile.v1
════════════════════════════════════════════════════════════════════════════════

// Profile CRUD

create_profile(identity_id: opaque_ref, initial_data: ProfileInput)
    → Result<Profile, ConflictError>

get_profile(identity_id: opaque_ref)
    → Result<Profile, NotFoundError>

update_profile(identity_id: opaque_ref, updates: Partial<ProfileInput>)
    → Result<Profile, Error>


// Profile structure

Profile {
    identity_id: opaque_ref
    display_name: string | null
    email: string | null               // Encrypted at rest
    goals: string[]
    body_type: string | null
    fitness_level: string | null
    timezone: string
    locale: string
    avatar_id: string
    preferences: opaque_blob
    created_at: timestamp
    updated_at: timestamp
}


// GDPR operations (CRITICAL - this is why Profile is isolated)

export_all_data(identity_id: opaque_ref)
    → Result<{
        profile: Profile,
        events: ACTIVITY_EVENT[],       // From EventJournal
        metrics: METRIC[],              // From Metrics
        windows: TIME_WINDOW[],         // From TimeKeeper
        progressions: PROGRESSION[]     // From Progression
    }, Error>

    // Orchestrates data export from ALL modules

request_deletion(identity_id: opaque_ref)
    → Result<{ deletion_ticket: opaque_ref, scheduled_for: timestamp }, Error>

    // Initiates 30-day deletion countdown per GDPR

cancel_deletion(deletion_ticket: opaque_ref)
    → Result<void, Error>

execute_deletion(identity_id: opaque_ref)
    → Result<{
        profile_deleted: boolean,
        events_deleted: number,
        metrics_deleted: number,
        windows_deleted: number,
        progressions_deleted: number
    }, Error>

    // Actually purges data from ALL modules


// Consent management

record_consent(identity_id: opaque_ref, consent_type: string, granted: boolean)
    → Result<void, Error>

get_consents(identity_id: opaque_ref)
    → Result<{ [consent_type: string]: { granted: boolean, timestamp: timestamp } }, Error>


════════════════════════════════════════════════════════════════════════════════
DESIGN RATIONALE:

This module is the GDPR orchestrator. It knows about other modules (violating pure
black-box) specifically because GDPR requires coordinated data handling.

However, it ONLY knows about other modules through THEIR interfaces.
It calls EventJournal.export_user_events(), not EventJournal's database directly.

This is acceptable because:
1. GDPR is a cross-cutting concern
2. The coupling is through stable interfaces, not implementations
3. Profile module can be replaced without changing other modules
════════════════════════════════════════════════════════════════════════════════
```

---

## Part 4: Module Interaction Patterns

### 4.1 Request Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         UGOKI REQUEST FLOW                                    │
│                                                                               │
│   Mobile App                                                                  │
│       │                                                                       │
│       │  HTTPS                                                                │
│       ▼                                                                       │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                         API GATEWAY                                   │  │
│   │  • Route requests to modules                                          │  │
│   │  • Validate IDENTITY token                                            │  │
│   │  • Rate limiting                                                       │  │
│   │  • Request logging (no body content)                                  │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                          │
│           ┌────────────────────────┼────────────────────────┐                │
│           │                        │                        │                │
│           ▼                        ▼                        ▼                │
│   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐          │
│   │  TIME_KEEPER │        │   METRICS    │        │   CONTENT    │          │
│   │              │        │              │        │              │          │
│   │  (Stateful)  │        │  (Stateful)  │        │ (Read-heavy) │          │
│   └──────────────┘        └──────────────┘        └──────────────┘          │
│           │                        │                        │                │
│           │                        │                        │                │
│           └────────────────────────┼────────────────────────┘                │
│                                    │                                          │
│                                    ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                       EVENT_JOURNAL                                   │  │
│   │                                                                       │  │
│   │  All state changes are recorded as events                             │  │
│   │  (Enables audit, analytics, GDPR, debugging)                         │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                          │
│                                    ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                       PROGRESSION                                     │  │
│   │                                                                       │  │
│   │  Subscribes to events, updates streaks/XP/achievements               │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                          │
│                                    ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                       NOTIFICATION                                    │  │
│   │                                                                       │  │
│   │  Triggered by progression changes (achievement unlocked, streak)      │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Example: User Completes a Fast

```
SEQUENCE: Complete Fast
════════════════════════════════════════════════════════════════════════════════

1. MOBILE APP → API_GATEWAY
   POST /time-keeper/v1/windows/{window_id}/close
   { "end_state": "completed" }
   Headers: Authorization: Bearer <identity_token>

2. API_GATEWAY → IDENTITY
   validate_token(identity_token)
   → IDENTITY { id: "id_xyz", capabilities: [...] }

3. API_GATEWAY → TIME_KEEPER
   close_window(window_id, "completed", null)

   TIME_KEEPER internally:
   a) Validates window belongs to identity
   b) Calculates final duration
   c) Updates window state
   d) Returns TIME_WINDOW primitive

4. TIME_KEEPER → EVENT_JOURNAL (async)
   record_event(
       identity_id: "id_xyz",
       event_type: "fast_completed",
       event_data: { duration_hours: 16.5, protocol: "16-8" },
       related_window: window_id
   )

5. EVENT_JOURNAL → PROGRESSION (via subscription)
   (PROGRESSION subscribes to "fast_completed" events)

   PROGRESSION internally:
   a) advance("id_xyz", "fasting_streak", 1)
   b) advance("id_xyz", "total_xp", 100)
   c) check_unlocks("id_xyz")

   Returns: { newly_unlocked: ["week_warrior_achievement"] }

6. PROGRESSION → NOTIFICATION (if achievement unlocked)
   send_now(
       identity_id: "id_xyz",
       channel: "push",
       notification_type: "achievement_unlocked",
       data: { achievement_name: "Week Warrior", xp_earned: 500 }
   )

7. API_GATEWAY → MOBILE APP
   Response: {
       window: TIME_WINDOW,
       achievements: [...],
       progression_updates: [...]
   }

════════════════════════════════════════════════════════════════════════════════
KEY OBSERVATION:

Each module only knows about primitives (TIME_WINDOW, ACTIVITY_EVENT, PROGRESSION).
No module knows the internal implementation of any other module.

TIME_KEEPER doesn't know how PROGRESSION calculates streaks.
PROGRESSION doesn't know how NOTIFICATION delivers messages.
Each can be replaced independently.
════════════════════════════════════════════════════════════════════════════════
```

---

## Part 5: Anti-Pattern Compliance

The original v1.0 document and the system prompt specified anti-patterns to avoid. This architecture addresses each:

### 5.1 Anti-Pattern: "Don't truncate text sent to LLM"

```
ADDRESSED IN: Content Module

The Content.get_recommendations() interface returns FULL content items.
There is no "preview" or "truncated" field.

When LLM integration is added (Phase 3), the interface will be:

analyze_content(content_id: opaque_ref)
    → Result<LLMAnalysis, Error>

The Content module retrieves the FULL content internally and passes it
to the LLM service. No truncation ever happens in the interface contract.
```

### 5.2 Anti-Pattern: "Don't limit word frequency display"

```
ADDRESSED IN: Metrics Module

The Metrics.get_history() interface takes limit and cursor parameters
but these are for PAGINATION, not artificial truncation.

All data is accessible - the interface allows paginating through
the complete history with no hidden limits.

BAD:  get_word_frequency(limit: 20)  // Hardcoded limitation
GOOD: get_history(cursor, limit)      // Pagination, full access possible
```

### 5.3 Anti-Pattern: "Don't add defensive JSON parsing fallbacks"

```
ADDRESSED IN: All Module Interfaces

Every interface uses strongly-typed primitives, not JSON strings.
Parsing happens at the edge (API Gateway), not within modules.

The opaque_blob type is for module-internal data that other modules
should NEVER parse. If you're tempted to parse an opaque_blob,
you're crossing a black box boundary incorrectly.

WRONG: JSON.parse(event_data) with try/catch
RIGHT: event_data is opaque; only the owning module interprets it
```

### 5.4 Anti-Pattern: "Don't hardcode API keys"

```
ADDRESSED IN: Architecture Design Principle

No module interface includes API keys, secrets, or credentials.

Configuration is injected at deployment time through:
1. Environment variables
2. Secret management service (abstracted behind interface)
3. Configuration module (if complex config needed)

The interfaces define WHAT is communicated, never HOW to authenticate
with external services. That's an implementation detail hidden within modules.
```

### 5.5 Anti-Pattern: "Don't mix concerns"

```
ADDRESSED IN: Module Separation

Each module has exactly one reason to change:

IDENTITY: Authentication/authorization rules change
TIME_KEEPER: Timer behavior or conflict rules change
EVENT_JOURNAL: Event storage or retention policy changes
METRICS: Aggregation algorithms or storage optimizations
PROGRESSION: Gamification rules or achievement criteria
CONTENT: Content structure or recommendation algorithm
NOTIFICATION: Delivery channels or scheduling logic
PROFILE: GDPR requirements or user preference structure

No module has multiple responsibilities.
```

### 5.6 Anti-Pattern: "Don't skip tests"

```
ADDRESSED IN: Black Box Testing Strategy (Section 6)

Every module interface is designed for testability:

1. All dependencies are injected through the interface
2. Mock implementations can satisfy any interface
3. Each module can be tested in complete isolation
4. Integration tests verify interface contracts, not internals

Testing strategy is mandatory, not optional.
```

---

## Part 6: Testing Strategy

> "Build tooling. Create utilities to test and debug your black boxes."
> — Eskil Steenberg

### 6.1 Test Pyramid for Black Box Modules

```
                           ┌───────────────────────┐
                           │   End-to-End Tests    │
                           │   (5% of tests)       │
                           │   Full user flows     │
                           └───────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │      Integration Tests          │
                    │      (25% of tests)             │
                    │      Module interface contracts │
                    └─────────────────────────────────┘
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │                     Unit Tests                          │
        │                     (70% of tests)                      │
        │                     Each module in isolation            │
        └─────────────────────────────────────────────────────────┘
```

### 6.2 Interface Contract Tests

Every module requires contract tests that verify:

```
CONTRACT TEST TEMPLATE
════════════════════════════════════════════════════════════════════════════════

For Module: TIME_KEEPER

Contract: open_window()
─────────────────────────
Given: Valid identity_id, window_type "fast", no active window
When:  open_window(identity_id, "fast", end_time, null)
Then:  Returns TIME_WINDOW with state "active"
       TIME_WINDOW.start_time is approximately now
       TIME_WINDOW.scheduled_end_at equals provided end_time

Contract: open_window() with conflict
─────────────────────────
Given: Valid identity_id, active "eating" window exists
       Conflict rule: "fast" and "eating" are mutual_exclusive
When:  open_window(identity_id, "fast", end_time, null)
Then:  Returns ConflictError
       Original "eating" window unchanged

Contract: close_window()
─────────────────────────
Given: Active window exists for identity_id
When:  close_window(window_id, "completed", null)
Then:  Returns TIME_WINDOW with state "completed"
       TIME_WINDOW.actual_ended_at is approximately now
       EventJournal.record_event() was called (verify via mock)

════════════════════════════════════════════════════════════════════════════════
```

### 6.3 Module Simulators

Each module must provide a **simulator** for development and testing:

```
SIMULATOR REQUIREMENTS
════════════════════════════════════════════════════════════════════════════════

TimeKeeperSimulator:
    - Runs timers at accelerated speed (1 hour = 1 second)
    - Allows manual time advancement
    - Provides hooks for testing timer-based behavior

EventJournalSimulator:
    - In-memory event storage
    - Instant replay of events for testing subscriptions
    - Configurable latency for testing async behavior

NotificationSimulator:
    - Captures all notifications without sending
    - Verifies notification content and timing
    - Simulates delivery failures for error handling tests

ContentSimulator:
    - Returns predictable test content
    - Configurable recommendations (bypass ML)
    - Fast barcode lookups without network

════════════════════════════════════════════════════════════════════════════════
```

---

## Part 7: Implementation Approach

### 7.1 Build Order (Dependency Graph)

```
PHASE 1: Core Primitives (No Dependencies)
──────────────────────────────────────────
Week 1-2:
├── Define primitive data structures
├── Implement opaque reference generation
└── Create primitive validation utilities

PHASE 2: Foundation Modules (Depend on Primitives)
──────────────────────────────────────────────────
Week 3-4:
├── IDENTITY module
│   └── Depends on: Primitives only
├── EVENT_JOURNAL module
│   └── Depends on: IDENTITY (for identity_id validation)
└── METRICS module
    └── Depends on: IDENTITY

PHASE 3: Time and Content Modules
─────────────────────────────────
Week 5-6:
├── TIME_KEEPER module
│   └── Depends on: IDENTITY, EVENT_JOURNAL
├── CONTENT module
│   └── Depends on: IDENTITY
└── NOTIFICATION module
    └── Depends on: IDENTITY

PHASE 4: Higher-Order Modules
─────────────────────────────
Week 7-8:
├── PROGRESSION module
│   └── Depends on: IDENTITY, EVENT_JOURNAL, METRICS
└── PROFILE module
    └── Depends on: All modules (GDPR orchestration)

PHASE 5: Integration Layer
──────────────────────────
Week 9-10:
├── API Gateway implementation
├── Inter-module event routing
└── End-to-end flow testing
```

### 7.2 Technology Mapping (Hidden Behind Interfaces)

The original v1.0 specified technologies. Here's how they map to black box modules:

```
MODULE → POSSIBLE IMPLEMENTATIONS (All satisfy same interface)
════════════════════════════════════════════════════════════════════════════════

IDENTITY:
├── MVP:       Firebase Auth
├── Scale:     Custom OAuth with PostgreSQL
└── Test:      In-memory token generator

TIME_KEEPER:
├── MVP:       PostgreSQL with cron jobs
├── Scale:     TimescaleDB with native time partitioning
└── Test:      In-memory with manual time control

EVENT_JOURNAL:
├── MVP:       PostgreSQL append-only table
├── Scale:     Apache Kafka + cold storage
└── Test:      In-memory array

METRICS:
├── MVP:       PostgreSQL with materialized views
├── Scale:     TimescaleDB with continuous aggregates
└── Test:      In-memory with simple aggregation

PROGRESSION:
├── MVP:       PostgreSQL state machine
├── Scale:     Redis for hot state + PostgreSQL for persistence
└── Test:      In-memory state tracker

CONTENT:
├── MVP:       PostgreSQL full-text search
├── Scale:     Elasticsearch + CDN for media
└── Test:      Static JSON fixtures

NOTIFICATION:
├── MVP:       Firebase Cloud Messaging + SendGrid
├── Scale:     Multi-provider with failover
└── Test:      Capture-only simulator

PROFILE:
├── MVP:       PostgreSQL with encryption at rest
├── Scale:     Encrypted PostgreSQL with field-level encryption
└── Test:      In-memory with fake PII

════════════════════════════════════════════════════════════════════════════════

CRITICAL: All implementations satisfy the SAME interface.
Swapping PostgreSQL for Redis in PROGRESSION requires:
- Zero changes to other modules
- Zero changes to API contracts
- Only internal implementation changes
════════════════════════════════════════════════════════════════════════════════
```

---

## Part 8: Future-Proofing

### 8.1 Features That "Just Work" With This Architecture

Because we've designed around primitives and black boxes, these future features require no architectural changes:

```
FEATURE: Meditation tracking
IMPLEMENTATION: New window_type "meditation" in TIME_KEEPER
MODULES CHANGED: None - TIME_KEEPER already handles any window_type

FEATURE: Sleep tracking
IMPLEMENTATION: New window_type "sleep" in TIME_KEEPER
MODULES CHANGED: None

FEATURE: Group challenges
IMPLEMENTATION: New EVENT_JOURNAL event types + PROGRESSION group logic
MODULES CHANGED: PROGRESSION (internal only), NOTIFICATION templates

FEATURE: AI Coach (Claude integration)
IMPLEMENTATION: New module COACH that reads from other modules via interfaces
MODULES CHANGED: None - COACH uses existing interfaces only

FEATURE: Apple Watch / WearOS
IMPLEMENTATION: New API client that uses same module interfaces
MODULES CHANGED: None - interfaces are platform-agnostic

FEATURE: Switch from PostgreSQL to CockroachDB
IMPLEMENTATION: Rewrite module internals
MODULES CHANGED: Zero interface changes, full internal rewrites
```

### 8.2 What Would Require Interface Changes

Being honest about limitations:

```
BREAKING CHANGES (Require interface version bump):

1. Adding required fields to primitives
   → Solution: Use v2 interface, deprecate v1 gradually

2. Changing primitive semantics (e.g., TIME_WINDOW now supports recurring)
   → Solution: New primitive RECURRING_WINDOW, keep TIME_WINDOW unchanged

3. GDPR law changes requiring new data categories
   → Solution: PROFILE module interface expands, other modules unchanged

4. Performance requirements forcing interface simplification
   → Solution: Create specialized high-performance interface (v1-fast)
```

---

## Part 9: Comparison with v1.0 Document

### 9.1 What We Kept

| v1.0 Element | Status | Reason |
|--------------|--------|--------|
| IF-HIIT core concept | Kept | Business requirement, not architecture |
| User flow designs | Kept | UX design, orthogonal to architecture |
| GDPR compliance goal | Kept & improved | Now built into module isolation |
| Microservices concept | Kept & refined | Formalized as black box modules |
| PostgreSQL/TimescaleDB | Kept as option | Now hidden behind interfaces |

### 9.2 What We Changed

| v1.0 Element | Change | Reason |
|--------------|--------|--------|
| SQL schemas first | Removed | Implementation detail, not interface |
| Entity-per-feature (FastingSession, WorkoutSession) | Unified to TIME_WINDOW | Recognizing common primitive |
| Direct API endpoint specs | Replaced with interface contracts | Endpoints are implementation, interfaces are contract |
| Technology stack mandates | Made optional | Interface-first allows any technology |
| Monolithic data model | Split by module | Each module owns its data exclusively |

### 9.3 What We Added

| New Element | Value |
|-------------|-------|
| Five core primitives | Stable foundation for all features |
| Black box interfaces | Enable replacement, reduce coupling |
| Module simulators | Testing infrastructure from day one |
| Interface contract tests | Verify modules independently |
| Technology mapping | Clear options per module |
| Future-proofing analysis | Confidence in extensibility |

---

## Part 10: Immediate Next Steps

### 10.1 Before Writing Any Code

1. **Review this document with stakeholders**
   - Validate primitive definitions match business needs
   - Confirm module boundaries make sense
   - Agree on interface contracts

2. **Create interface definition files**
   - One file per module (e.g., `time_keeper.interface.ts`)
   - Include all types and function signatures
   - Document all error conditions

3. **Build simulators first**
   - Before implementing real modules, build simulators
   - Use simulators for integration testing
   - Validate interfaces are usable before implementing

4. **Implement one module end-to-end**
   - Start with TIME_KEEPER (most central to business)
   - Prove the architecture works with real code
   - Iterate on interface if issues found

### 10.2 Decision Points Remaining

| Question | Options | Recommendation |
|----------|---------|----------------|
| API protocol | REST, GraphQL, gRPC | REST for MVP (simpler), evaluate GraphQL post-launch |
| Event delivery | HTTP webhooks, WebSocket, Server-Sent Events | WebSocket for real-time, with HTTP fallback |
| Module runtime | Separate services, monolith with modules, serverless | Monolith with modules for MVP (simpler deployment) |
| Interface language | TypeScript, Protocol Buffers, JSON Schema | TypeScript for MVP, consider Protobuf for performance |

---

## Conclusion

This architecture design replaces the implementation-first approach of v1.0 with a principled, black-box design that:

1. **Identifies primitives** that will remain stable even as features evolve
2. **Defines clean interfaces** that hide all implementation details
3. **Enables replaceability** - any module can be rewritten from interface alone
4. **Optimizes for humans** - one person can own one module without understanding the whole system
5. **Builds for the future** - new features fit naturally into existing primitives

> "It's faster to write five lines of code today than to write one line today and then have to edit it in the future."
> — Eskil Steenberg

By investing in architecture design before code, we ensure UGOKI will maintain constant development velocity regardless of project size, and remain maintainable by any developer, years from now.

---

## Part 11: Technology Stack Options

Based on the black box architecture, here are three implementation paths. Each satisfies the same interfaces - you can start with Option A and migrate to Option C without changing module contracts.

### Option Comparison Matrix

| Factor | Option A: Lean MVP | Option B: Balanced Growth | Option C: Enterprise Scale |
|--------|-------------------|--------------------------|---------------------------|
| **Team Size** | 1-2 developers | 3-6 developers | 6+ developers |
| **Time to MVP** | 6-8 weeks | 10-14 weeks | 16-20 weeks |
| **Monthly Cost** | $50-150 | $300-800 | $2,000-5,000+ |
| **Max Users** | 10,000 | 100,000 | 1,000,000+ |
| **Complexity** | Low | Medium | High |
| **Ops Overhead** | Minimal | Moderate | Significant |

---

### Option A: Lean MVP Stack (RECOMMENDED FOR UGOKI)

**Philosophy:** Ship fast, validate assumptions, minimize operational burden. Perfect for solo developers or tiny teams testing product-market fit.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        OPTION A: LEAN MVP STACK                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  FRONTEND                                                                     │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Mobile:     Expo (React Native)                                              │
│              • Zero native config needed                                      │
│              • OTA updates without app store                                  │
│              • Single codebase iOS + Android                                  │
│                                                                               │
│  UI:         Tamagui or NativeWind                                           │
│              • Cross-platform styling                                         │
│              • Performant animations                                          │
│                                                                               │
│  State:      Zustand + TanStack Query                                        │
│              • Simple, minimal boilerplate                                    │
│              • Built-in caching                                               │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  BACKEND                                                                      │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Runtime:    Bun                                                              │
│              • Fastest JS runtime                                             │
│              • Built-in SQLite driver                                         │
│              • Native TypeScript                                              │
│                                                                               │
│  Framework:  Hono                                                             │
│              • Ultra-lightweight                                              │
│              • Works everywhere (Bun, Cloudflare, Node)                       │
│              • TypeScript-first                                               │
│                                                                               │
│  Database:   Turso (libSQL/SQLite)                                           │
│              • Embedded replicas for edge                                     │
│              • Zero cold starts                                               │
│              • $0 to start, scales with usage                                 │
│                                                                               │
│  Auth:       Lucia Auth                                                       │
│              • Lightweight, database-agnostic                                 │
│              • No vendor lock-in                                              │
│              • Works with any OAuth provider                                  │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  INFRASTRUCTURE                                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Hosting:    Fly.io                                                          │
│              • Deploy from Git push                                           │
│              • Auto-scaling included                                          │
│              • $5-20/month to start                                           │
│              • Global edge deployment                                         │
│                                                                               │
│  Storage:    Cloudflare R2                                                   │
│              • S3-compatible                                                  │
│              • No egress fees                                                 │
│              • $0 for first 10GB                                              │
│                                                                               │
│  Push:       Expo Push Notifications                                         │
│              • Free tier generous                                             │
│              • Works with Expo out of box                                     │
│                                                                               │
│  Email:      Resend                                                          │
│              • 100 emails/day free                                            │
│              • Simple API                                                     │
│                                                                               │
│  Monitoring: Sentry (free tier)                                              │
│              • Error tracking                                                 │
│              • Performance monitoring                                         │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  MODULE → TECHNOLOGY MAPPING                                                  │
│  ─────────────────────────────────────────────────────────────────────────── │
│  IDENTITY      → Lucia Auth + SQLite                                         │
│  TIME_KEEPER   → SQLite + Bun cron                                           │
│  EVENT_JOURNAL → SQLite append-only table                                    │
│  METRICS       → SQLite with simple aggregation queries                      │
│  PROGRESSION   → SQLite + in-memory cache                                    │
│  CONTENT       → SQLite full-text search (FTS5)                              │
│  NOTIFICATION  → Expo Push + Resend                                          │
│  PROFILE       → SQLite with field encryption                                │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ESTIMATED MONTHLY COSTS                                                      │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Fly.io (1 machine, 1GB):     $5                                             │
│  Turso (5GB, 1B reads):       $0 (free tier)                                 │
│  Cloudflare R2 (10GB):        $0 (free tier)                                 │
│  Expo Push:                   $0 (free tier)                                 │
│  Resend (3k emails/mo):       $0 (free tier)                                 │
│  Sentry:                      $0 (free tier)                                 │
│  Domain + SSL:                $15/year                                        │
│  ────────────────────────────────────────────                                │
│  TOTAL:                       ~$50-100/month                                 │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Option B: Balanced Growth Stack

**Philosophy:** Production-ready from day one with room to scale. Industry-standard choices.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      OPTION B: BALANCED GROWTH STACK                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  FRONTEND                                                                     │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Mobile:     React Native (bare workflow) + EAS Build                        │
│  UI:         React Native Paper + Reanimated                                 │
│  State:      Redux Toolkit + RTK Query                                       │
│  Forms:      React Hook Form + Zod                                           │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  BACKEND                                                                      │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Runtime:    Node.js 22 LTS                                                  │
│  Framework:  Fastify                                                         │
│  ORM:        Drizzle ORM                                                     │
│  Database:   PostgreSQL 16 (Neon or Supabase)                                │
│  Cache:      Upstash Redis                                                   │
│  Auth:       Auth.js or Clerk                                                │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  INFRASTRUCTURE                                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Hosting:    Render or AWS App Runner                                        │
│  Database:   Neon PostgreSQL (serverless)                                    │
│  Storage:    AWS S3 + CloudFront                                             │
│  Queue:      BullMQ or Upstash QStash                                        │
│  Push:       Firebase Cloud Messaging                                        │
│  Email:      SendGrid                                                        │
│  Monitoring: Datadog                                                         │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ESTIMATED MONTHLY COSTS (10k users): ~$300-500                              │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Option C: Enterprise Scale Stack

**Philosophy:** Maximum scalability and reliability. Designed for millions of users.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      OPTION C: ENTERPRISE SCALE STACK                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  FRONTEND                                                                     │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Mobile:     React Native (bare) OR Flutter                                  │
│  Web:        Next.js 15 (App Router)                                         │
│  Real-time:  Socket.io or Ably                                               │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  BACKEND                                                                      │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Architecture: True Microservices (separate deployables)                     │
│  Runtime:    Node.js + Go (for high-perf modules)                            │
│  API:        GraphQL Federation + REST                                       │
│  Service Mesh: Istio or Linkerd                                              │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  DATA LAYER                                                                   │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Primary DB:    CockroachDB (distributed PostgreSQL)                         │
│  Time-Series:   TimescaleDB or ClickHouse                                    │
│  Events:        Apache Kafka                                                 │
│  Search:        Elasticsearch                                                │
│  Cache:         Redis Cluster                                                │
│  Vector DB:     Pinecone (for AI recommendations)                            │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  INFRASTRUCTURE                                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Cloud:         AWS + GCP (multi-cloud)                                      │
│  Orchestration: Kubernetes (EKS/GKE)                                         │
│  IaC:           Terraform + Pulumi                                           │
│  Secrets:       HashiCorp Vault                                              │
│  CDN:           CloudFront + Cloudflare                                      │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  OBSERVABILITY                                                                │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Metrics: Prometheus + Grafana                                               │
│  Logs:    Loki or ELK Stack                                                  │
│  Traces:  Jaeger                                                             │
│  Alerts:  PagerDuty                                                          │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ESTIMATED MONTHLY COSTS (100k users): ~$2,500-5,000                         │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 12: Recommended MVP Build Process

### Why Option A for UGOKI MVP

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    WHY OPTION A IS RIGHT FOR UGOKI MVP                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. VALIDATE BEFORE SCALING                                                   │
│     The IF-HIIT integration concept is unproven. You need user feedback      │
│     before investing in enterprise infrastructure. Option A gets you         │
│     to market in 6 weeks instead of 16.                                      │
│                                                                               │
│  2. SQLITE IS UNDERRATED                                                      │
│     • Handles 10k+ concurrent users easily                                   │
│     • Zero network latency (embedded)                                         │
│     • Perfect for mobile-first apps                                           │
│     • Turso adds replication when needed                                      │
│                                                                               │
│  3. BUN + HONO IS PRODUCTION-READY                                           │
│     • Fastest JavaScript runtime available                                    │
│     • Companies like Stripe use Bun in production                             │
│     • Hono is battle-tested on Cloudflare (billions of requests)             │
│                                                                               │
│  4. EXPO REMOVES MOBILE COMPLEXITY                                           │
│     • No Xcode/Android Studio needed initially                                │
│     • OTA updates without app store review                                   │
│     • Same code for iOS, Android, and web                                    │
│                                                                               │
│  5. MIGRATION PATH IS CLEAR                                                   │
│     • Interfaces don't change between options                                 │
│     • SQLite → PostgreSQL is straightforward                                  │
│     • Bun runs Node.js code (drop-in compatible)                              │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### MVP Build Process: 8-Week Sprint Plan

```
════════════════════════════════════════════════════════════════════════════════
                         UGOKI MVP: 8-WEEK BUILD PLAN
                              (Option A Stack)
════════════════════════════════════════════════════════════════════════════════

WEEK 0: SETUP (2-3 days)
─────────────────────────────────────────────────────────────────────────────────
□ Initialize monorepo structure
  /apps
    /mobile         # Expo app
    /api            # Bun + Hono server
  /packages
    /shared         # Shared types and utilities
    /interfaces     # Black box interface definitions

□ Set up development environment
  • Bun (runtime)
  • Turso CLI (local SQLite)
  • Expo CLI
  • TypeScript strict mode

□ Configure CI/CD
  • GitHub Actions for testing
  • Fly.io deployment on push to main
  • EAS Build for mobile

□ Create interface definition files
  • identity.interface.ts
  • time-keeper.interface.ts
  • event-journal.interface.ts
  • metrics.interface.ts
  • progression.interface.ts
  • content.interface.ts
  • notification.interface.ts
  • profile.interface.ts

DELIVERABLE: Empty project with all interfaces defined, deployable to staging


WEEK 1: IDENTITY + PROFILE MODULES
─────────────────────────────────────────────────────────────────────────────────
□ Implement IDENTITY module
  • Lucia Auth setup with SQLite
  • Google OAuth integration
  • Apple Sign In integration
  • Anonymous session support
  • JWT token generation/validation

□ Implement PROFILE module
  • User profile CRUD
  • Onboarding data storage
  • Preferences management
  • Basic encryption for PII fields

□ Mobile: Authentication screens
  • Landing page with value proposition
  • OAuth sign-in buttons
  • Anonymous mode option

DELIVERABLE: Users can sign in and create profiles


WEEK 2: TIME_KEEPER MODULE + FASTING TIMER
─────────────────────────────────────────────────────────────────────────────────
□ Implement TIME_KEEPER module
  • TIME_WINDOW CRUD operations
  • Conflict rules (fast vs eating)
  • Duration calculations
  • Active window queries

□ Implement basic scheduler
  • Bun cron for timer checks
  • Window state transitions
  • Scheduled end detection

□ Mobile: Fasting timer UI
  • Circular progress visualization
  • Start/stop fast buttons
  • Time remaining display
  • Fasting state indicator

DELIVERABLE: Users can start/complete 16:8 fasts with visual timer


WEEK 3: EVENT_JOURNAL + METRICS MODULES
─────────────────────────────────────────────────────────────────────────────────
□ Implement EVENT_JOURNAL module
  • Append-only event table
  • Event recording on all actions
  • Event query with pagination
  • Idempotency key support

□ Implement METRICS module
  • Metric recording
  • Basic aggregations (sum, avg, count)
  • Trend calculations
  • Latest value queries

□ Mobile: Weight tracking
  • Weight input screen
  • Weight history chart
  • Trend indicator

□ Wire up event recording
  • Fast started → event
  • Fast completed → event
  • Weight logged → event

DELIVERABLE: All actions create audit trail, weight tracking works


WEEK 4: PROGRESSION MODULE + GAMIFICATION
─────────────────────────────────────────────────────────────────────────────────
□ Implement PROGRESSION module
  • Streak tracking (fasting, workout)
  • XP accumulation
  • Level calculations
  • Achievement definitions
  • Unlock detection

□ Define initial achievements
  • First fast completed
  • 3-day streak
  • 7-day streak
  • First workout
  • Perfect day

□ Mobile: Gamification UI
  • Avatar display
  • XP bar
  • Streak counter
  • Achievement notifications
  • Celebration animations (Reanimated)

DELIVERABLE: Users earn XP and achievements, streaks are tracked


WEEK 5: CONTENT MODULE + WORKOUT LIBRARY
─────────────────────────────────────────────────────────────────────────────────
□ Implement CONTENT module
  • Content item storage
  • SQLite FTS5 full-text search
  • Category/tag filtering
  • Difficulty filtering

□ Seed workout content
  • 10-15 HIIT workouts (video URLs)
  • Categorize by difficulty, duration, focus
  • Add thumbnails

□ Mobile: Workout library
  • Workout list/grid view
  • Filter by duration/difficulty
  • Workout detail screen
  • Video player integration

DELIVERABLE: Users can browse and view workout library


WEEK 6: WORKOUT TRACKING + DASHBOARD
─────────────────────────────────────────────────────────────────────────────────
□ Extend TIME_KEEPER for workouts
  • Workout as TIME_WINDOW type
  • Track workout in progress
  • Completion with metrics

□ Mobile: Workout player
  • Exercise countdown timer
  • Next exercise preview
  • Pause/resume
  • Completion celebration

□ Mobile: Dashboard
  • Today's goals
  • Active timer display
  • Quick actions
  • Weekly summary

DELIVERABLE: Users can complete tracked workouts, see progress dashboard


WEEK 7: NOTIFICATION MODULE + ENGAGEMENT
─────────────────────────────────────────────────────────────────────────────────
□ Implement NOTIFICATION module
  • Expo Push integration
  • Resend email integration
  • Scheduled notification queue
  • Preference management

□ Set up notification triggers
  • Fast ending soon (1 hour before)
  • Fast completed
  • Streak about to break
  • Achievement unlocked
  • Daily reminder (configurable)

□ Mobile: Notification preferences
  • Toggle push notifications
  • Quiet hours setting
  • Reminder time selection

DELIVERABLE: Users receive timely push notifications


WEEK 8: POLISH + LAUNCH PREP
─────────────────────────────────────────────────────────────────────────────────
□ Bug fixing and performance
  • Load testing (k6)
  • Memory leak checks
  • Animation performance
  • Offline handling

□ GDPR compliance check
  • Data export works
  • Account deletion works
  • Privacy policy ready
  • Consent tracking

□ App store preparation
  • Screenshots
  • App description
  • Privacy policy link
  • EAS submit configuration

□ Monitoring setup
  • Sentry error tracking
  • Basic analytics events
  • Uptime monitoring

DELIVERABLE: App submitted to TestFlight/Play Store beta


════════════════════════════════════════════════════════════════════════════════
                              POST-MVP ROADMAP
════════════════════════════════════════════════════════════════════════════════

WEEK 9-10: User Testing + Iteration
• Collect feedback from beta users
• Fix critical issues
• Improve onboarding based on drop-off data

WEEK 11-12: Meal Tracking + Nutrition
• Add meal logging to METRICS
• Integrate Nutritionix API for food search
• Basic calorie/macro display

WEEK 13-14: Social Features
• Follow system
• Activity feed
• Share achievements

WEEK 15-16: Wearables + Migration Planning
• HealthKit integration
• Google Fit integration
• Evaluate if Option B migration needed
```

---

### Project Structure

```
ugoki/
├── apps/
│   ├── mobile/                    # Expo React Native app
│   │   ├── app/                   # Expo Router screens
│   │   │   ├── (auth)/           # Auth flow screens
│   │   │   ├── (tabs)/           # Main tab screens
│   │   │   └── _layout.tsx
│   │   ├── components/           # Shared UI components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── stores/               # Zustand stores
│   │   └── package.json
│   │
│   └── api/                       # Bun + Hono backend
│       ├── src/
│       │   ├── modules/          # Black box modules
│       │   │   ├── identity/
│       │   │   │   ├── identity.service.ts
│       │   │   │   ├── identity.routes.ts
│       │   │   │   └── identity.test.ts
│       │   │   ├── time-keeper/
│       │   │   ├── event-journal/
│       │   │   ├── metrics/
│       │   │   ├── progression/
│       │   │   ├── content/
│       │   │   ├── notification/
│       │   │   └── profile/
│       │   ├── db/
│       │   │   ├── schema.ts     # Drizzle schema
│       │   │   └── migrations/
│       │   ├── lib/              # Shared utilities
│       │   └── index.ts          # Hono app entry
│       └── package.json
│
├── packages/
│   ├── interfaces/               # TypeScript interface definitions
│   │   ├── identity.ts
│   │   ├── time-keeper.ts
│   │   ├── event-journal.ts
│   │   ├── metrics.ts
│   │   ├── progression.ts
│   │   ├── content.ts
│   │   ├── notification.ts
│   │   ├── profile.ts
│   │   └── primitives.ts         # Core primitive types
│   │
│   └── shared/                   # Shared code
│       ├── utils/
│       └── constants/
│
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── deploy.yml
│
├── fly.toml                      # Fly.io config
├── package.json                  # Root package.json (workspaces)
├── turbo.json                    # Turborepo config (optional)
└── README.md
```

---

### First Day Commands

```bash
# 1. Create project
mkdir ugoki && cd ugoki
bun init -y

# 2. Set up workspaces
cat > package.json << 'EOF'
{
  "name": "ugoki",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test"
  }
}
EOF

# 3. Create mobile app
mkdir -p apps
cd apps
bunx create-expo-app mobile --template expo-template-blank-typescript
cd mobile
bunx expo install expo-router expo-constants expo-linking
bun add zustand @tanstack/react-query

# 4. Create API
cd ..
mkdir api && cd api
bun init -y
bun add hono @hono/zod-validator drizzle-orm @libsql/client lucia
bun add -d drizzle-kit @types/bun

# 5. Create packages
cd ../..
mkdir -p packages/interfaces packages/shared

# 6. Initialize database
cd apps/api
bunx drizzle-kit generate:sqlite

# 7. Start development
cd ../..
bun run dev
```

---

### Python + Pydantic AI + FastAPI Stack

Since AI agents are core to UGOKI, the stack is unified around Python:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  UGOKI TECH STACK: PYTHON-FIRST WITH AI                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  FRONTEND                                                                     │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Mobile:     Expo (React Native)                                              │
│  UI:         Tamagui or NativeWind                                           │
│  State:      Zustand + TanStack Query                                        │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  BACKEND + AI AGENTS (unified)                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                               │
│  Runtime:     Python 3.12+                                                   │
│  Package Mgr: uv (10-100x faster than pip)                                   │
│                                                                               │
│  Framework:   FastAPI                                                        │
│               • REST endpoints for mobile app                                │
│               • WebSocket for real-time agent conversations                  │
│               • Streaming responses for AI output                            │
│               • Auto-generated OpenAPI docs                                  │
│               • Async by default                                             │
│                                                                               │
│  Validation:  Pydantic 2.0                                                   │
│               • Request/response models                                       │
│               • Settings management                                           │
│               • Type-safe throughout                                          │
│                                                                               │
│  AI Agents:   Pydantic AI                                                    │
│               • Type-safe agent definitions                                  │
│               • Built on Pydantic (native integration)                       │
│               • Claude as primary model                                       │
│               • Tool use with full type safety                               │
│               • Dependency injection for testing                             │
│               • Streaming support                                             │
│                                                                               │
│  LLM:         anthropic SDK                                                  │
│               • Claude 3.5 Sonnet (complex reasoning)                        │
│               • Claude 3.5 Haiku (fast responses)                            │
│               • Direct SDK + Pydantic AI wrapper                             │
│                                                                               │
│  ORM:         SQLAlchemy 2.0 (async)                                         │
│  Migrations:  Alembic                                                        │
│  Database:    SQLite (dev) → PostgreSQL (prod)                               │
│  Vector:      pgvector (PostgreSQL extension)                                │
│  Cache:       Redis (optional, for sessions)                                 │
│                                                                               │
│  Background:  APScheduler or arq                                             │
│               • Scheduled notifications                                       │
│               • Timer checks                                                  │
│               • Async task queue                                             │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  MODULE → TECHNOLOGY MAPPING                                                  │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                               │
│  IDENTITY      → FastAPI + python-jose + passlib                             │
│  TIME_KEEPER   → FastAPI + APScheduler + SQLAlchemy                          │
│  EVENT_JOURNAL → FastAPI + SQLAlchemy (append-only)                          │
│  METRICS       → FastAPI + SQLAlchemy + pandas                               │
│  PROGRESSION   → FastAPI + SQLAlchemy                                        │
│  CONTENT       → FastAPI + SQLAlchemy + pgvector                             │
│  NOTIFICATION  → FastAPI + expo-server-sdk + resend                          │
│  PROFILE       → FastAPI + SQLAlchemy + cryptography                         │
│  AI_COACH      → FastAPI + Pydantic AI + Claude                    [NEW]    │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  INFRASTRUCTURE                                                               │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Hosting:     Fly.io or Railway                                              │
│  Storage:     Cloudflare R2 (S3-compatible)                                  │
│  Push:        expo-server-sdk-python                                         │
│  Email:       resend                                                          │
│  Monitoring:  Sentry + Logfire (Pydantic's observability)                    │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  WHY PYDANTIC AI                                                             │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                               │
│  1. Native Pydantic integration (same validation everywhere)                 │
│  2. Type-safe agents (full IDE support, catch errors at dev time)            │
│  3. Dependency injection (easy testing, mock LLM responses)                  │
│  4. Streaming built-in (FastAPI StreamingResponse compatible)                │
│  5. Model-agnostic (Claude, OpenAI, Gemini - swap without code changes)      │
│  6. Simpler than LangChain (less magic, more explicit)                       │
│  7. Logfire integration for observability                                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### AI_COACH Module: Pydantic AI Implementation

```python
# src/modules/ai_coach/agents/coach.py

from pydantic_ai import Agent, RunContext
from pydantic import BaseModel
from typing import List
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# DEPENDENCIES (injected, following black box principles)
# ─────────────────────────────────────────────────────────────────────────────

class CoachDependencies(BaseModel):
    """Dependencies injected into the agent - other modules' interfaces"""
    identity_id: str
    time_keeper: "TimeKeeperInterface"    # Abstract interface, not implementation
    metrics: "MetricsInterface"
    progression: "ProgressionInterface"
    content: "ContentInterface"

# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS (type-safe outputs)
# ─────────────────────────────────────────────────────────────────────────────

class Suggestion(BaseModel):
    action: str
    reason: str
    priority: int

class CoachResponse(BaseModel):
    message: str
    suggestions: List[Suggestion]
    tools_used: List[str]

# ─────────────────────────────────────────────────────────────────────────────
# AGENT DEFINITION
# ─────────────────────────────────────────────────────────────────────────────

coach_agent = Agent(
    "anthropic:claude-3-5-sonnet-latest",
    deps_type=CoachDependencies,
    result_type=CoachResponse,
    system_prompt="""
    You are UGOKI Coach, a personal wellness assistant specializing in
    intermittent fasting and HIIT workouts.

    Your role:
    - Provide personalized guidance based on user's data
    - Encourage without being pushy
    - Give actionable, specific suggestions
    - Celebrate progress and streaks

    Always use the available tools to get current user data before responding.
    Never make assumptions about the user's state.
    """,
)

# ─────────────────────────────────────────────────────────────────────────────
# TOOLS (agent can call other modules through interfaces)
# ─────────────────────────────────────────────────────────────────────────────

@coach_agent.tool
async def get_active_fast(ctx: RunContext[CoachDependencies]) -> dict | None:
    """Get user's current fasting window if active"""
    window = await ctx.deps.time_keeper.get_active_window(
        ctx.deps.identity_id,
        window_type="fast"
    )
    if window:
        return {
            "started_at": window.start_time.isoformat(),
            "scheduled_end": window.end_time.isoformat() if window.end_time else None,
            "hours_elapsed": (datetime.utcnow() - window.start_time).total_seconds() / 3600,
        }
    return None

@coach_agent.tool
async def get_streak(ctx: RunContext[CoachDependencies], streak_type: str) -> dict:
    """Get user's current streak (fasting or workout)"""
    progression = await ctx.deps.progression.get_progression(
        ctx.deps.identity_id,
        f"{streak_type}_streak"
    )
    return {
        "current_days": int(progression.current_state.split("_")[1]) if progression else 0,
        "longest_days": progression.state_metadata.get("longest", 0) if progression else 0,
    }

@coach_agent.tool
async def get_recent_metrics(
    ctx: RunContext[CoachDependencies],
    metric_type: str,
    days: int = 7
) -> list:
    """Get user's metrics for the past N days"""
    from datetime import timedelta
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    metrics = await ctx.deps.metrics.get_history(
        ctx.deps.identity_id,
        metric_type,
        time_range={"start": start, "end": end},
        granularity="daily"
    )
    return [{"date": m.timestamp.isoformat(), "value": m.value} for m in metrics]

@coach_agent.tool
async def recommend_workout(
    ctx: RunContext[CoachDependencies],
    duration_max: int = 20,
    difficulty_max: int = 3
) -> dict | None:
    """Get a workout recommendation based on user's current state"""
    recommendations = await ctx.deps.content.get_recommendations(
        ctx.deps.identity_id,
        content_type="workout",
        context={
            "current_time_window": None,  # Could check if fasting
            "duration_preference_minutes": duration_max,
        },
        limit=1
    )
    if recommendations:
        r = recommendations[0]
        return {
            "id": r.id,
            "title": r.title,
            "duration_minutes": r.duration_minutes,
            "difficulty": r.difficulty,
        }
    return None

# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI ROUTE
# ─────────────────────────────────────────────────────────────────────────────

# src/modules/ai_coach/routes.py

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic_ai import Agent

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])

@router.post("/chat")
async def chat(
    message: str,
    identity_id: str = Depends(get_current_user),  # From IDENTITY module
    time_keeper = Depends(get_time_keeper),         # Injected interfaces
    metrics = Depends(get_metrics),
    progression = Depends(get_progression),
    content = Depends(get_content),
):
    deps = CoachDependencies(
        identity_id=identity_id,
        time_keeper=time_keeper,
        metrics=metrics,
        progression=progression,
        content=content,
    )

    result = await coach_agent.run(message, deps=deps)
    return result.data

@router.post("/chat/stream")
async def chat_stream(
    message: str,
    identity_id: str = Depends(get_current_user),
    # ... other deps
):
    """Streaming response for real-time AI output"""
    deps = CoachDependencies(...)

    async def generate():
        async with coach_agent.run_stream(message, deps=deps) as result:
            async for text in result.stream():
                yield f"data: {text}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

---

### Project Structure (Python + Pydantic AI)

```
ugoki/
├── apps/
│   ├── mobile/                      # Expo React Native
│   │   ├── app/                     # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── package.json
│   │
│   └── api/                         # Python FastAPI + Pydantic AI
│       ├── src/
│       │   ├── modules/
│       │   │   ├── identity/
│       │   │   │   ├── __init__.py
│       │   │   │   ├── interface.py    # Abstract interface
│       │   │   │   ├── service.py      # Implementation
│       │   │   │   ├── routes.py       # FastAPI routes
│       │   │   │   ├── models.py       # Pydantic models
│       │   │   │   └── tests/
│       │   │   ├── time_keeper/
│       │   │   ├── event_journal/
│       │   │   ├── metrics/
│       │   │   ├── progression/
│       │   │   ├── content/
│       │   │   ├── notification/
│       │   │   ├── profile/
│       │   │   └── ai_coach/           # Pydantic AI agents
│       │   │       ├── __init__.py
│       │   │       ├── routes.py
│       │   │       ├── agents/
│       │   │       │   ├── coach.py        # Main coaching agent
│       │   │       │   ├── scheduler.py    # Schedule optimization
│       │   │       │   ├── meal_planner.py # Meal suggestions
│       │   │       │   └── insights.py     # Pattern recognition
│       │   │       ├── tools/
│       │   │       │   ├── __init__.py
│       │   │       │   └── module_tools.py # Tools that call other modules
│       │   │       └── prompts/
│       │   │           └── system.py
│       │   ├── db/
│       │   │   ├── database.py
│       │   │   ├── models.py
│       │   │   └── migrations/
│       │   ├── core/
│       │   │   ├── config.py           # Settings (Pydantic)
│       │   │   ├── security.py
│       │   │   └── deps.py             # FastAPI dependencies
│       │   └── main.py                 # FastAPI app entry
│       ├── tests/
│       ├── pyproject.toml
│       ├── Dockerfile
│       └── fly.toml
│
├── packages/
│   └── interfaces/                  # TypeScript interfaces (for mobile)
│
├── .github/
│   └── workflows/
│
└── README.md
```

---

### Dependencies (pyproject.toml)

```toml
[project]
name = "ugoki-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    # Core
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.6.0",

    # Database
    "sqlalchemy[asyncio]>=2.0.0",
    "aiosqlite>=0.20.0",           # SQLite async driver
    "asyncpg>=0.30.0",             # PostgreSQL async driver
    "alembic>=1.14.0",

    # AI
    "pydantic-ai>=0.0.15",         # Agent framework
    "anthropic>=0.40.0",           # Claude SDK
    "logfire>=2.0.0",              # Observability (Pydantic team)

    # Auth
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.0",

    # Utils
    "httpx>=0.28.0",
    "python-multipart>=0.0.18",
    "apscheduler>=3.10.0",

    # Notifications
    "exponent-server-sdk>=2.1.0",  # Expo push
    "resend>=2.5.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "ruff>=0.8.0",
    "mypy>=1.13.0",
]
```

---

### First Day Commands (Python + Pydantic AI)

```bash
# 1. Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Create project structure
mkdir -p ugoki/apps/{api,mobile} ugoki/packages/interfaces
cd ugoki/apps/api

# 3. Initialize Python project
uv init --name ugoki-api

# 4. Add dependencies
uv add fastapi "uvicorn[standard]" pydantic pydantic-settings
uv add "sqlalchemy[asyncio]" aiosqlite alembic
uv add pydantic-ai anthropic logfire
uv add python-jose passlib httpx apscheduler
uv add exponent-server-sdk resend

# 5. Add dev dependencies
uv add --dev pytest pytest-asyncio ruff mypy

# 6. Create directory structure
mkdir -p src/modules/{identity,time_keeper,event_journal,metrics}
mkdir -p src/modules/{progression,content,notification,profile}
mkdir -p src/modules/ai_coach/{agents,tools,prompts}
mkdir -p src/{db,core} tests

# 7. Create main.py
cat > src/main.py << 'EOF'
from fastapi import FastAPI
from contextlib import asynccontextmanager
import logfire

# Initialize Logfire for observability
logfire.configure()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database, etc.
    yield
    # Shutdown: cleanup

app = FastAPI(
    title="UGOKI API",
    version="0.1.0",
    lifespan=lifespan
)

# Instrument FastAPI with Logfire
logfire.instrument_fastapi(app)

@app.get("/health")
async def health():
    return {"status": "ok"}
EOF

# 8. Create config
cat > src/core/config.py << 'EOF'
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./ugoki.db"

    # AI
    anthropic_api_key: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # Logfire
    logfire_token: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
EOF

# 9. Create .env
cat > .env << 'EOF'
DATABASE_URL=sqlite+aiosqlite:///./ugoki.db
ANTHROPIC_API_KEY=sk-ant-xxxxx
JWT_SECRET=your-secret-key-change-in-prod
LOGFIRE_TOKEN=
EOF

# 10. Run server
uv run uvicorn src.main:app --reload --port 8000

# 11. Set up mobile (in another terminal)
cd ../mobile
bunx create-expo-app . --template expo-template-blank-typescript
bunx expo install expo-router expo-constants
bun add zustand @tanstack/react-query
```

---

### Key Decision: Monolith First

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     MONOLITH WITH MODULES (NOT MICROSERVICES)                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  For MVP, deploy as SINGLE SERVICE with internal module boundaries:          │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         SINGLE BUN PROCESS                               ││
│  │                                                                          ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   ││
│  │  │   IDENTITY   │ │ TIME_KEEPER  │ │EVENT_JOURNAL │ │   METRICS    │   ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   ││
│  │                                                                          ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   ││
│  │  │ PROGRESSION  │ │   CONTENT    │ │ NOTIFICATION │ │   PROFILE    │   ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   ││
│  │                                                                          ││
│  │                        ▼ Shared SQLite Database ▼                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                               │
│  WHY THIS APPROACH:                                                          │
│  • Zero network latency between modules                                       │
│  • Single deployment = simple operations                                      │
│  • Module boundaries enforced by TypeScript, not network                     │
│  • Can extract to microservices later IF needed                              │
│                                                                               │
│  THE BLACK BOX DISCIPLINE STILL APPLIES:                                     │
│  • Modules only communicate through interfaces                                │
│  • No direct database queries across modules                                  │
│  • Each module has its own database tables                                   │
│  • Replace any module by reimplementing its interface                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## References

### Architecture Patterns
- [Hexagonal Architecture and Clean Architecture (with examples)](https://dev.to/dyarleniber/hexagonal-architecture-and-clean-architecture-with-examples-48oi)
- [Finding the Right Balance Between DDD, Clean and Hexagonal Architectures](https://dev.to/y9vad9/digging-deep-to-find-the-right-balance-between-ddd-clean-and-hexagonal-architectures-4dnn)
- [Building Better Software with Domain-Driven Design and Hexagonal Architecture](https://www.cloudthat.com/resources/blog/building-better-software-with-domain-driven-design-and-hexagonal-architecture)

### Modular Design Principles
- [Developing modular software: Top strategies and best practices](https://vfunction.com/blog/modular-software/)
- [Effective Modular Design in Software Engineering](https://www.geeksforgeeks.org/software-engineering/effective-modular-design-in-software-engineering/)
- [The Power of Modular Software Design](https://www.tdktech.com/tech-talks/the-power-of-modular-software-design-unlocking-efficiency-and-scalability/)

### Eskil Steenberg's Principles
- [AI Architecture Prompts based on Eskil Steenberg's lecture](https://github.com/Alexanderdunlop/ai-architecture-prompts)
- [How I Turn Claude Into a Systems Engineering Genius](https://medium.com/vibe-coding/how-i-turn-claude-into-a-systems-engineering-genius-with-one-prompt-d342af0f517c)

### Fitness App Architecture
- [Migrating a Fitness Platform Serving 6.4 Million Users to Microservices](https://www.altoroslabs.com/portfolio/migrating-a-fitness-platform-serving-6-million-users-to-microservices)
- [10 Best Practices for Microservices Architecture in 2025](https://www.geeksforgeeks.org/blogs/best-practices-for-microservices-architecture/)
- [Fitness App Development in 2025](https://www.scnsoft.com/healthcare/mobile/fitness-apps)

---

**Document Status:** Architecture Design Complete - Ready for Review
**Next Phase:** Interface Definition Files + Stakeholder Approval
**Version Control:** Track changes via Git repository
