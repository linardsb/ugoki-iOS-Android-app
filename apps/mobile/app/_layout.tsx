import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { TamaguiProvider, Theme } from '@tamagui/core';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import { PortalProvider } from 'tamagui';
import config from '@/shared/theme/tamagui.config';
import { queryClient } from '@/shared/api/query-client';
import { initApiClient, setApiAuthCache } from '@/shared/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import { useThemeStore } from '@/shared/stores/theme';
import { appStorage } from '@/shared/stores/storage';
import { NotificationProvider } from '@/features/notifications';

// Keep splash screen visible while we load fonts and check auth
SplashScreen.preventAutoHideAsync();

// DEV BYPASS: Set to true to skip auth and go directly to onboarding
const DEV_BYPASS_AUTH = false;

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { identity, isLoading } = useAuthStore();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Check onboarding status - re-check when identity changes (e.g., after reset)
  useEffect(() => {
    // Reset checked state when identity is cleared (logout/reset)
    if (!identity) {
      setOnboardingChecked(false);
      setOnboardingCompleted(false);
    }

    async function checkOnboarding() {
      const completed = await appStorage.isOnboardingCompleted();
      setOnboardingCompleted(completed);
      setOnboardingChecked(true);
    }
    checkOnboarding();
  }, [identity?.id]); // Re-check when identity changes

  useEffect(() => {
    if (isLoading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';
    const hasIdentity = !!identity;

    if (!hasIdentity && !inAuthGroup) {
      // No identity, redirect to auth flow
      router.replace('/(auth)/welcome');
    } else if (hasIdentity && inAuthGroup) {
      // Has identity but in auth group
      if (onboardingCompleted) {
        // Onboarding done, go to main app
        router.replace('/(tabs)');
      } else {
        // Need to complete onboarding
        router.replace('/(auth)/onboarding');
      }
    }
  }, [identity, isLoading, segments, router, onboardingChecked, onboardingCompleted]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);
  const { mode: themeMode, isLoaded: themeLoaded, loadTheme } = useThemeStore();

  // Load fonts
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
  });

  // Initialize auth state from storage
  useEffect(() => {
    async function prepare() {
      try {
        // Initialize API client cache
        await initApiClient();

        // Load theme preference
        await loadTheme();

        // DEV BYPASS: Skip auth and create fake identity
        if (DEV_BYPASS_AUTH) {
          console.log('[DEV] Bypassing auth, creating fake identity');
          // Clear onboarding to test onboarding flow
          await appStorage.setOnboardingCompleted(false);
          // Set fake auth state directly without API call
          useAuthStore.setState({
            identity: {
              id: 'dev-bypass-id',
              type: 'anonymous',
              capabilities: ['basic'],
              created_at: new Date().toISOString(),
              last_active_at: new Date().toISOString(),
            },
            accessToken: 'dev-bypass-token',
            isLoading: false,
            isAuthenticated: false,
            isAnonymous: true,
          });
          setAppReady(true);
          return;
        }

        // Check for existing auth
        const token = await appStorage.getAccessToken();
        const identityId = await appStorage.getIdentityId();
        const identityType = await appStorage.getIdentityType();

        if (token && identityId && identityType) {
          // Update API client cache
          setApiAuthCache(token, identityId);

          // Restore auth state (minimal - will refetch full identity)
          useAuthStore.getState().setAuth(
            {
              id: identityId,
              type: identityType,
              capabilities: [],
              created_at: '',
              last_active_at: '',
            },
            token
          );
        } else {
          useAuthStore.getState().setLoading(false);
        }
      } catch (e) {
        console.warn('Error restoring auth:', e);
        useAuthStore.getState().setLoading(false);
      } finally {
        setAppReady(true);
      }
    }

    prepare();
  }, []);

  // Hide splash when ready
  useEffect(() => {
    if (fontsLoaded && appReady && themeLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appReady, themeLoaded]);

  if (!fontsLoaded || !appReady || !themeLoaded) {
    return null;
  }

  // Get theme preference (default to light)
  const systemTheme = colorScheme || 'light';
  const theme = themeMode === 'system' ? systemTheme : themeMode;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={config} defaultTheme={theme}>
          <Theme name={theme as 'light' | 'dark'}>
            <PortalProvider>
              <NotificationProvider>
                <AuthGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'slide_from_right',
                      contentStyle: { flex: 1 },
                    }}
                  >
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="(modals)"
                      options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                      }}
                    />
                  </Stack>
                </AuthGate>
              </NotificationProvider>
              <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            </PortalProvider>
          </Theme>
        </TamaguiProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
