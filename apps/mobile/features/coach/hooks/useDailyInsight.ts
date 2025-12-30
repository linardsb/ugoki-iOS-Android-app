import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { CoachingInsight } from '../types';

/**
 * Hook to fetch a personalized daily insight.
 */
export function useDailyInsight() {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: queryKeys.coach.insights(),
    queryFn: async (): Promise<CoachingInsight> => {
      const response = await apiClient.get<CoachingInsight>('/coach/insight', {
        params: { identity_id: identityId },
      });
      return response.data;
    },
    enabled: !!identityId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
