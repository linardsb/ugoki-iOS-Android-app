import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { UserPreferences, UpdatePreferencesRequest } from '../types';

interface UseUpdatePreferencesOptions {
  onSuccess?: (data: UserPreferences) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to update user preferences.
 * Used to save eating window times and other settings.
 */
export function useUpdatePreferences(options?: UseUpdatePreferencesOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdatePreferencesRequest): Promise<UserPreferences> => {
      const response = await apiClient.patch<UserPreferences>('/profile/preferences', request);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
