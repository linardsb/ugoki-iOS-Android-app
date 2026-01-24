# Feature: Notifications

Push notifications, in-app alerts, and device token management for user engagement and fasting reminders.

---

## Overview

The Notifications system handles push notifications via Expo Push Service, in-app alert delivery, and notification preferences. Users receive alerts for fasting window completions, workout reminders, achievements, coach messages, and social events. All notifications are stored for history and can be marked as read. Device tokens are managed securely for multi-device support.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Push Service | Expo Push |
| Tests | Partial |

---

## User Stories

- As a user, I want to receive reminders when my fasting window is about to end so that I don't miss my goal
- As a user, I want to get notified when a friend adds me so that I can respond
- As a user, I want to mute notifications so that I'm not disturbed during sleep
- As a user, I want to see a history of notifications so that I can review past alerts
- As a user, I want to mark notifications as read so that I only see new ones
- As a user, I want to enable/disable specific notification types so that I control what I receive

---

## API Endpoints

### Notifications List

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/notifications` | List user notifications (paginated, newest first) | Yes |
| GET | `/api/v1/notifications/unread-count` | Get count of unread notifications | Yes |

### Notification Actions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/notifications/{id}/read` | Mark single notification as read | Yes |
| POST | `/api/v1/notifications/read-all` | Mark all notifications as read | Yes |
| POST | `/api/v1/notifications/send` | Send notification to user (admin/system) | Yes |

### Device Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/notifications/devices` | Register device token | Yes |
| GET | `/api/v1/notifications/devices` | List user's registered devices | Yes |
| DELETE | `/api/v1/notifications/devices/{token}` | Unregister device token | Yes |

### Preferences

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/notifications/preferences` | Get notification preferences | Yes |
| PATCH | `/api/v1/notifications/preferences` | Update notification preferences | Yes |
| GET | `/api/v1/notifications/stats` | Get notification statistics | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/modules/notification/service.py` | Notification creation and delivery |
| `apps/api/src/modules/notification/routes.py` | Notification endpoints |
| `apps/api/src/modules/notification/models.py` | Pydantic models |
| `apps/api/src/modules/notification/orm.py` | Database models |
| `apps/api/src/modules/notification/expo_client.py` | Expo Push Service client |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/notifications/hooks/useNotifications.ts` | React Query notification hooks |
| `apps/mobile/features/notifications/components/NotificationBell.tsx` | Notification icon badge |
| `apps/mobile/shared/api/expo-notifications.ts` | Expo notifications setup |
| `apps/mobile/features/notifications/screens/NotificationCenter.tsx` | Notification history screen |

---

## Data Models

### Notification

```typescript
interface Notification {
  id: string;
  identity_id: string;
  title: string;
  body: string;
  type: "fasting" | "workout" | "achievement" | "coach" | "social" | "system";
  action_url: string | null; // Deep link if clickable
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}
```

### Device Token

```typescript
interface DeviceToken {
  id: string;
  identity_id: string;
  expo_push_token: string;
  device_name: string; // e.g., "iPhone 15"
  os: "ios" | "android";
  app_version: string;
  created_at: string;
  last_used_at: string;
}
```

### Notification Preferences

```typescript
interface NotificationPreferences {
  id: string;
  identity_id: string;
  enabled: boolean;
  fasting_reminders: boolean; // 30 min before end
  workout_reminders: boolean;
  achievement_alerts: boolean;
  coach_messages: boolean;
  social_alerts: boolean;
  quiet_hours_start: "HH:MM"; // e.g., "22:00"
  quiet_hours_end: "HH:MM"; // e.g., "08:00"
  quiet_hours_enabled: boolean;
  created_at: string;
}
```

### Notification Statistics

```typescript
interface NotificationStats {
  total_count: number;
  unread_count: number;
  by_type: {
    fasting: number;
    workout: number;
    achievement: number;
    coach: number;
    social: number;
    system: number;
  };
  last_notification_at: string | null;
}
```

---

## Database Schema

```sql
-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL REFERENCES identities(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  INDEX idx_identity_created (identity_id, created_at DESC),
  INDEX idx_is_read (identity_id, is_read)
);

