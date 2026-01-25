import { YStack, styled, GetProps } from 'tamagui';

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBackground',
  borderRadius: '$lg',
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
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 0,
      },
      sm: {
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 0,
      },
      md: {
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 0,
      },
      lg: {
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 0,
      },
      xl: {
        shadowColor: '$shadowColorStrong',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 0,
      },
    },
    padded: {
      none: { padding: 0 },
      sm: { padding: '$2' },
      md: { padding: '$4' },
      lg: { padding: '$6' },
    },
    rounded: {
      sm: { borderRadius: '$sm' },
      md: { borderRadius: '$md' },
      lg: { borderRadius: '$lg' },
      xl: { borderRadius: '$xl' },
      '2xl': { borderRadius: '$2xl' },
    },
  } as const,

  defaultVariants: {
    padded: 'md',
  },
});

export type CardProps = GetProps<typeof Card>;
