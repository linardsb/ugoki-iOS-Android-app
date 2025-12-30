import { YStack, XStack, Text, Card, Image } from 'tamagui';
import { useRouter } from 'expo-router';
import { Clock, Fire, Barbell, Lightning, Play } from 'phosphor-react-native';
import type { Workout, DifficultyLevel, WorkoutType } from '../types';

interface WorkoutCardProps {
  workout: Workout;
  variant?: 'default' | 'compact' | 'featured';
  onPress?: () => void;
}

const difficultyColors: Record<DifficultyLevel, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
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

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(modals)/workout/${workout.id}`);
    }
  };

  const Icon = workoutTypeIcons[workout.workout_type] || Barbell;
  const difficultyColor = difficultyColors[workout.difficulty];

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
              <Icon size={24} color="$secondary" weight="thin" />
            )}
          </XStack>

          {/* Content */}
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1}>
              {workout.name}
            </Text>
            <XStack gap="$2" alignItems="center">
              <XStack gap="$1" alignItems="center">
                <Clock size={12} color="$colorMuted" weight="thin" />
                <Text fontSize="$2" color="$colorMuted">
                  {workout.duration_minutes}m
                </Text>
              </XStack>
              <Text color="$colorMuted">·</Text>
              <Text
                fontSize="$2"
                color={difficultyColor}
                textTransform="capitalize"
              >
                {workout.difficulty}
              </Text>
            </XStack>
          </YStack>

          {/* Calories */}
          <YStack alignItems="flex-end">
            <XStack gap="$1" alignItems="center">
              <Fire size={14} color="#ef4444" weight="thin" />
              <Text fontSize="$3" fontWeight="500" color="$color">
                {workout.calories_estimate}
              </Text>
            </XStack>
            <Text fontSize="$1" color="$colorMuted">cal</Text>
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
      >
        {/* Background */}
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
            backgroundColor="$secondary"
          />
        )}

        {/* Gradient overlay */}
        <YStack
          position="absolute"
          width="100%"
          height="100%"
          backgroundColor="rgba(0,0,0,0.4)"
        />

        {/* Content */}
        <YStack flex={1} padding="$3" justifyContent="space-between">
          {/* Top row - badges */}
          <XStack justifyContent="space-between">
            <XStack
              backgroundColor={difficultyColor}
              paddingHorizontal="$3"
              paddingVertical="$1.5"
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
                paddingVertical="$1.5"
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
              <XStack gap="$1" alignItems="center">
                <Clock size={14} color="white" weight="thin" />
                <Text fontSize="$2" color="rgba(255,255,255,0.8)">
                  {workout.duration_minutes} min
                </Text>
              </XStack>
              <XStack gap="$1" alignItems="center">
                <Fire size={14} color="white" weight="thin" />
                <Text fontSize="$2" color="rgba(255,255,255,0.8)">
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
          <Icon size={48} color="$secondary" weight="thin" />
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
          <Clock size={12} color="white" weight="thin" />
          <Text fontSize="$2" color="white" fontWeight="500">
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
          <Text fontSize="$2" color="$colorMuted" numberOfLines={2}>
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
              <Text fontSize="$1" color={difficultyColor} fontWeight="600" textTransform="capitalize">
                {workout.difficulty}
              </Text>
            </XStack>
            <XStack
              backgroundColor="$backgroundHover"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$1" color="$colorMuted" textTransform="capitalize">
                {workout.workout_type}
              </Text>
            </XStack>
          </XStack>

          <XStack gap="$1" alignItems="center">
            <Fire size={14} color="#ef4444" weight="thin" />
            <Text fontSize="$3" fontWeight="500" color="$color">
              {workout.calories_estimate}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Card>
  );
}
