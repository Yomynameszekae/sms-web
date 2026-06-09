'use client';

import { create } from 'zustand';

export const THEMES = ['sand-clay', 'greige-sage', 'slate-peach', 'deep-navy', 'navy-gold'] as const;
export type ThemeId = typeof THEMES[number];
export const DEFAULT_THEME: ThemeId = 'navy-gold';
export const THEME_STORAGE_KEY = 'brite-theme';

export function validateTheme(value: string | null | undefined): ThemeId {
  if (value && (THEMES as readonly string[]).includes(value)) return value as ThemeId;
  return DEFAULT_THEME;
}

interface ThemeState {
  theme: ThemeId;
  setTheme: (id: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: DEFAULT_THEME,
  setTheme: (id) => {
    const validated = validateTheme(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, validated);
      document.documentElement.dataset.theme = validated;
    }
    set({ theme: validated });
  },
}));
