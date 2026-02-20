'use client';

import React, { forwardRef, useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressVariant = 'linear' | 'circular';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Visual variant */
  variant?: ProgressVariant;
  /** Size preset */
  size?: ProgressSize;
  /** Override the auto color (Tailwind text/bg class) */
  color?: string;
  /** Show the numeric percentage label */
  showLabel?: boolean;
  /** Enable animated transitions */
  animated?: boolean;
  /** Additional class name */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp value between 0 and 100. */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Color shifts based on progress:
 *   0-49  -> green (encouraging start)
 *   50-74 -> blue  (mid-range, shimmer kicks in)
 *   75+   -> gold  (nearing completion, second shimmer)
 */
function autoColor(value: number): {
  bar: string;
  text: string;
  stroke: string;
} {
  if (value < 50) {
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      stroke: '#22c55e',
    };
  }
  if (value < 75) {
    return {
      bar: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      stroke: '#3b82f6',
    };
  }
  return {
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    stroke: '#f59e0b',
  };
}

// ---------------------------------------------------------------------------
// Size mappings
// ---------------------------------------------------------------------------

const linearHeights: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const circularSizes: Record<ProgressSize, { size: number; strokeWidth: number }> = {
  sm: { size: 32, strokeWidth: 3 },
  md: { size: 48, strokeWidth: 4 },
  lg: { size: 64, strokeWidth: 5 },
};

const labelSizes: Record<ProgressSize, string> = {
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-[15px]',
};

// ---------------------------------------------------------------------------
// Linear variant
// ---------------------------------------------------------------------------

const LinearProgress = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value: rawValue,
      size = 'md',
      color,
      showLabel = false,
      animated = true,
      className = '',
    },
    ref,
  ) => {
    const value = clamp(rawValue);
    const palette = useMemo(() => autoColor(value), [value]);
    const showShimmer = value >= 50;

    return (
      <div
        ref={ref}
        className={['flex items-center gap-2', className]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${Math.round(value)}%`}
          className={[
            'relative w-full overflow-hidden rounded-full',
            'bg-gray-200 dark:bg-gray-700',
            linearHeights[size],
          ].join(' ')}
        >
          {/* Filled bar */}
          <motion.div
            initial={animated ? { width: 0 } : false}
            animate={{ width: `${value}%` }}
            transition={
              animated
                ? { type: 'spring', damping: 25, stiffness: 120 }
                : { duration: 0 }
            }
            className={[
              'absolute inset-y-0 left-0 rounded-full',
              color || palette.bar,
            ].join(' ')}
          />

          {/* Shimmer overlay at 50% and 75% thresholds */}
          {animated && showShimmer && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 1,
              }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{ maxWidth: `${value}%` }}
            />
          )}
        </div>

        {/* Optional numeric label */}
        {showLabel && (
          <span
            className={[
              'font-medium tabular-nums shrink-0',
              labelSizes[size],
              palette.text,
            ].join(' ')}
          >
            {Math.round(value)}%
          </span>
        )}
      </div>
    );
  },
);

LinearProgress.displayName = 'LinearProgress';

// ---------------------------------------------------------------------------
// Circular variant
// ---------------------------------------------------------------------------

const CircularProgress = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value: rawValue,
      size = 'md',
      color,
      showLabel = false,
      animated = true,
      className = '',
    },
    ref,
  ) => {
    const value = clamp(rawValue);
    const palette = useMemo(() => autoColor(value), [value]);
    const { size: svgSize, strokeWidth } = circularSizes[size];

    const radius = (svgSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Spring-animated stroke offset
    const springValue = useSpring(animated ? 0 : value, {
      damping: 25,
      stiffness: 120,
    });

    // Update spring target when value changes
    React.useEffect(() => {
      springValue.set(value);
    }, [value, springValue]);

    const strokeDashoffset = useTransform(
      springValue,
      [0, 100],
      [circumference, 0],
    );

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${Math.round(value)}%`}
        className={[
          'relative inline-flex items-center justify-center',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ width: svgSize, height: svgSize }}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Indicator */}
          <motion.circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={color || palette.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
          />
        </svg>

        {/* Center label */}
        {showLabel && (
          <span
            className={[
              'absolute font-semibold tabular-nums',
              size === 'sm' ? 'text-[9px]' : labelSizes[size],
              palette.text,
            ].join(' ')}
          >
            {Math.round(value)}%
          </span>
        )}
      </div>
    );
  },
);

CircularProgress.displayName = 'CircularProgress';

// ---------------------------------------------------------------------------
// Unified export
// ---------------------------------------------------------------------------

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ variant = 'linear', ...props }, ref) => {
    if (variant === 'circular') {
      return <CircularProgress ref={ref} {...props} />;
    }
    return <LinearProgress ref={ref} {...props} />;
  },
);

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
