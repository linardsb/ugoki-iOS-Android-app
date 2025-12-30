import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { UserGoals } from '../types';

/**
 * Hook to fetch the user's goals.
 */
export function useGoals() {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: [...queryKeys.profile.all, 'goals'],
    queryFn: async (): Promise<UserGoals> => {
      const response = await apiClient.get<UserGoals>('/profile/goals', {
        params: { identity_id: identityId },
      });
      return response.data;
    },
    enabled: !!identityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
