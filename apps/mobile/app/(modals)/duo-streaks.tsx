/**
 * Duo Streaks Screen
 * Shows active duo streaks and pending invites
 */

import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Fire, Warning } from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useDuoStreaks,
  useDuoStreakInvites,
  useDuoStreaksAtRisk,
} from '@/features/social/hooks';
import { DuoStreakCard, DuoStreakInviteCard } from '@/features/social/components';

type Tab = 'active' | 'invites';

export default function DuoStreaksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const {
    data: duoStreaks,
    isLoading: loadingStreaks,
    refetch: refetchStreaks,
    isRefetching: refetchingStreaks,
  } = useDuoStreaks();

  const {
    data: invites,
    isLoading: loadingInvites,
    refetch: refetchInvites,
    isRefetching: refetchingInvites,
  } = useDuoStreakInvites();

  const { data: atRiskStreaks } = useDuoStreaksAtRisk();

  const isLoading = activeTab === 'active' ? loadingStreaks : loadingInvites;
  const isRefetching = activeTab === 'active' ? refetchingStreaks : refetchingInvites;
  const refetch = activeTab === 'active' ? refetchStreaks : refetchInvites;

  const activeStreaks = duoStreaks?.filter((s) => !s.ended_at) ?? [];
  const pendingInvites = invites?.filter((i) => i.status === 'pending') ?? [];
  const atRiskCount = atRiskStreaks?.length ?? 0;

  const handleCreateStreak = () => {
    router.push('/friends');
    Alert.alert(
      'Start Duo Streak',
      'To start a duo streak, go to a friend\'s profile and tap "Start Duo Streak".',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader
        title="Duo Streaks"
        showBack={true}
        rightAction={
          <TouchableOpacity
            onPress={handleCreateStreak}
            style={[styles.addButton, { backgroundColor: theme.primary?.val || '#14b8a6' }]}
          >
            <Plus size={20} color="white" weight="bold" />
          </TouchableOpacity>
        }
      />

      {/* At Risk Warning */}
      {atRiskCount > 0 && (
        <XStack
          backgroundColor="$errorMuted"
          paddingHorizontal="$4"
          paddingVertical="$3"
          gap="$2"
          alignItems="center"
        >
          <Warning size={18} color={theme.error?.val || '#EF4444'} weight="fill" />
          <Text fontSize={14} color="$error" flex={1}>
            {atRiskCount} streak{atRiskCount > 1 ? 's' : ''} at risk! Complete your activity today.
          </Text>
        </XStack>
      )}

      {/* Tabs */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" gap="$3">
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Fire
            size={18}
            color={activeTab === 'active' ? 'white' : '#6b7280'}
            weight={activeTab === 'active' ? 'fill' : 'regular'}
          />
          <Text
            fontSize={15}
            fontWeight="600"
            color={activeTab === 'active' ? 'white' : '#6b7280'}
          >
            Active
          </Text>
          {activeStreaks.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'active' && styles.tabBadgeActive]}>
              <Text
                fontSize={11}
                fontWeight="700"
                color={activeTab === 'active' ? '#14b8a6' : 'white'}
              >
                {activeStreaks.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'invites' && styles.tabActive]}
          onPress={() => setActiveTab('invites')}
        >
          <Text
            fontSize={15}
            fontWeight="600"
            color={activeTab === 'invites' ? 'white' : '#6b7280'}
          >
            Invites
          </Text>
          {pendingInvites.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'invites' && styles.tabBadgeActive]}>
              <Text
                fontSize={11}
                fontWeight="700"
                color={activeTab === 'invites' ? '#14b8a6' : 'white'}
              >
                {pendingInvites.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </XStack>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <YStack paddingHorizontal="$4" gap="$3">
          {isLoading ? (
            <Text fontSize={14} color="#6b7280" textAlign="center" paddingVertical="$4">
              Loading...
            </Text>
          ) : activeTab === 'active' ? (
            activeStreaks.length > 0 ? (
              activeStreaks.map((streak) => (
                <DuoStreakCard
                  key={streak.id}
                  duoStreak={streak}
                  onPress={() => router.push(`/duo-streaks/${streak.id}`)}
                />
              ))
            ) : (
              <YStack alignItems="center" paddingVertical="$6" gap="$2">
                <Fire size={48} color="#6b7280" weight="thin" />
                <Text fontSize={16} color="#6b7280" textAlign="center">
                  No active duo streaks
                </Text>
                <Text fontSize={14} color="#9ca3af" textAlign="center">
                  Start a duo streak with a friend to hold each other accountable!
                </Text>
                <TouchableOpacity
                  onPress={handleCreateStreak}
                  style={[styles.ctaButton, { backgroundColor: theme.primary?.val || '#14b8a6' }]}
                >
                  <Text fontSize={15} fontWeight="600" color="white">
                    Find a Partner
                  </Text>
                </TouchableOpacity>
              </YStack>
            )
          ) : pendingInvites.length > 0 ? (
            pendingInvites.map((invite) => (
              <DuoStreakInviteCard key={invite.id} invite={invite} />
            ))
          ) : (
            <YStack alignItems="center" paddingVertical="$6" gap="$2">
              <Text fontSize={16} color="#6b7280" textAlign="center">
                No pending invites
              </Text>
              <Text fontSize={14} color="#9ca3af" textAlign="center">
                When someone invites you to a duo streak, it will appear here
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#14b8a6',
  },
  tabBadge: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'white',
  },
  ctaButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
