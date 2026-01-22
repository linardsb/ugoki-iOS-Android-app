/**
 * Health sync hook for Apple HealthKit (iOS) and Health Connect (Android).
 *
 * Provides a unified interface for:
 * - Checking health data availability
 * - Requesting permissions
 * - Fetching health data from device
 * - Syncing data to backend
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import type {
  HealthData,
  HealthSyncPayload,
  HealthSyncResponse,
  HealthSyncStatus,
  HealthConnectionState,
} from '../types';

// Lazy imports for native modules (only load on respective platforms)
let HealthKit: any = null;
let HealthConnect: any = null;

if (Platform.OS === 'ios') {
  try {
    HealthKit = require('@kingstinct/react-native-healthkit').default;
  } catch (e) {
    console.warn('HealthKit not available:', e);
  }
}

if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect');
  } catch (e) {
    console.warn('Health Connect not available:', e);
  }
}

// Query keys
export const healthKeys = {
  all: ['health'] as const,
  status: () => [...healthKeys.all, 'status'] as const,
  data: () => [...healthKeys.all, 'data'] as const,
};

// iOS HealthKit identifiers
const IOS_READ_PERMISSIONS = [
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKCategoryTypeIdentifierSleepAnalysis',
];

// Android Health Connect permissions
const ANDROID_PERMISSIONS = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'SleepSession' },
];

/**
 * Check if health data is available on this device.
 */
async function checkAvailability(): Promise<boolean> {
  if (Platform.OS === 'ios' && HealthKit) {
    try {
      return await HealthKit.isHealthDataAvailable();
    } catch {
      return false;
    }
  }

  if (Platform.OS === 'android' && HealthConnect) {
    try {
      const status = await HealthConnect.getSdkStatus();
      return status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Request health data permissions from the user.
 */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios' && HealthKit) {
    try {
      await HealthKit.requestAuthorization(IOS_READ_PERMISSIONS, []);
      return true;
    } catch (e) {
      console.error('Failed to request HealthKit permissions:', e);
      return false;
    }
  }

  if (Platform.OS === 'android' && HealthConnect) {
    try {
      const granted = await HealthConnect.requestPermission(ANDROID_PERMISSIONS);
      return granted.length > 0;
    } catch (e) {
      console.error('Failed to request Health Connect permissions:', e);
      return false;
    }
  }

  return false;
}

/**
 * Fetch health data from device (iOS).
 */
async function fetchHealthDataIOS(days: number): Promise<HealthData> {
  if (!HealthKit) return {};

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const data: HealthData = {};

  try {
    // Resting Heart Rate (latest)
    const restingHR = await HealthKit.getMostRecentQuantitySample('HKQuantityTypeIdentifierRestingHeartRate');
    if (restingHR) {
      data.restingHeartRate = Math.round(restingHR.quantity);
    }

    // HRV (latest)
    const hrv = await HealthKit.getMostRecentQuantitySample('HKQuantityTypeIdentifierHeartRateVariabilitySDNN');
    if (hrv) {
      data.hrv = Math.round(hrv.quantity);
    }

    // Steps (today)
    const steps = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      from: todayStart,
      to: endDate,
    });
    if (steps?.length) {
      data.steps = steps.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
    }

    // Active calories (today)
    const calories = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
      from: todayStart,
      to: endDate,
    });
    if (calories?.length) {
      data.activeCalories = Math.round(calories.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0));
    }

    // Weight (latest)
    const weight = await HealthKit.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass');
    if (weight) {
      data.weight = Math.round(weight.quantity * 10) / 10; // 1 decimal place
    }

    // Body fat (latest)
    const bodyFat = await HealthKit.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage');
    if (bodyFat) {
      data.bodyFat = Math.round(bodyFat.quantity * 1000) / 10; // Convert to percentage
    }

    // Sleep (last night - from 6pm yesterday to now)
    const yesterdayEvening = new Date();
    yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
    yesterdayEvening.setHours(18, 0, 0, 0);

    const sleep = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      from: yesterdayEvening,
      to: endDate,
    });

    if (sleep?.length) {
      // Filter for actual sleep (not just in bed - value 0)
      const sleepSamples = sleep.filter((s: any) => s.value !== 0);
      const totalMs = sleepSamples.reduce((sum: number, s: any) => {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        return sum + (end - start);
      }, 0);
      data.sleepHours = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;
      data.sleepQuality = getSleepQuality(data.sleepHours);
    }
  } catch (e) {
    console.error('Error fetching iOS health data:', e);
  }

  return data;
}

