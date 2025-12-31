import { Pressable, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { User, Camera } from 'phosphor-react-native';
import type { UserProfile } from '../types';

interface ProfileHeaderProps {
  profile: UserProfile | null;
  level?: number;
  xp?: number;
  editable?: boolean;
}

export function ProfileHeader({ profile, level = 1, xp = 0, editable = true }: ProfileHeaderProps) {
  const router = useRouter();
  const displayName = profile?.display_name || profile?.first_name || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleAvatarPress = () => {
    if (editable) {
      router.push('/(modals)/avatar-picker');
    }
  };

  return (
    <YStack alignItems="center" gap="$4" paddingVertical="$4">
      {/* Avatar */}
      <Pressable onPress={handleAvatarPress} disabled={!editable}>
        <XStack position="relative">
          <XStack
            width={100}
            height={100}
            borderRadius={50}
            backgroundColor="$primary"
            justifyContent="center"
            alignItems="center"
            overflow="hidden"
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
                resizeMode="cover"
              />
            ) : (
              <Text fontSize="$8" fontWeight="bold" color="white">
                {initials || <User size={40} color="white" weight="thin" />}
              </Text>
            )}
          </XStack>

          {/* Edit badge - positioned outside the avatar */}
          {editable && (
            <XStack
              position="absolute"
              bottom={0}
              right={0}
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="$secondary"
              justifyContent="center"
              alignItems="center"
              borderWidth={3}
              borderColor="$background"
            >
              <Camera size={16} color="white" weight="fill" />
            </XStack>
          )}
        </XStack>
      </Pressable>

      {/* Name and level */}
      <YStack alignItems="center" gap="$1">
        <Text fontSize="$6" fontWeight="bold" color="$color">
          {displayName}
        </Text>
        <XStack gap="$2" alignItems="center">
          <XStack
            backgroundColor="$primary"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text fontSize="$3" fontWeight="bold" color="white">
              Level {level}
            </Text>
          </XStack>
          <Text fontSize="$3" color="$colorMuted">
            {xp.toLocaleString()} XP
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
