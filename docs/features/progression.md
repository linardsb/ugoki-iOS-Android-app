# Feature: Progression System

XP, levels, streaks, and achievements.

---

## Overview

The progression system gamifies the UGOKI experience with XP earning, level advancement, streak tracking, and 21 achievements. Progress is visualized on the dashboard and drives engagement through tangible rewards for consistent behavior.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to earn XP so that I feel rewarded for my efforts
- As a user, I want to level up so that I see my overall progress
- As a user, I want to maintain streaks so that I stay consistent
- As a user, I want to unlock achievements so that I have goals to work toward

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/progression` | Full progression data | Yes |
| GET | `/api/v1/progression/level` | Level info only | Yes |
| GET | `/api/v1/progression/streaks` | Streak info only | Yes |
| GET | `/api/v1/progression/achievements` | All achievements | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/progression/service.py` | XP/level logic |
| `apps/api/src/modules/progression/achievements.py` | Achievement definitions |
| `apps/api/src/modules/progression/routes.py` | API endpoints |
| `apps/api/src/modules/progression/orm.py` | Database models |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/dashboard/hooks/useProgression.ts` | React Query hooks |
| `apps/mobile/features/dashboard/components/LevelBadge.tsx` | Level display |
| `apps/mobile/features/dashboard/components/StreakCard.tsx` | Streak display |
| `apps/mobile/features/dashboard/components/AchievementCard.tsx` | Achievement display |

---

## XP System

### Earning XP

| Action | XP |
|--------|------|
| Complete 16:8 fast | 50 |
| Complete 18:6 fast | 75 |
| Complete 20:4 fast | 100 |
| Complete beginner workout | 30 |
| Complete intermediate workout | 45 |
| Complete advanced workout | 60 |
| 7-day fasting streak | 100 bonus |
| 30-day fasting streak | 500 bonus |
| Unlock achievement | 50-200 |

### Level Thresholds

| Level | Total XP Required |
|-------|-------------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 300 |
| 4 | 600 |
| 5 | 1,000 |
| 10 | 5,000 |
| 20 | 20,000 |
| 50 | 100,000 |
| 100 | 500,000 |

Formula: `XP = 50 * level^1.5`

---

## Streak System

### Fasting Streak

- Increments when a fast is completed
- Requires completion on consecutive calendar days
- Grace period: 4 hours into next day
- Resets to 0 if day is missed

### Workout Streak

- Increments when a workout is completed
- Follows same rules as fasting streak

### Streak Calculation

```python
def check_streak(last_activity_date: date, today: date) -> bool:
    # Same day - no change
    if last_activity_date == today:
        return True

    # Yesterday - increment
    if last_activity_date == today - timedelta(days=1):
        return True

    # Today before 4 AM, yesterday counts
    if datetime.now().hour < 4:
        if last_activity_date == today - timedelta(days=1):
            return True

    # Streak broken
    return False
```

---

## Achievements

### Categories

| Category | Count |
|----------|-------|
| Fasting | 7 |
| Workout | 7 |
| Streak | 4 |
| Social | 3 |

### Achievement List

#### Fasting Achievements

| Name | Requirement | XP |
|------|-------------|-----|
| First Fast | Complete 1 fast | 50 |
| Fasting Apprentice | Complete 10 fasts | 100 |
| Fasting Expert | Complete 50 fasts | 200 |
| Fasting Master | Complete 100 fasts | 300 |
| Extended Fast | Complete 20:4 fast | 100 |
| Marathon Faster | Complete 24h fast | 200 |
| Consistency King | 30-day streak | 500 |

#### Workout Achievements

| Name | Requirement | XP |
|------|-------------|-----|
| First Workout | Complete 1 workout | 50 |
| Workout Warrior | Complete 10 workouts | 100 |
| Iron Will | Complete 50 workouts | 200 |
| HIIT Legend | Complete 100 workouts | 300 |
| Early Bird | Workout before 7 AM | 75 |
| Night Owl | Workout after 9 PM | 75 |
| Variety Pack | Complete all workout types | 150 |

#### Streak Achievements

| Name | Requirement | XP |
|------|-------------|-----|
| Week Warrior | 7-day streak | 100 |
| Monthly Master | 30-day streak | 300 |
| Quarterly Champion | 90-day streak | 500 |
| Year of Dedication | 365-day streak | 1000 |

#### Social Achievements

| Name | Requirement | XP |
|------|-------------|-----|
| Social Butterfly | Add 5 friends | 75 |
| Challenge Accepted | Join first challenge | 50 |
| Challenge Champion | Win a challenge | 150 |

---

## Data Models

### Progression Response

```typescript
interface Progression {
  xp: {
    total: number;
    today: number;
    this_week: number;
  };
  level: {
    current: number;
    xp_for_next: number;
    progress_percent: number;
  };
  streaks: {
    fasting: {
      current: number;
      longest: number;
      last_activity: string;
    };
    workout: {
      current: number;
      longest: number;
      last_activity: string;
    };
  };
  achievements: Achievement[];
}
```

### Achievement

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  category: "fasting" | "workout" | "streak" | "social";
  xp_reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
  progress: number; // 0-100%
  requirement: number;
  current: number;
}
```

---

## Achievement Checking

Achievements are checked after relevant actions:

```python
async def on_fast_completed(identity_id: str):
    # Check fasting achievements
    await check_achievement(identity_id, "first_fast")
    await check_achievement(identity_id, "fasting_apprentice")
    # Check streak achievements
    await check_achievement(identity_id, "week_warrior")
```

---

## Known Issues

None currently tracked.

---

## Future Enhancements

- [ ] Achievement notifications
- [ ] Weekly/monthly XP reports
- [ ] XP multiplier events
- [ ] Custom achievement badges
- [ ] Leaderboard by level

---

## References

- **PRD Section:** [PRD.md#progression-system](../product/PRD.md#37-progression-system)
- **Module Spec:** [MODULES.md#progression](../architecture/MODULES.md#4-progression-module)
