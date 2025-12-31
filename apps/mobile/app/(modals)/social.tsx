/**
 * Social Modal Screen
 * Hub for social features: friends, challenges, leaderboards
 */

import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Users,
  UserPlus,
  Trophy,
  Flag,
  CaretRight,
  Plus,
  MagnifyingGlass,
} from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useFriends,
  useFollowers,
  useMyChallenges,
  useLeaderboard,
  useFriendRequestCount,
} from '@/features/social/hooks';
import { ChallengeCard } from '@/features/social/components/ChallengeCard';
import { LeaderboardEntryRow } from '@/features/social/components/LeaderboardEntry';

export default function SocialScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: friends, isLoading: friendsLoading, refetch: refetchFriends } = useFriends();
  const { data: followers, refetch: refetchFollowers } = useFollowers();
  const { data: myChallenges, isLoading: challengesLoading, refetch: refetchChallenges } = useMyChallenges();
  const { data: leaderboard, refetch: refetchLeaderboard } = useLeaderboard('global_xp', 'all_time', 5);
  const requestCount = useFriendRequestCount();

  const isRefreshing = friendsLoading || challengesLoading;

  const handleRefresh = () => {
    refetchFriends();
    refetchFollowers();
    refetchChallenges();
    refetchLeaderboard();
  };

  const activeChallenges = myChallenges?.filter(c => c.status === 'active') || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScreenHeader
        title="Social"
        showClose
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/(modals)/friends')}
            style={styles.searchButton}
          >
            <MagnifyingGlass size={20} color="#6b7280" weight="regular" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack gap="$5" paddingHorizontal="$4" paddingTop="$2">
          {/* Stats Row */}
          <XStack gap="$3">
            <TouchableOpacity
              style={[styles.statCard, { flex: 1 }]}
              onPress={() => router.push('/(modals)/friends')}
            >
              <Users size={24} color="#14b8a6" weight="regular" />
              <Text fontSize={24} fontWeight="700" color="#2B2B32">
                {friends?.length || 0}
              </Text>
              <Text fontSize={12} color="#6b7280">Friends</Text>
              {requestCount && requestCount > 0 && (
                <View style={styles.badge}>
                  <Text fontSize={10} fontWeight="700" color="white">
                    {requestCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { flex: 1 }]}
              onPress={() => router.push('/(modals)/friends')}
            >
              <UserPlus size={24} color="#8b5cf6" weight="regular" />
              <Text fontSize={24} fontWeight="700" color="#2B2B32">
                {followers?.length || 0}
              </Text>
              <Text fontSize={12} color="#6b7280">Followers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { flex: 1 }]}
              onPress={() => router.push('/(modals)/challenges')}
            >
              <Flag size={24} color="#f97316" weight="regular" />
              <Text fontSize={24} fontWeight="700" color="#2B2B32">
                {activeChallenges.length}
              </Text>
              <Text fontSize={12} color="#6b7280">Challenges</Text>
            </TouchableOpacity>
          </XStack>

          {/* Quick Actions */}
          <XStack gap="$3">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#14b8a6' }]}
              onPress={() => router.push('/(modals)/friends')}
            >
              <UserPlus size={18} color="white" weight="bold" />
              <Text fontSize={14} fontWeight="600" color="white">Add Friend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f97316' }]}
              onPress={() => router.push('/(modals)/challenges/create')}
            >
              <Plus size={18} color="white" weight="bold" />
              <Text fontSize={14} fontWeight="600" color="white">New Challenge</Text>
            </TouchableOpacity>
          </XStack>

          {/* Active Challenges */}
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={18} fontWeight="700" color="#2B2B32">
                Active Challenges
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(modals)/challenges')}
                style={styles.seeAllButton}
              >
                <Text fontSize={14} color="#14b8a6" fontWeight="600">See All</Text>
                <CaretRight size={16} color="#14b8a6" weight="bold" />
              </TouchableOpacity>
            </XStack>

            {Array.isArray(activeChallenges) && activeChallenges.length > 0 ? (
              <YStack gap="$3">
                {activeChallenges.slice(0, 3).map((challenge, index) => (
                  <ChallengeCard
                    key={challenge.id || `challenge-${index}`}
                    challenge={challenge}
                    onPress={() => router.push(`/(modals)/challenges/${challenge.id}`)}
                  />
                ))}
              </YStack>
            ) : (
              <TouchableOpacity
                style={styles.emptyCard}
                onPress={() => router.push('/(modals)/challenges')}
              >
                <Flag size={32} color="#d1d5db" weight="regular" />
                <Text fontSize={14} color="#6b7280" textAlign="center">
                  No active challenges
                </Text>
                <Text fontSize={13} color="#14b8a6" fontWeight="600">
                  Browse challenges to join one
                </Text>
              </TouchableOpacity>
            )}
          </YStack>

          {/* Leaderboard Preview */}
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={18} fontWeight="700" color="#2B2B32">
                Top Players
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(modals)/leaderboards')}
                style={styles.seeAllButton}
              >
                <Text fontSize={14} color="#14b8a6" fontWeight="600">Leaderboards</Text>
                <CaretRight size={16} color="#14b8a6" weight="bold" />
              </TouchableOpacity>
            </XStack>

            <YStack
              backgroundColor="white"
              borderRadius="$4"
              padding="$3"
              gap="$2"
            >
              {leaderboard?.entries && Array.isArray(leaderboard.entries) && leaderboard.entries.length > 0 ? (
                leaderboard.entries.slice(0, 5).map((entry, index) => (
                  <LeaderboardEntryRow
                    key={entry.identity_id || `entry-${index}`}
                    entry={entry}
                    valueLabel="XP"
                  />
                ))
              ) : (
                <YStack alignItems="center" padding="$4">
                  <Trophy size={32} color="#d1d5db" weight="regular" />
                  <Text fontSize={14} color="#6b7280" marginTop="$2">
                    No leaderboard data yet
                  </Text>
                </YStack>
              )}
            </YStack>
          </YStack>

          {/* Browse Section */}
          <YStack gap="$3">
            <Text fontSize={18} fontWeight="700" color="#2B2B32">
              Explore
            </Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(modals)/friends')}
            >
              <XStack alignItems="center" gap="$3" flex={1}>
                <View style={[styles.menuIcon, { backgroundColor: '#d1fae5' }]}>
                  <Users size={20} color="#14b8a6" weight="regular" />
                </View>
                <YStack>
                  <Text fontSize={15} fontWeight="600" color="#2B2B32">Friends</Text>
                  <Text fontSize={13} color="#6b7280">Manage your friends list</Text>
                </YStack>
              </XStack>
              <CaretRight size={20} color="#6b7280" weight="regular" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(modals)/leaderboards')}
            >
              <XStack alignItems="center" gap="$3" flex={1}>
                <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
                  <Trophy size={20} color="#f59e0b" weight="regular" />
                </View>
                <YStack>
                  <Text fontSize={15} fontWeight="600" color="#2B2B32">Leaderboards</Text>
                  <Text fontSize={13} color="#6b7280">See global and friends rankings</Text>
                </YStack>
              </XStack>
              <CaretRight size={20} color="#6b7280" weight="regular" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(modals)/challenges')}
            >
              <XStack alignItems="center" gap="$3" flex={1}>
                <View style={[styles.menuIcon, { backgroundColor: '#ffedd5' }]}>
                  <Flag size={20} color="#f97316" weight="regular" />
                </View>
                <YStack>
                  <Text fontSize={15} fontWeight="600" color="#2B2B32">Challenges</Text>
                  <Text fontSize={13} color="#6b7280">Compete with friends</Text>
                </YStack>
              </XStack>
              <CaretRight size={20} color="#6b7280" weight="regular" />
            </TouchableOpacity>
          </YStack>
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
