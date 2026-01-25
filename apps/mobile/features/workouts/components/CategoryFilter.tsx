/**
 * CategoryFilter Component
 * Uses theme tokens for all colors - no hardcoded values.
 */

import { XStack, Text, ScrollView, useTheme } from 'tamagui';
import { Lightning, Barbell, Play, ArrowsOutCardinal, Heart, SquaresFour } from 'phosphor-react-native';
import type { WorkoutType } from '../types';

interface CategoryFilterProps {
  selected: WorkoutType | null;
  onChange: (type: WorkoutType | null) => void;
}

// Category definitions without colors - colors come from theme
const categoryDefs: Array<{
  type: WorkoutType | null;
  label: string;
  icon: typeof Barbell;
  colorKey: 'muted' | 'secondary' | 'primary' | 'error' | 'success';
}> = [
  { type: null, label: 'All', icon: SquaresFour, colorKey: 'muted' },
  { type: 'hiit', label: 'HIIT', icon: Lightning, colorKey: 'secondary' },
  { type: 'strength', label: 'Strength', icon: Barbell, colorKey: 'primary' },
  { type: 'cardio', label: 'Cardio', icon: Play, colorKey: 'error' },
  { type: 'flexibility', label: 'Flex', icon: ArrowsOutCardinal, colorKey: 'primary' },
  { type: 'recovery', label: 'Recovery', icon: Heart, colorKey: 'success' },
];

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const theme = useTheme();

  // Map color keys to theme values
  const colorMap: Record<string, string> = {
    muted: theme.colorMuted?.val || '#6B697A',
    secondary: theme.secondary?.val || '#FFA387',
    primary: theme.primary?.val || '#3A5BA0',
    error: theme.error?.val || '#EF4444',
    success: theme.success?.val || '#4A9B7F',
  };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {categoryDefs.map((category) => {
        const isSelected = selected === category.type;
        const Icon = category.icon;
        const categoryColor = colorMap[category.colorKey];

        return (
          <XStack
            key={category.type ?? 'all'}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$6"
            backgroundColor={isSelected ? categoryColor : '$cardBackground'}
            gap="$2"
            alignItems="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => onChange(category.type)}
          >
            <Icon
              size={16}
              color={isSelected ? 'white' : categoryColor}
              weight="thin"
            />
            <Text
              fontSize="$3"
              fontWeight="500"
              color={isSelected ? 'white' : '$color'}
            >
              {category.label}
            </Text>
          </XStack>
        );
      })}
    </ScrollView>
  );
}
