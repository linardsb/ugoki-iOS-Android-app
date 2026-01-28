/**
 * User Profile Modal
 * Shows public profile for another user
 */

import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from '@/shared/components/tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  UserPlus,
  UserMinus,
  Eye,
  EyeSlash,
  ShieldSlash,
  Trophy,
  Flame,
  Star,
  Medal,
} from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import {
  usePublicProfile,
  useSendFriendRequest,
  useRemoveFriend,
  useFollowUser,
  useUnfollowUser,
  useBlockUser,
} from '@/features/social/hooks';

export default function UserProfileModal() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const userId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: profile, isLoading, refetch, isRefetching } = usePublicProfile(userId || '');
  const sendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const blockUser = useBlockUser();

  // Theme-aware colors from design tokens
  const cardBackground = theme.cardBackground.val;
  const cardBorder = theme.cardBorder.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const bioColor = theme.colorMuted.val;
  const buttonBackground = theme.backgroundHover.val;
  const pendingBackground = theme.backgroundHover.val;
  const primaryColor = theme.primary.val;

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.val }]}>
        <ScreenHeader title="Profile" />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color={mutedColor}>User not found</Text>
        </YStack>
      </View>
    );
  }

  const handleAddFriend = () => {
    sendRequest.mutate(
      { username: profile?.username || undefined },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Friend request sent!');
          refetch();
        },
        onError: (error: any) => {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to send request');
        },
      }
    );
  };

  const handleRemoveFriend = () => {
    Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeFriend.mutate(userId, {
            onSuccess: () => refetch(),
            onError: (error: any) => {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to remove friend');
            },
          });
        },
      },
    ]);
  };

  const handleFollow = () => {
    if (profile?.is_following) {
      unfollowUser.mutate(userId, {
        onSuccess: () => refetch(),
        onError: (error: any) => {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to unfollow');
        },
      });
    } else {
      followUser.mutate(userId, {
        onSuccess: () => refetch(),
        onError: (error: any) => {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to follow');
        },
      });
    }
  };

  const handleBlock = () => {
    Alert.alert('Block User', 'Are you sure you want to block this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          blockUser.mutate(userId, {
            onSuccess: () => {
              Alert.alert('Blocked', 'User has been blocked');
              router.back();
            },
            onError: (error: any) => {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to block');
            },
          });
        },
      },
    ]);
  };

  if (isLoading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.val }]}>
        <ScreenHeader title="Profile" />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color={mutedColor}>Loading...</Text>
        </YStack>
      </View>
    );
  }

  const name = profile.display_name || profile.username || 'User';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader title="" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <YStack alignItems="center" paddingVertical="$4" gap="$3">
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text color="white" fontSize={32} fontWeight="700">
                {initials}
              </Text>
            </View>
          )}

          <YStack alignItems="center" gap="$1">
            <Text fontSize={24} fontWeight="700" color="$color">
              {name}
            </Text>
            {profile.username && (
              <Text fontSize={15} color={mutedColor}>
                @{profile.username}
              </Text>
            )}
            {profile.title && (
              <XStack
                backgroundColor="#d1fae5"
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$2"
                marginTop="$1"
              >
                <Text fontSize={13} fontWeight="600" color="#14b8a6">
                  {profile.title}
                </Text>
              </XStack>
            )}
          </YStack>

          {profile.bio && (
            <Text
              fontSize={15}
              color={bioColor}
              textAlign="center"
              paddingHorizontal="$6"
            >
              {profile.bio}
            </Text>
          )}
        </YStack>

        {/* Stats */}
        <XStack
          marginHorizontal="$4"
          backgroundColor={cardBackground}
          borderRadius="$4"
          padding="$4"
          justifyContent="space-around"
        >
          {profile.level && (
            <YStack alignItems="center" gap="$1">
              <Star size={24} color="#14b8a6" weight="fill" />
              <Text fontSize={20} fontWeight="700" color="$color">
                {profile.level}
              </Text>
              <Text fontSize={12} color={mutedColor}>
                Level
              </Text>
            </YStack>
          )}

          {profile.streaks && (
            <>
              {profile.streaks.fasting !== undefined && (
                <YStack alignItems="center" gap="$1">
                  <Flame size={24} color="#f97316" weight="fill" />
                  <Text fontSize={20} fontWeight="700" color="$color">
                    {profile.streaks.fasting}
                  </Text>
                  <Text fontSize={12} color={mutedColor}>
                    Fast Streak
                  </Text>
                </YStack>
              )}
              {profile.streaks.workout !== undefined && (
                <YStack alignItems="center" gap="$1">
                  <Trophy size={24} color="#eab308" weight="fill" />
                  <Text fontSize={20} fontWeight="700" color="$color">
                    {profile.streaks.workout}
                  </Text>
                  <Text fontSize={12} color={mutedColor}>
                    Workout Streak
                  </Text>
                </YStack>
              )}
            </>
          )}

          {profile.achievement_count !== null && (
            <YStack alignItems="center" gap="$1">
              <Medal size={24} color="#8b5cf6" weight="fill" />
              <Text fontSize={20} fontWeight="700" color="$color">
                {profile.achievement_count}
              </Text>
              <Text fontSize={12} color={mutedColor}>
                Achievements
              </Text>
            </YStack>
          )}
        </XStack>

        {/* Actions */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$3">
          {/* Friend Button */}
          {profile.is_friend ? (
            <TouchableOpacity onPress={handleRemoveFriend} style={styles.secondaryButton}>
              <UserMinus size={20} color="#ef4444" weight="bold" />
              <Text color="#ef4444" fontWeight="600" marginLeft={8}>
                Remove Friend
              </Text>
            </TouchableOpacity>
          ) : profile.friendship_status === 'pending' ? (
            <View style={[styles.pendingButton, { backgroundColor: pendingBackground }]}>
              <Text color={mutedColor} fontWeight="600">
                Friend Request Pending
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleAddFriend}
              style={styles.primaryButton}
              disabled={sendRequest.isPending}
            >
              <UserPlus size={20} color="white" weight="bold" />
              <Text color="white" fontWeight="600" marginLeft={8}>
                Add Friend
              </Text>
            </TouchableOpacity>
          )}

          {/* Follow Button */}
          <TouchableOpacity
            onPress={handleFollow}
            style={[
              profile.is_following ? styles.secondaryButton : styles.outlineButton,
              !profile.is_following && { backgroundColor: buttonBackground },
            ]}
            disabled={followUser.isPending || unfollowUser.isPending}
          >
            {profile.is_following ? (
              <>
                <EyeSlash size={20} color={mutedColor} weight="bold" />
                <Text color={mutedColor} fontWeight="600" marginLeft={8}>
                  Unfollow
                </Text>
              </>
            ) : (
              <>
                <Eye size={20} color="#14b8a6" weight="bold" />
                <Text color="#14b8a6" fontWeight="600" marginLeft={8}>
                  Follow
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Block Button */}
          <TouchableOpacity onPress={handleBlock} style={[styles.dangerButton, { backgroundColor: buttonBackground }]}>
            <ShieldSlash size={20} color="#ef4444" weight="bold" />
            <Text color="#ef4444" fontWeight="600" marginLeft={8}>
              Block User
            </Text>
          </TouchableOpacity>
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e4e4e7',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
});
