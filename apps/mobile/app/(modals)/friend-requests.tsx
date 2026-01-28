/**
 * Friend Requests Screen
 * Shows incoming and outgoing friend requests
 */

import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
} from '@/features/social/hooks';
import { FriendRequestCard } from '@/features/social/components';

type Tab = 'incoming' | 'outgoing';

export default function FriendRequestsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('incoming');

  const {
    data: incomingRequests,
    isLoading: loadingIncoming,
    refetch: refetchIncoming,
    isRefetching: refetchingIncoming,
  } = useIncomingFriendRequests();

  const {
    data: outgoingRequests,
    isLoading: loadingOutgoing,
    refetch: refetchOutgoing,
    isRefetching: refetchingOutgoing,
  } = useOutgoingFriendRequests();

  const isLoading = activeTab === 'incoming' ? loadingIncoming : loadingOutgoing;
  const isRefetching = activeTab === 'incoming' ? refetchingIncoming : refetchingOutgoing;
  const refetch = activeTab === 'incoming' ? refetchIncoming : refetchOutgoing;
  const requests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader title="Friend Requests" />

      {/* Tabs */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" gap="$3">
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.tabActive]}
          onPress={() => setActiveTab('incoming')}
        >
          <Text
            fontSize={15}
            fontWeight="600"
            color={activeTab === 'incoming' ? 'white' : '#6b7280'}
          >
            Incoming
          </Text>
          {incomingRequests && incomingRequests.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'incoming' && styles.tabBadgeActive]}>
              <Text
                fontSize={11}
                fontWeight="700"
                color={activeTab === 'incoming' ? '#14b8a6' : 'white'}
              >
                {incomingRequests.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'outgoing' && styles.tabActive]}
          onPress={() => setActiveTab('outgoing')}
        >
          <Text
            fontSize={15}
            fontWeight="600"
            color={activeTab === 'outgoing' ? 'white' : '#6b7280'}
          >
            Outgoing
          </Text>
          {outgoingRequests && outgoingRequests.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'outgoing' && styles.tabBadgeActive]}>
              <Text
                fontSize={11}
                fontWeight="700"
                color={activeTab === 'outgoing' ? '#14b8a6' : 'white'}
              >
                {outgoingRequests.length}
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
          ) : requests && requests.length > 0 ? (
            requests.map((request) => (
              <FriendRequestCard key={request.id} request={request} type={activeTab} />
            ))
          ) : (
            <YStack alignItems="center" paddingVertical="$6" gap="$2">
              <Text fontSize={16} color="#6b7280" textAlign="center">
                {activeTab === 'incoming'
                  ? 'No pending requests'
                  : 'No outgoing requests'}
              </Text>
              <Text fontSize={14} color="#9ca3af" textAlign="center">
                {activeTab === 'incoming'
                  ? 'When someone sends you a friend request, it will appear here'
                  : 'Friend requests you send will appear here until accepted'}
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
});
