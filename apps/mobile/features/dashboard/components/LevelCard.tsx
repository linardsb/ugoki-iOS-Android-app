import { View } from 'react-native';
import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { Star, CaretRight } from 'phosphor-react-native';
import type { UserLevel } from '../types';

interface LevelCardProps {
  level: UserLevel | null;
  isLoading?: boolean;
}

export function LevelCard({ level, isLoading }: LevelCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const progressBarBg = theme.backgroundHover.val;
  const primaryColor = theme.primary.val;

  const handlePress = () => {
    router.push('/(modals)/achievements');
  };

  if (isLoading) {
    return (
      <Card backgroundColor="$cardBackground" padding="$4" borderRadius="$4">
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$3" color="$colorMuted">Loading...</Text>
          </XStack>
        </YStack>
      </Card>
    );
  }

  if (!level) {
    return (
      <Card
        backgroundColor="$cardBackground"
        padding="$4"
        borderRadius="$4"
        pressStyle={{ scale: 0.98, opacity: 0.9 }}
        onPress={handlePress}
      >
        <YStack gap="$3" alignItems="center">
          <Star size={32} color={primaryColor} weight="regular" />
          <Text color="$colorMuted">Start your journey to level up!</Text>
        </YStack>
      </Card>
    );
  }

  return (
    <Card
      backgroundColor="$cardBackground"
      padding="$4"
      borderRadius="$4"
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={handlePress}
    >
      <YStack gap="$3">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Star size={20} color="#FFA387" weight="fill" />
            <Text fontSize="$5" fontWeight="bold" color="$color">
              Level {level.current_level}
            </Text>
          </XStack>
          <Text fontSize="$3" color="$primary" fontWeight="600">
            {level.title}
          </Text>
        </XStack>

        {/* XP Progress */}
        <YStack gap="$2">
          <View
            style={{
              height: 8,
              backgroundColor: progressBarBg,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${level.xp_progress_percent}%`,
                backgroundColor: '#3A5BA0',
                borderRadius: 4,
              }}
            />
          </View>
          <XStack justifyContent="space-between">
            <Text fontSize="$3" color="$colorMuted">
              {level.current_xp.toLocaleString()} XP
            </Text>
            <Text fontSize="$3" color="$colorMuted">
              {level.xp_for_next_level.toLocaleString()} to next level
            </Text>
          </XStack>
        </YStack>

        {/* View Achievements hint */}
        <XStack justifyContent="center" alignItems="center" gap="$1" marginTop="$1">
          <Text fontSize="$3" color="$primary" fontWeight="600">
            View Achievements
          </Text>
          <CaretRight size={16} color="#3A5BA0" weight="regular" />
        </XStack>
      </YStack>
    </Card>
  );
}
