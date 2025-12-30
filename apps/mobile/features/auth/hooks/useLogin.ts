import { useMutation } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import type { AuthResult, AuthenticateRequest, AuthProvider } from '../types';

interface LoginParams {
  provider: Extract<AuthProvider, 'google' | 'apple'>;
  token: string; // OAuth token from the provider
}

interface UseLoginOptions {
  onSuccess?: (data: AuthResult) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to authenticate with OAuth providers (Google, Apple).
 * Note: OAuth is deferred post-MVP. This hook is ready for when it's implemented.
 */
export function useLogin(options?: UseLoginOptions) {
  const upgradeToAuthenticated = useAuthStore((state) => state.upgradeToAuthenticated);

  return useMutation({
    mutationFn: async ({ provider, token }: LoginParams): Promise<AuthResult> => {
      const request: AuthenticateRequest = {
        provider,
        token,
      };

      const response = await apiClient.post<AuthResult>('/identity/authenticate', request);
      return response.data;
    },
    onSuccess: (data) => {
      // Upgrade from anonymous to authenticated
      upgradeToAuthenticated(data.identity, data.access_token);
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}

// Placeholder for future OAuth implementations
export async function signInWithGoogle(): Promise<string> {
  // TODO: Implement with expo-auth-session or react-native-google-signin
  throw new Error('Google Sign-In not yet implemented');
}

export async function signInWithApple(): Promise<string> {
  // TODO: Implement with expo-apple-authentication
  throw new Error('Apple Sign-In not yet implemented');
}
