/**
 * Leaderboards Screen
 * Shows global and friends leaderboards for XP and streaks
 */

import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Users, Flame, Star } from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import { useLeaderboard } from '@/features/social/hooks';
import { LeaderboardEntryRow } from '@/features/social/components';
import type { LeaderboardType, LeaderboardPeriod } from '@/features/social/types';

type MetricType = 'xp' | 'streaks';
type ScopeType = 'global' | 'friends';

export default function LeaderboardsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<ScopeType>('global');
  const [metric, setMetric] = useState<MetricType>('xp');
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');

  // Theme-aware colors from design tokens
  const cardBackground = theme.cardBackground.val;
  const cardBorder = theme.cardBorder.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const subtleColor = theme.colorSubtle.val;
  const borderColor = theme.borderColor.val;
  const primaryColor = theme.primary.val;
  const successColor = theme.success.val;
  const successSubtle = theme.successSubtle.val;

  const leaderboardType: LeaderboardType = `${scope}_${metric}` as LeaderboardType;
  const valueLabel = metric === 'xp' ? 'XP' : 'days';

  const { data: leaderboard, isLoading, refetch, isRefetching } = useLeaderboard(
    leaderboardType,
    period
  );

  const periods: { value: LeaderboardPeriod; label: string }[] = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all_time', label: 'All Time' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader title="Leaderboards" showClose />

      {/* Scope Toggle */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" gap="$3">
        <TouchableOpacity
          style={[
            styles.scopeButton,
            { backgroundColor: scope === 'global' ? primaryColor : cardBackground, borderColor: cardBorder, borderWidth: 1 },
          ]}
          onPress={() => setScope('global')}
        >
          <Trophy size={18} color={scope === 'global' ? 'white' : mutedColor} weight="fill" />
          <Text
            fontSize={14}
            fontWeight="600"
            style={{ color: scope === 'global' ? 'white' : mutedColor }}
          >
            Global
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scopeButton,
            { backgroundColor: scope === 'friends' ? primaryColor : cardBackground, borderColor: cardBorder, borderWidth: 1 },
          ]}
          onPress={() => setScope('friends')}
        >
          <Users size={18} color={scope === 'friends' ? 'white' : mutedColor} weight="fill" />
          <Text
            fontSize={14}
            fontWeight="600"
            style={{ color: scope === 'friends' ? 'white' : mutedColor }}
          >
            Friends
          </Text>
        </TouchableOpacity>
      </XStack>

      {/* Metric Toggle */}
      <XStack paddingHorizontal="$4" gap="$3">
        <TouchableOpacity
          style={[
            styles.metricButton,
            {
              backgroundColor: metric === 'xp' ? successSubtle : cardBackground,
              borderColor: metric === 'xp' ? successColor : borderColor,
            },
          ]}
          onPress={() => setMetric('xp')}
        >
          <Star size={16} color={metric === 'xp' ? successColor : mutedColor} weight="fill" />
          <Text
            fontSize={13}
            fontWeight="500"
            style={{ color: metric === 'xp' ? successColor : mutedColor }}
          >
            XP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.metricButton,
            {
              backgroundColor: metric === 'streaks' ? successSubtle : cardBackground,
              borderColor: metric === 'streaks' ? successColor : borderColor,
            },
          ]}
          onPress={() => setMetric('streaks')}
        >
          <Flame size={16} color={metric === 'streaks' ? successColor : mutedColor} weight="fill" />
          <Text
            fontSize={13}
            fontWeight="500"
            style={{ color: metric === 'streaks' ? successColor : mutedColor }}
          >
            Streaks
          </Text>
        </TouchableOpacity>
      </XStack>

      {/* Period Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodContainer}
      >
        {periods.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.periodButton,
              {
                backgroundColor: period === p.value ? primaryColor : cardBackground,
                borderColor: cardBorder,
                borderWidth: 1,
              },
            ]}
            onPress={() => setPeriod(p.value)}
          >
            <Text
              fontSize={13}
              fontWeight="500"
              style={{ color: period === p.value ? 'white' : mutedColor }}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* My Rank Card */}
      {leaderboard && leaderboard.my_rank && (
        <XStack
          marginHorizontal="$4"
          marginTop="$3"
          backgroundColor="$successSubtle"
          borderRadius="$3"
          borderWidth={1}
          borderColor="$cardBorder"
          padding="$3"
          justifyContent="space-between"
          alignItems="center"
        >
          <XStack alignItems="center" gap="$2">
            <Trophy size={20} color={successColor} weight="fill" />
            <Text fontSize={14} fontWeight="600" color="$success">
              Your Rank
            </Text>
          </XStack>
          <XStack alignItems="center" gap="$3">
            <Text fontSize={18} fontWeight="700" color="$success">
              #{leaderboard.my_rank}
            </Text>
            <Text fontSize={14} color="$success">
              {Math.round(leaderboard.my_value || 0).toLocaleString()} {valueLabel}
            </Text>
          </XStack>
        </XStack>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <YStack paddingHorizontal="$4" paddingTop="$3" gap="$2">
          {isLoading ? (
            <Text fontSize={14} style={{ color: mutedColor }} textAlign="center" paddingVertical="$4">
              Loading...
            </Text>
          ) : leaderboard && leaderboard.entries.length > 0 ? (
            leaderboard.entries.map((entry) => (
              <LeaderboardEntryRow
                key={entry.identity_id}
                entry={entry}
                valueLabel={valueLabel}
              />
            ))
          ) : (
            <YStack alignItems="center" paddingVertical="$6" gap="$2">
              <Text fontSize={16} style={{ color: mutedColor }} textAlign="center">
                {scope === 'friends'
                  ? 'Add friends to see how you compare!'
                  : 'No entries yet'}
              </Text>
              <Text fontSize={14} style={{ color: subtleColor }} textAlign="center">
                {scope === 'friends'
                  ? 'Your friends will appear here once you connect'
                  : 'Be the first to top the leaderboard!'}
              </Text>
            </YStack>
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
  scopeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
});
