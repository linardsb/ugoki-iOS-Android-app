/**
 * Global color constants for Research Hub feature.
 * Ensures consistent text and background colors across all components.
 *
 * Pattern:
 * - Light cards (BenefitBadge, WHO IS THIS FOR) → always use dark text
 * - Theme backgrounds → use theme-aware text colors
 */

// Text colors for content on LIGHT card backgrounds (always visible)
export const CARD_TEXT = {
  title: '#1f2937',       // Dark gray for titles
  body: '#4b5563',        // Medium gray for body text
  muted: '#6b7280',       // Light gray for secondary text
};

// Theme-aware colors (use with isDark check)
export const THEME_TEXT = {
  light: {
    primary: '#1f2937',   // Dark text for light backgrounds
    secondary: '#4b5563',
    muted: '#6b7280',
    subtle: '#9ca3af',
  },
  dark: {
    primary: '#fafafa',   // Light text for dark backgrounds
    secondary: '#d4d4d8',
    muted: '#a1a1aa',
    subtle: '#71717a',
  },
};

// Background colors
export const BACKGROUNDS = {
  light: {
    card: '#f9fafb',
    cardAlt: '#f3f4f6',
    page: '#fafafa',
  },
  dark: {
    card: '#1c1c1e',
    cardAlt: '#2c2c2e',
    page: '#09090b',
  },
};

// Special card backgrounds (light in both themes for contrast)
export const LIGHT_CARD = {
  background: '#f9fafb',
  backgroundAlt: '#f5f5f5',
  iconBg: '#f3f4f6',
  iconBgAlt: '#e5e5e5',
};

// Status colors (semantic colors)
export const STATUS = {
  success: {
    light: { bg: '#f0fdf4', text: '#16a34a' },
    dark: { bg: '#1f3f2f', text: '#86efac' },
  },
  warning: {
    light: { bg: '#fffbeb', text: '#d97706' },
    dark: { bg: '#3f2f1f', text: '#fcd34d' },
  },
  error: {
    light: { bg: '#fef2f2', text: '#dc2626' },
    dark: { bg: '#3f1f1f', text: '#fca5a5' },
  },
  info: {
    light: { bg: '#eff6ff', text: '#2563eb' },
    dark: { bg: '#1e3a5f', text: '#93c5fd' },
  },
};

// Helper function to get theme-aware text color
export function getTextColor(isDark: boolean, variant: 'primary' | 'secondary' | 'muted' | 'subtle' = 'primary'): string {
  return isDark ? THEME_TEXT.dark[variant] : THEME_TEXT.light[variant];
}

// Helper function to get theme-aware background
export function getBackground(isDark: boolean, variant: 'card' | 'cardAlt' | 'page' = 'card'): string {
  return isDark ? BACKGROUNDS.dark[variant] : BACKGROUNDS.light[variant];
}

// Helper function to get status colors
export function getStatusColors(isDark: boolean, status: 'success' | 'warning' | 'error' | 'info') {
  return isDark ? STATUS[status].dark : STATUS[status].light;
}
