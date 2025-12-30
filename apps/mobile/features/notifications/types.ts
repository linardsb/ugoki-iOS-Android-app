// Notification module types - matches backend notification module schemas

export interface DeviceToken {
  id: string;
  identity_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface RegisterDeviceRequest {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface NotificationPreferences {
  identity_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;

  // Category preferences
  fasting_notifications: boolean;
  workout_notifications: boolean;
  streak_notifications: boolean;
  achievement_notifications: boolean;
  motivational_notifications: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string;

  // Daily motivation time
  daily_motivation_time?: string;
}

export interface UpdateNotificationPreferencesRequest {
  push_enabled?: boolean;
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  fasting_notifications?: boolean;
  workout_notifications?: boolean;
  streak_notifications?: boolean;
  achievement_notifications?: boolean;
  motivational_notifications?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  daily_motivation_time?: string;
}
