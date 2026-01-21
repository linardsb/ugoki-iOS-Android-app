import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL - hardcoded for local development
// TODO: Use env variable in production
const API_BASE_URL = 'http://192.168.1.12:8000';

// Get the full API base URL (with /api/v1 prefix)
export function getApiBaseUrl(): string {
  return `${API_BASE_URL}/api/v1`;
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache for auth tokens (populated from AsyncStorage)
let cachedToken: string | null = null;
let cachedIdentityId: string | null = null;

// Initialize cache from storage
export async function initApiClient() {
  cachedToken = await AsyncStorage.getItem('accessToken');
  cachedIdentityId = await AsyncStorage.getItem('identityId');
}

// Update cached values when auth changes
export function setApiAuthCache(token: string | null, identityId: string | null) {
  cachedToken = token;
  cachedIdentityId = identityId;
}

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }

    // Add identity_id to requests if available
    if (cachedIdentityId && !config.params?.identity_id) {
      config.params = {
        ...config.params,
        identity_id: cachedIdentityId,
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;

      if (status === 401) {
        // Unauthorized - clear auth cache
        cachedToken = null;
        cachedIdentityId = null;
        await AsyncStorage.multiRemove(['accessToken', 'identityId']);
        // Navigation will be handled by auth state listener
      }

      if (status === 403) {
        // Forbidden - user doesn't have permission
        console.warn('Permission denied:', error.response.data);
      }

      if (status >= 500) {
        // Server error
        console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      // Request made but no response received (network error)
      console.error('Network error:', error.message);
    } else {
      // Error setting up the request
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// API error type
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    if (apiError?.error?.message) {
      return apiError.error.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export default apiClient;
