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

export type LeaderboardType =
  | 'global_xp'
  | 'global_streaks'
  | 'friends_xp'
  | 'friends_streaks'
  | 'challenge'
  // Activity count leaderboards with period filtering (Sprint 2)
  | 'global_workouts'
  | 'friends_workouts'
  | 'global_fasts'
  | 'friends_fasts';

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
  // Team challenge fields (Sprint 3)
  is_team_challenge: boolean;
  team_size_min: number | null;
  team_size_max: number | null;
  team_count: number | null;
  my_team_id: string | null;
  my_team_name: string | null;
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
  // Team fields (Sprint 3)
  team_id: string | null;
  team_name: string | null;
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
  // Team challenge fields (Sprint 3)
  is_team_challenge?: boolean;
  team_size_min?: number;
  team_size_max?: number;
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

/**
 * @deprecated Use theme tokens via useTheme() hook instead of hardcoded colors.
 * Status colors should map to:
 * - upcoming: theme.primary (Slate Blue)
 * - active: theme.success (Sage Green)
 * - completed: theme.colorMuted
 *
 * See ChallengeCard.tsx getStatusColors() for proper implementation.
 */
export const CHALLENGE_STATUS_COLORS: Record<ChallengeStatus, string> = {
  upcoming: '#3A5BA0', // theme.primary - Slate Blue
  active: '#4A9B7F', // theme.success - Sage Green
  completed: '#6B697A', // theme.colorMuted
};

export const LEADERBOARD_TYPE_LABELS: Record<LeaderboardType, string> = {
  global_xp: 'Global XP',
  global_streaks: 'Global Streaks',
  friends_xp: 'Friends XP',
  friends_streaks: 'Friends Streaks',
  challenge: 'Challenge',
  // Activity count leaderboards (Sprint 2)
  global_workouts: 'Global Workouts',
  friends_workouts: 'Friends Workouts',
  global_fasts: 'Global Fasts',
  friends_fasts: 'Friends Fasts',
};

// =========================================================================
// Duo Streaks
// =========================================================================

export type DuoStreakType = 'fasting' | 'workout' | 'combined';

export type DuoStreakInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface DuoStreak {
  id: string;
  initiator_id: string;
  partner_id: string;
  streak_type: DuoStreakType;
  current_streak: number;
  longest_streak: number;
  started_at: string;
  last_activity_date: string | null;
  ended_at: string | null;
  end_reason: string | null;
  // Partner info (denormalized for display)
  partner_username: string | null;
  partner_display_name: string | null;
  partner_avatar_url: string | null;
  // Daily status
  my_completed_today: boolean;
  partner_completed_today: boolean;
  // Milestones
  milestones: DuoStreakMilestone[];
}

export interface DuoStreakMilestone {
  id: string;
  duo_streak_id: string;
  milestone_days: number;
  xp_awarded: number;
  reached_at: string;
}

export interface DuoStreakInvite {
  id: string;
  inviter_id: string;
  invitee_id: string;
  streak_type: DuoStreakType;
  status: DuoStreakInviteStatus;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
  // Inviter info
  inviter_username: string | null;
  inviter_display_name: string | null;
  inviter_avatar_url: string | null;
}

export interface CreateDuoStreakRequest {
  partner_id: string;
  streak_type: DuoStreakType;
}

export interface RespondDuoStreakInviteRequest {
  accept: boolean;
}

export const DUO_STREAK_TYPE_LABELS: Record<DuoStreakType, string> = {
  fasting: 'Fasting',
  workout: 'Workout',
  combined: 'Combined',
};

export const DUO_STREAK_TYPE_ICONS: Record<DuoStreakType, string> = {
  fasting: 'timer',
  workout: 'barbell',
  combined: 'fire',
};

export const DUO_STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365] as const;

// =========================================================================
// Activity Feed
// =========================================================================

export type FeedActivityType =
  | 'fast_completed'
  | 'workout_completed'
  | 'achievement_unlocked'
  | 'level_up'
  | 'streak_milestone'
  | 'duo_streak_milestone';

export interface FeedItem {
  id: string;
  identity_id: string;
  activity_type: FeedActivityType;
  title: string;
  subtitle: string | null;
  metadata: Record<string, any> | null;
  cheer_count: number;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  i_cheered: boolean;
}

export interface FeedPreferences {
  share_fasts: boolean;
  share_workouts: boolean;
  share_achievements: boolean;
  share_level_ups: boolean;
  share_streaks: boolean;
  share_duo_streaks: boolean;
}

export interface UpdateFeedPreferencesParams {
  share_fasts?: boolean;
  share_workouts?: boolean;
  share_achievements?: boolean;
  share_level_ups?: boolean;
  share_streaks?: boolean;
  share_duo_streaks?: boolean;
}

export const FEED_ACTIVITY_TYPE_LABELS: Record<FeedActivityType, string> = {
  fast_completed: 'Completed Fast',
  workout_completed: 'Completed Workout',
  achievement_unlocked: 'Achievement Unlocked',
  level_up: 'Level Up',
  streak_milestone: 'Streak Milestone',
  duo_streak_milestone: 'Duo Streak Milestone',
};

export const FEED_ACTIVITY_TYPE_ICONS: Record<FeedActivityType, string> = {
  fast_completed: 'Fire',
  workout_completed: 'Barbell',
  achievement_unlocked: 'Trophy',
  level_up: 'Star',
  streak_milestone: 'Lightning',
  duo_streak_milestone: 'Users',
};

// =========================================================================
// Challenge Templates
// =========================================================================

export interface ChallengeTemplate {
  id: string;
  name: string;
  description: string | null;
  challenge_type: ChallengeType;
  duration_days: number;
  goal_value: number;
  goal_unit: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CreateChallengeFromTemplateParams {
  template_id: string;
  invite_friend_ids?: string[];
  custom_name?: string;
  start_date?: string; // ISO date string YYYY-MM-DD
}

export const CHALLENGE_TEMPLATE_ICONS: Record<string, string> = {
  fire: 'Fire',
  barbell: 'Barbell',
  trophy: 'Trophy',
  lightning: 'Lightning',
  target: 'Target',
  calendar: 'Calendar',
};

// =========================================================================
// Achievement Celebrations (Sprint 2)
// =========================================================================

export interface AchievementCelebration {
  id: string;
  user_achievement_id: string;
  celebrator_identity_id: string;
  celebrator_username: string | null;
  celebrator_display_name: string | null;
  celebrator_avatar_url: string | null;
  created_at: string;
}

export interface CelebrateAchievementResponse {
  celebration: AchievementCelebration;
  xp_awarded_celebrator: number;
  xp_awarded_achiever: number;
  message: string;
}

export interface AchievementCelebrationList {
  user_achievement_id: string;
  celebrations: AchievementCelebration[];
  total_count: number;
}

// =========================================================================
// Team Challenges (Sprint 3)
// =========================================================================

export interface ChallengeTeam {
  id: string;
  challenge_id: string;
  name: string;
  created_by: string;
  creator_username: string | null;
  creator_display_name: string | null;
  join_code: string;
  total_progress: number;
  member_count: number;
  rank: number | null;
  created_at: string;
  members: ChallengeParticipant[] | null;
}

export interface ChallengeTeamLeaderboard {
  challenge_id: string;
  teams: ChallengeTeam[];
  total_teams: number;
}

export interface CreateTeamParams {
  name: string;
}

export interface JoinTeamParams {
  join_code: string;
}

export interface JoinTeamResponse {
  team: ChallengeTeam;
  challenge: Challenge;
  message: string;
}
