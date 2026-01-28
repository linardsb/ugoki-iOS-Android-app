/**
 * Recipe detail modal screen
 */

import { ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { View, Text, YStack, XStack } from '@/shared/components/tamagui';
import { Card } from '@/shared/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, Badge } from '@/shared/components/ui';
import {
  useRecipe,
  useToggleSaveRecipe,
  useSavedRecipes,
  MEAL_TYPE_LABELS,
  DIET_TAG_LABELS,
} from '@/features/recipes';

export default function RecipeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Handle id being string or string[]
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: recipe, isLoading, error } = useRecipe(id ?? null);
  const { data: savedRecipes } = useSavedRecipes();
  const { toggleSave, isLoading: isSaving } = useToggleSaveRecipe();

  const isSaved = savedRecipes?.some(r => r.id === id) ?? false;

  const handleToggleSave = async () => {
    if (!id) return;
    try {
      await toggleSave(id, isSaved);
    } catch (error) {
      console.error('Failed to toggle save:', error);
    }
  };

  // Show error state
  if (error) {
    return (
      <View flex={1} backgroundColor="$background">
        <ScreenHeader title="Recipe" showBack />
        <View flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text fontSize="$4" color="$color" marginTop="$3" textAlign="center">
            Failed to load recipe
          </Text>
          <Text fontSize="$3" color="$colorSubtle" marginTop="$2" textAlign="center">
            Please try again later
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading || !recipe) {
    return (
      <View flex={1} backgroundColor="$background">
        <ScreenHeader title="Recipe" showBack />
        <View flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      </View>
    );
  }

  return (
    <View flex={1} backgroundColor="$background">
      <ScreenHeader
        title="Recipe"
        showBack
        rightAction={
          <Pressable onPress={handleToggleSave} disabled={isSaving}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={isSaved ? '#14b8a6' : '#9ca3af'}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Header */}
        <YStack padding="$4" gap="$3">
          <XStack alignItems="center" gap="$2">
            <Badge variant="secondary">{MEAL_TYPE_LABELS[recipe.meal_type]}</Badge>
            {recipe.is_featured && <Badge variant="primary">Featured</Badge>}
          </XStack>

          <Text fontSize="$7" fontWeight="700" color="$color">
            {recipe.name}
          </Text>

          {recipe.description && (
            <Text fontSize="$3" color="$colorMuted" lineHeight={22}>
              {recipe.description}
            </Text>
          )}
        </YStack>

        {/* Nutrition Card */}
        <Card marginHorizontal="$4" padding="$4" backgroundColor="$backgroundStrong" borderRadius="$4">
          <Text fontSize="$4" fontWeight="700" color="$color" marginBottom="$3">
            Nutrition per serving
          </Text>
          <XStack justifyContent="space-around">
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$primary">
                {recipe.nutrition.calories}
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                Calories
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$primary">
                {recipe.nutrition.protein_g}g
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                Protein
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$color">
                {recipe.nutrition.carbs_g}g
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                Carbs
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$color">
                {recipe.nutrition.fat_g}g
              </Text>
              <Text fontSize="$3" color="$colorMuted">
                Fat
              </Text>
            </YStack>
          </XStack>
        </Card>

        {/* Time & Servings */}
        <XStack paddingHorizontal="$4" paddingVertical="$4" gap="$4" justifyContent="center">
          <XStack alignItems="center" gap="$2">
            <Ionicons name="time-outline" size={18} color="#a1a1aa" />
            <Text color="$colorMuted">
              Prep: {recipe.prep_time_minutes} min
            </Text>
          </XStack>
          {recipe.cook_time_minutes > 0 && (
            <XStack alignItems="center" gap="$2">
              <Ionicons name="flame-outline" size={18} color="#a1a1aa" />
              <Text color="$colorMuted">
                Cook: {recipe.cook_time_minutes} min
              </Text>
            </XStack>
          )}
          <XStack alignItems="center" gap="$2">
            <Ionicons name="people-outline" size={18} color="#a1a1aa" />
            <Text color="$colorMuted">
              {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
            </Text>
          </XStack>
        </XStack>

        {/* Diet Tags */}
        {recipe.diet_tags.length > 0 && (
          <XStack flexWrap="wrap" gap="$2" paddingHorizontal="$4" marginBottom="$4">
            {recipe.diet_tags.map((tag) => (
              <View
                key={tag}
                backgroundColor="$backgroundHover"
                paddingHorizontal="$4"
                paddingVertical="$2.5"
                borderRadius="$4"
              >
                <Text fontSize="$4" color="$color" fontWeight="500">
                  {DIET_TAG_LABELS[tag]}
                </Text>
              </View>
            ))}
          </XStack>
        )}

        {/* Ingredients */}
        <YStack paddingHorizontal="$4" marginBottom="$4">
          <Text fontSize="$5" fontWeight="700" color="$color" marginBottom="$3">
            Ingredients
          </Text>
          <Card backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4">
            {recipe.ingredients.map((ingredient, index) => (
              <XStack
                key={index}
                paddingVertical="$2"
                borderBottomWidth={index < recipe.ingredients.length - 1 ? 1 : 0}
                borderBottomColor="$borderColor"
                gap="$2"
              >
                <View
                  width={6}
                  height={6}
                  borderRadius={3}
                  backgroundColor="$primary"
                  marginTop={8}
                />
                <YStack flex={1}>
                  <XStack gap="$2">
                    <Text fontWeight="600" color="$color">
                      {ingredient.amount}
                    </Text>
                    <Text color="$color">
                      {ingredient.name}
                    </Text>
                  </XStack>
                  {ingredient.notes && (
                    <Text fontSize="$3" color="$colorMuted" fontStyle="italic">
                      {ingredient.notes}
                    </Text>
                  )}
                </YStack>
              </XStack>
            ))}
          </Card>
        </YStack>

        {/* Instructions */}
        <YStack paddingHorizontal="$4">
          <Text fontSize="$5" fontWeight="700" color="$color" marginBottom="$3">
            Instructions
          </Text>
          <YStack gap="$3">
            {recipe.instructions.map((instruction, index) => (
              <XStack key={index} gap="$3">
                <View
                  width={28}
                  height={28}
                  borderRadius={14}
                  backgroundColor="$primary"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontWeight="700" fontSize="$3">
                    {index + 1}
                  </Text>
                </View>
                <Text
                  flex={1}
                  fontSize="$3"
                  color="$color"
                  lineHeight={22}
                  paddingTop={4}
                >
                  {instruction}
                </Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
}
