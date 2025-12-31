/**
 * UI Store
 * Global UI state management (popups, modals, etc.)
 */

import { create } from 'zustand';

interface UIState {
  // Profile popup menu
  isProfileMenuOpen: boolean;
  openProfileMenu: () => void;
  closeProfileMenu: () => void;
  toggleProfileMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Profile popup menu
  isProfileMenuOpen: false,
  openProfileMenu: () => set({ isProfileMenuOpen: true }),
  closeProfileMenu: () => set({ isProfileMenuOpen: false }),
  toggleProfileMenu: () => set((state) => ({ isProfileMenuOpen: !state.isProfileMenuOpen })),
}));
