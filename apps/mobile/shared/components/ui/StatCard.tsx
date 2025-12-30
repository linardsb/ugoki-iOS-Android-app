import { YStack, XStack, Text, styled, GetProps } from 'tamagui';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  subtitle,
  trend,
  trendValue,
  onPress,
}: StatCardProps) {
  const trendColor = trend === 'up' ? '$success' : trend === 'down' ? '$error' : '$colorMuted';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

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
        <Text color="$color" fontSize="$8" fontWeight="bold">
          {value}
        </Text>
        {trendValue && (
          <Text color={trendColor} fontSize="$3" fontWeight="500">
            {trendIcon} {trendValue}
          </Text>
        )}
      </XStack>

      {subtitle && (
        <Text color="$colorMuted" fontSize="$2">
          {subtitle}
        </Text>
      )}
    </Card>
  );
}
