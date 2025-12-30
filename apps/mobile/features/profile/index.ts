// Profile feature exports

// Types
export * from './types';

// Hooks
export {
  // Query hooks
  useProfile,
  useCompleteProfile,
  usePreferences,
  useGoals,
  // Mutation hooks
  useCreateProfile,
  useUpdateProfile,
  useUpdateGoals,
  useUpdatePreferences,
  useUpdateWorkoutRestrictions,
  useSaveOnboarding,
  useDeleteAccount,
  useUploadAvatar,
  useDeleteAvatar,
  pickImageFromLibrary,
  takePhoto,
  type OnboardingData,
} from './hooks';

// Components
export {
  ProfileHeader,
  SettingsItem,
  SettingsSection,
} from './components';
