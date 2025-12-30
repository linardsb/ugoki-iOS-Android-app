import { useMutation } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import { getDeviceId } from '../utils/device-id';
import type { AuthResult, AuthenticateRequest } from '../types';

interface UseCreateAnonymousOptions {
  onSuccess?: (data: AuthResult) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to create an anonymous identity.
 * Uses a persistent device ID to maintain the same identity across app sessions.
 */
export function useCreateAnonymous(options?: UseCreateAnonymousOptions) {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (): Promise<AuthResult> => {
      const deviceId = getDeviceId();

      const request: AuthenticateRequest = {
        provider: 'anonymous',
        token: deviceId,
      };

      const response = await apiClient.post<AuthResult>('/identity/authenticate', request);
      return response.data;
    },
    onSuccess: (data) => {
      // Store auth state
      setAuth(data.identity, data.access_token);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
