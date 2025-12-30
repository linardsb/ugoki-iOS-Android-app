import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { UserProfile } from '../types';

/**
 * Hook to fetch the user's profile.
 */
export function useProfile() {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: async (): Promise<UserProfile | null> => {
      try {
        const response = await apiClient.get<UserProfile>('/profile', {
          params: { identity_id: identityId },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!identityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
