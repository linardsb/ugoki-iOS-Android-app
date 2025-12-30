import { YStack, XStack, Text, ScrollView, Spinner } from 'tamagui';
import { FlatList, ListRenderItem } from 'react-native';
import { Barbell } from 'phosphor-react-native';
import { WorkoutCard } from './WorkoutCard';
import type { Workout } from '../types';

interface WorkoutListProps {
  workouts: Workout[] | undefined;
  isLoading?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  emptyMessage?: string;
  horizontal?: boolean;
  showEmpty?: boolean;
}

export function WorkoutList({
  workouts,
  isLoading,
  variant = 'default',
  emptyMessage = 'No workouts found',
  horizontal = false,
  showEmpty = true,
}: WorkoutListProps) {
  if (isLoading) {
    return (
      <YStack padding="$4" alignItems="center" justifyContent="center" minHeight={100}>
        <Spinner size="large" color="$primary" />
        <Text color="$colorMuted" marginTop="$2">
          Loading workouts...
        </Text>
      </YStack>
    );
  }

  if (!workouts || workouts.length === 0) {
    if (!showEmpty) return null;

    return (
      <YStack padding="$4" alignItems="center" justifyContent="center" gap="$2">
        <Barbell size={48} color="$colorMuted" weight="thin" />
        <Text color="$colorMuted" textAlign="center">
          {emptyMessage}
        </Text>
      </YStack>
    );
  }

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            variant={variant}
          />
        ))}
      </ScrollView>
    );
  }

  // Vertical list
  const renderItem: ListRenderItem<Workout> = ({ item }) => (
    <WorkoutCard
      workout={item}
      variant={variant}
    />
  );

  return (
    <YStack gap="$3">
      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          variant={variant}
        />
      ))}
    </YStack>
  );
}
