/**
 * Activity Feed Screen
 * Displays user's activity history from the EVENT_JOURNAL
 */

import { useState, useMemo, useCallback } from 'react';
import { View, Text, XStack, YStack, Spinner } from '@/shared/components/tamagui';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/components/tamagui';
import {
  useActivityFeed,
  groupFeedByDate,
  ActivityFeedItemComponent,
  ActivitySectionHeader,
  ActivityEmptyState,
  ActivityItemSkeleton,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type EventCategory,
  type ActivityFeedItem as ActivityFeedItemType,
} from '@/features/activity';

type FilterType = 'all' | EventCategory;

const FILTERS: { key: FilterType; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#6b7280' },
  { key: 'fasting', label: 'Fasting', color: CATEGORY_COLORS.fasting },
  { key: 'workout', label: 'Workout', color: CATEGORY_COLORS.workout },
  { key: 'progression', label: 'Progress', color: CATEGORY_COLORS.progression },
  { key: 'metrics', label: 'Metrics', color: CATEGORY_COLORS.metrics },
  { key: 'content', label: 'Content', color: CATEGORY_COLORS.content },
];

interface SectionData {
  title: string;
  data: ActivityFeedItemType[];
}

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');

  const categoryFilter = filter === 'all' ? undefined : filter;
  const { data: feedItems, isLoading, refetch, isRefetching } = useActivityFeed({
    category: categoryFilter,
    limit: 100,
  });

  // Group items by date
  const sections = useMemo<SectionData[]>(() => {
    if (!feedItems?.length) return [];

    const grouped = groupFeedByDate(feedItems);
    const result: SectionData[] = [];

    grouped.forEach((items, title) => {
      result.push({ title, data: items });
    });

    return result;
  }, [feedItems]);

  // Flatten sections for FlatList
  const flatData = useMemo(() => {
    const result: (ActivityFeedItemType | { type: 'header'; title: string })[] = [];

    for (const section of sections) {
      result.push({ type: 'header', title: section.title });
      result.push(...section.data);
    }

    return result;
  }, [sections]);

  const handleClose = () => {
    router.back();
  };

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: ActivityFeedItemType | { type: 'header'; title: string } }) => {
    if ('type' in item && item.type === 'header') {
      return <ActivitySectionHeader title={item.title} />;
    }
    return <ActivityFeedItemComponent item={item as ActivityFeedItemType} showCategory={filter === 'all'} />;
  }, [filter]);

  const keyExtractor = useCallback((item: ActivityFeedItemType | { type: 'header'; title: string }, index: number) => {
    if ('type' in item && item.type === 'header') {
      return `header-${item.title}-${index}`;
    }
    return (item as ActivityFeedItemType).id;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: theme.background.val,
            borderBottomColor: theme.borderColor.val,
          },
        ]}
      >
        <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$4">
          <Text fontSize="$7" fontWeight="700" color="$color">
            Activity
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={28} color={theme.color.val} />
          </TouchableOpacity>
        </XStack>

        {/* Filter Tabs */}
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isActive = filter === item.key;
            return (
              <TouchableOpacity
                onPress={() => setFilter(item.key)}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: isActive ? item.color : 'transparent',
                    borderColor: isActive ? item.color : theme.borderColor.val,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? '#fff' : theme.colorSubtle.val },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </View>
      ) : feedItems?.length === 0 ? (
        <ActivityEmptyState />
      ) : (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={theme.primary.val}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
});
