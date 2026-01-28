/**
 * UGOKI Font Configuration
 *
 * Modular font system - change fonts by updating this single file.
 *
 * TO CHANGE FONTS:
 * 1. Add new font files to assets/fonts/
 * 2. Update fontFamilyNames below with new names
 * 3. Update _layout.tsx useFonts() with matching names and paths
 * 4. Rebuild the app (expo prebuild --clean if needed)
 */

import { createFont } from '@tamagui/core';
import { typography } from './tokens';

// =============================================================================
// FONT FAMILY NAMES
// =============================================================================

/**
 * Font family names as loaded by expo-font
 * These MUST match the keys used in useFonts() in _layout.tsx
 *
 * To switch to a different font:
 * 1. Change these names to match your new font
 * 2. Update _layout.tsx useFonts() to load the new font files
 */
export const fontFamilyNames = {
  thin: 'Homizio-Thin',
  light: 'Homizio-Light',
  regular: 'Homizio',
  medium: 'Homizio-Medium',
  bold: 'Homizio-Bold',
  black: 'Homizio-Black',
} as const;

// =============================================================================
// TAMAGUI FONT CONFIGURATION
// =============================================================================

/**
 * Create Tamagui font with proper React Native face mapping
 */
const createAppFont = () =>
  createFont({
    family: fontFamilyNames.regular,
    size: {
      1: typography.fontSize.xs, // 12
      2: typography.fontSize.sm, // 14
      3: typography.fontSize.base, // 16
      4: typography.fontSize.lg, // 18
      5: typography.fontSize.xl, // 20
      6: typography.fontSize['2xl'], // 24
      7: typography.fontSize['3xl'], // 30
      8: typography.fontSize['4xl'], // 36
      9: typography.fontSize['5xl'], // 48
      // Semantic aliases
      xs: typography.fontSize.xs,
      sm: typography.fontSize.sm,
      base: typography.fontSize.base,
      lg: typography.fontSize.lg,
      xl: typography.fontSize.xl,
      '2xl': typography.fontSize['2xl'],
      '3xl': typography.fontSize['3xl'],
      '4xl': typography.fontSize['4xl'],
      '5xl': typography.fontSize['5xl'],
    },
    lineHeight: {
      1: Math.round(typography.fontSize.xs * typography.lineHeight.normal),
      2: Math.round(typography.fontSize.sm * typography.lineHeight.normal),
      3: Math.round(typography.fontSize.base * typography.lineHeight.normal),
      4: Math.round(typography.fontSize.lg * typography.lineHeight.normal),
      5: Math.round(typography.fontSize.xl * typography.lineHeight.normal),
      6: Math.round(typography.fontSize['2xl'] * typography.lineHeight.snug),
      7: Math.round(typography.fontSize['3xl'] * typography.lineHeight.snug),
      8: Math.round(typography.fontSize['4xl'] * typography.lineHeight.tight),
      9: Math.round(typography.fontSize['5xl'] * typography.lineHeight.tight),
    },
    weight: {
      1: '100',
      2: '200',
      3: '300',
      4: '400',
      5: '500',
      6: '600',
      7: '700',
      8: '800',
      9: '900',
      thin: '100',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    letterSpacing: {
      1: typography.letterSpacing.tighter,
      2: typography.letterSpacing.tight,
      3: typography.letterSpacing.normal,
      4: typography.letterSpacing.wide,
      5: typography.letterSpacing.wider,
      tighter: typography.letterSpacing.tighter,
      tight: typography.letterSpacing.tight,
      normal: typography.letterSpacing.normal,
      wide: typography.letterSpacing.wide,
      wider: typography.letterSpacing.wider,
    },
    // React Native font face mapping - maps weight to actual font file name
    face: {
      100: { normal: fontFamilyNames.thin },
      200: { normal: fontFamilyNames.light },
      300: { normal: fontFamilyNames.light },
      400: { normal: fontFamilyNames.regular },
      500: { normal: fontFamilyNames.medium },
      600: { normal: fontFamilyNames.bold },
      700: { normal: fontFamilyNames.bold },
      800: { normal: fontFamilyNames.black },
      900: { normal: fontFamilyNames.black },
    },
  });

/**
 * App fonts configuration for Tamagui
 * All font roles use the same font family
 */
export const appFonts = {
  heading: createAppFont(),
  body: createAppFont(),
  mono: createAppFont(),
};

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Get the font family name for a given weight
 * Useful for components that need direct fontFamily access
 */
export const getFontFamily = (
  weight: 'thin' | 'light' | 'regular' | 'medium' | 'bold' | 'black' = 'regular'
): string => {
  return fontFamilyNames[weight];
};

/**
 * Default font family (regular weight)
 */
export const defaultFontFamily = fontFamilyNames.regular;
