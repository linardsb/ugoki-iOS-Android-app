import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';

/**
 * Hook to fetch a quick motivational message.
 */
export function useMotivation(context?: string) {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: [...queryKeys.coach.all, 'motivation', context],
    queryFn: async (): Promise<string> => {
      const response = await apiClient.get<string>('/coach/motivation', {
        params: {
          identity_id: identityId,
          context,
        },
      });
      return response.data;
    },
    enabled: !!identityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
