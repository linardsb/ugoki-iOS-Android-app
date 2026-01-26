import { Image, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Robot, Lightning, Timer, Scales, Brain } from 'phosphor-react-native';
import type { Gender } from '@/features/profile';

// Coach avatar images
const coachMaleAvatar = require('../../../assets/coach-male.webp');
const coachFemaleAvatar = require('../../../assets/coach-female.webp');

interface WelcomeMessageProps {
  onSuggestionPress: (message: string) => void;
  userGender?: Gender | null;
}

const suggestions = [
  {
    icon: Timer,
    text: 'How long should I fast today?',
    color: '#FFA387',
  },
  {
    icon: Lightning,
    text: 'Suggest a quick workout',
    color: '#3A5BA0',
  },
  {
    icon: Scales,
    text: 'Help me reach my weight goal',
    color: '#3A5BA0',
  },
  {
    icon: Brain,
    text: 'Give me some motivation',
    color: '#4A9B7F',
  },
];

export function WelcomeMessage({ onSuggestionPress, userGender }: WelcomeMessageProps) {
  const hasCustomAvatar = userGender === 'male' || userGender === 'female';

  const renderCoachAvatar = () => {
    switch (userGender) {
      case 'male':
        return (
          <Image
            source={coachMaleAvatar}
            style={styles.avatarImage}
          />
        );
      case 'female':
        return (
          <Image
            source={coachFemaleAvatar}
            style={styles.avatarImage}
          />
        );
      default:
        return <Robot size={40} color="white" weight="fill" />;
    }
  };

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$6">
      {/* Coach avatar */}
      <XStack
        width={100}
        height={100}
        borderRadius={50}
        backgroundColor={hasCustomAvatar ? 'transparent' : '$secondary'}
        justifyContent="center"
        alignItems="center"
        overflow="hidden"
      >
        {renderCoachAvatar()}
      </XStack>

      {/* Welcome text */}
      <YStack alignItems="center" gap="$2">
        <Text fontSize="$6" fontWeight="bold" color="$color">
          Hi, I'm your Coach!
        </Text>
        <Text
          fontSize="$3"
          color="$colorMuted"
          textAlign="center"
          maxWidth={280}
        >
          I'm here to help you with fasting, workouts, and your wellness journey. Ask me anything!
        </Text>
      </YStack>

      {/* Suggestions */}
      <YStack gap="$3" width="100%">
        <Text fontSize="$3" color="$colorMuted" textAlign="center">
          Try asking:
        </Text>
        <YStack gap="$2">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <XStack
                key={suggestion.text}
                backgroundColor="$cardBackground"
                padding="$3"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$cardBorder"
                gap="$3"
                alignItems="center"
                pressStyle={{ opacity: 0.8, scale: 0.98 }}
                onPress={() => onSuggestionPress(suggestion.text)}
              >
                <XStack
                  width={36}
                  height={36}
                  borderRadius="$4"
                  backgroundColor={`${suggestion.color}20`}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Icon size={18} color={suggestion.color} weight="thin" />
                </XStack>
                <Text fontSize="$3" color="$color" flex={1}>
                  {suggestion.text}
                </Text>
              </XStack>
            );
          })}
        </YStack>
      </YStack>

      {/* Disclaimer */}
      <Text
        fontSize="$3"
        color="$colorMuted"
        textAlign="center"
        opacity={0.8}
        maxWidth={300}
      >
        For general wellness guidance only. Not medical advice.
      </Text>
    </YStack>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});
