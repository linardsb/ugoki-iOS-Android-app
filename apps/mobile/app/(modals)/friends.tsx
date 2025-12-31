/**
 * Friends Screen
 * Shows user's friends list with search and add friend functionality
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MagnifyingGlass, UserPlus, Bell, X } from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useFriends,
  useSearchUsers,
  useSendFriendRequest,
  useFriendRequestCount,
} from '@/features/social/hooks';
import { UserCard } from '@/features/social/components';

export default function FriendsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { data: friends, isLoading, refetch, isRefetching } = useFriends();
  const { data: searchResults } = useSearchUsers(searchQuery, 20);
  const sendRequest = useSendFriendRequest();
  const requestCount = useFriendRequestCount();

  const handleAddFriend = (userId: string) => {
    sendRequest.mutate(
      { username: userId },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Friend request sent!');
        },
        onError: (error: any) => {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to send request');
        },
      }
    );
  };

  const handleAddByCode = () => {
    Alert.prompt(
      'Add Friend',
      'Enter friend code or username:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: (value) => {
            if (value) {
              const isCode = /^[A-Z0-9]{6,8}$/i.test(value);
              sendRequest.mutate(
                isCode ? { friend_code: value.toUpperCase() } : { username: value },
                {
                  onSuccess: () => {
                    Alert.alert('Success', 'Friend request sent!');
                  },
                  onError: (error: any) => {
                    Alert.alert(
                      'Error',
                      error.response?.data?.detail || 'User not found or request already sent'
                    );
                  },
                }
              );
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
        title="Friends"
        showClose
        rightElement={
          <XStack gap="$3">
            <TouchableOpacity onPress={() => router.push('/friend-requests')}>
              <View>
                <Bell size={24} color="#2B2B32" weight="regular" />
                {requestCount > 0 && (
                  <View style={styles.badge}>
                    <Text fontSize={10} color="white" fontWeight="700">
                      {requestCount > 9 ? '9+' : requestCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddByCode}>
              <UserPlus size={24} color="#2B2B32" weight="regular" />
            </TouchableOpacity>
          </XStack>
        }
      />

      {/* Search Bar */}
      <XStack paddingHorizontal="$4" paddingVertical="$3">
        <XStack
          flex={1}
          backgroundColor="white"
          borderRadius="$3"
          paddingHorizontal="$3"
          alignItems="center"
          gap="$2"
        >
          <MagnifyingGlass size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearching(true)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </XStack>
      </XStack>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Search Results */}
        {isSearching && searchQuery.length >= 2 && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Text fontSize={14} fontWeight="600" color="#6b7280">
              Search Results
            </Text>
            {searchResults && searchResults.length > 0 ? (
              searchResults.map((user) => (
                <UserCard
                  key={user.identity_id}
                  userId={user.identity_id}
                  username={user.username}
                  displayName={user.display_name}
                  avatarUrl={user.avatar_url}
                  level={user.level}
                  rightElement={
                    !user.is_friend && (
                      <TouchableOpacity
                        onPress={() => handleAddFriend(user.identity_id)}
                        style={styles.addButton}
                        disabled={sendRequest.isPending}
                      >
                        <UserPlus size={18} color="white" weight="bold" />
                      </TouchableOpacity>
                    )
                  }
                  showChevron={false}
                />
              ))
            ) : (
              <Text fontSize={14} color="#6b7280" textAlign="center" paddingVertical="$4">
                No users found
              </Text>
            )}
          </YStack>
        )}

        {/* Friends List */}
        {!isSearching && (
          <YStack paddingHorizontal="$4" gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={14} fontWeight="600" color="#6b7280">
                Your Friends
              </Text>
              <Text fontSize={13} color="#9ca3af">
                {friends?.length || 0} friends
              </Text>
            </XStack>

            {isLoading ? (
              <Text fontSize={14} color="#6b7280" textAlign="center" paddingVertical="$4">
                Loading...
              </Text>
            ) : friends && friends.length > 0 ? (
              friends.map((friend) => (
                <UserCard
                  key={friend.id}
                  userId={friend.friend_id}
                  username={friend.friend_username}
                  displayName={friend.friend_display_name}
                  avatarUrl={friend.friend_avatar_url}
                  level={friend.friend_level}
                />
              ))
            ) : (
              <YStack alignItems="center" paddingVertical="$6" gap="$3">
                <Text fontSize={16} color="#6b7280" textAlign="center">
                  No friends yet
                </Text>
                <Text fontSize={14} color="#9ca3af" textAlign="center">
                  Search for users or add friends by their friend code
                </Text>
                <TouchableOpacity onPress={handleAddByCode} style={styles.emptyAddButton}>
                  <UserPlus size={20} color="white" weight="bold" />
                  <Text color="white" fontWeight="600" marginLeft={8}>
                    Add Friend
                  </Text>
                </TouchableOpacity>
              </YStack>
            )}
          </YStack>
        )}
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
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#2B2B32',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