/**
 * Fetch health data from device (Android).
 */
async function fetchHealthDataAndroid(days: number): Promise<HealthData> {
  if (!HealthConnect) return {};

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const data: HealthData = {};

  try {
    // Resting Heart Rate
    try {
      const restingHRRecords = await HealthConnect.readRecords('RestingHeartRate', {
        timeRangeFilter: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      if (restingHRRecords.records?.length) {
        const latest = restingHRRecords.records[restingHRRecords.records.length - 1];
        data.restingHeartRate = Math.round(latest.beatsPerMinute);
      }
    } catch (e) {
      // RestingHeartRate might not be available, try deriving from HeartRate
      const hrRecords = await HealthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      if (hrRecords.records?.length) {
        const allSamples = hrRecords.records.flatMap((r: any) => r.samples || []);
        if (allSamples.length) {
          const sorted = allSamples.sort((a: any, b: any) => a.beatsPerMinute - b.beatsPerMinute);
          const lowestTen = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.1)));
          data.restingHeartRate = Math.round(
            lowestTen.reduce((sum: number, s: any) => sum + s.beatsPerMinute, 0) / lowestTen.length
          );
        }
      }
    }

    // HRV
    try {
      const hrvRecords = await HealthConnect.readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      if (hrvRecords.records?.length) {
        const latest = hrvRecords.records[hrvRecords.records.length - 1];
        data.hrv = Math.round(latest.heartRateVariabilityMillis);
      }
    } catch (e) {
      console.log('HRV not available');
    }

    // Steps (today)
    const stepsRecords = await HealthConnect.readRecords('Steps', {
      timeRangeFilter: {
        startTime: todayStart.toISOString(),
        endTime: endDate.toISOString(),
      },
    });
    if (stepsRecords.records?.length) {
      data.steps = stepsRecords.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
    }

    // Active calories (today)
    const calorieRecords = await HealthConnect.readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: {
        startTime: todayStart.toISOString(),
        endTime: endDate.toISOString(),
      },
    });
    if (calorieRecords.records?.length) {
      data.activeCalories = Math.round(
        calorieRecords.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0)
      );
    }

    // Weight (latest)
    const weightRecords = await HealthConnect.readRecords('Weight', {
      timeRangeFilter: {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });
    if (weightRecords.records?.length) {
      const latest = weightRecords.records[weightRecords.records.length - 1];
      data.weight = Math.round((latest.weight?.inKilograms || 0) * 10) / 10;
    }

    // Body fat (latest)
    const bodyFatRecords = await HealthConnect.readRecords('BodyFat', {
      timeRangeFilter: {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });
    if (bodyFatRecords.records?.length) {
      const latest = bodyFatRecords.records[bodyFatRecords.records.length - 1];
      data.bodyFat = Math.round((latest.percentage || 0) * 10) / 10;
    }

    // Sleep (last 24 hours)
    const sleepRecords = await HealthConnect.readRecords('SleepSession', {
      timeRangeFilter: {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: endDate.toISOString(),
      },
    });
    if (sleepRecords.records?.length) {
      const totalMs = sleepRecords.records.reduce((sum: number, r: any) => {
        const start = new Date(r.startTime).getTime();
        const end = new Date(r.endTime).getTime();
        return sum + (end - start);
      }, 0);
      data.sleepHours = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;
      data.sleepQuality = getSleepQuality(data.sleepHours);
    }
  } catch (e) {
    console.error('Error fetching Android health data:', e);
  }

  return data;
}

