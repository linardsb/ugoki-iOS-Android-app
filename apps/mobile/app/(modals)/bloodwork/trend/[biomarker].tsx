/**
 * Biomarker Trend - View historical values and trend for a specific biomarker.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { ScreenHeader } from '@/shared/components/ui';
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import {
  TrendUp,
  TrendDown,
  Minus,
  CheckCircle,
  Warning,
  ArrowUp,
  ArrowDown,
} from 'phosphor-react-native';
import { useBiomarkerTrend } from '@/features/bloodwork';
import type { Metric, BiomarkerFlag } from '@/features/bloodwork';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 20, bottom: 30, left: 50 };

export default function BiomarkerTrendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { biomarker } = useLocalSearchParams<{ biomarker: string }>();
  const decodedBiomarker = biomarker ? decodeURIComponent(biomarker) : '';

  // Theme-aware colors from design tokens
  const backgroundColor = theme.background.val;
  const cardBackground = theme.cardBackground.val;
  const cardBorder = theme.cardBorder.val;
  const textColor = theme.color.val;
  const mutedColor = theme.colorMuted.val;
  const gridColor = theme.borderColor.val;
  const primaryColor = theme.primary.val;
  const successColor = theme.success.val;
  const warningColor = theme.warning.val;
  const errorColor = theme.error.val;

  const { data, isLoading, error } = useBiomarkerTrend(decodedBiomarker);

  const formatBiomarkerName = (name: string) => {
    const cleanName = name.replace(/^biomarker_/, '');
    return cleanName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFlagColor = (flag: BiomarkerFlag | null) => {
    switch (flag) {
      case 'low':
        return '#f59e0b';
      case 'high':
      case 'abnormal':
        return '#ef4444';
      case 'normal':
      default:
        return '#22c55e';
    }
  };

  const getFlagIcon = (flag: BiomarkerFlag | null) => {
    switch (flag) {
      case 'low':
        return <ArrowDown size={14} color="#f59e0b" weight="fill" />;
      case 'high':
        return <ArrowUp size={14} color="#ef4444" weight="fill" />;
      case 'abnormal':
        return <Warning size={14} color="#ef4444" weight="fill" />;
      case 'normal':
      default:
        return <CheckCircle size={14} color="#22c55e" weight="fill" />;
    }
  };

  const getTrendIcon = (direction: string | undefined) => {
    switch (direction) {
      case 'up':
        return <TrendUp size={24} color="#22c55e" weight="bold" />;
      case 'down':
        return <TrendDown size={24} color="#ef4444" weight="bold" />;
      default:
        return <Minus size={24} color="#6b7280" weight="bold" />;
    }
  };

  // Chart rendering
  const renderChart = () => {
    if (!data?.history || data.history.length < 2) {
      return (
        <YStack
          height={CHART_HEIGHT}
          alignItems="center"
          justifyContent="center"
          backgroundColor={cardBackground}
          borderRadius="$3"
        >
          <Text fontSize={14} style={{ color: mutedColor }}>
            Not enough data for chart
          </Text>
        </YStack>
      );
    }

    const history = [...data.history].reverse(); // Oldest first for chart
    const values = history.map(h => h.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const padding = valueRange * 0.1;

    const chartMinY = minValue - padding;
    const chartMaxY = maxValue + padding;
    const chartRange = chartMaxY - chartMinY;

    const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

    // Scale functions
    const xScale = (index: number) =>
      CHART_PADDING.left + (index / (history.length - 1)) * innerWidth;
    const yScale = (value: number) =>
      CHART_PADDING.top + innerHeight - ((value - chartMinY) / chartRange) * innerHeight;

    // Generate path
    const pathData = history
      .map((point, i) => {
        const x = xScale(i);
        const y = yScale(point.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    // Reference range lines
    const refLow = history[0]?.reference_low;
    const refHigh = history[0]?.reference_high;

    return (
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = CHART_PADDING.top + innerHeight * ratio;
          const value = chartMaxY - ratio * chartRange;
          return (
            <React.Fragment key={i}>
              <Line
                x1={CHART_PADDING.left}
                y1={y}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y2={y}
                stroke={gridColor}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={CHART_PADDING.left - 8}
                y={y + 4}
                fontSize={10}
                fill={mutedColor}
                textAnchor="end"
              >
                {value.toFixed(0)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Reference range bands */}
        {refLow !== null && refLow !== undefined && refHigh !== null && refHigh !== undefined && (
          <Rect
            x={CHART_PADDING.left}
            y={yScale(Math.min(refHigh, chartMaxY))}
            width={innerWidth}
            height={yScale(Math.max(refLow, chartMinY)) - yScale(Math.min(refHigh, chartMaxY))}
            fill="rgba(34, 197, 94, 0.1)"
          />
        )}

        {/* Line path */}
        <Path
          d={pathData}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {history.map((point, i) => (
          <Circle
            key={i}
            cx={xScale(i)}
            cy={yScale(point.value)}
            r={4}
            fill={getFlagColor(point.flag)}
            stroke={cardBackground}
            strokeWidth={2}
          />
        ))}

        {/* X-axis labels */}
        {history.map((point, i) => {
          // Only show labels for first, middle, and last points
          if (i !== 0 && i !== history.length - 1 && i !== Math.floor(history.length / 2)) {
            return null;
          }
          return (
            <SvgText
              key={i}
              x={xScale(i)}
              y={CHART_HEIGHT - 8}
              fontSize={10}
              fill={mutedColor}
              textAnchor="middle"
            >
              {formatDate(point.timestamp)}
            </SvgText>
          );
        })}
      </Svg>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ScreenHeader title="Biomarker Trend" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text fontSize={14} marginTop="$2" style={{ color: mutedColor }}>
            Loading trend data...
          </Text>
        </YStack>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ScreenHeader title="Biomarker Trend" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text fontSize={16} style={{ color: textColor }}>
            Failed to load trend data
          </Text>
        </YStack>
      </View>
    );
  }

  const latestValue = data.history?.[0];
  const unit = latestValue?.unit || '';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScreenHeader title={formatBiomarkerName(decodedBiomarker)} showClose />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Value Card */}
        {latestValue && (
          <YStack
            backgroundColor={cardBackground}
            padding="$4"
            borderRadius="$3"
            marginBottom="$4"
          >
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack>
                <Text fontSize={13} style={{ color: mutedColor }}>
                  Latest Value
                </Text>
                <XStack alignItems="baseline" gap="$2" marginTop="$1">
                  <Text
                    fontSize={32}
                    fontWeight="bold"
                    style={{ color: getFlagColor(latestValue.flag) }}
                  >
                    {latestValue.value}
                  </Text>
                  {unit && (
                    <Text fontSize={14} style={{ color: mutedColor }}>
                      {unit}
                    </Text>
                  )}
                </XStack>
                <Text fontSize={12} marginTop="$1" style={{ color: mutedColor }}>
                  {formatFullDate(latestValue.timestamp)}
                </Text>
              </YStack>

              {data.trend && (
                <YStack alignItems="center">
                  {getTrendIcon(data.trend.direction)}
                  <Text fontSize={12} fontWeight="600" style={{ color: mutedColor }} marginTop="$1">
                    {data.trend.direction === 'stable'
                      ? 'Stable'
                      : `${data.trend.change_percent > 0 ? '+' : ''}${data.trend.change_percent.toFixed(1)}%`}
                  </Text>
                </YStack>
              )}
            </XStack>

            {/* Reference Range */}
            {(latestValue.reference_low !== null || latestValue.reference_high !== null) && (
              <XStack
                marginTop="$3"
                paddingTop="$3"
                borderTopWidth={1}
                borderTopColor={gridColor}
                alignItems="center"
                gap="$2"
              >
                <Text fontSize={13} style={{ color: mutedColor }}>
                  Reference Range:
                </Text>
                <Text fontSize={13} fontWeight="500" style={{ color: textColor }}>
                  {latestValue.reference_low !== null && latestValue.reference_high !== null
                    ? `${latestValue.reference_low} - ${latestValue.reference_high} ${unit}`
                    : latestValue.reference_low !== null
                    ? `> ${latestValue.reference_low} ${unit}`
                    : `< ${latestValue.reference_high} ${unit}`}
                </Text>
              </XStack>
            )}
          </YStack>
        )}

        {/* Trend Chart */}
        <YStack marginBottom="$4">
          <Text fontSize={16} fontWeight="600" style={{ color: textColor }} marginBottom="$3">
            Trend Over Time
          </Text>
          <YStack backgroundColor={cardBackground} padding="$3" borderRadius="$3">
            {renderChart()}
          </YStack>
        </YStack>

        {/* History List */}
        <YStack>
          <Text fontSize={16} fontWeight="600" style={{ color: textColor }} marginBottom="$3">
            History ({data.history?.length || 0} readings)
          </Text>
          <YStack backgroundColor={cardBackground} borderRadius="$3" overflow="hidden">
            {data.history?.map((reading: Metric, index: number) => (
              <XStack
                key={reading.id}
                padding="$3"
                alignItems="center"
                borderBottomWidth={index < (data.history?.length || 0) - 1 ? 1 : 0}
                borderBottomColor={gridColor}
              >
                <View style={styles.flagIcon}>
                  {getFlagIcon(reading.flag)}
                </View>
                <YStack flex={1} marginLeft="$3">
                  <Text fontSize={15} fontWeight="500" style={{ color: textColor }}>
                    {reading.value} {unit}
                  </Text>
                  <Text fontSize={12} style={{ color: mutedColor }}>
                    {formatFullDate(reading.timestamp)}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  flagIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
