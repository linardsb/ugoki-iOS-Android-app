/**
 * Health integration types for Apple HealthKit and Android Health Connect.
 */

export interface HealthSample {
  value: number;
  timestamp: string;
}

export interface HealthData {
  restingHeartRate?: number;
  hrv?: number;
  sleepHours?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  steps?: number;
  activeCalories?: number;
  weight?: number;
  bodyFat?: number;
  heartRateSamples?: HealthSample[];
}

export interface HealthSyncPayload {
  resting_heart_rate?: number;
  hrv?: number;
  sleep_hours?: number;
  steps?: number;
  active_calories?: number;
  weight_kg?: number;
  body_fat_pct?: number;
  synced_at: string;
}

export interface HealthSyncResponse {
  synced: string[];
  timestamp: string;
}

export interface HealthSyncStatus {
  is_connected: boolean;
  last_sync: string | null;
  synced_metrics: string[];
}

export type HealthPermissionStatus = 'not_determined' | 'denied' | 'authorized' | 'unavailable';

export interface HealthConnectionState {
  isAvailable: boolean;
  isAuthorized: boolean;
  permissionStatus: HealthPermissionStatus;
  lastSyncAt: string | null;
}
