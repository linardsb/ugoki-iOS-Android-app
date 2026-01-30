/**
 * Hooks for achievement celebrations
 * Sprint 2: Social Engagement - Achievement Reactions
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import {
  AchievementCelebration,
  AchievementCelebrationList,
  CelebrateAchievementResponse,
} from '../types';

// =========================================================================
// Query Keys
// =========================================================================

export const celebrationKeys = {
  all: ['celebrations'] as const,
  lists: () => [...celebrationKeys.all, 'list'] as const,
  list: (userAchievementId: string) =>
    [...celebrationKeys.lists(), userAchievementId] as const,
};

// =========================================================================
// Queries
// =========================================================================

/**
 * Get all celebrations for a specific achievement
 */
export function useAchievementCelebrations(userAchievementId: string) {
  return useQuery({
    queryKey: celebrationKeys.list(userAchievementId),
    queryFn: async () => {
      const { data } = await api.get<AchievementCelebrationList>(
        `/social/achievements/${userAchievementId}/celebrations`
      );
      return data;
    },
    enabled: !!userAchievementId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =========================================================================
// Mutations
// =========================================================================

/**
 * Celebrate a friend's achievement
 *
 * Awards 5 XP to both the celebrator and the achiever.
 * Each user can only celebrate an achievement once.
 */
export function useCelebrateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userAchievementId: string) => {
      const { data } = await api.post<CelebrateAchievementResponse>(
        `/social/achievements/${userAchievementId}/celebrate`
      );
      return data;
    },
    onMutate: async (userAchievementId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: celebrationKeys.list(userAchievementId),
      });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<AchievementCelebrationList>(
        celebrationKeys.list(userAchievementId)
      );

      return { previousData };
    },
    onSuccess: (data, userAchievementId) => {
      // Update the celebrations list with the new celebration
      queryClient.setQueryData<AchievementCelebrationList>(
        celebrationKeys.list(userAchievementId),
        (old) => {
          if (!old) {
            return {
              user_achievement_id: userAchievementId,
              celebrations: [data.celebration],
              total_count: 1,
            };
          }
          return {
            ...old,
            celebrations: [data.celebration, ...old.celebrations],
            total_count: old.total_count + 1,
          };
        }
      );

      // Invalidate feed to reflect updated celebration counts
      queryClient.invalidateQueries({ queryKey: ['feed'] });

      // Invalidate user's XP/progression data
      queryClient.invalidateQueries({ queryKey: ['progression'] });
      queryClient.invalidateQueries({ queryKey: ['user-level'] });
    },
    onError: (err, userAchievementId, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(
          celebrationKeys.list(userAchievementId),
          context.previousData
        );
      }
    },
    onSettled: (data, error, userAchievementId) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: celebrationKeys.list(userAchievementId),
      });
    },
  });
}

// =========================================================================
// Helpers
// =========================================================================

/**
 * Check if the current user has celebrated an achievement
 * (based on cached celebration list data)
 */
export function useHasCelebrated(
  userAchievementId: string,
  currentUserId: string | undefined
): boolean {
  const { data } = useAchievementCelebrations(userAchievementId);

  if (!data || !currentUserId) {
    return false;
  }

  return data.celebrations.some(
    (c) => c.celebrator_identity_id === currentUserId
  );
}
