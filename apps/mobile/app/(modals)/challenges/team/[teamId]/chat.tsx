/**
 * Team Chat Screen
 * Full-screen team messaging interface
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, YStack, useTheme } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '@/shared/components/ui';
import { TeamChat, UnreadBadge } from '@/features/social/components';
import { useChallengeTeam, useTeamUnreadCount } from '@/features/social/hooks';

export default function TeamChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ teamId: string }>();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

  const { data: team, isLoading } = useChallengeTeam(teamId || '', true);
  const unreadCount = useTeamUnreadCount(teamId || '');

  if (!teamId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background?.val }]}>
        <ScreenHeader title="Team Chat" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$colorMuted" fontSize="$3">Team not found</Text>
        </YStack>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val }]}>
      <ScreenHeader
        title={team?.name || 'Team Chat'}
        showClose
        rightAction={
          unreadCount > 0 ? <UnreadBadge count={unreadCount} size="small" /> : undefined
        }
      />

      {isLoading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$colorMuted" fontSize="$3">Loading...</Text>
        </YStack>
      ) : (
        <TeamChat teamId={teamId} teamName={team?.name} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
