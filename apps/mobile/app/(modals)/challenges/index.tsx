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
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
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
  const iconColor = theme.color.val;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('browse');

  // Theme-aware colors from design tokens
  const cardBackground = theme.cardBackground.val;
  const cardBorder = theme.cardBorder.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const subtleColor = theme.colorSubtle.val;
  const primaryColor = theme.primary.val;

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
              <Ticket size={24} color={iconColor} weight="regular" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(modals)/challenges/create')}>
              <Plus size={24} color={iconColor} weight="regular" />
            </TouchableOpacity>
          </XStack>
        }
      />

      {/* Tabs */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" gap="$3">
        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor: activeTab === 'browse' ? primaryColor : cardBackground,
              borderWidth: 1,
              borderColor: cardBorder,
            },
          ]}
          onPress={() => setActiveTab('browse')}
        >
          <Text
            fontSize={15}
            fontWeight="600"
            style={{ color: activeTab === 'browse' ? 'white' : mutedColor }}
          >
            Browse
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor: activeTab === 'mine' ? primaryColor : cardBackground,
              borderWidth: 1,
              borderColor: cardBorder,
            },
          ]}
          onPress={() => setActiveTab('mine')}
        >
          <Text
            fontSize={15}
            fontWeight="600"
            style={{ color: activeTab === 'mine' ? 'white' : mutedColor }}
          >
            My Challenges
          </Text>
          {myChallenges && myChallenges.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'mine' ? 'white' : primaryColor }]}>
              <Text
                fontSize={11}
                fontWeight="700"
                style={{ color: activeTab === 'mine' ? primaryColor : 'white' }}
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
            <Text fontSize={14} style={{ color: mutedColor }} textAlign="center" paddingVertical="$4">
              Loading...
            </Text>
          ) : challenges && challenges.length > 0 ? (
            challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))
          ) : (
            <YStack alignItems="center" paddingVertical="$6" gap="$3">
              <Text fontSize={16} style={{ color: mutedColor }} textAlign="center">
                {activeTab === 'mine'
                  ? 'No active challenges'
                  : 'No challenges available'}
              </Text>
              <Text fontSize={14} style={{ color: subtleColor }} textAlign="center">
                {activeTab === 'mine'
                  ? 'Join a challenge or create your own to get started'
                  : 'Be the first to create a challenge for the community'}
              </Text>
              <XStack gap="$3">
                <TouchableOpacity
                  onPress={handleJoinByCode}
                  style={[styles.emptyButton, { backgroundColor: cardBackground, borderColor: primaryColor }]}
                >
                  <Ticket size={18} color={primaryColor} weight="bold" />
                  <Text style={{ color: primaryColor }} fontWeight="600" marginLeft={6}>
                    Join with Code
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(modals)/challenges/create')}
                  style={[styles.emptyButton, { backgroundColor: primaryColor, borderColor: primaryColor }]}
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
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
});
