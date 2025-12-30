import { useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import { useTheme } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { MagnifyingGlass } from 'phosphor-react-native';
import {
  useWorkouts,
  useFeaturedWorkouts,
  useRecommendations,
  WorkoutList,
  CategoryFilter,
} from '@/features/workouts';
import type { WorkoutType } from '@/features/workouts';
import { ThemeToggle } from '@/shared/components/ui';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<WorkoutType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data
  const {
    data: featuredWorkouts,
    isLoading: featuredLoading,
  } = useFeaturedWorkouts(5);

  const {
    data: recommendations,
    isLoading: recommendationsLoading,
  } = useRecommendations(3);

  const {
    data: workouts,
    isLoading: workoutsLoading,
    refetch,
  } = useWorkouts(
    {
      workout_type: selectedCategory ?? undefined,
      search: searchQuery || undefined,
    },
    20
  );

  const isRefreshing = featuredLoading || workoutsLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['content'] });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
      {/* Header */}
      <XStack padding="$4" paddingBottom="$2" justifyContent="space-between" alignItems="flex-start">
            <YStack>
              <Text fontSize="$8" fontWeight="bold" color={theme.color.val}>
                Workouts
              </Text>
              <Text fontSize="$3" color={theme.colorSubtle.val}>
                Find the perfect workout for you
              </Text>
            </YStack>
            <ThemeToggle />
          </XStack>

          {/* Search & Filter (Sticky) */}
          <YStack backgroundColor="$background" paddingBottom="$3">
            {/* Search */}
            <YStack paddingHorizontal="$4" marginBottom="$3">
              <XStack
                backgroundColor="$cardBackground"
                borderRadius="$4"
                paddingHorizontal="$3"
                alignItems="center"
                gap="$2"
              >
                <MagnifyingGlass size={20} color="$colorMuted" weight="thin" />
                <Input
                  flex={1}
                  placeholder="Search workouts..."
                  placeholderTextColor="$colorMuted"
                  backgroundColor="transparent"
                  borderWidth={0}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </XStack>
            </YStack>

            {/* Category Filter */}
            <CategoryFilter
              selected={selectedCategory}
              onChange={setSelectedCategory}
            />
          </YStack>

          {/* Featured Workouts (only show when no search/filter) */}
          {!searchQuery && !selectedCategory && featuredWorkouts && featuredWorkouts.length > 0 && (
            <YStack gap="$3" marginTop="$2">
              <XStack paddingHorizontal="$4" justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Featured
                </Text>
              </XStack>
              <WorkoutList
                workouts={featuredWorkouts}
                isLoading={featuredLoading}
                variant="featured"
                horizontal
                showEmpty={false}
              />
            </YStack>
          )}

          {/* Recommendations (only show when no search/filter) */}
          {!searchQuery && !selectedCategory && recommendations && recommendations.length > 0 && (
            <YStack gap="$3" marginTop="$4" paddingHorizontal="$4">
              <Text fontSize="$4" fontWeight="600" color="$color">
                Recommended for You
              </Text>
              <YStack gap="$3">
                {recommendations.map(({ workout, reason }) => (
                  <YStack key={workout.id} gap="$1">
                    <WorkoutList
                      workouts={[workout]}
                      variant="compact"
                      showEmpty={false}
                    />
                    <Text fontSize="$2" color="$colorMuted" paddingLeft="$2">
                      {reason}
                    </Text>
                  </YStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* All Workouts */}
          <YStack gap="$3" marginTop="$4" paddingHorizontal="$4">
            <Text fontSize="$4" fontWeight="600" color="$color">
              {selectedCategory
                ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Workouts`
                : searchQuery
                ? 'Search Results'
                : 'All Workouts'}
            </Text>
            <WorkoutList
              workouts={workouts}
              isLoading={workoutsLoading}
              variant="compact"
              emptyMessage={
                searchQuery
                  ? `No workouts found for "${searchQuery}"`
                  : 'No workouts available'
              }
            />
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
});
