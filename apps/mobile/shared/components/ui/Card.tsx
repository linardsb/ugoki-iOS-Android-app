import { YStack, styled, GetProps } from 'tamagui';

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBackground',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$cardBorder',
  padding: '$4',

  variants: {
    pressable: {
      true: {
        pressStyle: {
          backgroundColor: '$backgroundHover',
          scale: 0.98,
        },
        cursor: 'pointer',
      },
    },
    elevated: {
      true: {
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
    },
    padded: {
      none: { padding: 0 },
      sm: { padding: '$2' },
      md: { padding: '$4' },
      lg: { padding: '$6' },
    },
  } as const,

  defaultVariants: {
    padded: 'md',
  },
});

export type CardProps = GetProps<typeof Card>;
