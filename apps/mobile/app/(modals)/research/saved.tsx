/**
 * Saved Research Screen - User's bookmarked papers.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, Text, useTheme } from 'tamagui';
import { BookmarkSimple } from 'phosphor-react-native';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useSavedResearch,
  useUnsaveResearch,
} from '@/features/research/hooks';
import { ResearchCard } from '@/features/research/components';

export default function SavedResearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Theme - use explicit colors for dark mode readability
  const theme = useTheme();
  const isDark = theme.name === 'dark';
  const backgroundColor = theme.background.val;
  const textColor = isDark ? '#fafafa' : '#1f2937';
  const mutedColor = isDark ? '#d4d4d8' : '#6b7280';
  const subtleColor = isDark ? '#a1a1aa' : '#9ca3af';

  const {
    data: savedPapers,
    isLoading,
    refetch,
  } = useSavedResearch();

  const unsaveMutation = useUnsaveResearch();

  const handleUnsave = (savedId: string) => {
    unsaveMutation.mutate(savedId);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ScreenHeader title="Saved Research" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color="#14b8a6" />
        </YStack>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScreenHeader title="Saved Research" showClose />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} />
        }
      >
        {/* Empty State */}
        {(!savedPapers || savedPapers.length === 0) && (
          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical="$8"
            gap="$3"
          >
            <BookmarkSimple size={48} color={subtleColor} />
            <Text fontSize={18} fontWeight="600" color={mutedColor}>
              No saved research yet
            </Text>
            <Text
              fontSize={14}
              color={subtleColor}
              textAlign="center"
              paddingHorizontal="$4"
            >
              Bookmark interesting research papers to read later. They'll appear here.
            </Text>
          </YStack>
        )}

        {/* Saved Papers */}
        {savedPapers && savedPapers.length > 0 && (
          <YStack gap="$3">
            <Text fontSize={14} color={mutedColor} marginBottom="$1">
              {savedPapers.length} saved paper{savedPapers.length !== 1 && 's'}
            </Text>

            {savedPapers.map((saved) =>
              saved.paper ? (
                <ResearchCard
                  key={saved.id}
                  paper={saved.paper}
                  isSaved={true}
                  isSaving={unsaveMutation.isPending}
                  onUnsave={() => handleUnsave(saved.id)}
                  onPress={() =>
                    router.push(`/(modals)/research/${saved.paper!.id}`)
                  }
                />
              ) : null
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
  content: {
    padding: 16,
  },
});
