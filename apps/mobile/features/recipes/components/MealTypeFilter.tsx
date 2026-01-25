/**
 * Meal type filter pills for recipe list
 */

import { ScrollView } from 'react-native';
import { XStack, Text, useTheme } from 'tamagui';
import { MealType, MEAL_TYPE_LABELS } from '../types';

interface MealTypeFilterProps {
  selected: MealType | null;
  onSelect: (type: MealType | null) => void;
}

const MEAL_TYPES = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK];

export function MealTypeFilter({ selected, onSelect }: MealTypeFilterProps) {
  const theme = useTheme();

  return (
    <XStack marginVertical="$2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: 16,
          paddingRight: 16,
          paddingVertical: 6,
          gap: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* All button */}
        <XStack
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius={18}
          backgroundColor={selected === null ? '$primary' : '$backgroundHover'}
          minWidth={50}
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.8 }}
          onPress={() => onSelect(null)}
        >
          <Text
            color={selected === null ? 'white' : '$color'}
            fontSize="$3"
            fontWeight="600"
          >
            All
          </Text>
        </XStack>

        {/* Meal type buttons */}
        {MEAL_TYPES.map((type) => (
          <XStack
            key={type}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius={18}
            backgroundColor={selected === type ? '$primary' : '$backgroundHover'}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => onSelect(type)}
          >
            <Text
              color={selected === type ? 'white' : '$color'}
              fontSize="$3"
              fontWeight="600"
            >
              {MEAL_TYPE_LABELS[type]}
            </Text>
          </XStack>
        ))}
      </ScrollView>
    </XStack>
  );
}
