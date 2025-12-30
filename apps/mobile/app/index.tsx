import { Redirect } from 'expo-router';
import { useAuthStore } from '@/shared/stores/auth';
import { appStorage } from '@/shared/stores/storage';

export default function Index() {
  const { identity, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Splash screen is still visible
  }

  if (!identity) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const onboardingCompleted = appStorage.isOnboardingCompleted();

  if (!onboardingCompleted) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
