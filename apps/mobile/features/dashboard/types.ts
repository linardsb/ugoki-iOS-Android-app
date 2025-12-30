// Dashboard types - aggregates data from progression, metrics, and content modules

// Progression types
export type StreakType = 'fasting' | 'workout' | 'logging' | 'app_usage';

export interface Streak {
  id: string;
  identity_id: string;
  streak_type: StreakType;
  current_count: number;
  longest_count: number;
  last_activity_date: string;
  started_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserLevel {
  identity_id: string;
  current_level: number;
  current_xp: number;
  xp_for_next_level: number;
  xp_progress_percent: number;
  total_xp_earned: number;
  title: string;
}

export type AchievementType = 'streak' | 'fasting' | 'workout' | 'weight' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  achievement_type: AchievementType;
  xp_reward: number;
  icon?: string;
  requirement_value: number;
  is_hidden: boolean;
}

export interface UserAchievement {
  id: string;
  identity_id: string;
  achievement_id: string;
  achievement: Achievement;
  unlocked_at: string | null;
  progress: number;
  is_unlocked: boolean;
}

export interface UserProgression {
  identity_id: string;
  level: UserLevel;
  streaks: Streak[];
  recent_achievements: UserAchievement[];
  total_achievements: number;
}

// Metrics types
export interface Metric {
  id: string;
  identity_id: string;
  metric_type: string;
  value: number;
  timestamp: string;
  source: string;
  note?: string;
  unit?: string;
  reference_low?: number;
  reference_high?: number;
  flag?: 'low' | 'normal' | 'high' | 'abnormal';
  created_at: string;
  updated_at: string;
}

export type TrendDirection = 'up' | 'down' | 'stable';

export interface MetricTrend {
  direction: TrendDirection;
  change_absolute: number;
  change_percent: number;
  period_days: number;
  start_value: number;
  end_value: number;
  data_points: number;
}

export interface MetricSummary {
  metric_type: string;
  latest_value: number;
  latest_timestamp: string;
  min_value: number;
  max_value: number;
  avg_value: number;
  total_entries: number;
}

// Content/Workout types
export interface WorkoutStats {
  total_workouts: number;
  total_duration_minutes: number;
  total_calories_burned: number;
  favorite_workout_type: string;
  current_week_workouts: number;
  average_workout_duration: number;
}

// Dashboard summary - combined view
export interface DashboardSummary {
  progression: UserProgression | null;
  weightTrend: MetricTrend | null;
  latestWeight: Metric | null;
  workoutStats: WorkoutStats | null;
}
