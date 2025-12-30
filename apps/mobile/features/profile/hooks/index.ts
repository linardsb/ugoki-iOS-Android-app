// Query hooks
export { useProfile } from './useProfile';
export { useCompleteProfile } from './useCompleteProfile';
export { usePreferences } from './usePreferences';
export { useGoals } from './useGoals';

// Mutation hooks
export { useCreateProfile } from './useCreateProfile';
export { useUpdateProfile } from './useUpdateProfile';
export { useUpdateGoals } from './useUpdateGoals';
export { useUpdatePreferences } from './useUpdatePreferences';
export { useUpdateWorkoutRestrictions } from './useUpdateWorkoutRestrictions';
export { useSaveOnboarding, type OnboardingData } from './useSaveOnboarding';
export { useDeleteAccount } from './useDeleteAccount';
export {
  useUploadAvatar,
  useDeleteAvatar,
  pickImageFromLibrary,
  takePhoto,
} from './useUploadAvatar';
