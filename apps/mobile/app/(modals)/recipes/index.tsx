/**
 * Recipe list modal screen
 */

import { useState, useCallback } from 'react';
import { FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { View, Text, YStack, XStack, Input } from 'tamagui';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/shared/components/ui';
import {
  useRecipes,
  useToggleSaveRecipe,
  RecipeCard,
  MealTypeFilter,
  MealType,
  RecipeSummary,
} from '@/features/recipes';

export default function RecipeListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: recipes, isLoading, refetch, isRefetching } = useRecipes({
    meal_type: selectedMealType || undefined,
    search: searchQuery || undefined,
  });

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
      <ScreenHeader title="Recipes" showBack />

      {/* Search Bar */}
      <View paddingHorizontal="$4" paddingBottom="$2">
        <XStack
          backgroundColor="$backgroundStrong"
          borderRadius="$4"
          alignItems="center"
          paddingHorizontal="$3"
        >
          <Ionicons name="search" size={20} color="#9ca3af" />
          <Input
            flex={1}
            placeholder="Search recipes..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            backgroundColor="transparent"
            borderWidth={0}
            paddingVertical="$3"
          />
          {searchQuery.length > 0 && (
            <Ionicons
              name="close-circle"
              size={20}
              color="#9ca3af"
              onPress={() => setSearchQuery('')}
            />
          )}
        </XStack>
      </View>

      {/* Meal Type Filter */}
      <MealTypeFilter
        selected={selectedMealType}
        onSelect={setSelectedMealType}
      />

      {/* Recipe List */}
      {isLoading ? (
        <View flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={recipes}
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
              <Ionicons name="restaurant-outline" size={48} color="#9ca3af" />
              <Text fontSize="$4" color="$colorSubtle" marginTop="$3">
                No recipes found
              </Text>
              <Text fontSize="$3" color="$colorSubtle" marginTop="$1">
                Try adjusting your filters
              </Text>
            </YStack>
          }
        />
      )}
    </View>
  );
}
