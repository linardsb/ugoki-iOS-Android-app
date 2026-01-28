/**
 * WorkoutCard Component
 * Uses theme tokens for all colors - no hardcoded values.
 */

import { YStack, XStack, Text, Image, useTheme } from '@/shared/components/tamagui';
import { useRouter } from 'expo-router';
import { Clock, Fire, Barbell, Lightning, Play } from 'phosphor-react-native';
import { Card } from '@/shared/components/ui';
import type { Workout, DifficultyLevel, WorkoutType } from '../types';

interface WorkoutCardProps {
  workout: Workout;
  variant?: 'default' | 'compact' | 'featured';
  onPress?: () => void;
}

// Map difficulty to semantic theme colors
const getDifficultyColor = (difficulty: DifficultyLevel, theme: ReturnType<typeof useTheme>) => {
  switch (difficulty) {
    case 'beginner':
      return theme.success.val;
    case 'intermediate':
      return theme.secondary.val;
    case 'advanced':
      return theme.error.val;
    default:
      return theme.colorMuted.val;
  }
};

const workoutTypeIcons: Record<WorkoutType, typeof Barbell> = {
  hiit: Lightning,
  strength: Barbell,
  cardio: Play,
  flexibility: Barbell,
  recovery: Barbell,
};

export function WorkoutCard({ workout, variant = 'default', onPress }: WorkoutCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const iconColor = theme.color.val;
  const mutedIconColor = theme.colorMuted.val;
  const primaryColor = theme.primary.val;
  const darkBg = theme.background.val;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(modals)/workout/${workout.id}`);
    }
  };

  const Icon = workoutTypeIcons[workout.workout_type] || Barbell;
  const difficultyColor = getDifficultyColor(workout.difficulty, theme);

  if (variant === 'compact') {
    return (
      <Card
        backgroundColor="$cardBackground"
        padding="$3"
        borderRadius="$4"
        pressStyle={{ scale: 0.98, opacity: 0.9 }}
        onPress={handlePress}
      >
        <XStack gap="$3" alignItems="center">
          {/* Thumbnail or icon */}
          <XStack
            width={56}
            height={56}
            borderRadius="$3"
            backgroundColor="$backgroundHover"
            justifyContent="center"
            alignItems="center"
            overflow="hidden"
          >
            {workout.thumbnail_url ? (
              <Image
                source={{ uri: workout.thumbnail_url }}
                width={56}
                height={56}
                resizeMode="cover"
              />
            ) : (
              <Icon size={28} color={iconColor} weight="thin" />
            )}
          </XStack>

          {/* Content */}
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
              {workout.name}
            </Text>
            <XStack gap="$2" alignItems="center">
              <XStack gap="$1" alignItems="center">
                <Clock size={16} color={mutedIconColor} weight="thin" />
                <Text fontSize="$3" color="$colorMuted">
                  {workout.duration_minutes}m
                </Text>
              </XStack>
              <Text color="$colorMuted">·</Text>
              <Text
                fontSize="$3"
                color={difficultyColor}
                fontWeight="500"
                textTransform="capitalize"
              >
                {workout.difficulty}
              </Text>
            </XStack>
          </YStack>

          {/* Calories */}
          <YStack alignItems="flex-end">
            <XStack gap="$1" alignItems="center">
              <Fire size={18} color={iconColor} weight="thin" />
              <Text fontSize="$4" fontWeight="600" color="$color">
                {workout.calories_estimate}
              </Text>
            </XStack>
            <Text fontSize="$3" color="$colorMuted">cal</Text>
          </YStack>
        </XStack>
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card
        width={280}
        height={180}
        borderRadius="$4"
        overflow="hidden"
        pressStyle={{ scale: 0.98 }}
        onPress={handlePress}
        padded="none"
      >
        {/* Background - use primary color when no thumbnail so white text is readable */}
        {workout.thumbnail_url ? (
          <Image
            source={{ uri: workout.thumbnail_url }}
            position="absolute"
            width="100%"
            height="100%"
            resizeMode="cover"
          />
        ) : (
          <YStack
            position="absolute"
            width="100%"
            height="100%"
            backgroundColor="$primary"
          />
        )}

        {/* Gradient overlay for images */}
        {workout.thumbnail_url && (
          <YStack
            position="absolute"
            width="100%"
            height="100%"
            backgroundColor="rgba(0,0,0,0.4)"
          />
        )}

        {/* Content */}
        <YStack flex={1} padding="$3" justifyContent="space-between">
          {/* Top row - badges */}
          <XStack justifyContent="space-between">
            <XStack
              backgroundColor={difficultyColor}
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$3"
            >
              <Text fontSize="$3" color="white" fontWeight="700" textTransform="capitalize">
                {workout.difficulty}
              </Text>
            </XStack>
            {workout.is_featured && (
              <XStack
                backgroundColor="$primary"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$3"
              >
                <Text fontSize="$3" color="white" fontWeight="700">Featured</Text>
              </XStack>
            )}
          </XStack>

          {/* Bottom row - title and stats */}
          <YStack gap="$1">
            <Text fontSize="$5" fontWeight="bold" color="white" numberOfLines={2}>
              {workout.name}
            </Text>
            <XStack gap="$3">
              <XStack gap="$1.5" alignItems="center">
                <Clock size={18} color="white" weight="thin" />
                <Text fontSize="$3" color="rgba(255,255,255,0.9)">
                  {workout.duration_minutes} min
                </Text>
              </XStack>
              <XStack gap="$1.5" alignItems="center">
                <Fire size={18} color="white" weight="thin" />
                <Text fontSize="$3" color="rgba(255,255,255,0.9)">
                  {workout.calories_estimate} cal
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      backgroundColor="$cardBackground"
      borderRadius="$4"
      overflow="hidden"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={handlePress}
      padded="none"
    >
      {/* Thumbnail */}
      <XStack
        height={140}
        backgroundColor="$backgroundHover"
        justifyContent="center"
        alignItems="center"
      >
        {workout.thumbnail_url ? (
          <Image
            source={{ uri: workout.thumbnail_url }}
            width="100%"
            height="100%"
            resizeMode="cover"
          />
        ) : (
          <Icon size={48} color={iconColor} weight="thin" />
        )}

        {/* Duration badge */}
        <XStack
          position="absolute"
          bottom="$2"
          right="$2"
          backgroundColor="rgba(0,0,0,0.7)"
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
          gap="$1"
          alignItems="center"
        >
          <Clock size={14} color="white" weight="thin" />
          <Text fontSize="$3" color="white" fontWeight="500">
            {workout.duration_minutes}m
          </Text>
        </XStack>
      </XStack>

      {/* Content */}
      <YStack padding="$3" gap="$2">
        <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
          {workout.name}
        </Text>

        {workout.description && (
          <Text fontSize="$3" color="$colorMuted" numberOfLines={2}>
            {workout.description}
          </Text>
        )}

        {/* Meta row */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <XStack
              backgroundColor={`${difficultyColor}20`}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$3" color={difficultyColor} fontWeight="600" textTransform="capitalize">
                {workout.difficulty}
              </Text>
            </XStack>
            <XStack
              backgroundColor="$backgroundHover"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$3" color="$colorMuted" textTransform="capitalize">
                {workout.workout_type}
              </Text>
            </XStack>
          </XStack>

          <XStack gap="$1" alignItems="center">
            <Fire size={16} color={iconColor} weight="thin" />
            <Text fontSize="$3" fontWeight="500" color="$color">
              {workout.calories_estimate}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Card>
  );
}
