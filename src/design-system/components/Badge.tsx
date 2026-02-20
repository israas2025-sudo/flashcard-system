'use client';

import React, { forwardRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'language';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Visual variant */
  variant?: BadgeVariant;
  /** Text label displayed in the badge */
  label: string;
  /** Size preset */
  size?: BadgeSize;
  /** Additional class name */
  className?: string;
}

// ---------------------------------------------------------------------------
// Variant styles
// ---------------------------------------------------------------------------

const variantStyles: Record<Exclude<BadgeVariant, 'language'>, string> = {
  default: [
    'bg-gray-100 text-gray-700 border-gray-200',
    'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  ].join(' '),
  success: [
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  ].join(' '),
  warning: [
    'bg-amber-50 text-amber-700 border-amber-200',
    'dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  ].join(' '),
  error: [
    'bg-red-50 text-red-700 border-red-200',
    'dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  ].join(' '),
  info: [
    'bg-blue-50 text-blue-700 border-blue-200',
    'dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  ].join(' '),
};

// ---------------------------------------------------------------------------
// Language-specific accent colors
// ---------------------------------------------------------------------------

/**
 * Maps a language label (case-insensitive) to a Tailwind colour scheme.
 *   arabic  -> emerald
 *   spanish -> amber
 *   masri / egyptian -> purple
 *   english -> blue
 *
 * Falls back to the default variant for unrecognised labels.
 */
const languageColors: Record<string, string> = {
  arabic: [
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  ].join(' '),
  spanish: [
    'bg-amber-50 text-amber-700 border-amber-200',
    'dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  ].join(' '),
  masri: [
    'bg-purple-50 text-purple-700 border-purple-200',
    'dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  ].join(' '),
  egyptian: [
    'bg-purple-50 text-purple-700 border-purple-200',
    'dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  ].join(' '),
  english: [
    'bg-blue-50 text-blue-700 border-blue-200',
    'dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  ].join(' '),
};

function resolveLanguageStyle(label: string): string {
  const key = label.toLowerCase().trim();
  return languageColors[key] ?? variantStyles.default;
}

// ---------------------------------------------------------------------------
// Size styles
// ---------------------------------------------------------------------------

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'h-5 px-1.5 text-[10px]',
  md: 'h-6 px-2 text-[12px]',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      label,
      size = 'md',
      className = '',
    },
    ref,
  ) => {
    const colorClass =
      variant === 'language'
        ? resolveLanguageStyle(label)
        : variantStyles[variant];

    return (
      <span
        ref={ref}
        role="status"
        aria-label={label}
        className={[
          // Base
          'inline-flex items-center justify-center rounded-full border',
          'font-semibold leading-none select-none whitespace-nowrap',
          // Size
          sizeStyles[size],
          // Colors
          colorClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export default Badge;
