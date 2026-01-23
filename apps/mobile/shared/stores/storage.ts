import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

// Zustand persist storage adapter (async)
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

// Type-safe storage helpers
export const StorageKeys = {
  // Auth
  ACCESS_TOKEN: 'accessToken',
  IDENTITY_ID: 'identityId',
  IDENTITY_TYPE: 'identityType',

  // Onboarding
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  ONBOARDING_STEP: 'onboardingStep',

  // User preferences
  THEME: 'theme',
  UNIT_SYSTEM: 'unitSystem',
  NOTIFICATIONS_ENABLED: 'notificationsEnabled',

  // Fasting state (for offline support)
  ACTIVE_FAST: 'activeFast',
  LAST_FAST_SYNC: 'lastFastSync',

  // UI state
  GENDER_REMINDER_DISMISSED: 'genderReminderDismissed',
} as const;

// Async typed getters/setters
export const appStorage = {
  // Auth
  getAccessToken: () => AsyncStorage.getItem(StorageKeys.ACCESS_TOKEN),
  setAccessToken: (token: string) => AsyncStorage.setItem(StorageKeys.ACCESS_TOKEN, token),
  clearAccessToken: () => AsyncStorage.removeItem(StorageKeys.ACCESS_TOKEN),

  getIdentityId: () => AsyncStorage.getItem(StorageKeys.IDENTITY_ID),
  setIdentityId: (id: string) => AsyncStorage.setItem(StorageKeys.IDENTITY_ID, id),
  clearIdentityId: () => AsyncStorage.removeItem(StorageKeys.IDENTITY_ID),

  getIdentityType: async (): Promise<'authenticated' | 'anonymous' | null> => {
    const value = await AsyncStorage.getItem(StorageKeys.IDENTITY_TYPE);
    return value as 'authenticated' | 'anonymous' | null;
  },
  setIdentityType: (type: 'authenticated' | 'anonymous') =>
    AsyncStorage.setItem(StorageKeys.IDENTITY_TYPE, type),

  // Onboarding
  isOnboardingCompleted: async (): Promise<boolean> => {
    const value = await AsyncStorage.getItem(StorageKeys.ONBOARDING_COMPLETED);
    return value === 'true';
  },
  setOnboardingCompleted: (completed: boolean) =>
    AsyncStorage.setItem(StorageKeys.ONBOARDING_COMPLETED, String(completed)),

  getOnboardingStep: async (): Promise<number> => {
    const value = await AsyncStorage.getItem(StorageKeys.ONBOARDING_STEP);
    return value ? parseInt(value, 10) : 0;
  },
  setOnboardingStep: (step: number) =>
    AsyncStorage.setItem(StorageKeys.ONBOARDING_STEP, String(step)),

  // Preferences
  getTheme: async (): Promise<'light' | 'dark' | 'system' | null> => {
    const value = await AsyncStorage.getItem(StorageKeys.THEME);
    return value as 'light' | 'dark' | 'system' | null;
  },
  setTheme: (theme: 'light' | 'dark' | 'system') =>
    AsyncStorage.setItem(StorageKeys.THEME, theme),

  getUnitSystem: async (): Promise<'metric' | 'imperial' | null> => {
    const value = await AsyncStorage.getItem(StorageKeys.UNIT_SYSTEM);
    return value as 'metric' | 'imperial' | null;
  },
  setUnitSystem: (system: 'metric' | 'imperial') =>
    AsyncStorage.setItem(StorageKeys.UNIT_SYSTEM, system),

  // Fasting offline state
  getActiveFast: async () => {
    const data = await AsyncStorage.getItem(StorageKeys.ACTIVE_FAST);
    return data ? JSON.parse(data) : null;
  },
  setActiveFast: async (fast: object | null) => {
    if (fast) {
      await AsyncStorage.setItem(StorageKeys.ACTIVE_FAST, JSON.stringify(fast));
    } else {
      await AsyncStorage.removeItem(StorageKeys.ACTIVE_FAST);
    }
  },

  // UI state
  isGenderReminderDismissed: async (): Promise<boolean> => {
    const value = await AsyncStorage.getItem(StorageKeys.GENDER_REMINDER_DISMISSED);
    return value === 'true';
  },
  setGenderReminderDismissed: (dismissed: boolean) =>
    AsyncStorage.setItem(StorageKeys.GENDER_REMINDER_DISMISSED, String(dismissed)),

  // Clear all data (for logout)
  clearAll: () => AsyncStorage.clear(),

  // Clear auth only (keep preferences)
  clearAuth: async () => {
    await AsyncStorage.multiRemove([
      StorageKeys.ACCESS_TOKEN,
      StorageKeys.IDENTITY_ID,
      StorageKeys.IDENTITY_TYPE,
      StorageKeys.ONBOARDING_COMPLETED,
      StorageKeys.ONBOARDING_STEP,
      'auth-storage', // Zustand persist key - must be cleared to prevent rehydration
    ]);
  },
};

// Sync storage wrapper for device ID (used during init)
// This uses a cached value since device ID rarely changes
let cachedDeviceId: string | null = null;

export const syncStorage = {
  getDeviceId: (): string | null => cachedDeviceId,
  setDeviceId: (id: string) => {
    cachedDeviceId = id;
    AsyncStorage.setItem('deviceId', id);
  },
  loadDeviceId: async (): Promise<string | null> => {
    cachedDeviceId = await AsyncStorage.getItem('deviceId');
    return cachedDeviceId;
  },
};
