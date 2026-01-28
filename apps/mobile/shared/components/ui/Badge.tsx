import { XStack, Text, styled, GetProps } from '@/shared/components/tamagui';

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
      info: {
        backgroundColor: '$info',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      // Muted variants (subtle background)
      primaryMuted: {
        backgroundColor: '$primaryMuted',
      },
      secondaryMuted: {
        backgroundColor: '$secondaryMuted',
      },
      successMuted: {
        backgroundColor: '$successMuted',
      },
      warningMuted: {
        backgroundColor: '$warningMuted',
      },
      errorMuted: {
        backgroundColor: '$errorMuted',
      },
      infoMuted: {
        backgroundColor: '$infoMuted',
      },
    },
    size: {
      sm: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
      md: {
        paddingHorizontal: '$3',
        paddingVertical: '$1.5',
      },
      lg: {
        paddingHorizontal: '$4',
        paddingVertical: '$2',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline'
  | 'primaryMuted'
  | 'secondaryMuted'
  | 'successMuted'
  | 'warningMuted'
  | 'errorMuted'
  | 'infoMuted';

type BadgeProps = GetProps<typeof BadgeContainer> & {
  children: React.ReactNode;
  variant?: BadgeVariant;
};

// Map variants to their text colors
const getTextColor = (variant?: BadgeVariant): string => {
  if (!variant) return '$color';

  const lightTextVariants = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];
  const darkTextVariants = ['default', 'outline'];
  const mutedVariants = ['primaryMuted', 'secondaryMuted', 'successMuted', 'warningMuted', 'errorMuted', 'infoMuted'];

  if (lightTextVariants.includes(variant)) return 'white';
  if (darkTextVariants.includes(variant)) return '$color';
  if (mutedVariants.includes(variant)) {
    // Extract base color from muted variant (e.g., 'primaryMuted' -> '$primary')
    const baseColor = variant.replace('Muted', '');
    return `$${baseColor}`;
  }
  return '$color';
};

export function Badge({ children, variant, ...props }: BadgeProps) {
  const textColor = getTextColor(variant);

  return (
    <BadgeContainer variant={variant} {...props}>
      {typeof children === 'string' ? (
        <Text color={textColor} fontSize="$3" fontWeight="600">
          {children}
        </Text>
      ) : (
        children
      )}
    </BadgeContainer>
  );
}
