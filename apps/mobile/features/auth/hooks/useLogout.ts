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
    onSuccess: () => {
      // Clear all cached queries
      queryClient.clear();

      // Clear auth state
      clearAuth();

      // Clear local storage (except device ID for future anonymous re-auth)
      appStorage.clearAuth();

      options?.onSuccess?.();
    },
    onError: (error) => {
      // Even if API call fails, clear local state
      queryClient.clear();
      clearAuth();
      appStorage.clearAuth();

      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
