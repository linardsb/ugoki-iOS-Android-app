/**
 * Activity Feed Types
 * Types for the EVENT_JOURNAL activity feed
 */

export type EventCategory =
  | 'auth'
  | 'fasting'
  | 'workout'
  | 'progression'
  | 'profile'
  | 'metrics'
  | 'coach'
  | 'content';

export type EventType =
  // Auth
  | 'identity_created'
  | 'login'
  | 'logout'
  // Fasting
  | 'fast_started'
  | 'fast_paused'
  | 'fast_resumed'
  | 'fast_completed'
  | 'fast_abandoned'
  | 'fast_extended'
  // Workout
  | 'workout_started'
  | 'workout_completed'
  | 'workout_abandoned'
  // Progression
  | 'xp_earned'
  | 'level_up'
  | 'streak_incremented'
  | 'streak_reset'
  | 'achievement_unlocked'
  // Profile
  | 'profile_created'
  | 'profile_updated'
  | 'goals_updated'
  | 'preferences_updated'
  // Metrics
  | 'weight_logged'
  | 'biomarker_uploaded'
  | 'metric_recorded'
  // Coach
  | 'coach_message_sent'
  | 'coach_insight_viewed'
  // Content
  | 'recipe_saved'
  | 'recipe_unsaved';

export interface ActivityEvent {
  id: string;
  identity_id: string;
  event_type: EventType;
  category: EventCategory;
  timestamp: string;
  related_id: string | null;
  related_type: string | null;
  source: 'api' | 'mobile' | 'web' | 'scheduled' | 'system';
  metadata: Record<string, any>;
  description: string | null;
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  event_type: EventType;
  category: EventCategory;
  timestamp: string;
  title: string;
  description: string | null;
  icon: string;
  metadata: Record<string, any>;
}

export interface ActivitySummary {
  total_events: number;
  events_by_category: Record<string, number>;
  events_by_type: Record<string, number>;
  period_start: string;
  period_end: string;
}

// Category colors for UI
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  auth: '#6366f1', // indigo
  fasting: '#14b8a6', // teal (primary)
  workout: '#f97316', // orange (secondary)
  progression: '#eab308', // yellow
  profile: '#8b5cf6', // violet
  metrics: '#06b6d4', // cyan
  coach: '#ec4899', // pink
  content: '#22c55e', // green
};

// Category labels for UI
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  auth: 'Account',
  fasting: 'Fasting',
  workout: 'Workout',
  progression: 'Progress',
  profile: 'Profile',
  metrics: 'Metrics',
  coach: 'Coach',
  content: 'Content',
};
