import { Image } from 'expo-image';
import { YStack, Text, styled, GetProps } from '@/shared/components/tamagui';

const AvatarContainer = styled(YStack, {
  name: 'Avatar',
  borderRadius: '$full',
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$primary',

  variants: {
    size: {
      sm: { width: 32, height: 32 },
      md: { width: 48, height: 48 },
      lg: { width: 64, height: 64 },
      xl: { width: 96, height: 96 },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
}

const fontSizes: Record<AvatarSize, number> = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 36,
};

export function Avatar({ source, name, size = 'md' }: AvatarProps) {
  // Get initials from name
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  if (source) {
    return (
      <AvatarContainer size={size}>
        <Image
          source={{ uri: source }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      </AvatarContainer>
    );
  }

  return (
    <AvatarContainer size={size}>
      <Text
        color="white"
        fontWeight="600"
        fontSize={fontSizes[size]}
      >
        {getInitials(name)}
      </Text>
    </AvatarContainer>
  );
}
