/**
 * Team Detail Screen
 * Shows team details and provides navigation to chat
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users, ChatCircle, Trophy, SignOut, Copy } from 'phosphor-react-native';
import * as Clipboard from 'expo-clipboard';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useChallengeTeam,
  useLeaveTeam,
  useTeamUnreadCount,
} from '@/features/social/hooks';
import { UnreadBadge } from '@/features/social/components';
import type { ChallengeParticipant } from '@/features/social/types';

export default function TeamDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId: string }>();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

  const {
    data: team,
    isLoading,
    refetch,
    isRefetching,
  } = useChallengeTeam(teamId || '', true);
  const leaveTeam = useLeaveTeam();
  const unreadCount = useTeamUnreadCount(teamId || '');

  const primaryColor = theme.primary?.val || '#3A5BA0';
  const mutedColor = theme.colorMuted?.val || '#6B7280';

  const handleCopyCode = async () => {
    if (team?.join_code) {
      await Clipboard.setStringAsync(team.join_code);
      Alert.alert('Copied!', 'Team join code copied to clipboard');
    }
  };

  const handleOpenChat = () => {
    router.push(`/challenges/team/${teamId}/chat`);
  };

  const handleLeave = () => {
    Alert.alert('Leave Team', 'Are you sure you want to leave this team?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leaveTeam.mutate(teamId!, {
            onSuccess: () => {
              router.back();
            },
            onError: (error: any) => {
              Alert.alert('Error', error.message || 'Failed to leave team');
            },
          });
        },
      },
    ]);
  };

  if (!teamId || isLoading || !team) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background?.val }]}>
        <ScreenHeader title="Team" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$colorMuted">
            {!teamId ? 'Team not found' : 'Loading...'}
          </Text>
        </YStack>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val }]}>
      <ScreenHeader title="Team" showClose />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Team Header */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$3">
          <YStack gap="$1">
            <Text fontSize={24} fontWeight="700" color="$color">
              {team.name}
            </Text>
            <Text fontSize={14} color="$colorMuted">
              {team.member_count} member{team.member_count !== 1 ? 's' : ''}
            </Text>
          </YStack>

          {/* Stats Row */}
          <XStack gap="$4" paddingTop="$2">
            <XStack alignItems="center" gap="$2">
              <Trophy size={18} color={mutedColor} />
              <Text fontSize={14} color="$colorMuted">
                Rank #{team.rank || '-'}
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$2">
              <Users size={18} color={mutedColor} />
              <Text fontSize={14} color="$colorMuted">
                {team.total_progress.toFixed(1)} total progress
              </Text>
            </XStack>
          </XStack>

          {/* Join Code */}
          <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
            <XStack
              backgroundColor="$backgroundHover"
              borderRadius="$3"
              padding="$3"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize={14} color="$colorMuted">
                Team Join Code
              </Text>
              <XStack alignItems="center" gap="$2">
                <Text fontSize={16} fontWeight="700" color="$color">
                  {team.join_code}
                </Text>
                <Copy size={18} color={mutedColor} />
              </XStack>
            </XStack>
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity
            onPress={handleOpenChat}
            activeOpacity={0.7}
            style={[styles.chatButton, { backgroundColor: primaryColor }]}
          >
            <XStack alignItems="center" justifyContent="center" gap="$2">
              <ChatCircle size={22} color="white" weight="fill" />
              <Text color="white" fontWeight="600" fontSize={16}>
                Team Chat
              </Text>
              {unreadCount > 0 && (
                <UnreadBadge count={unreadCount} size="small" />
              )}
            </XStack>
          </TouchableOpacity>
        </YStack>

        {/* Members */}
        <YStack paddingHorizontal="$4" paddingTop="$6" gap="$3">
          <Text fontSize={16} fontWeight="700" color="$color">
            Team Members
          </Text>

          {team.members && team.members.length > 0 ? (
            <YStack gap="$2">
              {team.members.map((member: ChallengeParticipant) => (
                <XStack
                  key={member.id}
                  backgroundColor="$cardBackground"
                  borderRadius="$3"
                  padding="$3"
                  alignItems="center"
                  gap="$3"
                >
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: theme.backgroundHover?.val },
                      ]}
                    />
                  ) : (
                    <View
                      style={[styles.memberAvatar, { backgroundColor: primaryColor }]}
                    >
                      <Text color="white" fontSize={12} fontWeight="600">
                        {(member.display_name || member.username || '?')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="500" color="$color">
                      {member.display_name || member.username || 'Unknown'}
                    </Text>
                    <Text fontSize={12} color="$colorMuted">
                      Progress: {member.current_progress.toFixed(1)}
                    </Text>
                  </YStack>
                  {member.rank && (
                    <Text fontSize={12} color="$colorMuted" fontWeight="600">
                      #{member.rank}
                    </Text>
                  )}
                </XStack>
              ))}
            </YStack>
          ) : (
            <Text fontSize={14} color="$colorMuted" textAlign="center" paddingVertical="$4">
              No members yet
            </Text>
          )}
        </YStack>
      </ScrollView>

      {/* Leave Team Button */}
      <View
        style={[
          styles.bottomAction,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.cardBackground.val,
            borderTopColor: theme.borderColor.val,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleLeave}
          style={styles.leaveButton}
          disabled={leaveTeam.isPending}
        >
          <SignOut size={20} color="#ef4444" weight="bold" />
          <Text color="#ef4444" fontWeight="600" marginLeft={8}>
            Leave Team
          </Text>
        </TouchableOpacity>
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
  chatButton: {
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
});
