import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { readCssColor } from '@/lib/cssColor';

export type ThemeMode = 'dark' | 'light';

function systemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Applied synchronously (not in a React effect) so that CSS variables are already updated
 * when components — notably the chart — re-read them after a theme change.
 */
function applyTheme(theme: ThemeMode, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }
  root.dataset.theme = theme;
  // Tint the mobile browser chrome to match the header.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', readCssColor('--surface'));
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: systemTheme(),
      setTheme: (theme) => {
        applyTheme(theme, true);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'fb-theme', // also read by the inline script in index.html
      version: 1,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme, false);
      },
    },
  ),
);
