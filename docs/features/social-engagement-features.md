# Social Engagement Features Specification

**Version:** 1.0 | **Status:** Proposed | **Date:** January 30, 2026

This document specifies 6 new social engagement features to increase user interaction and retention in UGOKI.

---

## Table of Contents

1. [Duo Streaks](#1-duo-streaks) (Priority 1)
2. [Activity Feed](#2-activity-feed) (Priority 2)
3. [Quick Challenge Templates](#3-quick-challenge-templates) (Priority 3)
4. [Weekly Leaderboard Resets](#4-weekly-leaderboard-resets) (Priority 4)
5. [Achievement Reactions](#5-achievement-reactions) (Priority 5)
6. [Team Challenges](#6-team-challenges) (Priority 6)

---

## 1. Duo Streaks

**Impact:** Very High | **Effort:** Medium | **Module:** SOCIAL + PROGRESSION

### Overview

Duo Streaks create a shared streak between two users where **both must complete the activity** on the same day to maintain the streak. Inspired by Snapchat's mutual streak mechanic, this creates strong daily retention through mutual accountability.

### User Stories

- As a user, I want to start a duo streak with a friend so we can hold each other accountable
- As a user, I want to see which duo streaks are at risk so I can remind my partner
- As a user, I want to celebrate milestone duo streaks with my partner
- As a user, I want to end a duo streak if it's no longer working

### Database Schema

```sql
-- New table: duo_streaks
CREATE TABLE duo_streaks (
    id VARCHAR(36) PRIMARY KEY,
    -- Always store with identity_id_a < identity_id_b (same pattern as friendships)
    identity_id_a VARCHAR(36) NOT NULL,
    identity_id_b VARCHAR(36) NOT NULL,
    streak_type VARCHAR(20) NOT NULL,  -- 'fasting', 'workout', 'any_activity'
    current_count INTEGER NOT NULL DEFAULT 0,
    longest_count INTEGER NOT NULL DEFAULT 0,
    last_mutual_date DATE,  -- Last date BOTH completed
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,  -- NULL = active
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_duo_streak_order CHECK (identity_id_a < identity_id_b),
    UNIQUE(identity_id_a, identity_id_b, streak_type)
);

CREATE INDEX ix_duo_streaks_a ON duo_streaks(identity_id_a);
CREATE INDEX ix_duo_streaks_b ON duo_streaks(identity_id_b);
CREATE INDEX ix_duo_streaks_active ON duo_streaks(ended_at) WHERE ended_at IS NULL;

-- Track daily completion status for duo streaks
CREATE TABLE duo_streak_daily (
    id VARCHAR(36) PRIMARY KEY,
    duo_streak_id VARCHAR(36) NOT NULL REFERENCES duo_streaks(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    identity_id_a_completed BOOLEAN NOT NULL DEFAULT FALSE,
    identity_id_b_completed BOOLEAN NOT NULL DEFAULT FALSE,
    both_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(duo_streak_id, activity_date)
);

CREATE INDEX ix_duo_streak_daily_lookup ON duo_streak_daily(duo_streak_id, activity_date);
```

### ORM Models

```python
# apps/api/src/modules/social/orm.py

class DuoStreakType(str, enum.Enum):
    FASTING = "fasting"
    WORKOUT = "workout"
    ANY_ACTIVITY = "any_activity"


class DuoStreakORM(Base, TimestampMixin):
    """Shared streak between two users."""

    __tablename__ = "duo_streaks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identity_id_a: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    identity_id_b: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    streak_type: Mapped[DuoStreakType] = mapped_column(
        SQLEnum(DuoStreakType), nullable=False
    )
    current_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_mutual_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_duo_streaks_pair", "identity_id_a", "identity_id_b", "streak_type", unique=True),
        CheckConstraint("identity_id_a < identity_id_b", name="chk_duo_streak_order"),
    )


class DuoStreakDailyORM(Base):
    """Daily completion tracking for duo streaks."""

    __tablename__ = "duo_streak_daily"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    duo_streak_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("duo_streaks.id", ondelete="CASCADE"), nullable=False
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    identity_id_a_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    identity_id_b_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    both_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_duo_streak_daily_lookup", "duo_streak_id", "activity_date", unique=True),
    )
```

### Pydantic Models

```python
# apps/api/src/modules/social/models.py

class DuoStreakType(str, Enum):
    FASTING = "fasting"
    WORKOUT = "workout"
    ANY_ACTIVITY = "any_activity"


class DuoStreakCreate(BaseModel):
    partner_id: str
    streak_type: DuoStreakType = DuoStreakType.FASTING


class DuoStreak(BaseModel):
    id: str
    partner_id: str
    partner_username: str | None
    partner_display_name: str | None
    partner_avatar_url: str | None
    streak_type: DuoStreakType
    current_count: int
    longest_count: int
    last_mutual_date: date | None
    started_at: datetime
    ended_at: datetime | None

    # Today's status
    i_completed_today: bool
    partner_completed_today: bool
    at_risk: bool  # One completed, other hasn't

    model_config = ConfigDict(from_attributes=True)


class DuoStreakInvite(BaseModel):
    id: str
    from_user_id: str
    from_username: str | None
    from_display_name: str | None
    from_avatar_url: str | None
    streak_type: DuoStreakType
    created_at: datetime


class DuoStreakMilestone(BaseModel):
    duo_streak_id: str
    milestone_days: int  # 7, 14, 30, 60, 90, 180, 365
    reached_at: datetime
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/duo-streaks` | Create/invite duo streak |
| GET | `/api/v1/social/duo-streaks` | List active duo streaks |
| GET | `/api/v1/social/duo-streaks/invites` | Get pending invites |
| POST | `/api/v1/social/duo-streaks/invites/{id}/respond` | Accept/decline |
| GET | `/api/v1/social/duo-streaks/{id}` | Get duo streak details |
| DELETE | `/api/v1/social/duo-streaks/{id}` | End duo streak |
| GET | `/api/v1/social/duo-streaks/at-risk` | Get streaks at risk today |

### Service Methods

```python
# apps/api/src/modules/social/service.py

async def create_duo_streak_invite(
    self,
    identity_id: str,
    partner_id: str,
    streak_type: DuoStreakType,
) -> DuoStreak:
    """Send duo streak invite to a friend."""
    # Verify friendship exists
    friendship = await self._get_friendship_record(identity_id, partner_id)
    if not friendship or friendship.status != FriendshipStatus.ACCEPTED:
        raise ValueError("Can only start duo streaks with friends")

    # Check for existing active streak
    existing = await self._get_duo_streak(identity_id, partner_id, streak_type)
    if existing and not existing.ended_at:
        raise ValueError("Active duo streak already exists")

    # Create as pending invite
    # ...

async def record_duo_streak_activity(
    self,
    identity_id: str,
    activity_type: str,  # "fasting" or "workout"
) -> list[DuoStreak]:
    """
    Called when user completes activity. Updates all relevant duo streaks.
    Returns list of duo streaks that were updated.
    """
    today = date.today()
    updated_streaks = []

    # Get all active duo streaks for this user matching activity type
    duo_streaks = await self._get_active_duo_streaks(identity_id, activity_type)

    for duo_streak in duo_streaks:
        # Get or create daily record
        daily = await self._get_or_create_daily(duo_streak.id, today)

        # Mark this user as completed
        is_user_a = duo_streak.identity_id_a == identity_id
        if is_user_a:
            daily.identity_id_a_completed = True
        else:
            daily.identity_id_b_completed = True

        # Check if both completed
        if daily.identity_id_a_completed and daily.identity_id_b_completed:
            daily.both_completed = True

            # Update streak count
            duo_streak.current_count += 1
            duo_streak.last_mutual_date = today

            if duo_streak.current_count > duo_streak.longest_count:
                duo_streak.longest_count = duo_streak.current_count

            # Check for milestones
            await self._check_duo_streak_milestone(duo_streak)

        updated_streaks.append(duo_streak)

    await self._db.flush()
    return updated_streaks

async def check_duo_streak_breaks(self) -> None:
    """
    Scheduled job: Run at midnight to check for broken streaks.
    Called by a daily cron job.
    """
    yesterday = date.today() - timedelta(days=1)

    # Find streaks that didn't have mutual completion yesterday
    query = (
        select(DuoStreakORM)
        .where(
            DuoStreakORM.ended_at.is_(None),
            DuoStreakORM.current_count > 0,
        )
    )
    result = await self._db.execute(query)

    for duo_streak in result.scalars():
        daily = await self._get_daily(duo_streak.id, yesterday)

        if not daily or not daily.both_completed:
            # Streak broken - reset to 0
            duo_streak.current_count = 0

            # Send notification to both users
            await self._notify_streak_broken(duo_streak)

    await self._db.flush()
```

### Mobile Integration

```typescript
// apps/mobile/features/social/types.ts

export interface DuoStreak {
  id: string;
  partnerId: string;
  partnerUsername: string | null;
  partnerDisplayName: string | null;
  partnerAvatarUrl: string | null;
  streakType: 'fasting' | 'workout' | 'any_activity';
  currentCount: number;
  longestCount: number;
  lastMutualDate: string | null;
  startedAt: string;
  endedAt: string | null;
  iCompletedToday: boolean;
  partnerCompletedToday: boolean;
  atRisk: boolean;
}

// apps/mobile/features/social/hooks/useDuoStreaks.ts

export const duoStreakKeys = {
  all: ['duo-streaks'] as const,
  lists: () => [...duoStreakKeys.all, 'list'] as const,
  list: () => [...duoStreakKeys.lists()] as const,
  atRisk: () => [...duoStreakKeys.all, 'at-risk'] as const,
  invites: () => [...duoStreakKeys.all, 'invites'] as const,
  detail: (id: string) => [...duoStreakKeys.all, 'detail', id] as const,
};

export function useDuoStreaks() {
  return useQuery({
    queryKey: duoStreakKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<DuoStreak[]>('/social/duo-streaks');
      return data;
    },
  });
}

export function useDuoStreaksAtRisk() {
  return useQuery({
    queryKey: duoStreakKeys.atRisk(),
    queryFn: async () => {
      const { data } = await api.get<DuoStreak[]>('/social/duo-streaks/at-risk');
      return data;
    },
    // Refetch frequently to show real-time status
    refetchInterval: 60 * 1000, // 1 minute
  });
}

export function useCreateDuoStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { partnerId: string; streakType: string }) => {
      const { data: streak } = await api.post<DuoStreak>('/social/duo-streaks', {
        partner_id: data.partnerId,
        streak_type: data.streakType,
      });
      return streak;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: duoStreakKeys.lists() });
    },
  });
}
```

### Mobile Components

```tsx
// apps/mobile/features/social/components/DuoStreakCard.tsx

interface DuoStreakCardProps {
  streak: DuoStreak;
  onPress: () => void;
}

export function DuoStreakCard({ streak, onPress }: DuoStreakCardProps) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card backgroundColor={colors.card} padding="$4" borderRadius="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$3" alignItems="center">
            <Avatar url={streak.partnerAvatarUrl} size={48} />
            <YStack>
              <Text fontFamily="InterSemiBold" color={colors.text}>
                {streak.partnerDisplayName || streak.partnerUsername}
              </Text>
              <Text fontSize="$2" color={colors.textMuted}>
                {streak.streakType === 'fasting' ? 'Fasting' : 'Workout'} Duo
              </Text>
            </YStack>
          </XStack>

          <YStack alignItems="center">
            <XStack alignItems="center" gap="$1">
              <Fire size={20} color={streak.currentCount > 0 ? '#f97316' : colors.textMuted} />
              <Text
                fontSize="$6"
                fontFamily="InterBold"
                color={streak.currentCount > 0 ? '#f97316' : colors.textMuted}
              >
                {streak.currentCount}
              </Text>
            </XStack>
            <Text fontSize="$1" color={colors.textSubtle}>days</Text>
          </YStack>
        </XStack>

        {/* Today's Status */}
        <XStack marginTop="$3" gap="$2">
          <StatusBadge
            label="You"
            completed={streak.iCompletedToday}
          />
          <StatusBadge
            label={streak.partnerDisplayName?.split(' ')[0] || 'Partner'}
            completed={streak.partnerCompletedToday}
          />
        </XStack>

        {/* At Risk Warning */}
        {streak.atRisk && (
          <XStack
            marginTop="$2"
            backgroundColor="#fef3c7"
            padding="$2"
            borderRadius="$2"
            alignItems="center"
            gap="$2"
          >
            <Warning size={16} color="#d97706" />
            <Text fontSize="$2" color="#92400e">
              Waiting on {streak.iCompletedToday ? 'partner' : 'you'} to complete today!
            </Text>
          </XStack>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function StatusBadge({ label, completed }: { label: string; completed: boolean }) {
  return (
    <XStack
      flex={1}
      backgroundColor={completed ? '#dcfce7' : '#f3f4f6'}
      padding="$2"
      borderRadius="$2"
      alignItems="center"
      justifyContent="center"
      gap="$1"
    >
      {completed ? (
        <CheckCircle size={14} color="#16a34a" weight="fill" />
      ) : (
        <Circle size={14} color="#9ca3af" />
      )}
      <Text fontSize="$2" color={completed ? '#16a34a' : '#6b7280'}>
        {label}
      </Text>
    </XStack>
  );
}
```

### Integration Points

1. **TIME_KEEPER**: When fast completes, call `social_service.record_duo_streak_activity(identity_id, "fasting")`
2. **CONTENT** (workouts): When workout completes, call `social_service.record_duo_streak_activity(identity_id, "workout")`
3. **NOTIFICATION**: Send push when partner completes, when streak at risk, when streak breaks
4. **PROGRESSION**: Award bonus XP for duo streak milestones (7, 30, 100 days)

### Milestones & Rewards

| Days | Name | XP Bonus |
|------|------|----------|
| 7 | Week Warriors | 100 XP each |
| 14 | Fortnight Friends | 150 XP each |
| 30 | Monthly Masters | 300 XP each |
| 60 | Dynamic Duo | 500 XP each |
| 90 | Quarter Crew | 750 XP each |
| 180 | Half-Year Heroes | 1000 XP each |
| 365 | Yearly Yoke | 2000 XP each |

---

## 2. Activity Feed

**Impact:** High | **Effort:** Medium | **Module:** SOCIAL + EVENT_JOURNAL

### Overview

A social feed showing friends' activities (completed fasts, workouts, achievements, level-ups) with ability to react with a "Cheer" (single-tap engagement).

### User Stories

- As a user, I want to see what my friends are accomplishing to stay motivated
- As a user, I want to cheer my friends' achievements with one tap
- As a user, I want to control what activities I share to my feed
- As a user, I want to receive notifications when friends cheer me

### Database Schema

```sql
-- Activity feed items (denormalized for fast reads)
CREATE TABLE feed_items (
    id VARCHAR(36) PRIMARY KEY,
    identity_id VARCHAR(36) NOT NULL,  -- Who did the activity
    activity_type VARCHAR(50) NOT NULL,  -- 'fast_completed', 'workout_completed', 'achievement_unlocked', 'level_up', 'streak_milestone', 'duo_streak_milestone'
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(500),
    metadata JSONB,  -- Additional context (workout name, achievement icon, etc.)
    cheer_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Denormalized user data for fast display
    display_name VARCHAR(100),
    avatar_url VARCHAR(500)
);

CREATE INDEX ix_feed_items_identity ON feed_items(identity_id);
CREATE INDEX ix_feed_items_created ON feed_items(created_at DESC);

-- Cheers on feed items
CREATE TABLE feed_cheers (
    id VARCHAR(36) PRIMARY KEY,
    feed_item_id VARCHAR(36) NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
    identity_id VARCHAR(36) NOT NULL,  -- Who cheered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(feed_item_id, identity_id)
);

CREATE INDEX ix_feed_cheers_item ON feed_cheers(feed_item_id);
CREATE INDEX ix_feed_cheers_identity ON feed_cheers(identity_id);

-- User feed preferences
CREATE TABLE feed_preferences (
    identity_id VARCHAR(36) PRIMARY KEY,
    share_fasts BOOLEAN NOT NULL DEFAULT TRUE,
    share_workouts BOOLEAN NOT NULL DEFAULT TRUE,
    share_achievements BOOLEAN NOT NULL DEFAULT TRUE,
    share_level_ups BOOLEAN NOT NULL DEFAULT TRUE,
    share_streaks BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/social/feed` | Get friends' activity feed (paginated) |
| POST | `/api/v1/social/feed/{id}/cheer` | Cheer a feed item |
| DELETE | `/api/v1/social/feed/{id}/cheer` | Remove cheer |
| GET | `/api/v1/social/feed/my-activity` | Get own recent activity |
| GET | `/api/v1/social/feed/preferences` | Get feed sharing preferences |
| PATCH | `/api/v1/social/feed/preferences` | Update preferences |

### Feed Item Types

| Type | Title Template | Metadata |
|------|---------------|----------|
| `fast_completed` | "Completed a {duration}h fast" | `{ hours: 16, protocol: "16:8" }` |
| `workout_completed` | "Crushed {workout_name}" | `{ workout_id, duration_mins, calories }` |
| `achievement_unlocked` | "Unlocked {achievement_name}" | `{ achievement_id, icon, xp_reward }` |
| `level_up` | "Reached Level {level}" | `{ level, title, total_xp }` |
| `streak_milestone` | "{count}-day {type} streak!" | `{ streak_type, count }` |
| `duo_streak_milestone` | "{count}-day duo streak with {partner}!" | `{ duo_streak_id, partner_name }` |

### Mobile Components

```tsx
// apps/mobile/features/social/components/FeedItem.tsx

export function FeedItem({ item, onCheer }: FeedItemProps) {
  const { colors } = useAppTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleCheer = async () => {
    setIsAnimating(true);
    await onCheer(item.id);
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Card backgroundColor={colors.card} padding="$4" marginBottom="$3">
      <XStack gap="$3">
        <Avatar url={item.avatarUrl} size={44} />

        <YStack flex={1}>
          <Text fontFamily="InterSemiBold" color={colors.text}>
            {item.displayName}
          </Text>
          <Text color={colors.text}>{item.title}</Text>
          {item.subtitle && (
            <Text fontSize="$2" color={colors.textMuted}>{item.subtitle}</Text>
          )}

          <XStack marginTop="$2" justifyContent="space-between" alignItems="center">
            <Text fontSize="$1" color={colors.textSubtle}>
              {formatRelativeTime(item.createdAt)}
            </Text>

            <TouchableOpacity onPress={handleCheer} hitSlop={12}>
              <XStack alignItems="center" gap="$1">
                <Animated.View style={isAnimating && styles.bounce}>
                  <HandsClapping
                    size={20}
                    color={item.iCheered ? colors.teal : colors.textMuted}
                    weight={item.iCheered ? 'fill' : 'regular'}
                  />
                </Animated.View>
                {item.cheerCount > 0 && (
                  <Text fontSize="$2" color={colors.textMuted}>
                    {item.cheerCount}
                  </Text>
                )}
              </XStack>
            </TouchableOpacity>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
```

---

## 3. Quick Challenge Templates

**Impact:** High | **Effort:** Low | **Module:** SOCIAL

### Overview

Pre-built challenge templates that users can launch with one tap, reducing friction to start challenges with friends.

### Templates

| Template | Type | Duration | Goal | Description |
|----------|------|----------|------|-------------|
| 7-Day Fast Challenge | fasting_streak | 7 days | 7 fasts | Complete a fast every day for a week |
| Workout Week | workout_count | 7 days | 5 workouts | Complete 5 workouts in 7 days |
| XP Sprint | total_xp | 7 days | 1000 XP | Earn the most XP in a week |
| 30-Day Consistency | consistency | 30 days | 25 days | Log activity on 25 of 30 days |
| Fasting February | fasting_streak | 28 days | 20 fasts | Complete 20 fasts in February |
| Monthly Muscle | workout_count | 30 days | 20 workouts | Complete 20 workouts in a month |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/social/challenges/templates` | List available templates |
| POST | `/api/v1/social/challenges/from-template` | Create challenge from template |

### Request Model

```python
class CreateChallengeFromTemplate(BaseModel):
    template_id: str  # e.g., "7_day_fast"
    invite_friend_ids: list[str] = []  # Auto-invite these friends
    custom_name: str | None = None  # Override default name
    start_date: date | None = None  # Default: tomorrow
```

### Mobile Integration

```tsx
// One-tap challenge creation from friend profile
<AppButton
  onPress={() => createFromTemplate({
    templateId: '7_day_fast',
    inviteFriendIds: [friend.id],
  })}
>
  Challenge to 7-Day Fast
</AppButton>
```

---

## 4. Weekly Leaderboard Resets

**Impact:** High | **Effort:** Low | **Module:** SOCIAL

### Overview

Add weekly leaderboards alongside all-time leaderboards. Weekly leaderboards reset every Monday at midnight UTC, creating recurring engagement loops.

### Database Changes

```sql
-- Add week tracking to leaderboard queries
-- No new tables needed - computed from existing data

-- Optional: Cache weekly rankings for performance
CREATE TABLE weekly_leaderboard_cache (
    id VARCHAR(36) PRIMARY KEY,
    leaderboard_type VARCHAR(50) NOT NULL,
    week_start DATE NOT NULL,  -- Monday of the week
    identity_id VARCHAR(36) NOT NULL,
    rank INTEGER NOT NULL,
    value FLOAT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(leaderboard_type, week_start, identity_id)
);

CREATE INDEX ix_weekly_lb_lookup ON weekly_leaderboard_cache(leaderboard_type, week_start, rank);
```

### New Leaderboard Types

| Type | Period | Metric |
|------|--------|--------|
| `weekly_xp` | Current week (Mon-Sun) | XP earned this week |
| `weekly_workouts` | Current week | Workouts completed this week |
| `weekly_fasts` | Current week | Fasts completed this week |

### API Changes

```python
# Extend LeaderboardPeriod enum
class LeaderboardPeriod(str, Enum):
    ALL_TIME = "all_time"
    WEEK = "week"
    MONTH = "month"

# Update endpoint
GET /api/v1/social/leaderboards/{type}?period=week
```

### Weekly Champion Recognition

When weekly leaderboard resets:
1. Record previous week's #1 as "Weekly Champion"
2. Send push notification to champion
3. Award bonus XP (50 XP for weekly champion)
4. Show champion badge on their feed item

---

## 5. Achievement Reactions

**Impact:** Medium | **Effort:** Low | **Module:** SOCIAL + PROGRESSION

### Overview

When a friend unlocks an achievement, prompt users to send a "Celebrate" reaction that sends a push notification and awards small XP bonus.

### Database Schema

```sql
CREATE TABLE achievement_celebrations (
    id VARCHAR(36) PRIMARY KEY,
    user_achievement_id VARCHAR(36) NOT NULL,  -- The unlocked achievement
    achiever_id VARCHAR(36) NOT NULL,  -- Who unlocked it
    celebrator_id VARCHAR(36) NOT NULL,  -- Who celebrated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_achievement_id, celebrator_id)
);

CREATE INDEX ix_celebrations_achiever ON achievement_celebrations(achiever_id);
```

### Flow

1. User A unlocks achievement
2. Feed item created for friends
3. Friend B sees feed item with "Celebrate" button
4. B taps Celebrate
5. A receives push: "Sarah celebrated your achievement!"
6. Both A and B get 5 XP bonus

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/achievements/{user_achievement_id}/celebrate` | Celebrate friend's achievement |
| GET | `/api/v1/social/achievements/celebrations` | Get celebrations I've received |

---

## 6. Team Challenges

**Impact:** High | **Effort:** Medium-High | **Module:** SOCIAL

### Overview

Group challenges where 3-10 users form a team and compete against the challenge goal together. Team's combined progress counts toward victory.

### Database Schema

```sql
-- Extend challenges table
ALTER TABLE challenges ADD COLUMN is_team_challenge BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE challenges ADD COLUMN team_size_min INTEGER DEFAULT 1;
ALTER TABLE challenges ADD COLUMN team_size_max INTEGER DEFAULT 1;

-- Challenge teams
CREATE TABLE challenge_teams (
    id VARCHAR(36) PRIMARY KEY,
    challenge_id VARCHAR(36) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    join_code VARCHAR(8) NOT NULL UNIQUE,
    total_progress FLOAT NOT NULL DEFAULT 0,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_challenge_teams_challenge ON challenge_teams(challenge_id);

-- Update challenge_participants to support teams
ALTER TABLE challenge_participants ADD COLUMN team_id VARCHAR(36) REFERENCES challenge_teams(id);
CREATE INDEX ix_participants_team ON challenge_participants(team_id);
```

### Team Challenge Types

| Type | Goal | Team Calculation |
|------|------|------------------|
| `team_total_xp` | 5000 XP | Sum of all members' XP |
| `team_workout_count` | 50 workouts | Sum of all members' workouts |
| `team_fasting_hours` | 500 hours | Sum of all members' fasting hours |
| `team_consistency` | 90% days active | Average activity rate |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/social/challenges` | Create challenge (with `is_team_challenge=true`) |
| POST | `/api/v1/social/challenges/{id}/teams` | Create team within challenge |
| POST | `/api/v1/social/challenges/teams/{id}/join` | Join team |
| GET | `/api/v1/social/challenges/{id}/teams` | List teams in challenge |
| GET | `/api/v1/social/challenges/teams/{id}` | Get team details |

### Team Chat (Optional - Phase 2)

Simple in-team messaging for coordination:

```sql
CREATE TABLE team_messages (
    id VARCHAR(36) PRIMARY KEY,
    team_id VARCHAR(36) NOT NULL REFERENCES challenge_teams(id) ON DELETE CASCADE,
    identity_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_team_messages_team ON team_messages(team_id, created_at DESC);
```

---

## Implementation Priority

| # | Feature | Sprint | Dependencies |
|---|---------|--------|--------------|
| 1 | Duo Streaks | Sprint 1 | None |
| 2 | Activity Feed | Sprint 1 | None |
| 3 | Quick Challenge Templates | Sprint 1 | None |
| 4 | Weekly Leaderboard Resets | Sprint 2 | None |
| 5 | Achievement Reactions | Sprint 2 | Activity Feed |
| 6 | Team Challenges | Sprint 3 | None |

---

## Migration Plan

### Sprint 1 Migration

```python
"""add social engagement features sprint 1

Revision ID: xxx
"""

def upgrade() -> None:
    # Duo Streaks
    op.create_table('duo_streaks', ...)
    op.create_table('duo_streak_daily', ...)

    # Activity Feed
    op.create_table('feed_items', ...)
    op.create_table('feed_cheers', ...)
    op.create_table('feed_preferences', ...)

    # Challenge Templates (seed data)
    op.execute("""
        INSERT INTO challenge_templates (id, name, ...) VALUES
        ('7_day_fast', '7-Day Fast Challenge', ...),
        ...
    """)

def downgrade() -> None:
    op.drop_table('feed_preferences')
    op.drop_table('feed_cheers')
    op.drop_table('feed_items')
    op.drop_table('duo_streak_daily')
    op.drop_table('duo_streaks')
```

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Duo Streaks | % users with active duo streak | 30% of users with friends |
| Duo Streaks | Avg duo streak length | 14+ days |
| Activity Feed | Daily feed views | 2+ per active user |
| Activity Feed | Cheer rate | 15% of feed items get cheered |
| Challenge Templates | Challenge creation rate | +50% vs current |
| Weekly Leaderboards | Weekly active users | +20% |
| Achievement Reactions | Celebration rate | 25% of achievements celebrated |
| Team Challenges | Team participation | 20% of challenge participants |

---

## References

- [docs/features/social.md](social.md) - Existing social feature spec
- [docs/architecture/MODULES.md](../architecture/MODULES.md) - Module specifications
- [docs/architecture/PATTERNS.md](../architecture/PATTERNS.md) - Code patterns
