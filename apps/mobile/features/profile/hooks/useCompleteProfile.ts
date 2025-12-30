import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { CompleteProfile } from '../types';

/**
 * Hook to fetch the complete user profile with all sections.
 */
export function useCompleteProfile() {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: [...queryKeys.profile.all, 'complete'],
    queryFn: async (): Promise<CompleteProfile | null> => {
      try {
        const response = await apiClient.get<CompleteProfile>('/profile/complete', {
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
