'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Current theme setting (may be 'system') */
  theme: Theme;
  /** Set the theme ('light', 'dark', or 'system') */
  setTheme: (theme: Theme) => void;
  /** The actual resolved theme after evaluating system preference */
  resolvedTheme: ResolvedTheme;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'flashcard-theme';
const ATTRIBUTE = 'data-theme';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current theme and setter.
 *
 * @returns `{ theme, setTheme, resolvedTheme }`
 * @throws if used outside of `<ThemeProvider>`
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// System preference helper
// ---------------------------------------------------------------------------

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable (SSR, incognito quota, etc.)
  }
  return 'system';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  children: ReactNode;
  /** Override initial theme (useful for testing / Storybook) */
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme ?? getStoredTheme);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(
    getSystemPreference,
  );

  // Listen for OS-level preference changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    function handleChange(e: MediaQueryListEvent) {
      setSystemPreference(e.matches ? 'dark' : 'light');
    }

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // Derive the resolved (actual) theme
  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? systemPreference : theme;

  // Apply the data-theme attribute and Tailwind dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute(ATTRIBUTE, resolvedTheme);

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Persist user choice
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore write failures
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

ThemeProvider.displayName = 'ThemeProvider';

export default ThemeProvider;
