import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { appStorage } from '@/shared/stores/storage';
import { useCurrentIdentity } from './useCurrentIdentity';

interface AuthInitResult {
  isLoading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  hasIdentity: boolean;
}

/**
 * Hook to initialize auth state on app startup.
 * Validates stored token and syncs with server.
 */
export function useAuthInit(): AuthInitResult {
  const { identity, isLoading, setLoading, setAuth, clearAuth } = useAuthStore();
  const [storedToken, setStoredToken] = useState<string | null | undefined>(undefined);

  // Load stored token on mount
  useEffect(() => {
    appStorage.getAccessToken().then(setStoredToken);
  }, []);

  // Try to fetch current identity to validate token
  const { data: serverIdentity, isLoading: isValidating, isError } = useCurrentIdentity();

  useEffect(() => {
    // Wait until we've checked storage
    if (storedToken === undefined) return;

    // If we have a token stored but server returns error, clear auth
    if (isError && storedToken) {
      clearAuth();
      return;
    }

    // If server returned identity, ensure local state is synced
    if (serverIdentity && !isValidating && storedToken) {
      setAuth(serverIdentity, storedToken);
    }

    // If no stored token and validation is done, set loading to false
    if (!storedToken && !isValidating) {
      setLoading(false);
    }
  }, [serverIdentity, isValidating, isError, storedToken, setAuth, clearAuth, setLoading]);

  return {
    isLoading: isLoading || isValidating || storedToken === undefined,
    isAuthenticated: identity?.type === 'authenticated',
    isAnonymous: identity?.type === 'anonymous',
    hasIdentity: !!identity,
  };
}