/**
 * Get sleep quality rating based on hours.
 */
function getSleepQuality(hours: number | undefined): 'poor' | 'fair' | 'good' | 'excellent' {
  if (!hours) return 'poor';
  if (hours >= 8) return 'excellent';
  if (hours >= 7) return 'good';
  if (hours >= 6) return 'fair';
  return 'poor';
}

/**
 * Main hook for health data sync.
 */
export function useHealthSync() {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<HealthConnectionState>({
    isAvailable: false,
    isAuthorized: false,
    permissionStatus: 'not_determined',
    lastSyncAt: null,
  });

  // Check availability on mount
  useEffect(() => {
    checkAvailability().then((available) => {
      setConnectionState((prev) => ({
        ...prev,
        isAvailable: available,
        permissionStatus: available ? 'not_determined' : 'unavailable',
      }));
    });
  }, []);

  // Fetch sync status from backend
  const syncStatusQuery = useQuery({
    queryKey: healthKeys.status(),
    queryFn: async (): Promise<HealthSyncStatus> => {
      try {
        const response = await apiClient.get<HealthSyncStatus>('/health-sync/status');
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return { is_connected: false, last_sync: null, synced_metrics: [] };
        }
        throw error;
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Request permissions
  const requestPermissionsMutation = useMutation({
    mutationFn: requestPermissions,
    onSuccess: (granted) => {
      setConnectionState((prev) => ({
        ...prev,
        isAuthorized: granted,
        permissionStatus: granted ? 'authorized' : 'denied',
      }));
    },
  });

  // Fetch health data from device
  const fetchHealthDataMutation = useMutation({
    mutationFn: async (days: number = 7): Promise<HealthData> => {
      if (Platform.OS === 'ios') {
        return fetchHealthDataIOS(days);
      }
      if (Platform.OS === 'android') {
        return fetchHealthDataAndroid(days);
      }
      return {};
    },
  });

  // Sync data to backend
  const syncToBackendMutation = useMutation({
    mutationFn: async (data: HealthData): Promise<HealthSyncResponse> => {
      const payload: HealthSyncPayload = {
        resting_heart_rate: data.restingHeartRate,
        hrv: data.hrv,
        sleep_hours: data.sleepHours,
        steps: data.steps,
        active_calories: data.activeCalories,
        weight_kg: data.weight,
        body_fat_pct: data.bodyFat,
        synced_at: new Date().toISOString(),
      };

      const response = await apiClient.post<HealthSyncResponse>('/health-sync', payload);
      return response.data;
    },
    onSuccess: (data) => {
      setConnectionState((prev) => ({
        ...prev,
        lastSyncAt: data.timestamp,
      }));
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: healthKeys.status() });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });

  // Combined fetch and sync
  const syncHealthData = useCallback(
    async (days: number = 7): Promise<{ data: HealthData; synced: string[] }> => {
      const healthData = await fetchHealthDataMutation.mutateAsync(days);
      const syncResult = await syncToBackendMutation.mutateAsync(healthData);
      return { data: healthData, synced: syncResult.synced };
    },
    [fetchHealthDataMutation, syncToBackendMutation]
  );

  return {
    // State
    connectionState,
    syncStatus: syncStatusQuery.data,
    isLoading:
      syncStatusQuery.isLoading ||
      requestPermissionsMutation.isPending ||
      fetchHealthDataMutation.isPending ||
      syncToBackendMutation.isPending,
    error:
      syncStatusQuery.error ||
      requestPermissionsMutation.error ||
      fetchHealthDataMutation.error ||
      syncToBackendMutation.error,

    // Actions
    requestPermissions: requestPermissionsMutation.mutateAsync,
    fetchHealthData: fetchHealthDataMutation.mutateAsync,
    syncToBackend: syncToBackendMutation.mutateAsync,
    syncHealthData,

    // Refetch status
    refetchStatus: syncStatusQuery.refetch,
  };
}

export default useHealthSync;
