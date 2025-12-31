/**
 * User Profiles Hooks
 * React Query hooks for public user profiles and search
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-client';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { PublicUserProfile, ShareContent, GenerateShareContentParams } from '../types';

// =========================================================================
// Get Public Profile
// =========================================================================

export function usePublicProfile(userId: string) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.social.userProfile(userId),
    queryFn: async (): Promise<PublicUserProfile> => {
      const response = await apiClient.get(`/social/users/${userId}`, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
    enabled: !!identity?.id && !!userId,
  });
}

// =========================================================================
// Search Users
// =========================================================================

export function useSearchUsers(query: string, limit = 20) {
  const { identity } = useAuthStore();

  return useQuery({
    queryKey: ['social', 'search', query],
    queryFn: async (): Promise<PublicUserProfile[]> => {
      const response = await apiClient.get('/social/users/search', {
        params: { identity_id: identity?.id, query, limit },
      });
      return response.data;
    },
    enabled: !!identity?.id && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

// =========================================================================
// Generate Share Content
// =========================================================================

export function useGenerateShareContent() {
  const { identity } = useAuthStore();

  return useMutation({
    mutationFn: async (params: GenerateShareContentParams): Promise<ShareContent> => {
      const response = await apiClient.post('/social/share/generate', params, {
        params: { identity_id: identity?.id },
      });
      return response.data;
    },
  });
}
