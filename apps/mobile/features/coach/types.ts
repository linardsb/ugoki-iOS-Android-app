/**
 * Coach types matching backend AI_COACH module
 */

// Enums
export type MessageRole = 'user' | 'assistant' | 'system';
export type CoachPersonality = 'motivational' | 'calm' | 'tough' | 'friendly';

// Core types
export interface ChatMessage {
  id: string; // Client-generated for UI
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface CoachResponse {
  message: string;
  suggestions: string[];
  workout_recommendation: string | null;
  encouragement: string | null;
}

export interface QuickAction {
  label: string;
  action: string; // e.g., "start_fast", "start_workout", "log_weight"
  description: string | null;
}

export interface ChatResponseFull {
  response: CoachResponse;
  context_summary: string | null;
  quick_actions: QuickAction[];
}

export interface UserContext {
  identity_id: string;
  current_level: number;
  total_xp: number;
  fasting_streak: number;
  workout_streak: number;
  active_fast: boolean;
  fast_elapsed_hours: number | null;
  fast_target_hours: number | null;
  last_workout_date: string | null;
  workouts_this_week: number;
  current_weight: number | null;
  weight_trend: 'up' | 'down' | 'stable' | null;
  personality: CoachPersonality;
}

export interface CoachingInsight {
  title: string;
  content: string;
  category: 'fasting' | 'workout' | 'nutrition' | 'motivation';
  priority: number;
}

// Request types
export interface ChatRequest {
  message: string;
  personality?: CoachPersonality;
}

// Personality display info
export interface PersonalityInfo {
  id: CoachPersonality;
  name: string;
  description: string;
  iconName: 'Sparkle' | 'Mountains' | 'Anchor' | 'SmileyWink';
}

export const PERSONALITIES: PersonalityInfo[] = [
  {
    id: 'motivational',
    name: 'Motivational',
    description: 'Energetic and encouraging',
    iconName: 'Sparkle',
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Zen and mindful approach',
    iconName: 'Mountains',
  },
  {
    id: 'tough',
    name: 'Tough',
    description: 'Drill sergeant style',
    iconName: 'Anchor',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Casual supportive friend',
    iconName: 'SmileyWink',
  },
];
