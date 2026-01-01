import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import { Scales, TrendDown, TrendUp, Minus } from 'phosphor-react-native';
import type { Metric, MetricTrend } from '../types';

interface WeightCardProps {
  latestWeight: Metric | null;
  trend: MetricTrend | null;
  isLoading?: boolean;
}

export function WeightCard({ latestWeight, trend, isLoading }: WeightCardProps) {
  const theme = useTheme();
  const primaryColor = theme.primary?.val || '#14b8a6';
  const mutedColor = theme.colorMuted?.val || '#6b7280';

  if (isLoading) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <Text color="$colorMuted">Loading weight...</Text>
      </Card>
    );
  }

  if (!latestWeight) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <YStack gap="$2" alignItems="center">
          <Scales size={32} color={mutedColor} weight="regular" />
          <Text color="$colorMuted">No weight logged yet</Text>
          <Text fontSize="$3" color="$colorMuted">
            Track your progress by logging your weight
          </Text>
        </YStack>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (!trend) return <Minus size={16} color={mutedColor} weight="regular" />;
    if (trend.direction === 'down') return <TrendDown size={16} color="#22c55e" weight="regular" />;
    if (trend.direction === 'up') return <TrendUp size={16} color="#ef4444" weight="regular" />;
    return <Minus size={16} color={mutedColor} weight="regular" />;
  };

  const getTrendColor = () => {
    if (!trend) return '$colorMuted';
    if (trend.direction === 'down') return '#22c55e';
    if (trend.direction === 'up') return '#ef4444';
    return '$colorMuted';
  };

  const formatWeight = (value: number) => {
    return `${value.toFixed(1)} kg`;
  };

  return (
    <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
      <YStack gap="$3">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Scales size={20} color={primaryColor} weight="regular" />
            <Text fontSize="$3" color="$colorMuted">
              Current Weight
            </Text>
          </XStack>
          {trend && (
            <XStack gap="$2" alignItems="center">
              {getTrendIcon()}
              <Text fontSize="$4" color={getTrendColor()}>
                {trend.change_absolute > 0 ? '+' : ''}
                {trend.change_absolute.toFixed(1)} kg
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Weight value */}
        <XStack justifyContent="space-between" alignItems="baseline">
          <Text fontSize="$8" fontWeight="bold" color="$color">
            {formatWeight(latestWeight.value)}
          </Text>
          {trend && (
            <Text fontSize="$4" color="$colorMuted">
              {trend.period_days}-day trend
            </Text>
          )}
        </XStack>

        {/* Last updated */}
        <Text fontSize="$3" color="$colorMuted">
          Last updated: {new Date(latestWeight.timestamp).toLocaleDateString()}
        </Text>
      </YStack>
    </Card>
  );
}
