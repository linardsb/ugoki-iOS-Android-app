/**
 * Recipe card component for displaying recipe summaries
 * Uses theme tokens for all colors - no hardcoded values.
 */

import { View, Text, XStack, YStack, useTheme } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { BookmarkSimple } from 'phosphor-react-native';
import { Card, Badge } from '@/shared/components/ui';
import type { RecipeSummary } from '../types';
import { DIET_TAG_LABELS } from '../types';

interface RecipeCardProps {
  recipe: RecipeSummary;
  onPress: () => void;
  onToggleSave?: () => void;
  variant?: 'default' | 'compact';
}

export function RecipeCard({ recipe, onPress, onToggleSave, variant = 'default' }: RecipeCardProps) {
  const theme = useTheme();
  const primaryColor = theme.primary.val;
  const mutedColor = theme.colorMuted.val;

  // Get first 2-3 relevant diet tags to display
  const displayTags = recipe.diet_tags.slice(0, variant === 'compact' ? 2 : 3);

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card
          backgroundColor="$backgroundStrong"
          borderRadius="$4"
          padding="$3"
          marginBottom="$2"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack flex={1}>
              <Text
                fontSize="$4"
                fontWeight="600"
                color="$color"
                numberOfLines={1}
              >
                {recipe.name}
              </Text>
              <XStack gap="$2" marginTop="$1">
                <Text fontSize="$2" color="$colorMuted">
                  {recipe.calories} cal
                </Text>
                <Text fontSize="$2" color="$colorMuted">•</Text>
                <Text fontSize="$2" color="$colorMuted">
                  {recipe.protein_g}g protein
                </Text>
                <Text fontSize="$2" color="$colorMuted">•</Text>
                <Text fontSize="$2" color="$colorMuted">
                  {recipe.prep_time_minutes} min
                </Text>
              </XStack>
            </YStack>
            {onToggleSave && (
              <TouchableOpacity
                onPress={onToggleSave}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <BookmarkSimple
                  size={22}
                  color={recipe.is_saved ? primaryColor : mutedColor}
                  weight={recipe.is_saved ? 'fill' : 'regular'}
                />
              </TouchableOpacity>
            )}
          </XStack>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        backgroundColor="$backgroundStrong"
        borderRadius="$5"
        padding="$4"
        marginBottom="$3"
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            {recipe.is_featured && (
              <XStack marginBottom="$2">
                <Badge variant="primary" size="sm">Featured</Badge>
              </XStack>
            )}

            <Text
              fontSize="$5"
              fontWeight="700"
              color="$color"
              marginBottom="$2"
              numberOfLines={2}
            >
              {recipe.name}
            </Text>

            {/* Nutrition Info */}
            <XStack gap="$4" marginBottom="$3">
              <YStack alignItems="center">
                <Text fontSize={22} fontWeight="700" color="$primary">
                  {recipe.calories}
                </Text>
                <Text fontSize="$3" color="$colorMuted">
                  calories
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text fontSize={22} fontWeight="700" color="$primary">
                  {recipe.protein_g}g
                </Text>
                <Text fontSize="$3" color="$colorMuted">
                  protein
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text fontSize={22} fontWeight="700" color="$color">
                  {recipe.prep_time_minutes}
                </Text>
                <Text fontSize="$3" color="$colorMuted">
                  min
                </Text>
              </YStack>
            </XStack>

            {/* Diet Tags */}
            {displayTags.length > 0 && (
              <XStack flexWrap="wrap" gap="$2">
                {displayTags.map((tag) => (
                  <View
                    key={tag}
                    backgroundColor="$backgroundHover"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius="$3"
                  >
                    <Text fontSize="$3" color="$colorMuted" fontWeight="500">
                      {DIET_TAG_LABELS[tag]}
                    </Text>
                  </View>
                ))}
              </XStack>
            )}
          </YStack>

          {onToggleSave && (
            <TouchableOpacity
              onPress={onToggleSave}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.6}
            >
              <BookmarkSimple
                size={26}
                color={recipe.is_saved ? primaryColor : mutedColor}
                weight={recipe.is_saved ? 'fill' : 'regular'}
              />
            </TouchableOpacity>
          )}
        </XStack>
      </Card>
    </TouchableOpacity>
  );
}
