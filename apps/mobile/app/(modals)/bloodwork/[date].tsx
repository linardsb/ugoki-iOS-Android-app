/**
 * Bloodwork Date Detail - View biomarkers for a specific test date.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import { useThemeStore } from '@/shared/stores/theme';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ScreenHeader } from '@/shared/components/ui';
import {
  CheckCircle,
  Warning,
  ArrowDown,
  ArrowUp,
  TrendUp,
  PencilSimple,
} from 'phosphor-react-native';
import { useBiomarkersForDate, categorizeBiomarkers } from '@/features/bloodwork';
import type { Metric, BiomarkerFlag } from '@/features/bloodwork';

export default function BloodworkDateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();

  // Theme
  const colorScheme = useColorScheme();
  const { mode: themeMode } = useThemeStore();
  const systemTheme = colorScheme || 'light';
  const effectiveTheme = themeMode === 'system' ? systemTheme : themeMode;
  const isDark = effectiveTheme === 'dark';
  const backgroundColor = isDark ? '#121216' : '#fafafa';
  const cardBackground = isDark ? '#1c1c1e' : 'white';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const mutedColor = isDark ? '#a1a1aa' : '#6b7280';

  const { data: biomarkers, isLoading, error } = useBiomarkersForDate(date || '');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatBiomarkerName = (name: string) => {
    // Remove biomarker_ prefix and format
    const cleanName = name.replace(/^biomarker_/, '');
    return cleanName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getFlagIcon = (flag: BiomarkerFlag | null) => {
    switch (flag) {
      case 'low':
        return <ArrowDown size={16} color="#f59e0b" weight="fill" />;
      case 'high':
        return <ArrowUp size={16} color="#ef4444" weight="fill" />;
      case 'abnormal':
        return <Warning size={16} color="#ef4444" weight="fill" />;
      case 'normal':
      default:
        return <CheckCircle size={16} color="#22c55e" weight="fill" />;
    }
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

  const formatReferenceRange = (metric: Metric) => {
    if (metric.reference_low !== null && metric.reference_high !== null) {
      return `${metric.reference_low} - ${metric.reference_high}`;
    }
    if (metric.reference_low !== null) {
      return `> ${metric.reference_low}`;
    }
    if (metric.reference_high !== null) {
      return `< ${metric.reference_high}`;
    }
    return null;
  };

  // Categorize biomarkers
  const categorizedBiomarkers = React.useMemo(() => {
    if (!biomarkers) return {};

    const categories: Record<string, Metric[]> = {
      'Blood Count': [],
      'Lipids': [],
      'Metabolic': [],
      'Vitamins': [],
      'Iron': [],
      'Thyroid': [],
      'Kidney': [],
      'Liver': [],
      'Inflammation': [],
      'Other': [],
    };

    const categoryKeywords: Record<string, string[]> = {
      'Blood Count': ['haemoglobin', 'hemoglobin', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv', 'mch', 'mchc', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil'],
      'Lipids': ['cholesterol', 'ldl', 'hdl', 'triglyceride', 'vldl', 'lipid'],
      'Metabolic': ['glucose', 'hba1c', 'insulin', 'blood sugar'],
      'Vitamins': ['vitamin', 'b12', 'folate', 'folic'],
      'Iron': ['iron', 'ferritin', 'transferrin', 'tibc'],
      'Thyroid': ['tsh', 't3', 't4', 'thyroid'],
      'Kidney': ['creatinine', 'egfr', 'urea', 'bun', 'uric acid'],
      'Liver': ['alt', 'ast', 'alp', 'bilirubin', 'albumin', 'ggt', 'alkaline phosphatase'],
      'Inflammation': ['crp', 'esr', 'c-reactive'],
    };

    for (const biomarker of biomarkers) {
      const nameLower = biomarker.metric_type.toLowerCase();
      let placed = false;

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => nameLower.includes(kw))) {
          categories[category].push(biomarker);
          placed = true;
          break;
        }
      }

      if (!placed) {
        categories['Other'].push(biomarker);
      }
    }

    // Remove empty categories
    for (const key of Object.keys(categories)) {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    }

    return categories;
  }, [biomarkers]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ScreenHeader title="Blood Test" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text fontSize={14} marginTop="$2" style={{ color: mutedColor }}>
            Loading results...
          </Text>
        </YStack>
      </View>
    );
  }

  if (error || !biomarkers) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ScreenHeader title="Blood Test" showClose />
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text fontSize={16} style={{ color: textColor }}>
            Failed to load blood test results
          </Text>
        </YStack>
      </View>
    );
  }

  const normalCount = biomarkers.filter((b: Metric) => b.flag === 'normal' || !b.flag).length;
  const abnormalCount = biomarkers.length - normalCount;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScreenHeader title="Blood Test" showClose />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <YStack
          backgroundColor={cardBackground}
          padding="$4"
          borderRadius="$3"
          marginBottom="$4"
        >
          <Text fontSize={18} fontWeight="bold" style={{ color: textColor }}>
            {formatDate(date || '')}
          </Text>

          <XStack gap="$4" marginTop="$3">
            <YStack alignItems="center" flex={1}>
              <Text fontSize={24} fontWeight="bold" color="#22c55e">
                {normalCount}
              </Text>
              <Text fontSize={13} style={{ color: mutedColor }}>
                Normal
              </Text>
            </YStack>
            <YStack alignItems="center" flex={1}>
              <Text fontSize={24} fontWeight="bold" color={abnormalCount > 0 ? '#f59e0b' : mutedColor}>
                {abnormalCount}
              </Text>
              <Text fontSize={13} style={{ color: mutedColor }}>
                Flagged
              </Text>
            </YStack>
            <YStack alignItems="center" flex={1}>
              <Text fontSize={24} fontWeight="bold" color="#14b8a6">
                {biomarkers.length}
              </Text>
              <Text fontSize={13} style={{ color: mutedColor }}>
                Total
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Biomarker Categories */}
        {Object.entries(categorizedBiomarkers).map(([category, markers]) => (
          <YStack key={category} marginBottom="$4">
            <XStack alignItems="center" gap="$2" marginBottom="$2">
              {markers.some(m => m.flag && m.flag !== 'normal') && (
                <Warning size={16} color="#f59e0b" weight="fill" />
              )}
              <Text fontSize={16} fontWeight="600" style={{ color: textColor }}>
                {category}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{markers.length}</Text>
              </View>
            </XStack>

            <YStack backgroundColor={cardBackground} borderRadius="$3" overflow="hidden">
              {markers.map((metric, index) => (
                <TouchableOpacity
                  key={metric.id}
                  onPress={() => router.push(`/(modals)/bloodwork/trend/${encodeURIComponent(metric.metric_type)}`)}
                  activeOpacity={0.7}
                >
                  <XStack
                    padding="$3"
                    alignItems="center"
                    borderBottomWidth={index < markers.length - 1 ? 1 : 0}
                    borderBottomColor={isDark ? '#2c2c2e' : '#f3f4f6'}
                  >
                    {/* Flag icon */}
                    <View style={styles.flagIcon}>
                      {getFlagIcon(metric.flag)}
                    </View>

                    {/* Name and reference */}
                    <YStack flex={1} marginLeft="$3">
                      <Text fontSize={15} fontWeight="500" style={{ color: textColor }}>
                        {formatBiomarkerName(metric.metric_type)}
                      </Text>
                      {formatReferenceRange(metric) && (
                        <Text fontSize={12} style={{ color: mutedColor }}>
                          Ref: {formatReferenceRange(metric)} {metric.unit || ''}
                        </Text>
                      )}
                    </YStack>

                    {/* Value */}
                    <YStack alignItems="flex-end">
                      <Text
                        fontSize={16}
                        fontWeight="600"
                        style={{ color: getFlagColor(metric.flag) }}
                      >
                        {metric.value}
                      </Text>
                      {metric.unit && (
                        <Text fontSize={12} style={{ color: mutedColor }}>
                          {metric.unit}
                        </Text>
                      )}
                    </YStack>

                    {/* Trend icon */}
                    <TrendUp size={16} color={mutedColor} style={{ marginLeft: 8 }} />
                  </XStack>
                </TouchableOpacity>
              ))}
            </YStack>
          </YStack>
        ))}
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
  badge: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#14b8a6',
    fontSize: 12,
    fontWeight: '600',
  },
});
