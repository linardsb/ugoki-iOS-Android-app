/**
 * Leaderboards Hooks
 * React Query hooks for leaderboards
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { Leaderboard, LeaderboardType, LeaderboardPeriod } from '../types';

// =========================================================================
// Get Leaderboard
// =========================================================================

export function useLeaderboard(
  type: LeaderboardType,
  period: LeaderboardPeriod = 'week',
  limit = 100
) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.leaderboard(type, period),
    queryFn: async (): Promise<Leaderboard> => {
      const response = await apiClient.get(`/social/leaderboards/${type}`, {
        params: { identity_id: identity?.id, period, limit },
      });
      return response.data;
    },
    enabled: !!identity?.id,
    // Leaderboards can be cached longer since they update less frequently
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =========================================================================
// Convenience Hooks for Common Leaderboards
// =========================================================================

export function useGlobalXPLeaderboard(period: LeaderboardPeriod = 'week') {
  return useLeaderboard('global_xp', period);
}

export function useGlobalStreaksLeaderboard(period: LeaderboardPeriod = 'week') {
  return useLeaderboard('global_streaks', period);
}

export function useFriendsXPLeaderboard(period: LeaderboardPeriod = 'week') {
  return useLeaderboard('friends_xp', period);
}

export function useFriendsStreaksLeaderboard(period: LeaderboardPeriod = 'week') {
  return useLeaderboard('friends_streaks', period);
}
