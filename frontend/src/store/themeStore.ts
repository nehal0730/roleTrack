import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: window.matchMedia('(prefers-color-scheme: dark)').matches,

      toggle: () => {
        const next = !get().dark;
        document.documentElement.classList.toggle('dark', next);
        set({ dark: next });
      },

      setDark: (value: boolean) => {
        document.documentElement.classList.toggle('dark', value);
        set({ dark: value });
      },
    }),
    { name: 'theme-store' }
  )
);

/** Call once on app boot to restore saved theme before first render */
export const initTheme = () => {
  const stored = localStorage.getItem('theme-store');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (typeof state?.dark === 'boolean') {
        document.documentElement.classList.toggle('dark', state.dark);
        return;
      }
    } catch {}
  }
  // Fallback: system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
};