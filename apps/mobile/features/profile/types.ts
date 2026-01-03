// Profile module types - matches backend profile module schemas

export type GoalType =
  | 'weight_loss'
  | 'weight_gain'
  | 'muscle_gain'
  | 'maintain_weight'
  | 'improve_fitness'
  | 'increase_energy'
  | 'better_sleep'
  | 'reduce_stress';

export type Gender = 'male' | 'female';

export type UnitSystem = 'metric' | 'imperial';

export type FastingProtocol = '16:8' | '18:6' | '20:4' | '24:0' | 'custom';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

// User Profile
export interface UserProfile {
  identity_id: string;
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: Gender;
  height_cm?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileRequest {
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
}

export interface UpdateProfileRequest {
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: Gender;
  height_cm?: number;
}

// User Goals
export interface UserGoals {
  identity_id: string;
  primary_goal?: GoalType;
  secondary_goals?: GoalType[];
  starting_weight_kg?: number;
  target_weight_kg?: number;
  target_date?: string;
  target_body_fat_percent?: number;
  target_muscle_mass_kg?: number;
  weekly_workout_goal?: number;
  daily_step_goal?: number;
  weekly_fasting_goal?: number;
  target_fasting_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateGoalsRequest {
  primary_goal?: GoalType;
  secondary_goals?: GoalType[];
  starting_weight_kg?: number;
  target_weight_kg?: number;
  target_date?: string;
  target_body_fat_percent?: number;
  target_muscle_mass_kg?: number;
  weekly_workout_goal?: number;
  daily_step_goal?: number;
  weekly_fasting_goal?: number;
  target_fasting_hours?: number;
}

// User Preferences
export interface UserPreferences {
  identity_id: string;
  unit_system: UnitSystem;
  timezone: string;
  language: string;
  default_fasting_protocol: FastingProtocol;
  custom_fast_hours?: number;
  eating_window_start: string; // HH:MM:SS format
  eating_window_end: string;
  preferred_workout_time: string;
  workout_reminder_enabled: boolean;
  preferred_workout_types: string[];
  dark_mode: boolean;
  haptic_feedback: boolean;
  sound_effects: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesRequest {
  unit_system?: UnitSystem;
  timezone?: string;
  language?: string;
  default_fasting_protocol?: FastingProtocol;
  custom_fast_hours?: number;
  eating_window_start?: string;
  eating_window_end?: string;
  preferred_workout_time?: string;
  workout_reminder_enabled?: boolean;
  preferred_workout_types?: string[];
  dark_mode?: boolean;
  haptic_feedback?: boolean;
  sound_effects?: boolean;
}

// Workout Restrictions (includes fitness level)
export interface WorkoutRestrictions {
  identity_id: string;
  fitness_level: FitnessLevel;
  max_workout_duration_minutes?: number;
  injuries?: string[];
  excluded_exercises?: string[];
  home_equipment?: string[];
  created_at: string;
  updated_at: string;
}

export interface UpdateWorkoutRestrictionsRequest {
  fitness_level?: FitnessLevel;
  max_workout_duration_minutes?: number;
  injuries?: string[];
  excluded_exercises?: string[];
  home_equipment?: string[];
}

// Onboarding Status
export interface OnboardingStatus {
  identity_id: string;
  basic_profile_completed: boolean;
  goals_set: boolean;
  health_profile_completed: boolean;
  dietary_preferences_set: boolean;
  workout_restrictions_set: boolean;
  notifications_configured: boolean;
  bloodwork_uploaded: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Complete Profile (aggregated)
export interface CompleteProfile {
  profile: UserProfile;
  preferences: UserPreferences;
  goals?: UserGoals;
  workout_restrictions?: WorkoutRestrictions;
  onboarding: OnboardingStatus;
}
