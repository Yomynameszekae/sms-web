'use client';

import { useEffect } from 'react';
import { useThemeStore, THEME_STORAGE_KEY } from '@/store/theme.store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    setTheme(localStorage.getItem(THEME_STORAGE_KEY) ?? '');
  }, [setTheme]);

  return <>{children}</>;
}
