import { View, ScrollView, RefreshControl, Alert, Linking, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  Target,
  Scales,
  Bell,
  Vibrate,
  SpeakerHigh,
  Question,
  ChatText,
  Shield,
  SignOut,
  Trash,
  CaretRight,
  CookingPot,
  Bookmark,
  ClockCounterClockwise,
} from 'phosphor-react-native';
import {
  useProfile,
  usePreferences,
  useUpdatePreferences,
  useDeleteAccount,
  ProfileHeader,
  SettingsItem,
  SettingsSection,
} from '@/features/profile';
import { useProgression } from '@/features/dashboard';
import { useSavedRecipes } from '@/features/recipes';
import { useAuthStore } from '@/shared/stores/auth';
import { ThemeToggle } from '@/shared/components/ui';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: preferences, isLoading: preferencesLoading } = usePreferences();
  const { data: progression } = useProgression();
  const { data: savedRecipes } = useSavedRecipes();

  const updatePreferences = useUpdatePreferences();
  const deleteAccount = useDeleteAccount({
    onSuccess: () => {
      Alert.alert('Account Deleted', 'Your account and all data have been deleted.');
    },
    onError: (error) => {
      Alert.alert('Error', error);
    },
  });

  const isRefreshing = profileLoading || preferencesLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: () => {
            clearAuth();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type DELETE to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => deleteAccount.mutate(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const toggleHaptics = (value: boolean) => {
    updatePreferences.mutate({ haptic_feedback: value });
  };

  const toggleSounds = (value: boolean) => {
    updatePreferences.mutate({ sound_effects: value });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack gap="$5">
            {/* Header with Theme Toggle */}
            <XStack justifyContent="flex-end" paddingHorizontal="$4">
              <ThemeToggle />
            </XStack>

            {/* Profile Header */}
            <ProfileHeader
              profile={profile ?? null}
              level={progression?.level?.current_level ?? 1}
              xp={progression?.level?.total_xp_earned ?? 0}
            />

            {/* Account Section */}
            <SettingsSection title="Account">
              <SettingsItem
                icon={<User size={20} color="$primary" weight="thin" />}
                label="Edit Profile"
                onPress={() => router.push('/(modals)/settings')}
              />
              <SettingsItem
                icon={<Target size={20} color="$secondary" weight="thin" />}
                label="Goals"
                value={progression?.level?.current_level ? `Level ${progression.level.current_level}` : undefined}
                onPress={() => router.push('/(modals)/settings')}
              />
              <SettingsItem
                icon={<Scales size={20} color="#3b82f6" weight="thin" />}
                label="Log Weight"
                onPress={() => router.push('/(modals)/log-weight')}
              />
              <SettingsItem
                icon={<ClockCounterClockwise size={20} color="#6366f1" weight="thin" />}
                label="Activity History"
                onPress={() => router.push('/(modals)/activity')}
              />
            </SettingsSection>

            {/* Content Section */}
            <SettingsSection title="Content">
              <SettingsItem
                icon={<CookingPot size={20} color="#ec4899" weight="thin" />}
                label="Browse Recipes"
                onPress={() => router.push('/(modals)/recipes')}
              />
              <SettingsItem
                icon={<Bookmark size={20} color="#14b8a6" weight="thin" />}
                label="Saved Recipes"
                value={savedRecipes?.length ? `${savedRecipes.length} saved` : undefined}
                onPress={() => router.push('/(modals)/saved-recipes')}
              />
            </SettingsSection>

            {/* Preferences Section */}
            <SettingsSection title="Preferences">
              <SettingsItem
                icon={<Vibrate size={20} color="#f59e0b" weight="thin" />}
                label="Haptic Feedback"
                isToggle
                toggleValue={preferences?.haptic_feedback ?? true}
                onToggle={toggleHaptics}
              />
              <SettingsItem
                icon={<SpeakerHigh size={20} color="#22c55e" weight="thin" />}
                label="Sound Effects"
                isToggle
                toggleValue={preferences?.sound_effects ?? true}
                onToggle={toggleSounds}
              />
              <SettingsItem
                icon={<Bell size={20} color="#ef4444" weight="thin" />}
                label="Notifications"
                onPress={() => router.push('/(modals)/settings')}
              />
            </SettingsSection>

            {/* Support Section */}
            <SettingsSection title="Support">
              <SettingsItem
                icon={<Question size={20} color="$colorMuted" weight="thin" />}
                label="Help Center"
                onPress={() => Linking.openURL('https://ugoki.app/help')}
              />
              <SettingsItem
                icon={<ChatText size={20} color="$colorMuted" weight="thin" />}
                label="Send Feedback"
                onPress={() => Linking.openURL('mailto:feedback@ugoki.app')}
              />
              <SettingsItem
                icon={<Shield size={20} color="$colorMuted" weight="thin" />}
                label="Privacy Policy"
                onPress={() => Linking.openURL('https://ugoki.app/privacy')}
              />
            </SettingsSection>

            {/* Danger Zone */}
            <SettingsSection title="Account Actions">
              <SettingsItem
                icon={<SignOut size={20} color="$colorMuted" weight="thin" />}
                label="Sign Out"
                onPress={handleLogout}
              />
              <SettingsItem
                icon={<Trash size={20} color="#ef4444" weight="thin" />}
                label="Delete Account"
                onPress={handleDeleteAccount}
                destructive
              />
            </SettingsSection>

            {/* App Info */}
            <YStack alignItems="center" paddingTop="$4">
              <Text fontSize="$2" color="$colorMuted">
                UGOKI v1.0.0
              </Text>
              <Text fontSize="$1" color="$colorMuted">
                Made with love for your wellness journey
              </Text>
            </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
