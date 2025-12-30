import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import type { DeviceToken, RegisterDeviceRequest } from '../types';

interface UseRegisterDeviceOptions {
  onSuccess?: (device: DeviceToken) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to register a device for push notifications.
 */
export function useRegisterDevice(options?: UseRegisterDeviceOptions) {
  return useMutation({
    mutationFn: async (params: RegisterDeviceRequest): Promise<DeviceToken> => {
      const response = await apiClient.post<DeviceToken>('/notifications/devices', params);
      return response.data;
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to register device';
      options?.onError?.(message);
    },
  });
}

/**
 * Hook to unregister a device from push notifications.
 */
export function useUnregisterDevice(options?: { onSuccess?: () => void; onError?: (error: string) => void }) {
  return useMutation({
    mutationFn: async (token: string): Promise<void> => {
      await apiClient.delete(`/notifications/devices/${encodeURIComponent(token)}`);
    },
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to unregister device';
      options?.onError?.(message);
    },
  });
}
