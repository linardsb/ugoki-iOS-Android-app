/**
 * DuoStreakCard Component
 * Displays a duo streak with partner info, streak count, and daily status
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView, Alert } from 'react-native';
import { XStack, YStack, Text, useTheme } from '@/shared/components/tamagui';
import { useRouter } from 'expo-router';
import { Fire, Timer, Barbell, Check, Warning, X } from 'phosphor-react-native';
import { useEndDuoStreak } from '../hooks';
import type { DuoStreak, DuoStreakType } from '../types';
import { DUO_STREAK_TYPE_LABELS, DUO_STREAK_MILESTONES } from '../types';

interface DuoStreakCardProps {
  duoStreak: DuoStreak;
  onPress?: () => void;
}

export function DuoStreakCard({ duoStreak, onPress }: DuoStreakCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const endMutation = useEndDuoStreak();

  // Theme-aware colors
  const primaryColor = theme.primary?.val || '#3A5BA0';
  const primaryBgColor = theme.primaryMuted?.val || theme.backgroundHover.val;
  const successColor = theme.success?.val || '#4A9B7F';
  const warningColor = theme.warning?.val || '#F59E0B';
  const errorColor = theme.error?.val || '#EF4444';
  const mutedColor = theme.colorMuted.val;
  const mutedBgColor = theme.backgroundHover.val;

  const getStreakIcon = (type: DuoStreakType) => {
    switch (type) {
      case 'fasting':
        return Timer;
      case 'workout':
        return Barbell;
      case 'combined':
        return Fire;
    }
  };

  const getStreakColor = () => {
    // Red if at risk (neither completed), yellow if one completed, green if both
    if (!duoStreak.my_completed_today && !duoStreak.partner_completed_today) {
      return errorColor;
    }
    if (duoStreak.my_completed_today && duoStreak.partner_completed_today) {
      return successColor;
    }
    return warningColor;
  };

  const handleViewProfile = () => {
    router.push(`/user/${duoStreak.partner_id}`);
  };

  const handleEndStreak = () => {
    Alert.alert(
      'End Duo Streak',
      `Are you sure you want to end your ${duoStreak.current_streak}-day streak with ${partnerName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Streak',
          style: 'destructive',
          onPress: () => {
            endMutation.mutate(duoStreak.id, {
              onError: () => {
                Alert.alert('Error', 'Failed to end duo streak');
              },
            });
          },
        },
      ]
    );
  };

  const partnerName = duoStreak.partner_display_name || duoStreak.partner_username || 'Partner';
  const initials = partnerName.slice(0, 2).toUpperCase();
  const Icon = getStreakIcon(duoStreak.streak_type);
  const streakColor = getStreakColor();

  // Find next milestone
  const nextMilestone = DUO_STREAK_MILESTONES.find((m) => m > duoStreak.current_streak);
  const daysToMilestone = nextMilestone ? nextMilestone - duoStreak.current_streak : null;

  // Check if at risk (user hasn't completed today)
  const isAtRisk = !duoStreak.my_completed_today;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <XStack
        backgroundColor="$cardBackground"
        borderRadius="$3"
        borderWidth={1}
        borderColor={isAtRisk ? '$error' : '$cardBorder'}
        padding="$3"
        alignItems="center"
        gap="$3"
      >
        {/* Partner Avatar */}
        <TouchableOpacity onPress={handleViewProfile} activeOpacity={0.7}>
          {duoStreak.partner_avatar_url ? (
            <Image
              source={{ uri: duoStreak.partner_avatar_url }}
              style={[styles.avatar, { backgroundColor: mutedBgColor }]}
            />
          ) : (
            <RNView style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
              <Text color="white" fontSize="$4" fontWeight="600">
                {initials}
              </Text>
            </RNView>
          )}
        </TouchableOpacity>

        {/* Streak Info */}
        <YStack flex={1} gap="$1">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$4" fontWeight="600" color="$color">
              {partnerName}
            </Text>
            <XStack alignItems="center" gap="$1">
              <Icon size={18} color={streakColor} weight="fill" />
              <Text fontSize="$5" fontWeight="700" color="$color">
                {duoStreak.current_streak}
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                days
              </Text>
            </XStack>
          </XStack>

          <XStack gap="$2" alignItems="center">
            <RNView style={[styles.typeBadge, { backgroundColor: primaryBgColor }]}>
              <Text fontSize="$2" fontWeight="500" color="$primary">
                {DUO_STREAK_TYPE_LABELS[duoStreak.streak_type]}
              </Text>
            </RNView>
            {nextMilestone && (
              <Text fontSize="$2" color="$colorSubtle">
                {daysToMilestone}d to {nextMilestone}-day milestone
              </Text>
            )}
          </XStack>

          {/* Daily Status */}
          <XStack gap="$3" marginTop="$1">
            <XStack alignItems="center" gap="$1">
              {duoStreak.my_completed_today ? (
                <Check size={14} color={successColor} weight="bold" />
              ) : (
                <X size={14} color={errorColor} weight="bold" />
              )}
              <Text fontSize="$2" color={duoStreak.my_completed_today ? '$success' : '$error'}>
                You
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$1">
              {duoStreak.partner_completed_today ? (
                <Check size={14} color={successColor} weight="bold" />
              ) : (
                <X size={14} color={errorColor} weight="bold" />
              )}
              <Text
                fontSize="$2"
                color={duoStreak.partner_completed_today ? '$success' : '$error'}
              >
                {duoStreak.partner_username || 'Partner'}
              </Text>
            </XStack>
          </XStack>
        </YStack>

        {/* At Risk Warning */}
        {isAtRisk && (
          <TouchableOpacity
            onPress={handleEndStreak}
            style={[styles.warningButton, { backgroundColor: `${warningColor}20` }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Warning size={20} color={warningColor} weight="fill" />
          </TouchableOpacity>
        )}
      </XStack>
    </TouchableOpacity>
  );
}

