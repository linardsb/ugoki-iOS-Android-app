import { XStack, YStack, Text, Card } from 'tamagui';
import { useRouter } from 'expo-router';
import { Timer, Barbell, Chat, Trophy, CookingPot, Scales } from 'phosphor-react-native';
import type { IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';

export function QuickActions() {
  const router = useRouter();

  const actions: Array<{
    icon: ComponentType<IconProps>;
    label: string;
    color: string;
    onPress: () => void;
  }> = [
    {
      icon: Timer,
      label: 'Fast',
      color: '#f97316',
      onPress: () => router.push('/(tabs)/fasting'),
    },
    {
      icon: Barbell,
      label: 'Workout',
      color: '#14b8a6',
      onPress: () => router.push('/(tabs)/workouts'),
    },
    {
      icon: Chat,
      label: 'Coach',
      color: '#8b5cf6',
      onPress: () => router.push('/(tabs)/coach'),
    },
    {
      icon: CookingPot,
      label: 'Recipes',
      color: '#ec4899',
      onPress: () => router.push('/(modals)/recipes'),
    },
    {
      icon: Scales,
      label: 'Weight',
      color: '#06b6d4',
      onPress: () => router.push('/(modals)/log-weight'),
    },
    {
      icon: Trophy,
      label: 'Achievements',
      color: '#f59e0b',
      onPress: () => router.push('/(modals)/achievements'),
    },
  ];

  // Split into rows of 3
  const topRow = actions.slice(0, 3);
  const bottomRow = actions.slice(3, 6);

  const renderAction = (action: typeof actions[0]) => (
    <Card
      key={action.label}
      flex={1}
      backgroundColor="$cardBackground"
      padding="$3"
      borderRadius="$4"
      pressStyle={{ scale: 0.97, opacity: 0.9 }}
      onPress={action.onPress}
    >
      <YStack alignItems="center" gap="$2">
        <XStack
          width={44}
          height={44}
          borderRadius="$5"
          backgroundColor={`${action.color}20`}
          justifyContent="center"
          alignItems="center"
        >
          <action.icon size={22} color={action.color} weight="thin" />
        </XStack>
        <Text fontSize="$3" color="$color" fontWeight="500">
          {action.label}
        </Text>
      </YStack>
    </Card>
  );

  return (
    <YStack gap="$3">
      <XStack gap="$3">
        {topRow.map(renderAction)}
      </XStack>
      <XStack gap="$3">
        {bottomRow.map(renderAction)}
      </XStack>
    </YStack>
  );
}
