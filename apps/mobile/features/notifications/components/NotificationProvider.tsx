import { useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/shared/stores/auth';
import { useRegisterDevice } from '../hooks/useRegisterDevice';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Provider component that handles push notification registration and listeners.
 * Wraps the app to enable push notifications.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const tokenRegistered = useRef(false);

  const registerDevice = useRegisterDevice({
    onSuccess: () => {
      console.log('[Notifications] Device token registered with backend');
      tokenRegistered.current = true;
    },
    onError: (error) => {
      console.error('[Notifications] Failed to register device:', error);
    },
  });

  // Register for push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      tokenRegistered.current = false;
      return;
    }

    async function registerForPushNotifications() {
      // Only register on physical devices
      if (!Device.isDevice) {
        console.log('[Notifications] Push notifications require a physical device');
        return;
      }

      try {
        // Check/request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[Notifications] Permission not granted');
          return;
        }

        // Get Expo push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const token = tokenData.data;
        console.log('[Notifications] Got push token:', token.substring(0, 20) + '...');

        // Determine platform
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        // Register with backend (if not already registered)
        if (!tokenRegistered.current) {
          registerDevice.mutate({ token, platform });
        }

        // Android-specific channel setup
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#14b8a6', // Primary teal color
          });
        }
      } catch (error) {
        console.error('[Notifications] Error registering for push:', error);
      }
    }

    registerForPushNotifications();
  }, [isAuthenticated]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Received:', notification.request.content.title);
      // You can handle foreground notifications here
      // e.g., show an in-app toast, update UI, etc.
    });

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[Notifications] User tapped notification:', data);

      // Handle navigation based on notification data
      handleNotificationNavigation(data);
    });

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        console.log('[Notifications] App opened from notification:', data);
        handleNotificationNavigation(data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Handle navigation based on notification data
  const handleNotificationNavigation = (data: Record<string, unknown>) => {
    if (!data) return;

    const { type, route, params } = data as {
      type?: string;
      route?: string;
      params?: Record<string, string>;
    };

    // Navigate based on notification type or explicit route
    if (route) {
      router.push({ pathname: route as any, params });
      return;
    }

    // Handle specific notification types
    switch (type) {
      case 'fasting_reminder':
      case 'fasting_complete':
        router.push('/(tabs)/fasting');
        break;
      case 'workout_reminder':
      case 'workout_complete':
        router.push('/(tabs)/workouts');
        break;
      case 'streak_milestone':
      case 'achievement_unlocked':
        router.push('/(tabs)');
        break;
      case 'coach_message':
        router.push('/(tabs)/coach');
        break;
      default:
        // Default to home tab
        break;
    }
  };

  return <>{children}</>;
}
