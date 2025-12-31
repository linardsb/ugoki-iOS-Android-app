/**
 * Challenges List Screen
 * Shows available and active challenges
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, MagnifyingGlass, Ticket } from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useChallenges,
  useMyChallenges,
  useJoinChallengeByCode,
} from '@/features/social/hooks';
import { ChallengeCard } from '@/features/social/components';

type Tab = 'browse' | 'mine';

export default function ChallengesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('browse');

  const {
    data: allChallenges,
    isLoading: loadingAll,
    refetch: refetchAll,
    isRefetching: refetchingAll,
  } = useChallenges(true, true);

  const {
    data: myChallenges,
    isLoading: loadingMine,
    refetch: refetchMine,
    isRefetching: refetchingMine,
  } = useMyChallenges(true);

  const joinByCode = useJoinChallengeByCode();

  const isLoading = activeTab === 'browse' ? loadingAll : loadingMine;
  const isRefetching = activeTab === 'browse' ? refetchingAll : refetchingMine;
  const refetch = activeTab === 'browse' ? refetchAll : refetchMine;
  const challenges = activeTab === 'browse' ? allChallenges : myChallenges;

  const handleJoinByCode = () => {
    Alert.prompt(
      'Join Challenge',
      'Enter the challenge code:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: (code) => {
            if (code) {
              joinByCode.mutate(code.toUpperCase(), {
                onSuccess: (participant) => {
                  Alert.alert('Success', 'You joined the challenge!');
                  refetchMine();
                },
                onError: (error: any) => {
                  Alert.alert(
                    'Error',
                    error.response?.data?.detail || 'Invalid code or challenge is full'
                  );
                },
              });
            }
          },
        },
      ],
      'plain-text'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader
        title="Challenges"
        showClose
        rightAction={
          <XStack gap="$3">
            <TouchableOpacity onPress={handleJoinByCode}>
              <Ticket size={24} color="#2B2B32" weight="regular" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/challenges/create')}>
              <Plus size={24} color="#2B2B32" weight="regular" />
            </TouchableOpacity>
          </XStack>
        }
      />

      {/* Tabs */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" gap="$3">
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
          onPress={() => setActiveTab('browse')}
        >
          <Text
            fontSize={15}
            fontWeight="600"
            color={activeTab === 'browse' ? 'white' : '#6b7280'}
          >
            Browse
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'mine' && styles.tabActive]}
          onPress={() => setActiveTab('mine')}
        >
          <Text
            fontSize={15}
            fontWeight="600"
            color={activeTab === 'mine' ? 'white' : '#6b7280'}
          >
            My Challenges
          </Text>
          {myChallenges && myChallenges.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'mine' && styles.tabBadgeActive]}>
              <Text
                fontSize={11}
                fontWeight="700"
                color={activeTab === 'mine' ? '#14b8a6' : 'white'}
              >
                {myChallenges.length}
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
          ) : challenges && challenges.length > 0 ? (
            challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))
          ) : (
            <YStack alignItems="center" paddingVertical="$6" gap="$3">
              <Text fontSize={16} color="#6b7280" textAlign="center">
                {activeTab === 'mine'
                  ? 'No active challenges'
                  : 'No challenges available'}
              </Text>
              <Text fontSize={14} color="#9ca3af" textAlign="center">
                {activeTab === 'mine'
                  ? 'Join a challenge or create your own to get started'
                  : 'Be the first to create a challenge for the community'}
              </Text>
              <XStack gap="$3">
                <TouchableOpacity
                  onPress={handleJoinByCode}
                  style={styles.emptyButton}
                >
                  <Ticket size={18} color="#14b8a6" weight="bold" />
                  <Text color="#14b8a6" fontWeight="600" marginLeft={6}>
                    Join with Code
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/challenges/create')}
                  style={[styles.emptyButton, styles.emptyButtonFilled]}
                >
                  <Plus size={18} color="white" weight="bold" />
                  <Text color="white" fontWeight="600" marginLeft={6}>
                    Create
                  </Text>
                </TouchableOpacity>
              </XStack>
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  emptyButtonFilled: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
});
