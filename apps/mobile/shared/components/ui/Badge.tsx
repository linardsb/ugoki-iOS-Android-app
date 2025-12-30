import { XStack, Text, styled, GetProps } from 'tamagui';

const BadgeContainer = styled(XStack, {
  name: 'Badge',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$full',

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
      warning: {
        backgroundColor: '$warning',
      },
      error: {
        backgroundColor: '$error',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
    },
    size: {
      sm: {
        paddingHorizontal: '$1.5',
        paddingVertical: '$0.5',
      },
      md: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
      lg: {
        paddingHorizontal: '$3',
        paddingVertical: '$1.5',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type BadgeProps = GetProps<typeof BadgeContainer> & {
  children: React.ReactNode;
};

export function Badge({ children, variant, ...props }: BadgeProps) {
  const textColor = variant === 'outline' || variant === 'default' ? '$color' : 'white';

  return (
    <BadgeContainer variant={variant} {...props}>
      {typeof children === 'string' ? (
        <Text color={textColor} fontSize="$2" fontWeight="600">
          {children}
        </Text>
      ) : (
        children
      )}
    </BadgeContainer>
  );
}
