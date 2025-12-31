import { YStack, XStack, Text, Card } from 'tamagui';
import { Barbell, Clock, Fire } from 'phosphor-react-native';
import type { WorkoutStats } from '../types';

interface WorkoutStatsCardProps {
  stats: WorkoutStats | null;
  isLoading?: boolean;
}

export function WorkoutStatsCard({ stats, isLoading }: WorkoutStatsCardProps) {
  if (isLoading) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <Text color="$colorMuted">Loading workout stats...</Text>
      </Card>
    );
  }

  if (!stats || stats.total_workouts === 0) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <YStack gap="$2" alignItems="center">
          <Barbell size={32} color="$colorMuted" weight="thin" />
          <Text color="$colorMuted">No workouts yet</Text>
          <Text fontSize="$3" color="$colorMuted">
            Start your first workout to see stats
          </Text>
        </YStack>
      </Card>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
      <YStack gap="$4">
        {/* Header */}
        <XStack gap="$2" alignItems="center">
          <Barbell size={20} color="$secondary" weight="thin" />
          <Text fontSize="$4" fontWeight="600" color="$color">
            Workout Stats
          </Text>
        </XStack>

        {/* Stats grid */}
        <XStack gap="$4">
          <StatItem
            icon={<Barbell size={16} color="$secondary" weight="thin" />}
            value={stats.total_workouts.toString()}
            label="Total Workouts"
            flex={1}
          />
          <StatItem
            icon={<Clock size={16} color="$primary" weight="thin" />}
            value={formatDuration(stats.total_duration_minutes)}
            label="Total Time"
            flex={1}
          />
          <StatItem
            icon={<Fire size={16} color="#ef4444" weight="thin" />}
            value={stats.total_calories_burned.toLocaleString()}
            label="Calories"
            flex={1}
          />
        </XStack>

        {/* This week */}
        <XStack
          backgroundColor="$backgroundHover"
          paddingVertical="$2"
          paddingHorizontal="$3"
          borderRadius="$3"
          justifyContent="space-between"
          alignItems="center"
          overflow="hidden"
        >
          <Text fontSize="$3" color="$colorMuted" flexShrink={0}>
            This Week:
          </Text>
          <Text fontSize="$3" fontWeight="600" color="$color" flexShrink={0}>
            {stats.current_week_workouts} workout{stats.current_week_workouts !== 1 ? 's' : ''}
          </Text>
        </XStack>
      </YStack>
    </Card>
  );
}

function StatItem({
  icon,
  value,
  label,
  flex,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  flex?: number;
}) {
  return (
    <YStack gap="$1" alignItems="center" flex={flex}>
      {icon}
      <Text fontSize="$5" fontWeight="bold" color="$color">
        {value}
      </Text>
      <Text fontSize="$3" color="$colorMuted" textAlign="center">
        {label}
      </Text>
    </YStack>
  );
}
