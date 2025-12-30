/**
 * Workout types matching backend CONTENT module
 */

// Enums
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutType = 'hiit' | 'strength' | 'cardio' | 'flexibility' | 'recovery';
export type SessionStatus = 'active' | 'completed' | 'abandoned';

// Core types
export interface WorkoutCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  workout_count: number;
}

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  duration_seconds: number;
  rest_seconds: number;
  video_url: string | null;
  thumbnail_url: string | null;
  calories_per_minute: number;
  order: number;
}

export interface Workout {
  id: string;
  name: string;
  description: string | null;
  workout_type: WorkoutType;
  difficulty: DifficultyLevel;
  duration_minutes: number;
  calories_estimate: number;
  thumbnail_url: string | null;
  video_url: string | null;
  category_id: string | null;
  category: WorkoutCategory | null;
  exercises: Exercise[];
  equipment_needed: string[];
  is_featured: boolean;
  is_premium: boolean;
  times_completed: number;
  average_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSession {
  id: string;
  identity_id: string;
  workout_id: string;
  workout: Workout | null;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  calories_burned: number | null;
  xp_earned: number;
}

export interface WorkoutRecommendation {
  workout: Workout;
  reason: string;
  score: number;
}

export interface WorkoutStats {
  total_workouts: number;
  total_duration_minutes: number;
  total_calories_burned: number;
  favorite_workout_type: WorkoutType | null;
  current_week_workouts: number;
  average_workout_duration: number;
}

// Request types
export interface WorkoutFilter {
  workout_type?: WorkoutType;
  difficulty?: DifficultyLevel;
  category_id?: string;
  min_duration?: number;
  max_duration?: number;
  is_featured?: boolean;
  search?: string;
}

export interface StartWorkoutRequest {
  workout_id: string;
}

export interface CompleteWorkoutRequest {
  calories_burned?: number;
}
