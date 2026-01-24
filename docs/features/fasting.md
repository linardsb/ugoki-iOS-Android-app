# Feature: Intermittent Fasting Timer

Core fasting timer with multiple protocols, pause/resume, and progress tracking.

---

## Overview

The fasting timer is UGOKI's primary feature, allowing users to track intermittent fasting windows. It supports multiple protocols (16:8, 18:6, 20:4), pause/resume functionality, and integrates with the progression system for streak tracking and XP.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to start a fasting timer so that I can track my fasting window
- As a user, I want to pause my fast so that I can handle interruptions
- As a user, I want to see my fasting streak so that I stay motivated
- As a user, I want to choose different protocols so that I can customize my fasting schedule

---

## Protocols

| Protocol | Fasting Hours | Eating Hours |
|----------|---------------|--------------|
| 16:8 | 16 | 8 |
| 18:6 | 18 | 6 |
| 20:4 | 20 | 4 |
| Custom | User-defined | User-defined |

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/time-keeper/windows` | Start a new fasting window | Yes |
| POST | `/api/v1/time-keeper/windows/{id}/close` | End the active fasting window | Yes |
| POST | `/api/v1/time-keeper/windows/{id}/extend` | Extend the active fasting window | Yes |
| GET | `/api/v1/time-keeper/windows/active` | Get active fasting window | Yes |
| GET | `/api/v1/time-keeper/windows` | Get fasting history (all windows) | Yes |
| GET | `/api/v1/time-keeper/windows/{id}` | Get specific fasting window by ID | Yes |
| GET | `/api/v1/time-keeper/windows/{id}/elapsed` | Get elapsed time in current window (seconds) | Yes |
| GET | `/api/v1/time-keeper/windows/{id}/remaining` | Get remaining time in current window (seconds) | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/time_keeper/service.py` | Timer logic, state management |
| `apps/api/src/modules/time_keeper/routes.py` | Fasting API endpoints |
| `apps/api/src/modules/time_keeper/models.py` | TimeWindow models |
| `apps/api/src/modules/time_keeper/orm.py` | time_windows table |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/fasting/hooks/useFasting.ts` | React Query hooks |
| `apps/mobile/features/fasting/stores/fastingStore.ts` | Local timer state |
| `apps/mobile/features/fasting/components/FastingTimer.tsx` | Circular progress timer |
| `apps/mobile/features/fasting/components/FastingControls.tsx` | Start/pause/end buttons |
| `apps/mobile/app/(tabs)/index.tsx` | Dashboard with timer |

---

## Data Models

### Start Fast Request

```typescript
interface StartFastRequest {
  protocol: string; // "16:8", "18:6", "20:4", "custom"
  custom_hours?: number; // Required if protocol is "custom"
}
```

### Time Window Response

```typescript
interface TimeWindow {
  id: string;
  window_type: "fast" | "eating";
  protocol: string;
  start_time: string; // ISO datetime
  end_time: string | null;
  target_end_time: string; // When fast should end
  state: "active" | "paused" | "completed" | "abandoned";
  paused_duration: number; // Seconds paused
}
```

---

## State Machine

```
                    ┌─────────┐
                    │  idle   │
                    └────┬────┘
                         │ start()
                         ▼
           ┌─────────────────────────┐
           │        active           │
           └─────────┬───────────────┘
                     │
        ┌────────────┼────────────┐
        │ pause()    │ end()      │ abandon()
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ paused  │  │completed│  │abandoned│
   └────┬────┘  └─────────┘  └─────────┘
        │ resume()
        ▼
   ┌─────────┐
   │ active  │
   └─────────┘
```

---

## Business Logic

### Starting a Fasting Window
1. Check no active window exists for user
2. POST `/api/v1/time-keeper/windows` with protocol
3. Backend creates TIME_WINDOW with state="active"
4. Calculate target_end_time based on protocol (hours)
5. Mobile receives window details and starts local timer

### Getting Active Window Status
1. GET `/api/v1/time-keeper/windows/active` to fetch current window
2. GET `/api/v1/time-keeper/windows/{id}/elapsed` to get time elapsed
3. GET `/api/v1/time-keeper/windows/{id}/remaining` to get time remaining
4. Mobile uses these to display countdown timer

### Extending a Fasting Window
1. Validate window is currently active
2. POST `/api/v1/time-keeper/windows/{id}/extend` with additional hours
3. Backend recalculates target_end_time
4. Mobile updates countdown timer

### Closing/Completing a Window
1. Validate window is active (or can be closed)
2. POST `/api/v1/time-keeper/windows/{id}/close`
3. Backend sets state="completed"
4. Backend triggers progression: add XP, update streak
5. Backend records ACTIVITY_EVENT in audit log

### Streak Calculation
- Streak increments when window completed on consecutive days
- Streak resets if no window completed yesterday
- Grace period: 4 hours into next day
- Stored in PROGRESSION module

---

## Progression Integration

| Action | XP Earned |
|--------|-----------|
| Complete 16:8 fast | 50 XP |
| Complete 18:6 fast | 75 XP |
| Complete 20:4 fast | 100 XP |
| 7-day streak | 100 XP bonus |
| 30-day streak | 500 XP bonus |

---

## Known Issues

None currently tracked.

---

## Future Enhancements

- [ ] 24-hour fast protocol
- [ ] 5:2 fasting (5 days eat, 2 days fast)
- [ ] Alternate day fasting (ADF)
- [ ] Fasting reminders/notifications
- [ ] Eating window meal logging

---

## References

- **PRD Section:** [PRD.md#intermittent-fasting-timer](../product/PRD.md#31-intermittent-fasting-timer)
- **Module Spec:** [MODULES.md#time_keeper](../architecture/MODULES.md#2-time_keeper-module)
