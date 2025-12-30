import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';

interface UseDeleteAccountOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook to delete the user's account and all data (GDPR).
 */
export function useDeleteAccount(options?: UseDeleteAccountOptions) {
  const queryClient = useQueryClient();
  const identityId = useAuthStore((state) => state.identity?.id);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.delete('/profile/all-data', {
        params: { identity_id: identityId, confirm: true },
      });
    },
    onSuccess: () => {
      queryClient.clear();
      clearAuth();
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to delete account';
      options?.onError?.(message);
    },
  });
}
