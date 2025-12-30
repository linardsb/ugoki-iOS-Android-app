import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { UserPreferences } from '../types';

/**
 * Hook to fetch the user's preferences.
 */
export function usePreferences() {
  const identityId = useAuthStore((state) => state.identity?.id);

  return useQuery({
    queryKey: queryKeys.profile.preferences(),
    queryFn: async (): Promise<UserPreferences> => {
      const response = await apiClient.get<UserPreferences>('/profile/preferences', {
        params: { identity_id: identityId },
      });
      return response.data;
    },
    enabled: !!identityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
