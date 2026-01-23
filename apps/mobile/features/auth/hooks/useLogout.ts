import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import { appStorage } from '@/shared/stores/storage';
import type { LogoutResponse } from '../types';

interface UseLogoutOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook to logout the current user.
 * Clears all auth state and query cache.
 */
export function useLogout(options?: UseLogoutOptions) {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<LogoutResponse> => {
      const response = await apiClient.post<LogoutResponse>('/identity/logout');
      return response.data;
    },
    onSuccess: async () => {
      // Clear all cached queries
      queryClient.clear();

      // Clear local storage first (including Zustand persist key)
      await appStorage.clearAuth();

      // Clear auth state (this will also try to persist null values)
      clearAuth();

      options?.onSuccess?.();
    },
    onError: async (error) => {
      // Even if API call fails, clear local state
      queryClient.clear();
      await appStorage.clearAuth();
      clearAuth();

      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
