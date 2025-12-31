import { Image, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Robot, User } from 'phosphor-react-native';
import type { ChatMessage } from '../types';
import type { Gender } from '@/features/profile';

// Coach avatar images
const coachMaleAvatar = require('../../../assets/coach-male.webp');
const coachFemaleAvatar = require('../../../assets/coach-female.webp');

interface ChatBubbleProps {
  message: ChatMessage;
  userGender?: Gender | null;
}

export function ChatBubble({ message, userGender }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get coach avatar based on user's gender preference
  const renderCoachAvatar = () => {
    switch (userGender) {
      case 'male':
        return (
          <Image
            source={coachMaleAvatar}
            style={styles.coachAvatarImage}
          />
        );
      case 'female':
        return (
          <Image
            source={coachFemaleAvatar}
            style={styles.coachAvatarImage}
          />
        );
      default:
        return <Robot size={20} color="white" weight="fill" />;
    }
  };

  return (
    <XStack
      width="100%"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      paddingHorizontal="$4"
      paddingVertical="$1"
    >
      <XStack
        maxWidth="80%"
        gap="$2"
        flexDirection={isUser ? 'row-reverse' : 'row'}
        alignItems="flex-end"
      >
        {/* Avatar */}
        <XStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor={isUser ? '$primary' : (userGender === 'male' || userGender === 'female' ? 'transparent' : '$secondary')}
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
          overflow="hidden"
        >
          {isUser ? (
            <User size={18} color="white" weight="thin" />
          ) : (
            renderCoachAvatar()
          )}
        </XStack>

        {/* Message bubble */}
        <YStack
          backgroundColor={isUser ? '$primary' : '$cardBackground'}
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$4"
          borderBottomRightRadius={isUser ? '$1' : '$4'}
          borderBottomLeftRadius={isUser ? '$4' : '$1'}
          gap="$1"
        >
          <Text
            fontSize="$3"
            color={isUser ? 'white' : '$color'}
            lineHeight={22}
          >
            {message.content}
          </Text>
          <Text
            fontSize="$3"
            color={isUser ? 'rgba(255,255,255,0.7)' : '$colorMuted'}
            alignSelf={isUser ? 'flex-start' : 'flex-end'}
          >
            {formatTime(message.timestamp)}
          </Text>
        </YStack>
      </XStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  coachAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
