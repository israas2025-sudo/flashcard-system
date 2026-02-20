'use client';

import React, { forwardRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

export interface SkeletonProps {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Width — CSS value (e.g. '100%', '200px'). Defaults vary by variant. */
  width?: string | number;
  /** Height — CSS value. Defaults vary by variant. */
  height?: string | number;
  /**
   * Number of text lines to render (only applies to variant='text').
   * The last line is rendered at 75% width for a natural look.
   */
  lines?: number;
  /** Additional class name */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCSS(val: string | number | undefined, fallback: string): string {
  if (val === undefined) return fallback;
  return typeof val === 'number' ? `${val}px` : val;
}

// ---------------------------------------------------------------------------
// Single skeleton block
// ---------------------------------------------------------------------------

interface SkeletonBlockProps {
  width: string;
  height: string;
  borderRadius: string;
  className?: string;
}

const SkeletonBlock = forwardRef<HTMLDivElement, SkeletonBlockProps>(
  ({ width, height, borderRadius, className = '' }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
      className={[
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width, height, borderRadius }}
    >
      {/* Screen-reader only text */}
      <span className="sr-only">Loading...</span>
    </div>
  ),
);

SkeletonBlock.displayName = 'SkeletonBlock';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      lines = 1,
      className = '',
    },
    ref,
  ) => {
    // --- Text variant (supports multiple lines) ---
    if (variant === 'text') {
      const lineCount = Math.max(1, lines);
      const lineHeight = toCSS(height, '14px');
      const baseWidth = toCSS(width, '100%');

      if (lineCount === 1) {
        return (
          <SkeletonBlock
            ref={ref}
            width={baseWidth}
            height={lineHeight}
            borderRadius="4px"
            className={className}
          />
        );
      }

      return (
        <div
          ref={ref}
          className={['flex flex-col gap-2', className]
            .filter(Boolean)
            .join(' ')}
          role="status"
          aria-label="Loading..."
          aria-busy="true"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <SkeletonBlock
              key={i}
              width={i === lineCount - 1 ? '75%' : baseWidth}
              height={lineHeight}
              borderRadius="4px"
            />
          ))}
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    // --- Circular variant ---
    if (variant === 'circular') {
      const size = toCSS(width || height, '40px');
      return (
        <SkeletonBlock
          ref={ref}
          width={size}
          height={size}
          borderRadius="9999px"
          className={className}
        />
      );
    }

    // --- Rectangular variant ---
    return (
      <SkeletonBlock
        ref={ref}
        width={toCSS(width, '100%')}
        height={toCSS(height, '120px')}
        borderRadius="8px"
        className={className}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
