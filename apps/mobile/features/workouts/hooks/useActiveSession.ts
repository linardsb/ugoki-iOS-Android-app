import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { WorkoutSession } from '../types';

/**
 * Hook to fetch the currently active workout session.
 * Returns null if no session is active.
 */
export function useActiveSession() {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: [...queryKeys.content.sessions(), 'active'],
    queryFn: async (): Promise<WorkoutSession | null> => {
      try {
        const response = await apiClient.get<WorkoutSession | null>('/content/sessions/active', {
          params: { identity_id: identityId },
        });
        return response.data;
      } catch (error: any) {
        // 404 means no active session - this is normal
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!identityId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds when active
  });
}
