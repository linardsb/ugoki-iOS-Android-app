/**
 * Meal type filter pills for recipe list
 */

import { ScrollView, Pressable, Text, View } from 'react-native';
import { MealType, MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '../types';

interface MealTypeFilterProps {
  selected: MealType | null;
  onSelect: (type: MealType | null) => void;
}

const MEAL_TYPES = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK];

export function MealTypeFilter({ selected, onSelect }: MealTypeFilterProps) {
  return (
    <View style={{ marginVertical: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingVertical: 8,
          gap: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* All button */}
        <Pressable onPress={() => onSelect(null)}>
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 25,
              backgroundColor: selected === null ? '#14b8a6' : '#e5e7eb',
              minWidth: 70,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: selected === null ? '#ffffff' : '#1f2937',
                fontSize: 16,
                fontFamily: 'InterSemiBold',
              }}
            >
              All
            </Text>
          </View>
        </Pressable>

        {/* Meal type buttons */}
        {MEAL_TYPES.map((type) => (
          <Pressable key={type} onPress={() => onSelect(type)}>
            <View
              style={{
                paddingLeft: 16,
                paddingRight: 20,
                paddingVertical: 14,
                borderRadius: 25,
                backgroundColor: selected === type ? '#14b8a6' : '#e5e7eb',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 20 }}>{MEAL_TYPE_ICONS[type]}</Text>
              <Text
                style={{
                  color: selected === type ? '#ffffff' : '#1f2937',
                  fontSize: 16,
                  fontFamily: 'InterSemiBold',
                }}
              >
                {MEAL_TYPE_LABELS[type]}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
