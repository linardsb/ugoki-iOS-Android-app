/**
 * Follows Hooks
 * React Query hooks for follow management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { Follow } from '../types';

// =========================================================================
// Followers & Following Lists
// =========================================================================

export function useFollowers(limit = 50, offset = 0) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: [...queryKeys.social.followers(), limit, offset],
    queryFn: async (): Promise<Follow[]> => {
      const response = await apiClient.get('/social/followers', {
        params: { identity_id: identity?.id, limit, offset },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

export function useFollowing(limit = 50, offset = 0) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: [...queryKeys.social.following(), limit, offset],
    queryFn: async (): Promise<Follow[]> => {
      const response = await apiClient.get('/social/following', {
        params: { identity_id: identity?.id, limit, offset },
      });
      return response.data;
    },
    enabled: !!identity?.id,
  });
}

// =========================================================================
// Follow Actions
// =========================================================================

export function useFollowUser() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<Follow> => {
      const response = await apiClient.post(`/social/follow/${userId}`, null, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.following() });
    },
  });
}

export function useUnfollowUser() {
  const { identity } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      await apiClient.delete(`/social/follow/${userId}`, {
        params: { identity_id: identity?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.social.following() });
    },
  });
}

// =========================================================================
// Toggle Follow (convenience hook)
// =========================================================================

export function useToggleFollow() {
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  return {
    toggleFollow: async (userId: string, isCurrentlyFollowing: boolean) => {
      if (isCurrentlyFollowing) {
        await unfollowMutation.mutateAsync(userId);
      } else {
        await followMutation.mutateAsync(userId);
      }
    },
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
}
