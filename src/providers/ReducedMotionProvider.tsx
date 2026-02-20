'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { MotionConfig } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReducedMotionContextValue {
  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ReducedMotionContext = createContext<ReducedMotionContextValue>({
  prefersReducedMotion: false,
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns whether the user prefers reduced motion.
 *
 * When `prefersReducedMotion` is `true`, all Framer Motion animations
 * wrapped by this provider will run with `duration: 0`.
 */
export function useReducedMotion(): boolean {
  return useContext(ReducedMotionContext).prefersReducedMotion;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMediaQuery(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ReducedMotionProviderProps {
  children: ReactNode;
  /** Force a value (useful for testing / Storybook) */
  forceReducedMotion?: boolean;
}

export function ReducedMotionProvider({
  children,
  forceReducedMotion,
}: ReducedMotionProviderProps) {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(
    forceReducedMotion ?? getMediaQuery,
  );

  // Listen for OS-level preference changes
  useEffect(() => {
    if (forceReducedMotion !== undefined) {
      setPrefersReduced(forceReducedMotion);
      return;
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleChange(e: MediaQueryListEvent) {
      setPrefersReduced(e.matches);
    }

    // Sync initial state
    setPrefersReduced(mql.matches);

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [forceReducedMotion]);

  const value = useMemo<ReducedMotionContextValue>(
    () => ({ prefersReducedMotion: prefersReduced }),
    [prefersReduced],
  );

  // Framer Motion's <MotionConfig> applies transition defaults to all
  // children. When reduced motion is active, set duration to 0 so every
  // animation resolves instantly.
  const transition = prefersReduced ? { duration: 0 } : undefined;

  return (
    <ReducedMotionContext.Provider value={value}>
      <MotionConfig transition={transition} reducedMotion="user">
        {children}
      </MotionConfig>
    </ReducedMotionContext.Provider>
  );
}

ReducedMotionProvider.displayName = 'ReducedMotionProvider';

export default ReducedMotionProvider;
