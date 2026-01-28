/**
 * Challenge Detail Screen
 * Shows challenge details, progress, and leaderboard
 */

import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users, Calendar, Trophy, Clock, ShareNetwork, SignOut, Copy } from 'phosphor-react-native';
import * as Clipboard from 'expo-clipboard';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useChallenge,
  useChallengeLeaderboard,
  useJoinChallenge,
  useLeaveChallenge,
} from '@/features/social/hooks';
import { LeaderboardEntryRow } from '@/features/social/components';
import { CHALLENGE_TYPE_LABELS, CHALLENGE_STATUS_COLORS, CHALLENGE_TYPE_UNITS } from '@/features/social/types';

export default function ChallengeDetailScreen() {
  const theme = useTheme();
  const iconColor = theme.color.val;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  // Theme-aware colors from design tokens
  const cardBackground = theme.cardBackground.val;
  const cardBorder = theme.cardBorder.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const subtleBackground = theme.backgroundHover.val;
  const successSubtle = theme.successSubtle.val;
  const borderColor = theme.borderColor.val;
  const primaryColor = theme.primary.val;

  const { data: challenge, isLoading, refetch, isRefetching } = useChallenge(id);
  const { data: leaderboard } = useChallengeLeaderboard(id);
  const joinChallenge = useJoinChallenge();
  const leaveChallenge = useLeaveChallenge();

  if (!id) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.val }]}>
        <ScreenHeader title="Challenge" />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="#6b7280">Challenge not found</Text>
        </YStack>
      </View>
    );
  }

  const handleJoin = () => {
    // Show fasting safety warning before joining fasting challenges
    if (challenge?.challenge_type === 'fasting_streak') {
      Alert.alert(
        '⚠️ Health Warning',
        'Fasting challenges are only suitable for EXPERIENCED fasters.\n\n' +
          'Do NOT join if you:\n' +
          '• Are new to intermittent fasting\n' +
          '• Have diabetes or blood sugar issues\n' +
          '• Have eating disorder history\n' +
          '• Are pregnant or breastfeeding\n' +
          '• Have any medical conditions\n\n' +
          'Consult your doctor before participating.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Understand & Accept',
            onPress: () => {
              joinChallenge.mutate(id, {
                onSuccess: () => {
                  Alert.alert('Success', 'You joined the challenge!');
                  refetch();
                },
                onError: (error: any) => {
                  Alert.alert('Error', error.response?.data?.detail || 'Failed to join');
                },
              });
            },
          },
        ]
      );
    } else {
      joinChallenge.mutate(id, {
        onSuccess: () => {
          Alert.alert('Success', 'You joined the challenge!');
          refetch();
        },
        onError: (error: any) => {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to join');
        },
      });
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave Challenge', 'Are you sure you want to leave this challenge?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leaveChallenge.mutate(id, {
            onSuccess: () => {
              router.back();
            },
            onError: (error: any) => {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to leave');
            },
          });
        },
      },
    ]);
  };

  const handleCopyCode = async () => {
    if (challenge?.join_code) {
      await Clipboard.setStringAsync(challenge.join_code);
      Alert.alert('Copied!', 'Join code copied to clipboard');
    }
  };

  const handleShare = async () => {
    if (!challenge) return;
    try {
      await Share.share({
        message: `Join my "${challenge.name}" challenge on UGOKI! Use code: ${challenge.join_code}`,
      });
    } catch (error) {
      // User cancelled
    }
  };

  if (isLoading || !challenge) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.val }]}>
        <ScreenHeader title="Challenge" />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="#6b7280">Loading...</Text>
        </YStack>
      </View>
    );
  }

  const statusColor = CHALLENGE_STATUS_COLORS[challenge.status];
  const typeLabel = CHALLENGE_TYPE_LABELS[challenge.challenge_type];
  const unit = challenge.goal_unit || CHALLENGE_TYPE_UNITS[challenge.challenge_type];
  const progressPercent = challenge.my_progress
    ? Math.min(100, (challenge.my_progress / challenge.goal_value) * 100)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader
        title="Challenge"
        showClose
        rightAction={
          challenge.is_participating && (
            <TouchableOpacity onPress={handleShare}>
              <ShareNetwork size={24} color={iconColor} weight="regular" />
            </TouchableOpacity>
          )
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$3">
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} gap="$1">
              <Text fontSize={22} fontWeight="700" color="$color">
                {challenge.name}
              </Text>
              <Text fontSize={14} style={{ color: mutedColor }}>
                {typeLabel} - Goal: {challenge.goal_value} {unit}
              </Text>
            </YStack>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text fontSize={12} fontWeight="600" style={{ color: statusColor }}>
                {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
              </Text>
            </View>
          </XStack>

          {challenge.description && (
            <Text fontSize={15} style={{ color: mutedColor }}>
              {challenge.description}
            </Text>
          )}

          {/* Stats */}
          <XStack gap="$4" paddingTop="$2">
            <XStack alignItems="center" gap="$2">
              <Users size={18} color={mutedColor} />
              <Text fontSize={14} style={{ color: mutedColor }}>
                {challenge.participant_count}/{challenge.max_participants}
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$2">
              <Calendar size={18} color={mutedColor} />
              <Text fontSize={14} style={{ color: mutedColor }}>
                {challenge.days_remaining !== null
                  ? `${challenge.days_remaining} days left`
                  : challenge.status === 'upcoming'
                  ? 'Starting soon'
                  : 'Ended'}
              </Text>
            </XStack>
          </XStack>

          {/* Join Code */}
          <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
            <XStack
              backgroundColor={subtleBackground}
              borderRadius="$3"
              padding="$3"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize={14} style={{ color: mutedColor }}>
                Join Code
              </Text>
              <XStack alignItems="center" gap="$2">
                <Text fontSize={16} fontWeight="700" style={{ color: textColor }}>
                  {challenge.join_code}
                </Text>
                <Copy size={18} color={mutedColor} />
              </XStack>
            </XStack>
          </TouchableOpacity>
        </YStack>

        {/* My Progress (if participating) */}
        {challenge.is_participating && (
          <YStack
            marginHorizontal="$4"
            marginTop="$4"
            backgroundColor={successSubtle}
            borderRadius="$4"
            padding="$4"
            gap="$3"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$2">
                <Trophy size={20} color="#14b8a6" weight="fill" />
                <Text fontSize={16} fontWeight="600" color="#14b8a6">
                  Your Progress
                </Text>
              </XStack>
              {challenge.my_rank && (
                <Text fontSize={16} fontWeight="700" color="#14b8a6">
                  Rank #{challenge.my_rank}
                </Text>
              )}
            </XStack>

            <XStack justifyContent="space-between" alignItems="flex-end">
              <YStack>
                <Text fontSize={32} fontWeight="700" color="#14b8a6">
                  {Math.round(challenge.my_progress || 0)}
                </Text>
                <Text fontSize={13} color="#14b8a6">
                  of {challenge.goal_value} {unit}
                </Text>
              </YStack>
              <Text fontSize={24} fontWeight="700" color="#14b8a6">
                {Math.round(progressPercent)}%
              </Text>
            </XStack>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>
          </YStack>
        )}

        {/* Leaderboard */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$3">
          <Text fontSize={16} fontWeight="700" color="$color">
            Leaderboard
          </Text>

          {leaderboard && leaderboard.length > 0 ? (
            <YStack gap="$2">
              {leaderboard.map((participant) => (
                <LeaderboardEntryRow
                  key={participant.id}
                  entry={{
                    rank: participant.rank || 0,
                    identity_id: participant.identity_id,
                    username: participant.username,
                    display_name: participant.display_name,
                    avatar_url: participant.avatar_url,
                    value: participant.current_progress,
                    is_current_user: false, // TODO: Check against current user
                  }}
                  valueLabel={unit}
                />
              ))}
            </YStack>
          ) : (
            <Text fontSize={14} style={{ color: mutedColor }} textAlign="center" paddingVertical="$4">
              No participants yet
            </Text>
          )}
        </YStack>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16, backgroundColor: cardBackground, borderTopColor: borderColor }]}>
        {challenge.is_participating ? (
          <TouchableOpacity
            onPress={handleLeave}
            style={[styles.actionButton, styles.leaveButton]}
            disabled={leaveChallenge.isPending}
          >
            <SignOut size={20} color="#ef4444" weight="bold" />
            <Text color="#ef4444" fontWeight="600" marginLeft={8}>
              Leave Challenge
            </Text>
          </TouchableOpacity>
        ) : challenge.status === 'active' || challenge.status === 'upcoming' ? (
          <TouchableOpacity
            onPress={handleJoin}
            style={[styles.actionButton, styles.joinButton]}
            disabled={joinChallenge.isPending}
          >
            <Text color="white" fontWeight="700" fontSize={16}>
              Join Challenge
            </Text>
          </TouchableOpacity>
        ) : (
          <Text fontSize={14} style={{ color: mutedColor }} textAlign="center">
            This challenge has ended
          </Text>
        )}
      </View>
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 5,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  joinButton: {
    backgroundColor: '#14b8a6',
  },
  leaveButton: {
    backgroundColor: '#fee2e2',
  },
});
