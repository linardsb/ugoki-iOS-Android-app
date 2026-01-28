import { Button, Text, Spinner, styled, GetProps, TamaguiElement } from '@/shared/components/tamagui';
import * as Haptics from 'expo-haptics';
import { forwardRef, type ForwardedRef } from 'react';

const StyledButton = styled(Button, {
  name: 'AppButton',
  borderRadius: '$3',
  fontWeight: '600',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        pressStyle: { backgroundColor: '$primaryPress' },
      },
      secondary: {
        backgroundColor: '$secondary',
        pressStyle: { backgroundColor: '$secondaryPress' },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
        pressStyle: { backgroundColor: '$backgroundHover' },
      },
      ghost: {
        backgroundColor: 'transparent',
        pressStyle: { backgroundColor: '$backgroundHover' },
      },
      danger: {
        backgroundColor: '$error',
        pressStyle: { opacity: 0.8 },
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
  },
});

type AppButtonProps = GetProps<typeof StyledButton> & {
  loading?: boolean;
  haptic?: boolean;
  children: React.ReactNode;
};

export const AppButton = forwardRef<TamaguiElement, AppButtonProps>(
  ({ loading, haptic = true, children, onPress, variant, disabled, ...props }, ref) => {
    const handlePress = (e: any) => {
      if (haptic && !disabled && !loading) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onPress?.(e);
    };

    const textColor = variant === 'outline' || variant === 'ghost' ? '$color' : 'white';

    return (
      <StyledButton
        ref={ref}
        variant={variant}
        disabled={disabled || loading}
        onPress={handlePress}
        opacity={disabled || loading ? 0.6 : 1}
        {...props}
      >
        {loading ? (
          <Spinner size="small" color={textColor} />
        ) : typeof children === 'string' ? (
          <Text color={textColor} fontWeight="600" fontSize="$5">
            {children}
          </Text>
        ) : (
          children
        )}
      </StyledButton>
    );
  }
);

AppButton.displayName = 'AppButton';
