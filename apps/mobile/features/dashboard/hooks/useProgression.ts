import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { UserProgression, UserLevel, Streak, UserAchievement } from '../types';

/**
 * Hook to get complete progression overview (level, streaks, achievements).
 * This is the main hook for dashboard data.
 */
export function useProgression() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async (): Promise<UserProgression> => {
      const response = await apiClient.get<UserProgression>('/progression/overview');
      return response.data;
    },
    staleTime: 60 * 1000, // Fresh for 1 minute
  });
}

/**
 * Hook to get just the user's level.
 */
export function useUserLevel() {
  return useQuery({
    queryKey: queryKeys.progression.level(),
    queryFn: async (): Promise<UserLevel> => {
      const response = await apiClient.get<UserLevel>('/progression/level');
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to get all active streaks.
 */
export function useStreaks() {
  return useQuery({
    queryKey: queryKeys.progression.streaks(),
    queryFn: async (): Promise<Streak[]> => {
      const response = await apiClient.get<Streak[]>('/progression/streaks');
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to get user's achievements.
 */
export function useAchievements(unlockedOnly: boolean = false) {
  return useQuery({
    queryKey: queryKeys.progression.achievements(),
    queryFn: async (): Promise<UserAchievement[]> => {
      const response = await apiClient.get<UserAchievement[]>('/progression/achievements/mine', {
        params: { unlocked_only: unlockedOnly },
      });
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}
