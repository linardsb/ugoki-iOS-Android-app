import { ScrollView, RefreshControl, Modal, Pressable, StyleSheet } from 'react-native';
import { YStack, Text, XStack, useTheme, Button } from 'tamagui';
import { useCallback, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, X } from 'phosphor-react-native';

import { LevelCard, StreakCard, WeightCard, WorkoutStatsCard, ActiveFastCard, QuickActions } from '@/features/dashboard/components';
import { useProgression, useLatestWeight, useWeightTrend, useWorkoutStats } from '@/features/dashboard/hooks';
import { useActiveFast } from '@/features/fasting/hooks';
import { useProfile } from '@/features/profile';
import { RecentActivityCard } from '@/features/activity';
import { ThemeToggle } from '@/shared/components/ui';
import { appStorage } from '@/shared/stores/storage';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showGenderReminder, setShowGenderReminder] = useState(false);

  // Queries
  const { data: profile } = useProfile();
  const { data: progression, refetch: refetchProgression } = useProgression();
  const { data: latestWeight, refetch: refetchWeight } = useLatestWeight();
  const { data: weightTrend, refetch: refetchTrend } = useWeightTrend();
  const { data: workoutStats, refetch: refetchWorkoutStats } = useWorkoutStats();
  const { data: activeFast, refetch: refetchFast } = useActiveFast();

  // Check if we should show gender reminder
  useEffect(() => {
    async function checkGenderReminder() {
      // Only show if profile is loaded, gender is not set, and user hasn't dismissed
      if (profile && !profile.gender) {
        const dismissed = await appStorage.isGenderReminderDismissed();
        if (!dismissed) {
          // Small delay so it doesn't appear immediately on load
          setTimeout(() => setShowGenderReminder(true), 1000);
        }
      }
    }
    checkGenderReminder();
  }, [profile]);

  const handleDismissGenderReminder = async () => {
    await appStorage.setGenderReminderDismissed(true);
    setShowGenderReminder(false);
  };

  const handleSetGender = () => {
    setShowGenderReminder(false);
    router.push('/(modals)/settings');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProgression(),
      refetchWeight(),
      refetchTrend(),
      refetchWorkoutStats(),
      refetchFast(),
    ]);
    setRefreshing(false);
  }, [refetchProgression, refetchWeight, refetchTrend, refetchWorkoutStats, refetchFast]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background.val }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 100,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary.val} />
      }
    >
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$4">
        <YStack>
          <Text fontSize="$8" fontWeight="700" color={theme.color.val}>
            Dashboard
          </Text>
          <Text fontSize="$4" color={theme.colorSubtle.val}>
            Your health at a glance
          </Text>
        </YStack>
        <ThemeToggle />
      </XStack>

      {/* Active Fast Card */}
      <YStack marginBottom="$4">
        <ActiveFastCard />
      </YStack>

      {/* Level Card - Full Width */}
      <YStack marginBottom="$3">
        <LevelCard level={progression?.level ?? null} />
      </YStack>

      {/* Streaks Row */}
      <YStack marginBottom="$4">
        <StreakCard streaks={progression?.streaks ?? []} />
      </YStack>

      {/* Weight Card - Full Width */}
      <YStack marginBottom="$3">
        <WeightCard
          latestWeight={latestWeight ?? null}
          trend={weightTrend ?? null}
        />
      </YStack>

      {/* Workout Stats Card - Full Width */}
      <YStack marginBottom="$4">
        <WorkoutStatsCard stats={workoutStats ?? null} />
      </YStack>

      {/* Quick Actions */}
      <YStack marginBottom="$4">
        <Text fontSize="$5" fontWeight="600" color={theme.color.val} marginBottom="$3">
          Quick Actions
        </Text>
        <QuickActions />
      </YStack>

      {/* Recent Activity */}
      <YStack marginBottom="$4">
        <RecentActivityCard />
      </YStack>

      {/* Gender Reminder Popup */}
      <Modal
        visible={showGenderReminder}
        transparent
        animationType="fade"
        onRequestClose={handleDismissGenderReminder}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleDismissGenderReminder}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.background.val }]}>
            {/* Close button */}
            <Pressable
              style={styles.closeButton}
              onPress={handleDismissGenderReminder}
            >
              <X size={24} color={theme.colorHover.val} weight="bold" />
            </Pressable>

            {/* Icon */}
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="$primary"
              opacity={0.15}
              position="absolute"
              top={40}
            />
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              justifyContent="center"
              alignItems="center"
              marginBottom="$4"
            >
              <User size={40} color={theme.primary.val} weight="fill" />
            </YStack>

            {/* Content */}
            <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center" marginBottom="$2">
              Personalize Your Coach
            </Text>
            <Text fontSize="$4" color="$colorMuted" textAlign="center" marginBottom="$5" paddingHorizontal="$2">
              Set your gender to customize your AI coach avatar for a more personal experience.
            </Text>

            {/* Buttons */}
            <YStack gap="$3" width="100%">
              <Button
                size="$5"
                height={52}
                backgroundColor="$primary"
                borderRadius="$4"
                pressStyle={{ backgroundColor: '$primaryPress', scale: 0.98 }}
                onPress={handleSetGender}
              >
                <Text color="white" fontWeight="600" fontSize="$4">
                  Set Gender Now
                </Text>
              </Button>
              <Button
                size="$4"
                height={44}
                backgroundColor="transparent"
                borderRadius="$4"
                pressStyle={{ opacity: 0.7 }}
                onPress={handleDismissGenderReminder}
              >
                <Text color="$colorMuted" fontSize="$3">
                  Maybe Later
                </Text>
              </Button>
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
});