-- Device Tokens
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL REFERENCES identities(id),
  expo_push_token VARCHAR NOT NULL UNIQUE,
  device_name TEXT,
  os VARCHAR,
  app_version VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  INDEX idx_identity (identity_id)
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE REFERENCES identities(id),
  enabled BOOLEAN DEFAULT true,
  fasting_reminders BOOLEAN DEFAULT true,
  workout_reminders BOOLEAN DEFAULT true,
  achievement_alerts BOOLEAN DEFAULT true,
  coach_messages BOOLEAN DEFAULT true,
  social_alerts BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Notification Types

### Fasting Reminders
- **Trigger:** 30 minutes before fasting window end time
- **Message:** "Your fasting window ends in 30 minutes!"
- **Action:** Navigate to fasting tab

### Workout Reminders
- **Trigger:** Daily at preferred time (configurable)
- **Message:** "Ready for your workout?"
- **Action:** Navigate to workout library

### Achievement Alerts
- **Trigger:** User earns new achievement
- **Message:** "🎉 Achievement unlocked: 7-Day Streak"
- **Action:** Navigate to progression/achievements

### Coach Messages
- **Trigger:** AI Coach sends direct message
- **Message:** "Coach has a new message for you"
- **Action:** Navigate to coach chat

### Social Alerts
- **Trigger:** Friend added you, joined challenge, completed challenge
- **Message:** "Friend added you" / "Challenge started" / "Challenge completed"
- **Action:** Navigate to social/leaderboards

### System Notifications
- **Trigger:** App updates, maintenance, announcements
- **Message:** Varies
- **Action:** Navigate to settings or open deep link

---

## Business Logic

### Push Notification Delivery
1. Backend event triggered (fasting end, achievement unlocked, etc.)
2. Service creates Notification record in database
3. Service fetches all active device tokens for user
4. Service calls Expo Push Service API for each token
5. Expo Push Service delivers to iOS/Android app
6. Mobile app receives and displays local notification

### Quiet Hours
- Notifications disabled between `quiet_hours_start` and `quiet_hours_end`
- Badge count still increments (unread count)
- Notifications queued and shown after quiet hours end
- Only affects push notifications; in-app still visible

### Device Token Lifecycle
- Token registered when user logs in on new device
- Token deleted when user logs out
- Token marked as inactive if delivery fails 3 times
- Old tokens cleaned up after 30 days of inactivity

### Read Status Tracking
- Notification marked as read when user:
  - Clicks notification
  - Views notification in notification center
  - Calls /read or /read-all endpoint
- `read_at` timestamp recorded for analytics

---

## Security & Privacy

### Token Management
- Expo Push tokens never logged in plaintext
- Tokens stored encrypted in database
- Tokens tied to device OS and app version
- Tokens rotated on device factory reset

### Notification Content
- No sensitive data (passwords, PII) in notifications
- Generic messages used (e.g., "You have a message" not actual message content)
- Deep links validated to prevent phishing

### Rate Limiting
- Max 5 notifications per hour per user per type
- Burst allowed for system critical alerts
- Rate limits enforced per device

---

## Known Issues

None currently tracked.

---

## Future Enhancements

- [ ] SMS notifications as fallback
- [ ] Email digest summaries
- [ ] Scheduled notifications (send at preferred time)
- [ ] Rich notifications with images
- [ ] Notification actions (reply, snooze, etc.)
- [ ] Notification templates and personalization
- [ ] Analytics dashboard for engagement metrics

---

## References

- **PRD Section:** [PRD.md](../product/PRD.md)
- **Module Spec:** [MODULES.md#notification](../architecture/MODULES.md#notification-module)
- **Expo Push:** [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- **Security:** [SECURITY.md](../standards/SECURITY.md)
