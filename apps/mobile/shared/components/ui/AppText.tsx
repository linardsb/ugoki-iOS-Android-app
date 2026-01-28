/**
 * AppText - Custom Text component with app font applied
 *
 * Use this instead of Tamagui's Text to ensure consistent font usage.
 * Automatically applies the Homizio font family from the theme config.
 */

import { styled, Text as TamaguiText } from 'tamagui';

/**
 * Styled Text component with default font family
 * Extends all Tamagui Text props
 */
export const AppText = styled(TamaguiText, {
  name: 'AppText',
  fontFamily: '$body',

  variants: {
    // Preset variants for common text styles
    preset: {
      heading: {
        fontFamily: '$heading',
        fontWeight: '700',
      },
      subheading: {
        fontFamily: '$heading',
        fontWeight: '600',
      },
      body: {
        fontFamily: '$body',
        fontWeight: '400',
      },
      label: {
        fontFamily: '$body',
        fontWeight: '500',
        fontSize: '$sm',
      },
      caption: {
        fontFamily: '$body',
        fontWeight: '400',
        fontSize: '$xs',
        color: '$colorMuted',
      },
      mono: {
        fontFamily: '$mono',
      },
    },
  } as const,
});

export type AppTextProps = React.ComponentProps<typeof AppText>;
