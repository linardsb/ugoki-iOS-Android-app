import { XStack, Text, ScrollView } from 'tamagui';
import { Lightning, Barbell, Play, ArrowsOutCardinal, Heart, SquaresFour } from 'phosphor-react-native';
import type { WorkoutType } from '../types';

interface CategoryFilterProps {
  selected: WorkoutType | null;
  onChange: (type: WorkoutType | null) => void;
}

const categories: Array<{
  type: WorkoutType | null;
  label: string;
  icon: typeof Barbell;
  color: string;
}> = [
  { type: null, label: 'All', icon: SquaresFour, color: '#6b7280' },
  { type: 'hiit', label: 'HIIT', icon: Lightning, color: '#f97316' },
  { type: 'strength', label: 'Strength', icon: Barbell, color: '#14b8a6' },
  { type: 'cardio', label: 'Cardio', icon: Play, color: '#ef4444' },
  { type: 'flexibility', label: 'Flex', icon: ArrowsOutCardinal, color: '#8b5cf6' },
  { type: 'recovery', label: 'Recovery', icon: Heart, color: '#22c55e' },
];

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {categories.map((category) => {
        const isSelected = selected === category.type;
        const Icon = category.icon;

        return (
          <XStack
            key={category.type ?? 'all'}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$6"
            backgroundColor={isSelected ? category.color : '$cardBackground'}
            gap="$2"
            alignItems="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => onChange(category.type)}
          >
            <Icon
              size={16}
              color={isSelected ? 'white' : category.color}
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