// =========================================================================
// DuoStreakInviteCard - For incoming invites
// =========================================================================

import type { DuoStreakInvite } from '../types';
import { useRespondToDuoStreakInvite } from '../hooks';

interface DuoStreakInviteCardProps {
  invite: DuoStreakInvite;
}

export function DuoStreakInviteCard({ invite }: DuoStreakInviteCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const respondMutation = useRespondToDuoStreakInvite();

  const primaryColor = theme.primary?.val || '#3A5BA0';
  const primaryBgColor = theme.primaryMuted?.val || theme.backgroundHover.val;
  const successColor = theme.success?.val || '#4A9B7F';
  const errorColor = theme.error?.val || '#EF4444';
  const errorBgColor = theme.errorMuted?.val || theme.backgroundHover.val;
  const mutedBgColor = theme.backgroundHover.val;

  const handleAccept = () => {
    respondMutation.mutate(
      { inviteId: invite.id, accept: true },
      {
        onError: () => {
          Alert.alert('Error', 'Failed to accept duo streak invite');
        },
      }
    );
  };

  const handleDecline = () => {
    Alert.alert('Decline Invite', 'Are you sure you want to decline this duo streak invite?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => {
          respondMutation.mutate(
            { inviteId: invite.id, accept: false },
            {
              onError: () => {
                Alert.alert('Error', 'Failed to decline duo streak invite');
              },
            }
          );
        },
      },
    ]);
  };

  const handleViewProfile = () => {
    router.push(`/user/${invite.inviter_id}`);
  };

  const inviterName = invite.inviter_display_name || invite.inviter_username || 'User';
  const initials = inviterName.slice(0, 2).toUpperCase();
  const Icon = invite.streak_type === 'fasting' ? Timer : invite.streak_type === 'workout' ? Barbell : Fire;

  const timeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  return (
    <XStack
      backgroundColor="$cardBackground"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$cardBorder"
      padding="$3"
      alignItems="center"
      gap="$3"
    >
      {/* Inviter Avatar */}
      <TouchableOpacity onPress={handleViewProfile} activeOpacity={0.7}>
        {invite.inviter_avatar_url ? (
          <Image
            source={{ uri: invite.inviter_avatar_url }}
            style={[styles.avatar, { backgroundColor: mutedBgColor }]}
          />
        ) : (
          <RNView style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
            <Text color="white" fontSize="$4" fontWeight="600">
              {initials}
            </Text>
          </RNView>
        )}
      </TouchableOpacity>

      {/* Invite Info */}
      <TouchableOpacity onPress={handleViewProfile} style={{ flex: 1 }} activeOpacity={0.7}>
        <YStack gap="$1">
          <Text fontSize="$4" fontWeight="600" color="$color">
            {inviterName}
          </Text>
          <XStack gap="$2" alignItems="center">
            <Icon size={14} color={primaryColor} />
            <Text fontSize="$3" color="$colorMuted">
              {DUO_STREAK_TYPE_LABELS[invite.streak_type]} Duo Streak
            </Text>
          </XStack>
          <Text fontSize="$3" color="$colorSubtle">
            {timeSince(invite.created_at)}
          </Text>
        </YStack>
      </TouchableOpacity>

      {/* Actions */}
      <XStack gap="$2">
        <TouchableOpacity
          onPress={handleAccept}
          disabled={respondMutation.isPending}
          style={[styles.actionButton, { backgroundColor: successColor }]}
        >
          <Check size={20} color="white" weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDecline}
          disabled={respondMutation.isPending}
          style={[styles.actionButton, { backgroundColor: errorBgColor }]}
        >
          <X size={20} color={errorColor} weight="bold" />
        </TouchableOpacity>
      </XStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
