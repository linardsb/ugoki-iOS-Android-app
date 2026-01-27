import { XStack, Text, styled, GetProps } from 'tamagui';
import { Pressable } from 'react-native';

/**
 * SectionHeader - A header component for feature sections
 *
 * Used for: Dashboard sections, list headers, settings groups, etc.
 */

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'compact' | 'large';
}

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
  variant = 'default',
}: SectionHeaderProps) {
  const titleSize = variant === 'large' ? '$6' : variant === 'compact' ? '$4' : '$5';
  const subtitleSize = variant === 'large' ? '$3' : '$2';

  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingVertical={variant === 'compact' ? '$2' : '$3'}
    >
      <XStack alignItems="center" gap="$2" flex={1}>
        {icon}
        <XStack flexDirection="column" gap="$0.5">
          <Text
            color="$color"
            fontSize={titleSize}
            fontWeight="600"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              color="$colorMuted"
              fontSize={subtitleSize}
            >
              {subtitle}
            </Text>
          )}
        </XStack>
      </XStack>

      {action && (
        <Pressable onPress={action.onPress}>
          <Text
            color="$primary"
            fontSize="$3"
            fontWeight="600"
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </XStack>
  );
}

export default SectionHeader;
