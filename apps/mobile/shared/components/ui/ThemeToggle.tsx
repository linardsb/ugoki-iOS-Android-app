/**
 * Theme Toggle Button
 * A reusable sun/moon toggle for switching between light and dark mode
 */

import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/components/tamagui';
import { Sun, Moon } from 'phosphor-react-native';
import { useCallback } from 'react';
import { useThemeStore } from '@/shared/stores/theme';

interface ThemeToggleProps {
  size?: number;
}

export function ThemeToggle({ size = 44 }: ThemeToggleProps) {
  const theme = useTheme();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

  const isDarkMode = themeMode === 'dark';
  const iconSize = size * 0.55;

  const toggleTheme = useCallback(() => {
    setThemeMode(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setThemeMode]);

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.backgroundHover.val,
        },
      ]}
      activeOpacity={0.7}
    >
      {isDarkMode ? (
        <Sun size={iconSize} color={theme.color.val} weight="bold" />
      ) : (
        <Moon size={iconSize} color={theme.color.val} weight="bold" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
