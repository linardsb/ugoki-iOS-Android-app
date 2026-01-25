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
          paddingLeft: 16,
          paddingRight: 16,
          paddingVertical: 6,
          gap: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* All button */}
        <Pressable onPress={() => onSelect(null)}>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 18,
              backgroundColor: selected === null ? '#3A5BA0' : '#E8E6E2',
              minWidth: 50,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: selected === null ? '#ffffff' : '#1F2041',
                fontSize: 13,
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
                paddingLeft: 10,
                paddingRight: 14,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: selected === type ? '#3A5BA0' : '#E8E6E2',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>{MEAL_TYPE_ICONS[type]}</Text>
              <Text
                style={{
                  color: selected === type ? '#ffffff' : '#1F2041',
                  fontSize: 13,
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
