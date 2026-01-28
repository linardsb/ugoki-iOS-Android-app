import { ScrollView, XStack, Text } from '@/shared/components/tamagui';
import type { QuickAction } from '../types';

interface QuickActionsProps {
  actions: QuickAction[];
  onSelect: (action: QuickAction) => void;
}

export function QuickActions({ actions, onSelect }: QuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {actions.map((action, index) => (
        <XStack
          key={`${action.action}-${index}`}
          backgroundColor="$cardBackground"
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$primary"
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          onPress={() => onSelect(action)}
        >
          <Text fontSize="$3" color="$primary" fontWeight="500">
            {action.label}
          </Text>
        </XStack>
      ))}
    </ScrollView>
  );
}
