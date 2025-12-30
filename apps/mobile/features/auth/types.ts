// Auth module types - matches backend identity module schemas

export type AuthProvider = 'google' | 'apple' | 'anonymous';

export type IdentityType = 'authenticated' | 'anonymous' | 'system';

export interface Identity {
  id: string;
  type: IdentityType;
  capabilities: string[];
  created_at: string;
  last_active_at: string;
}

export interface AuthResult {
  identity: Identity;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface AuthenticateRequest {
  provider: AuthProvider;
  token: string; // OAuth token or device ID for anonymous
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  status: 'logged_out';
}

// App-level auth state
export interface AuthState {
  identity: Identity | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}
