import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage, appStorage } from './storage';
import { setApiAuthCache, setOnUnauthorizedCallback } from '../api/client';

// Identity type from backend
export interface Identity {
  id: string;
  type: 'authenticated' | 'anonymous' | 'system';
  capabilities: string[];
  created_at: string;
  last_active_at: string;
}

// Auth state
interface AuthState {
  // State
  identity: Identity | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;

  // Actions
  setAuth: (identity: Identity, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  upgradeToAuthenticated: (identity: Identity, accessToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      identity: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,
      isAnonymous: false,

      // Set auth after login/anonymous creation
      setAuth: (identity, accessToken) => {
        // Update API client cache for immediate use
        setApiAuthCache(accessToken, identity.id);

        // Persist to storage (async)
        appStorage.setAccessToken(accessToken);
        appStorage.setIdentityId(identity.id);
        appStorage.setIdentityType(identity.type as 'authenticated' | 'anonymous');

        set({
          identity,
          accessToken,
          isLoading: false,
          isAuthenticated: identity.type === 'authenticated',
          isAnonymous: identity.type === 'anonymous',
        });
      },

      // Clear auth on logout
      clearAuth: () => {
        // Clear API client cache
        setApiAuthCache(null, null);

        // Clear storage (async)
        appStorage.clearAuth();

        set({
          identity: null,
          accessToken: null,
          isLoading: false,
          isAuthenticated: false,
          isAnonymous: false,
        });
      },

      // Set loading state
      setLoading: (isLoading) => set({ isLoading }),

      // Upgrade anonymous to authenticated (after email/social signup)
      upgradeToAuthenticated: (identity, accessToken) => {
        // Update API client cache
        setApiAuthCache(accessToken, identity.id);

        // Persist to storage (async)
        appStorage.setAccessToken(accessToken);
        appStorage.setIdentityId(identity.id);
        appStorage.setIdentityType('authenticated');

        set({
          identity,
          accessToken,
          isAuthenticated: true,
          isAnonymous: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        identity: state.identity,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        // Set derived state after rehydration
        if (state) {
          state.isLoading = false;
          state.isAuthenticated = state.identity?.type === 'authenticated';
          state.isAnonymous = state.identity?.type === 'anonymous';

          // Update API client cache with rehydrated values
          if (state.accessToken && state.identity?.id) {
            setApiAuthCache(state.accessToken, state.identity.id);
          }
        }
      },
    }
  )
);

// Selectors for common use cases
export const useIdentityId = () => useAuthStore((state) => state.identity?.id);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsAnonymous = () => useAuthStore((state) => state.isAnonymous);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

// Register callback for 401 errors - clears auth state when server rejects token
setOnUnauthorizedCallback(() => {
  console.log('[Auth] 401 received, clearing auth state');
  useAuthStore.getState().clearAuth();
});
