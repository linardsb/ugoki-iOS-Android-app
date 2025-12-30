import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';
import type { Identity } from '../types';

/**
 * Hook to fetch the current identity from the server.
 * Useful for validating that the stored token is still valid.
 */
export function useCurrentIdentity() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.identity.current(),
    queryFn: async (): Promise<Identity> => {
      const response = await apiClient.get<Identity>('/identity/me');
      return response.data;
    },
    enabled: !!accessToken, // Only run if we have a token
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    retry: false, // Don't retry on 401 - auth interceptor will handle it
  });
}
