import { Circle, styled, GetProps } from 'tamagui';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * IconButton - A circular button component for icons
 *
 * Used for: Action buttons, navigation, social interactions, etc.
 */

const IconButtonContainer = styled(Circle, {
  name: 'IconButton',
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    variant: {
      default: {
        backgroundColor: '$backgroundHover',
      },
      primary: {
        backgroundColor: '$primary',
      },
      secondary: {
        backgroundColor: '$secondary',
      },
      success: {
        backgroundColor: '$success',
      },
      error: {
        backgroundColor: '$error',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      muted: {
        backgroundColor: '$backgroundSoft',
      },
    },
    size: {
      xs: {
        width: 28,
        height: 28,
      },
      sm: {
        width: 36,
        height: 36,
      },
      md: {
        width: 44,
        height: 44,
      },
      lg: {
        width: 52,
        height: 52,
      },
      xl: {
        width: 64,
        height: 64,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type IconButtonProps = GetProps<typeof IconButtonContainer> & {
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
};

export function IconButton({
  icon,
  onPress,
  disabled,
  haptic = true,
  variant,
  size,
  ...props
}: IconButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      <IconButtonContainer variant={variant} size={size} {...props}>
        {icon}
      </IconButtonContainer>
    </Pressable>
  );
}

export default IconButton;
