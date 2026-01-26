import { YStack, XStack, Text } from 'tamagui';
import { Card } from '@/shared/components/ui';
import { Fire, Barbell, Calendar } from 'phosphor-react-native';
import type { IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import type { Streak, StreakType } from '../types';

interface StreakCardProps {
  streaks: Streak[];
  isLoading?: boolean;
}

const STREAK_CONFIG: Record<StreakType, { icon: ComponentType<IconProps>; label: string; color: string }> = {
  fasting: { icon: Fire, label: 'Fasting', color: '#FFA387' },
  workout: { icon: Barbell, label: 'Workout', color: '#3A5BA0' },
  logging: { icon: Calendar, label: 'Logging', color: '#4A9B7F' },
  app_usage: { icon: Calendar, label: 'Daily', color: '#3A5BA0' },
};

export function StreakCard({ streaks, isLoading }: StreakCardProps) {
  if (isLoading) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <Text color="$colorMuted">Loading streaks...</Text>
      </Card>
    );
  }

  // Get fasting and workout streaks
  const fastingStreak = streaks.find((s) => s.streak_type === 'fasting');
  const workoutStreak = streaks.find((s) => s.streak_type === 'workout');

  return (
    <XStack gap="$3">
      <StreakItem
        streak={fastingStreak}
        type="fasting"
        flex={1}
      />
      <StreakItem
        streak={workoutStreak}
        type="workout"
        flex={1}
      />
    </XStack>
  );
}

function StreakItem({
  streak,
  type,
  flex,
}: {
  streak?: Streak;
  type: StreakType;
  flex?: number;
}) {
  const config = STREAK_CONFIG[type];
  const Icon = config.icon;
  const count = streak?.current_count ?? 0;
  const longest = streak?.longest_count ?? 0;

  return (
    <Card
      backgroundColor="$cardBackground"
      padding="$4"
      borderRadius="$4"
      flex={flex}
    >
      <YStack gap="$2" alignItems="center">
        <XStack
          width={48}
          height={48}
          borderRadius="$6"
          backgroundColor={`${config.color}20`}
          justifyContent="center"
          alignItems="center"
        >
          <Icon size={24} color={config.color} weight="thin" />
        </XStack>

        <Text fontSize="$7" fontWeight="bold" color="$color">
          {count}
        </Text>

        <Text fontSize="$3" color="$colorMuted">
          {config.label} Streak
        </Text>

        {longest > 0 && (
          <Text fontSize="$3" color="$colorMuted">
            Best: {longest} days
          </Text>
        )}
      </YStack>
    </Card>
  );
}
