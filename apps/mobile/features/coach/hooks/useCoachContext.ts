import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { UserContext } from '../types';

/**
 * Hook to fetch the user's coaching context.
 */
export function useCoachContext() {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: [...queryKeys.coach.all, 'context'],
    queryFn: async (): Promise<UserContext> => {
      const response = await apiClient.get<UserContext>('/coach/context', {
        params: { identity_id: identityId },
      });
      return response.data;
    },
    enabled: !!identityId,
    staleTime: 60 * 1000, // 1 minute
  });
}
