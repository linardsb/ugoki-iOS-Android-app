import { useEffect, useMemo } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from '@/shared/components/tamagui';
import { Card } from '@/shared/components/ui';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fire, Clock, Trophy } from 'phosphor-react-native';

import {
  FastingTimer,
  FastingControls,
  useActiveFast,
  useFastingStore,
  useHasActiveFast,
  useFastingHistory,
} from '@/features/fasting';
import { useStreaks } from '@/features/dashboard';
import { ThemeToggle } from '@/shared/components/ui';

export default function FastingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: serverFast, isLoading, refetch, isRefetching } = useActiveFast();
  const { syncFromServer, activeWindow } = useFastingStore();
  const hasActiveFast = useHasActiveFast();

  // Fetch streaks and fasting history
  const { data: streaks, refetch: refetchStreaks } = useStreaks();
  const { data: fastingHistory, refetch: refetchHistory } = useFastingHistory({ limit: 100 });

  // Get fasting streak
  const fastingStreak = streaks?.find((s) => s.streak_type === 'fasting');
  const currentStreak = fastingStreak?.current_count ?? 0;

  // Calculate fasts this week (completed fasts in last 7 days)
  const fastsThisWeek = useMemo(() => {
    if (!fastingHistory) return 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return fastingHistory.filter((fast) => {
      if (fast.state !== 'completed') return false;
      const startTime = new Date(fast.start_time);
      return startTime >= sevenDaysAgo;
    }).length;
  }, [fastingHistory]);

  // Calculate longest fast duration
  const longestFast = useMemo(() => {
    if (!fastingHistory) return null;

    let maxDurationMs = 0;
    fastingHistory.forEach((fast) => {
      if (fast.state !== 'completed' || !fast.end_time) return;
      const start = new Date(fast.start_time).getTime();
      const end = new Date(fast.end_time).getTime();
      const duration = end - start;
      if (duration > maxDurationMs) {
        maxDurationMs = duration;
      }
    });

    if (maxDurationMs === 0) return null;

    // Format as HH:MM:SS
    const hours = Math.floor(maxDurationMs / (1000 * 60 * 60));
    const minutes = Math.floor((maxDurationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((maxDurationMs % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [fastingHistory]);

  // Sync server state to local store
  useEffect(() => {
    if (!isLoading) {
      syncFromServer(serverFast ?? null);
    }
  }, [serverFast, isLoading, syncFromServer]);

  // Combined refetch for pull-to-refresh
  const handleRefresh = () => {
    refetch();
    refetchStreaks();
    refetchHistory();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
      <YStack gap="$6">
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack gap="$1">
                <Text fontSize="$3" color={theme.colorSubtle.val} textTransform="uppercase" letterSpacing={1}>
                  Intermittent Fasting
                </Text>
                <Text fontSize="$8" fontWeight="bold" color={theme.color.val}>
                  {hasActiveFast ? 'Keep Going!' : 'Ready to Fast?'}
                </Text>
              </YStack>
              <ThemeToggle />
            </XStack>

            {/* Timer */}
            <YStack alignItems="center" paddingVertical="$6">
              <FastingTimer size={280} strokeWidth={14} />
            </YStack>

            {/* Controls */}
            <FastingControls />

            {/* Stats Cards */}
            <YStack gap="$3" marginTop="$4">
              <Text fontSize="$5" fontWeight="600" color="$color">
                Today's Progress
              </Text>

              <XStack gap="$3">
                <StatCard
                  icon={<Fire size={20} color="#f97316" weight="thin" />}
                  label="Current Streak"
                  value={`${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
                  flex={1}
                />
                <StatCard
                  icon={<Clock size={20} color="#14b8a6" weight="thin" />}
                  label="This Week"
                  value={`${fastsThisWeek} ${fastsThisWeek === 1 ? 'fast' : 'fasts'}`}
                  flex={1}
                />
              </XStack>

              <StatCard
                icon={<Trophy size={20} color="#f59e0b" weight="thin" />}
                label="Longest Fast"
                value={longestFast ?? '--:--:--'}
              />
            </YStack>

            {/* Tips */}
            {!hasActiveFast && (
              <Card
                backgroundColor="$cardBackground"
                padding="$4"
                borderRadius="$4"
                marginTop="$2"
              >
                <YStack gap="$2">
                  <Text fontWeight="600" color="$color">
                    Tips for Success
                  </Text>
                  <Text fontSize="$3" color="$colorMuted" lineHeight={20}>
                    • Stay hydrated - water, black coffee, and tea are okay{'\n'}
                    • Keep busy to avoid thinking about food{'\n'}
                    • Start with 16:8 if you're new to fasting{'\n'}
                    • Listen to your body - it's okay to end early
                  </Text>
                </YStack>
              </Card>
            )}
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

// Stat card component
function StatCard({
  icon,
  label,
  value,
  flex,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  flex?: number;
}) {
  return (
    <Card
      backgroundColor="$cardBackground"
      padding="$4"
      borderRadius="$4"
      flex={flex}
    >
      <YStack gap="$2">
        <XStack gap="$2" alignItems="center">
          {icon}
          <Text fontSize="$3" color="$colorMuted">
            {label}
          </Text>
        </XStack>
        <Text fontSize="$6" fontWeight="bold" color="$color">
          {value}
        </Text>
      </YStack>
    </Card>
  );
}
