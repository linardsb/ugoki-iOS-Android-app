import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/query-client';
import type { GoalType, FitnessLevel, Gender, UnitSystem } from '../types';

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
  // Health metrics
  unitSystem: UnitSystem;
  heightCm: number | null;
  weightKg: number | null;
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
      // Step 1: Create profile (or skip if already exists)
      try {
        await apiClient.post('/profile', {
          display_name: 'User',
        });
      } catch (error: unknown) {
        // Profile might already exist - that's okay, continue with updates
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status !== 400) {
          throw error; // Re-throw if it's not a "profile exists" error
        }
      }

      // Step 2: Update profile with gender and height if provided
      const profileUpdate: Record<string, unknown> = {};
      if (data.gender) profileUpdate.gender = data.gender;
      if (data.heightCm) profileUpdate.height_cm = data.heightCm;

      if (Object.keys(profileUpdate).length > 0) {
        await apiClient.patch('/profile', profileUpdate);
      }

      // Step 3: Save goals with starting weight if provided
      const goalsUpdate: Record<string, unknown> = {};
      if (data.goal) {
        goalsUpdate.primary_goal = data.goal;
        goalsUpdate.weekly_fasting_goal = 5;
        goalsUpdate.target_fasting_hours = 16;
      }
      if (data.weightKg) {
        goalsUpdate.starting_weight_kg = data.weightKg;
      }

      if (Object.keys(goalsUpdate).length > 0) {
        await apiClient.patch('/profile/goals', goalsUpdate);
      }

      // Step 4: Save fitness level if selected
      if (data.experience) {
        await apiClient.patch('/profile/workout-restrictions', {
          fitness_level: data.experience,
        });
      }

      // Step 5: Save preferences (eating window and unit system)
      const prefsUpdate: Record<string, unknown> = {};

      if (data.unitSystem) {
        prefsUpdate.unit_system = data.unitSystem;
      }

      if (data.eatingTime && EATING_WINDOWS[data.eatingTime]) {
        const window = EATING_WINDOWS[data.eatingTime];
        prefsUpdate.eating_window_start = window.start;
        prefsUpdate.eating_window_end = window.end;
        prefsUpdate.default_fasting_protocol = '16:8';
      }

      if (Object.keys(prefsUpdate).length > 0) {
        await apiClient.patch('/profile/preferences', prefsUpdate);
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
