import { YStack, XStack, Text } from 'tamagui';
import { ArrowDown, ArrowUp, Check, Warning } from 'phosphor-react-native';
import type { ParsedBiomarker, BiomarkerFlag } from '../types';
import { categorizeBiomarkers } from '../hooks';

interface BloodworkResultsProps {
  biomarkers: ParsedBiomarker[];
  testDate?: string | null;
}

function getFlagColor(flag: BiomarkerFlag | null): string {
  switch (flag) {
    case 'low':
      return '#f59e0b'; // amber
    case 'high':
      return '#ef4444'; // red
    case 'abnormal':
      return '#ef4444'; // red
    case 'normal':
    default:
      return '#22c55e'; // green
  }
}

function getFlagIcon(flag: BiomarkerFlag | null) {
  const color = getFlagColor(flag);
  const size = 14;

  switch (flag) {
    case 'low':
      return <ArrowDown size={size} color={color} weight="thin" />;
    case 'high':
      return <ArrowUp size={size} color={color} weight="thin" />;
    case 'abnormal':
      return <Warning size={size} color={color} weight="thin" />;
    case 'normal':
    default:
      return <Check size={size} color={color} weight="thin" />;
  }
}

function BiomarkerRow({ biomarker }: { biomarker: ParsedBiomarker }) {
  const flagColor = getFlagColor(biomarker.flag);

  // Format the name nicely
  const displayName = biomarker.standardised_name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Format reference range
  const refRange =
    biomarker.reference_low !== null && biomarker.reference_high !== null
      ? `${biomarker.reference_low} - ${biomarker.reference_high}`
      : biomarker.reference_low !== null
        ? `> ${biomarker.reference_low}`
        : biomarker.reference_high !== null
          ? `< ${biomarker.reference_high}`
          : null;

  return (
    <XStack
      paddingVertical="$2"
      paddingHorizontal="$3"
      alignItems="center"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      {/* Flag icon */}
      <XStack width={24} alignItems="center" justifyContent="center">
        {getFlagIcon(biomarker.flag)}
      </XStack>

      {/* Name and reference */}
      <YStack flex={1} marginLeft="$2">
        <Text fontSize="$3" color="$color" fontWeight="500">
          {displayName}
        </Text>
        {refRange && (
          <Text fontSize="$3" color="$colorMuted">
            Ref: {refRange} {biomarker.unit}
          </Text>
        )}
      </YStack>

      {/* Value */}
      <YStack alignItems="flex-end">
        <Text fontSize="$4" fontWeight="600" color={flagColor}>
          {biomarker.value_text}
        </Text>
        <Text fontSize="$3" color="$colorMuted">
          {biomarker.unit}
        </Text>
      </YStack>
    </XStack>
  );
}

function CategorySection({ title, biomarkers }: { title: string; biomarkers: ParsedBiomarker[] }) {
  const hasAbnormal = biomarkers.some(b => b.flag && b.flag !== 'normal');

  return (
    <YStack marginBottom="$3">
      <XStack
        paddingVertical="$2"
        paddingHorizontal="$3"
        backgroundColor="$backgroundHover"
        borderRadius="$2"
        alignItems="center"
        gap="$2"
      >
        {hasAbnormal && <Warning size={14} color="#f59e0b" weight="thin" />}
        <Text fontSize="$3" fontWeight="600" color="$color">
          {title}
        </Text>
        <Text fontSize="$3" color="$colorMuted">
          ({biomarkers.length})
        </Text>
      </XStack>
      <YStack backgroundColor="$cardBackground" borderRadius="$2" overflow="hidden">
        {biomarkers.map((biomarker, index) => (
          <BiomarkerRow key={`${biomarker.standardised_name}-${index}`} biomarker={biomarker} />
        ))}
      </YStack>
    </YStack>
  );
}

export function BloodworkResults({ biomarkers, testDate }: BloodworkResultsProps) {
  if (biomarkers.length === 0) {
    return (
      <YStack padding="$4" alignItems="center">
        <Text color="$colorMuted">No biomarkers found</Text>
      </YStack>
    );
  }

  const categorized = categorizeBiomarkers(biomarkers);

  // Count abnormal
  const abnormalCount = biomarkers.filter(b => b.flag && b.flag !== 'normal').length;
  const normalCount = biomarkers.length - abnormalCount;

  return (
    <YStack gap="$3">
      {/* Summary header */}
      <YStack
        backgroundColor="$cardBackground"
        padding="$4"
        borderRadius="$3"
        gap="$2"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$5" fontWeight="bold" color="$color">
            Results Summary
          </Text>
          {testDate && (
            <Text fontSize="$3" color="$colorMuted">
              {new Date(testDate).toLocaleDateString()}
            </Text>
          )}
        </XStack>

        <XStack gap="$4" marginTop="$2">
          <YStack flex={1} alignItems="center" padding="$2" backgroundColor="$backgroundHover" borderRadius="$2">
            <Text fontSize="$6" fontWeight="bold" color="#22c55e">
              {normalCount}
            </Text>
            <Text fontSize="$3" color="$colorMuted">Normal</Text>
          </YStack>
          <YStack flex={1} alignItems="center" padding="$2" backgroundColor="$backgroundHover" borderRadius="$2">
            <Text fontSize="$6" fontWeight="bold" color={abnormalCount > 0 ? '#f59e0b' : '$colorMuted'}>
              {abnormalCount}
            </Text>
            <Text fontSize="$3" color="$colorMuted">Attention</Text>
          </YStack>
          <YStack flex={1} alignItems="center" padding="$2" backgroundColor="$backgroundHover" borderRadius="$2">
            <Text fontSize="$6" fontWeight="bold" color="$primary">
              {biomarkers.length}
            </Text>
            <Text fontSize="$3" color="$colorMuted">Total</Text>
          </YStack>
        </XStack>
      </YStack>

      {/* Categorized biomarkers */}
      {Object.entries(categorized).map(([category, markers]) => (
        <CategorySection key={category} title={category} biomarkers={markers} />
      ))}
    </YStack>
  );
}
