import { create } from 'zustand';
import { appStorage } from './storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isLoaded: boolean;
  setMode: (mode: ThemeMode) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  isLoaded: false,

  setMode: async (mode: ThemeMode) => {
    set({ mode });
    await appStorage.setTheme(mode);
  },

  loadTheme: async () => {
    const savedTheme = await appStorage.getTheme();
    set({
      mode: savedTheme || 'light',
      isLoaded: true,
    });
  },
}));
