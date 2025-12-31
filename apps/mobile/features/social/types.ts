/**
 * Social Module Types
 * Matches backend src/modules/social/models.py
 */

// =========================================================================
// Enums
// =========================================================================

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type ChallengeType = 'fasting_streak' | 'workout_count' | 'total_xp' | 'consistency';

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';

export type LeaderboardType = 'global_xp' | 'global_streaks' | 'friends_xp' | 'friends_streaks' | 'challenge';

export type LeaderboardPeriod = 'week' | 'month' | 'all_time';

// =========================================================================
// Core Models
// =========================================================================

export interface Friendship {
  id: string;
  friend_id: string;
  friend_username: string | null;
  friend_display_name: string | null;
  friend_avatar_url: string | null;
  friend_level: number | null;
  status: FriendshipStatus;
  requested_by_me: boolean;
  created_at: string;
  accepted_at: string | null;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: number | null;
  created_at: string;
}

export interface Follow {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: number | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  challenge_type: ChallengeType;
  goal_value: number;
  goal_unit: string | null;
  start_date: string;
  end_date: string;
  created_by: string;
  creator_username: string | null;
  join_code: string;
  is_public: boolean;
  max_participants: number;
  participant_count: number;
  status: ChallengeStatus;
  my_progress: number | null;
  my_rank: number | null;
  is_participating: boolean;
  days_remaining: number | null;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  identity_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  current_progress: number;
  completed: boolean;
  completed_at: string | null;
  rank: number | null;
  joined_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  identity_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  value: number;
  is_current_user: boolean;
}

export interface Leaderboard {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  my_rank: number | null;
  my_value: number | null;
  total_participants: number;
  updated_at: string;
}

export interface PublicUserProfile {
  identity_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  level: number | null;
  title: string | null;
  streaks: Record<string, number> | null;
  achievement_count: number | null;
  is_friend: boolean;
  is_following: boolean;
  is_followed_by: boolean;
  friendship_status: FriendshipStatus | null;
}

export interface ShareContent {
  title: string;
  message: string;
  image_url: string | null;
  deep_link: string | null;
}

// =========================================================================
// Request Types
// =========================================================================

export interface SendFriendRequestParams {
  friend_code?: string;
  username?: string;
}

export interface RespondFriendRequestParams {
  accept: boolean;
}

export interface CreateChallengeParams {
  name: string;
  description?: string;
  challenge_type: ChallengeType;
  goal_value: number;
  goal_unit?: string;
  start_date: string;
  end_date: string;
  is_public?: boolean;
  max_participants?: number;
}

export interface GenerateShareContentParams {
  share_type: 'achievement' | 'streak' | 'level_up' | 'workout' | 'challenge_win';
  related_id?: string;
  custom_message?: string;
}

// =========================================================================
// UI Helper Types
// =========================================================================

export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  fasting_streak: 'Fasting Streak',
  workout_count: 'Workout Count',
  total_xp: 'Total XP',
  consistency: 'Consistency',
};

export const CHALLENGE_TYPE_UNITS: Record<ChallengeType, string> = {
  fasting_streak: 'days',
  workout_count: 'workouts',
  total_xp: 'XP',
  consistency: 'days',
};

export const CHALLENGE_STATUS_COLORS: Record<ChallengeStatus, string> = {
  upcoming: '#3b82f6', // blue
  active: '#22c55e', // green
  completed: '#6b7280', // gray
};

export const LEADERBOARD_TYPE_LABELS: Record<LeaderboardType, string> = {
  global_xp: 'Global XP',
  global_streaks: 'Global Streaks',
  friends_xp: 'Friends XP',
  friends_streaks: 'Friends Streaks',
  challenge: 'Challenge',
};
