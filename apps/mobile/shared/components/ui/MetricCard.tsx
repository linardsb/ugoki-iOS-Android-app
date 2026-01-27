import { YStack, XStack, Text, useTheme } from 'tamagui';
import { Card } from './Card';

/**
 * MetricCard - A card component for displaying metrics with optional trend indicator
 *
 * Used for: Health metrics, dashboard stats, fasting stats, etc.
 */

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  variant?: 'default' | 'compact' | 'detailed';
  onPress?: () => void;
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendValue,
  subtitle,
  variant = 'default',
  onPress,
}: MetricCardProps) {
  const theme = useTheme();

  const trendColor = trend === 'up' ? '$trendUp' : trend === 'down' ? '$trendDown' : '$trendNeutral';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  if (variant === 'compact') {
    return (
      <Card
        pressable={!!onPress}
        onPress={onPress}
        padded="sm"
        gap="$1"
      >
        <XStack justifyContent="space-between" alignItems="center">
          {icon}
          <XStack alignItems="baseline" gap="$1">
            <Text color="$color" fontSize="$5" fontWeight="bold">
              {value}
            </Text>
            {unit && (
              <Text color="$colorMuted" fontSize="$3">
                {unit}
              </Text>
            )}
          </XStack>
        </XStack>
        <Text color="$colorMuted" fontSize="$3" numberOfLines={1}>
          {label}
        </Text>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card
        pressable={!!onPress}
        onPress={onPress}
        gap="$3"
      >
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1">
            <Text color="$colorMuted" fontSize="$3" fontWeight="500">
              {label}
            </Text>
            {subtitle && (
              <Text color="$colorSubtle" fontSize="$3">
                {subtitle}
              </Text>
            )}
          </YStack>
          {icon}
        </XStack>

        <XStack alignItems="baseline" gap="$2">
          <Text color="$color" fontSize="$8" fontWeight="bold">
            {value}
          </Text>
          {unit && (
            <Text color="$colorMuted" fontSize="$4" fontWeight="500">
              {unit}
            </Text>
          )}
        </XStack>

        {trendValue && (
          <XStack alignItems="center" gap="$1">
            <Text color={trendColor} fontSize="$3" fontWeight="500">
              {trendIcon} {trendValue}
            </Text>
            <Text color="$colorMuted" fontSize="$3">
              vs. last week
            </Text>
          </XStack>
        )}
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      pressable={!!onPress}
      onPress={onPress}
      gap="$2"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <Text color="$colorMuted" fontSize="$3" fontWeight="500">
          {label}
        </Text>
        {icon}
      </XStack>

      <XStack alignItems="baseline" gap="$2">
        <Text color="$color" fontSize="$7" fontWeight="bold">
          {value}
        </Text>
        {unit && (
          <Text color="$colorMuted" fontSize="$3">
            {unit}
          </Text>
        )}
        {trendValue && (
          <Text color={trendColor} fontSize="$3" fontWeight="500">
            {trendIcon} {trendValue}
          </Text>
        )}
      </XStack>

      {subtitle && (
        <Text color="$colorMuted" fontSize="$3">
          {subtitle}
        </Text>
      )}
    </Card>
  );
}

export default MetricCard;
