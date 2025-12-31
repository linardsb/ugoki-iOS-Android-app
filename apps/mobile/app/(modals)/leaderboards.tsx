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
          style={[styles.scopeButton, scope === 'global' && styles.scopeButtonActive]}
          onPress={() => setScope('global')}
        >
          <Trophy size={18} color={scope === 'global' ? 'white' : '#6b7280'} weight="fill" />
          <Text
            fontSize={14}
            fontWeight="600"
            color={scope === 'global' ? 'white' : '#6b7280'}
          >
            Global
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scopeButton, scope === 'friends' && styles.scopeButtonActive]}
          onPress={() => setScope('friends')}
        >
          <Users size={18} color={scope === 'friends' ? 'white' : '#6b7280'} weight="fill" />
          <Text
            fontSize={14}
            fontWeight="600"
            color={scope === 'friends' ? 'white' : '#6b7280'}
          >
            Friends
          </Text>
        </TouchableOpacity>
      </XStack>

      {/* Metric Toggle */}
      <XStack paddingHorizontal="$4" gap="$3">
        <TouchableOpacity
          style={[styles.metricButton, metric === 'xp' && styles.metricButtonActive]}
          onPress={() => setMetric('xp')}
        >
          <Star size={16} color={metric === 'xp' ? '#14b8a6' : '#6b7280'} weight="fill" />
          <Text
            fontSize={13}
            fontWeight="500"
            color={metric === 'xp' ? '#14b8a6' : '#6b7280'}
          >
            XP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricButton, metric === 'streaks' && styles.metricButtonActive]}
          onPress={() => setMetric('streaks')}
        >
          <Flame size={16} color={metric === 'streaks' ? '#14b8a6' : '#6b7280'} weight="fill" />
          <Text
            fontSize={13}
            fontWeight="500"
            color={metric === 'streaks' ? '#14b8a6' : '#6b7280'}
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
            style={[styles.periodButton, period === p.value && styles.periodButtonActive]}
            onPress={() => setPeriod(p.value)}
          >
            <Text
              fontSize={13}
              fontWeight="500"
              color={period === p.value ? 'white' : '#6b7280'}
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
          backgroundColor="#d1fae5"
          borderRadius="$3"
          padding="$3"
          justifyContent="space-between"
          alignItems="center"
        >
          <XStack alignItems="center" gap="$2">
            <Trophy size={20} color="#14b8a6" weight="fill" />
            <Text fontSize={14} fontWeight="600" color="#14b8a6">
              Your Rank
            </Text>
          </XStack>
          <XStack alignItems="center" gap="$3">
            <Text fontSize={18} fontWeight="700" color="#14b8a6">
              #{leaderboard.my_rank}
            </Text>
            <Text fontSize={14} color="#14b8a6">
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
            <Text fontSize={14} color="#6b7280" textAlign="center" paddingVertical="$4">
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
              <Text fontSize={16} color="#6b7280" textAlign="center">
                {scope === 'friends'
                  ? 'Add friends to see how you compare!'
                  : 'No entries yet'}
              </Text>
              <Text fontSize={14} color="#9ca3af" textAlign="center">
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
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 12,
  },
  scopeButtonActive: {
    backgroundColor: '#14b8a6',
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  metricButtonActive: {
    borderColor: '#14b8a6',
    backgroundColor: '#d1fae5',
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
    backgroundColor: 'white',
    marginRight: 8,
  },
  periodButtonActive: {
    backgroundColor: '#6b7280',
  },
});
