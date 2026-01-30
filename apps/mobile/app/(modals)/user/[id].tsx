/**
 * User Profile Modal
 * Shows public profile for another user
 */

import React from 'react';
import { ScrollView, RefreshControl, Alert } from 'react-native';
import { YStack, XStack, Text, Spinner, useTheme } from '@/shared/components/tamagui';
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
import { ScreenHeader, Avatar, Badge, AppButton, Card } from '@/shared/components/ui';
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
  const primaryColor = theme.primary.val;
  const secondaryColor = theme.secondary.val;
  const warningColor = theme.warning.val;
  const errorColor = theme.error.val;
  const mutedColor = theme.colorMuted.val;
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

  if (!userId) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScreenHeader title="Profile" />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$colorMuted">User not found</Text>
        </YStack>
      </YStack>
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
      <YStack flex={1} backgroundColor="$background">
        <ScreenHeader title="Profile" />
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
          <Spinner size="large" color="$primary" />
          <Text color="$colorMuted">Loading...</Text>
        </YStack>
      </YStack>
    );
  }

  const name = profile.display_name || profile.username || 'User';

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScreenHeader title="" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <YStack alignItems="center" paddingVertical="$4" gap="$3">
          <Avatar source={profile.avatar_url} name={name} size="xl" />

          <YStack alignItems="center" gap="$1">
            <Text fontSize="$8" fontWeight="700" color="$color">
              {name}
            </Text>
            {profile.username && (
              <Text fontSize="$5" color="$colorMuted">
                @{profile.username}
              </Text>
            )}
            {profile.title && (
              <Badge variant="successMuted" marginTop="$1">
                {profile.title}
              </Badge>
            )}
          </YStack>

          {profile.bio && (
            <Text
              fontSize="$5"
              color="$colorMuted"
              textAlign="center"
              paddingHorizontal="$6"
            >
              {profile.bio}
            </Text>
          )}
        </YStack>

        {/* Stats */}
        <Card marginHorizontal="$4" padded="lg">
          <XStack justifyContent="space-around">
            {profile.level && (
              <YStack alignItems="center" gap="$1">
                <Star size={24} color={primaryColor} weight="fill" />
                <Text fontSize="$7" fontWeight="700" color="$color">
                  {profile.level}
                </Text>
                <Text fontSize="$2" color="$colorMuted">
                  Level
                </Text>
              </YStack>
            )}

            {profile.streaks && (
              <>
                {profile.streaks.fasting !== undefined && (
                  <YStack alignItems="center" gap="$1">
                    <Flame size={24} color={warningColor} weight="fill" />
                    <Text fontSize="$7" fontWeight="700" color="$color">
                      {profile.streaks.fasting}
                    </Text>
                    <Text fontSize="$2" color="$colorMuted">
                      Fast Streak
                    </Text>
                  </YStack>
                )}
                {profile.streaks.workout !== undefined && (
                  <YStack alignItems="center" gap="$1">
                    <Trophy size={24} color={warningColor} weight="fill" />
                    <Text fontSize="$7" fontWeight="700" color="$color">
                      {profile.streaks.workout}
                    </Text>
                    <Text fontSize="$2" color="$colorMuted">
                      Workout Streak
                    </Text>
                  </YStack>
                )}
              </>
            )}

            {profile.achievement_count !== null && (
              <YStack alignItems="center" gap="$1">
                <Medal size={24} color={secondaryColor} weight="fill" />
                <Text fontSize="$7" fontWeight="700" color="$color">
                  {profile.achievement_count}
                </Text>
                <Text fontSize="$2" color="$colorMuted">
                  Achievements
                </Text>
              </YStack>
            )}
          </XStack>
        </Card>

        {/* Actions */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$3">
          {/* Friend Button */}
          {profile.is_friend ? (
            <AppButton
              variant="danger"
              fullWidth
              onPress={handleRemoveFriend}
              disabled={removeFriend.isPending}
              loading={removeFriend.isPending}
            >
              <XStack alignItems="center" gap="$2">
                <UserMinus size={20} color="white" weight="bold" />
                <Text color="white" fontWeight="600">
                  Remove Friend
                </Text>
              </XStack>
            </AppButton>
          ) : profile.friendship_status === 'pending' ? (
            <XStack
              backgroundColor="$backgroundHover"
              paddingVertical="$3"
              borderRadius="$3"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="$colorMuted" fontWeight="600">
                Friend Request Pending
              </Text>
            </XStack>
          ) : (
            <AppButton
              variant="primary"
              fullWidth
              onPress={handleAddFriend}
              disabled={sendRequest.isPending}
              loading={sendRequest.isPending}
            >
              <XStack alignItems="center" gap="$2">
                <UserPlus size={20} color="white" weight="bold" />
                <Text color="white" fontWeight="600">
                  Add Friend
                </Text>
              </XStack>
            </AppButton>
          )}

          {/* Follow Button */}
          <AppButton
            variant="outline"
            fullWidth
            onPress={handleFollow}
            disabled={followUser.isPending || unfollowUser.isPending}
            loading={followUser.isPending || unfollowUser.isPending}
          >
            <XStack alignItems="center" gap="$2">
              {profile.is_following ? (
                <>
                  <EyeSlash size={20} color={mutedColor} weight="bold" />
                  <Text color="$colorMuted" fontWeight="600">
                    Unfollow
                  </Text>
                </>
              ) : (
                <>
                  <Eye size={20} color={primaryColor} weight="bold" />
                  <Text color="$primary" fontWeight="600">
                    Follow
                  </Text>
                </>
              )}
            </XStack>
          </AppButton>

          {/* Block Button */}
          <XStack
            backgroundColor="$backgroundHover"
            paddingVertical="$3"
            borderRadius="$3"
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor="$errorMuted"
            pressStyle={{ opacity: 0.7 }}
            onPress={handleBlock}
          >
            <XStack alignItems="center" gap="$2">
              <ShieldSlash size={20} color={errorColor} weight="bold" />
              <Text color="$error" fontWeight="600">
                Block User
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
