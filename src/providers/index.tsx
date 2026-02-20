'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider, type ThemeProviderProps } from './ThemeProvider';
import { ReducedMotionProvider } from './ReducedMotionProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppProvidersProps {
  children: ReactNode;
  /** Override initial theme (forwarded to ThemeProvider) */
  defaultTheme?: ThemeProviderProps['defaultTheme'];
}

// ---------------------------------------------------------------------------
// Combined provider tree
// ---------------------------------------------------------------------------

/**
 * Wraps all application-level providers in a single component.
 *
 * Current providers (in order):
 *   1. ThemeProvider    — light/dark/system theme with persistence
 *   2. ReducedMotionProvider — respects prefers-reduced-motion
 *
 * Usage:
 * ```tsx
 * <AppProviders>
 *   <YourApp />
 * </AppProviders>
 * ```
 */
export function AppProviders({ children, defaultTheme }: AppProvidersProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <ReducedMotionProvider>{children}</ReducedMotionProvider>
    </ThemeProvider>
  );
}

AppProviders.displayName = 'AppProviders';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { ThemeProvider, useTheme } from './ThemeProvider';
export type { Theme, ResolvedTheme, ThemeContextValue } from './ThemeProvider';

export { ReducedMotionProvider, useReducedMotion } from './ReducedMotionProvider';

export default AppProviders;
