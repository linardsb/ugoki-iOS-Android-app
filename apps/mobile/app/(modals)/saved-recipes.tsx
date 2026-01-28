/**
 * Saved recipes modal screen
 */

import { useCallback } from 'react';
import { FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { View, Text, YStack } from '@/shared/components/tamagui';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useSavedRecipes,
  useToggleSaveRecipe,
  RecipeCard,
  RecipeSummary,
} from '@/features/recipes';

export default function SavedRecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: savedRecipes, isLoading, refetch, isRefetching } = useSavedRecipes();
  const { toggleSave, isLoading: isSaving } = useToggleSaveRecipe();

  const handleRecipePress = useCallback((recipe: RecipeSummary) => {
    router.push(`/(modals)/recipes/${recipe.id}`);
  }, [router]);

  const handleToggleSave = useCallback(async (recipe: RecipeSummary) => {
    try {
      await toggleSave(recipe.id, recipe.is_saved);
    } catch (error) {
      console.error('Failed to toggle save:', error);
    }
  }, [toggleSave]);

  const renderRecipe = useCallback(({ item }: { item: RecipeSummary }) => (
    <RecipeCard
      recipe={item}
      onPress={() => handleRecipePress(item)}
      onToggleSave={() => handleToggleSave(item)}
    />
  ), [handleRecipePress, handleToggleSave]);

  return (
    <View flex={1} backgroundColor="$background">
      <ScreenHeader title="Saved Recipes" showBack />

      {isLoading ? (
        <View flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={savedRecipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 16,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#14b8a6"
            />
          }
          ListEmptyComponent={
            <YStack alignItems="center" padding="$8">
              <Ionicons name="bookmark-outline" size={48} color="#9ca3af" />
              <Text fontSize="$4" color="$colorSubtle" marginTop="$3">
                No saved recipes yet
              </Text>
              <Text fontSize="$3" color="$colorSubtle" marginTop="$1" textAlign="center">
                Browse recipes and tap the bookmark icon to save them here
              </Text>
            </YStack>
          }
        />
      )}
    </View>
  );
}
