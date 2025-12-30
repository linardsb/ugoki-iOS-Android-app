import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { GoalType, FitnessLevel, Gender } from '../types';

// Eating time to window mapping
const EATING_WINDOWS = {
  early: { start: '06:00:00', end: '14:00:00' },
  mid: { start: '10:00:00', end: '18:00:00' },
  late: { start: '12:00:00', end: '20:00:00' },
} as const;

export interface OnboardingData {
  gender: Gender | null;
  goal: GoalType | null;
  experience: FitnessLevel | null;
  eatingTime: 'early' | 'mid' | 'late' | null;
}

interface UseSaveOnboardingOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Combined hook to save all onboarding data in sequence.
 * Creates profile, saves goals, workout restrictions, and preferences.
 */
export function useSaveOnboarding(options?: UseSaveOnboardingOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnboardingData): Promise<void> => {
      // Step 1: Create profile with gender
      await apiClient.post('/profile', {
        display_name: 'User',
      });

      // Step 2: Update profile with gender if selected
      if (data.gender) {
        await apiClient.patch('/profile', {
          gender: data.gender,
        });
      }

      // Step 3: Save goals if selected
      if (data.goal) {
        await apiClient.patch('/profile/goals', {
          primary_goal: data.goal,
          // Set reasonable defaults based on goal
          weekly_fasting_goal: 5,
          target_fasting_hours: 16,
        });
      }

      // Step 4: Save fitness level if selected
      if (data.experience) {
        await apiClient.patch('/profile/workout-restrictions', {
          fitness_level: data.experience,
        });
      }

      // Step 5: Save eating window preferences if selected
      if (data.eatingTime && EATING_WINDOWS[data.eatingTime]) {
        const window = EATING_WINDOWS[data.eatingTime];
        await apiClient.patch('/profile/preferences', {
          eating_window_start: window.start,
          eating_window_end: window.end,
          default_fasting_protocol: '16:8',
        });
      }
    },
    onSuccess: () => {
      // Invalidate all profile-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      options?.onSuccess?.();
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      options?.onError?.(message);
    },
  });
}
