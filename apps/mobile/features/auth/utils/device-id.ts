import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'deviceId';

// Cache for sync access after initial load
let cachedDeviceId: string | null = null;

/**
 * Get or create a persistent device ID for anonymous authentication.
 * This ID is stored locally and persists across app reinstalls if possible.
 * Note: This is async - use getDeviceIdSync() after initial load for sync access.
 */
export async function getDeviceIdAsync(): Promise<string> {
  // Check cache first
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // Check if we already have a device ID stored
  const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existingId) {
    cachedDeviceId = existingId;
    return existingId;
  }

  // Generate a new UUID-like device ID
  const newId = generateUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  cachedDeviceId = newId;
  return newId;
}

/**
 * Synchronous getter - only works after getDeviceIdAsync has been called at least once.
 * Falls back to generating a new ID if cache is empty.
 */
export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // Generate a new ID and cache it (async save will happen)
  const newId = generateUUID();
  cachedDeviceId = newId;
  AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
