import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import type { NotificationPreferences, UpdateNotificationPreferencesRequest } from '../types';

interface UseUpdateNotificationPreferencesOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook to get notification preferences.
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: async (): Promise<NotificationPreferences> => {
      const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update notification preferences.
 */
export function useUpdateNotificationPreferences(options?: UseUpdateNotificationPreferencesOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateNotificationPreferencesRequest): Promise<NotificationPreferences> => {
      const response = await apiClient.patch<NotificationPreferences>('/notifications/preferences', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to update preferences';
      options?.onError?.(message);
    },
  });
}
