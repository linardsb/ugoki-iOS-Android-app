import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiClient } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import { useAuthStore } from '@/shared/stores/auth';

interface AvatarUploadResponse {
  success: boolean;
  avatar_url: string;
  message: string;
}

interface UseUploadAvatarOptions {
  onSuccess?: (avatarUrl: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to upload a user avatar image.
 */
export function useUploadAvatar(options?: UseUploadAvatarOptions) {
  const queryClient = useQueryClient();
  const identityId = useAuthStore((state) => state.identity?.id);

  return useMutation({
    mutationFn: async (imageUri: string): Promise<string> => {
      // Resize image to 400x400
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: manipulated.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      // Upload
      const response = await apiClient.post<AvatarUploadResponse>(
        '/uploads/avatar',
        formData,
        {
          params: { identity_id: identityId },
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      return response.data.avatar_url;
    },
    onSuccess: (avatarUrl) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      options?.onSuccess?.(avatarUrl);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to upload avatar';
      options?.onError?.(message);
    },
  });
}

/**
 * Hook to delete user's avatar.
 */
export function useDeleteAvatar(options?: { onSuccess?: () => void; onError?: (error: string) => void }) {
  const queryClient = useQueryClient();
  const identityId = useAuthStore((state) => state.identity?.id);

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.delete('/uploads/avatar', {
        params: { identity_id: identityId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to delete avatar';
      options?.onError?.(message);
    },
  });
}

/**
 * Pick an image from the library.
 */
export async function pickImageFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Take a photo with the camera.
 */
export async function takePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0].uri;
}
