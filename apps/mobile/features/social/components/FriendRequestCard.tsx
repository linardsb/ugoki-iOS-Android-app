/**
 * FriendRequestCard Component
 * Displays a friend request with accept/decline buttons
 * Uses theme tokens for all colors - no hardcoded values.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, View as RNView, Alert } from 'react-native';
import { XStack, YStack, Text, Button, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { Check, X } from 'phosphor-react-native';
import { useRespondToFriendRequest } from '../hooks';
import type { FriendRequest } from '../types';

interface FriendRequestCardProps {
  request: FriendRequest;
  type: 'incoming' | 'outgoing';
}

export function FriendRequestCard({ request, type }: FriendRequestCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const respondMutation = useRespondToFriendRequest();

  // Theme-aware colors from Tamagui theme tokens
  const primaryColor = theme.primary?.val || '#3A5BA0';
  const primaryBgColor = theme.primaryMuted?.val || theme.backgroundHover.val;
  const successColor = theme.success?.val || '#4A9B7F';
  const errorColor = theme.error?.val || '#EF4444';
  const errorBgColor = theme.errorMuted?.val || theme.backgroundHover.val;
  const mutedColor = theme.colorMuted.val;
  const mutedBgColor = theme.backgroundHover.val;

  const handleAccept = () => {
    respondMutation.mutate(
      { requestId: request.id, accept: true },
      {
        onError: (error) => {
          Alert.alert('Error', 'Failed to accept friend request');
        },
      }
    );
  };

  const handleDecline = () => {
    Alert.alert('Decline Request', 'Are you sure you want to decline this friend request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => {
          respondMutation.mutate(
            { requestId: request.id, accept: false },
            {
              onError: (error) => {
                Alert.alert('Error', 'Failed to decline friend request');
              },
            }
          );
        },
      },
    ]);
  };

  const handleViewProfile = () => {
    router.push(`/user/${request.user_id}`);
  };

  const name = request.display_name || request.username || 'User';
  const initials = name.slice(0, 2).toUpperCase();

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
      {/* Avatar */}
      <TouchableOpacity onPress={handleViewProfile} activeOpacity={0.7}>
        {request.avatar_url ? (
          <Image source={{ uri: request.avatar_url }} style={[styles.avatar, { backgroundColor: mutedBgColor }]} />
        ) : (
          <RNView style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
            <Text color="white" fontSize={16} fontWeight="600">
              {initials}
            </Text>
          </RNView>
        )}
      </TouchableOpacity>

      {/* User Info */}
      <TouchableOpacity onPress={handleViewProfile} style={{ flex: 1 }} activeOpacity={0.7}>
        <YStack gap="$1">
          <Text fontSize={16} fontWeight="600" color="$color">
            {name}
          </Text>
          <XStack gap="$2" alignItems="center">
            {request.username && (
              <Text fontSize={13} color="$colorMuted">
                @{request.username}
              </Text>
            )}
            {request.level && (
              <RNView style={[styles.levelBadge, { backgroundColor: primaryBgColor }]}>
                <Text fontSize={11} fontWeight="600" color="$primary">
                  Lvl {request.level}
                </Text>
              </RNView>
            )}
          </XStack>
          <Text fontSize={12} color="$colorSubtle">
            {timeSince(request.created_at)}
          </Text>
        </YStack>
      </TouchableOpacity>

      {/* Actions */}
      {type === 'incoming' ? (
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
      ) : (
        <RNView style={[styles.pendingBadge, { backgroundColor: mutedBgColor }]}>
          <Text fontSize={12} fontWeight="500" color="$colorMuted">
            Pending
          </Text>
        </RNView>
      )}
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
  levelBadge: {
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
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});
