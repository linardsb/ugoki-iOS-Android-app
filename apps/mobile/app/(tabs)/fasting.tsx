import { useEffect } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fire, Clock, Trophy } from 'phosphor-react-native';

import {
  FastingTimer,
  FastingControls,
  useActiveFast,
  useFastingStore,
  useHasActiveFast,
} from '@/features/fasting';
import { ThemeToggle } from '@/shared/components/ui';

export default function FastingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: serverFast, isLoading, refetch, isRefetching } = useActiveFast();
  const { syncFromServer, activeWindow } = useFastingStore();
  const hasActiveFast = useHasActiveFast();

  // Sync server state to local store
  useEffect(() => {
    if (!isLoading) {
      syncFromServer(serverFast ?? null);
    }
  }, [serverFast, isLoading]);

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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
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
                  icon={<Fire size={20} color="$primary" weight="thin" />}
                  label="Current Streak"
                  value="0 days"
                  flex={1}
                />
                <StatCard
                  icon={<Clock size={20} color="$secondary" weight="thin" />}
                  label="This Week"
                  value="0 fasts"
                  flex={1}
                />
              </XStack>

              <StatCard
                icon={<Trophy size={20} color="#f59e0b" weight="thin" />}
                label="Longest Fast"
                value="--:--:--"
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
          <Text fontSize="$2" color="$colorMuted">
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
