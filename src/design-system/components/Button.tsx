'use client';

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { colors, radius, spacing, typography, animation } from '../tokens';
import { buttonPress } from '../animations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show a loading spinner and disable interactions */
  loading?: boolean;
  /** Icon rendered before the label */
  iconLeft?: ReactNode;
  /** Icon rendered after the label */
  iconRight?: ReactNode;
  /** Make the button take the full width of its container */
  fullWidth?: boolean;
  /** Content */
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Style mappings (token-based, no magic numbers)
// ---------------------------------------------------------------------------

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-indigo-500 text-white',
    'hover:bg-indigo-400',
    'active:bg-indigo-600',
    'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
    'disabled:bg-indigo-300 disabled:cursor-not-allowed',
    'dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:active:bg-indigo-700',
  ].join(' '),
  secondary: [
    'bg-gray-100 text-gray-900 border border-gray-200',
    'hover:bg-gray-200',
    'active:bg-gray-300',
    'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
    'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
    'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
    'dark:hover:bg-gray-700 dark:active:bg-gray-600',
  ].join(' '),
  ghost: [
    'bg-transparent text-gray-700',
    'hover:bg-gray-100',
    'active:bg-gray-200',
    'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
    'disabled:text-gray-300 disabled:cursor-not-allowed',
    'dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
  ].join(' '),
  danger: [
    'bg-red-500 text-white',
    'hover:bg-red-400',
    'active:bg-red-600',
    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
    'disabled:bg-red-300 disabled:cursor-not-allowed',
    'dark:bg-red-600 dark:hover:bg-red-500 dark:active:bg-red-700',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded',
  md: 'h-10 px-4 text-[15px] gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[17px] gap-2.5 rounded-lg',
};

const iconSizeMap: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={isDisabled}
        whileTap={isDisabled ? undefined : buttonPress.whileTap}
        whileHover={isDisabled ? undefined : buttonPress.whileHover}
        className={[
          // Base styles
          'inline-flex items-center justify-center font-medium',
          'select-none whitespace-nowrap',
          'transition-colors',
          // Variant + size
          variantStyles[variant],
          sizeStyles[size],
          // Full width
          fullWidth ? 'w-full' : '',
          // Loading opacity
          loading ? 'opacity-80' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        {...rest}
      >
        {/* Loading spinner replaces left icon */}
        {loading ? (
          <Loader2
            className="animate-spin"
            size={iconSizeMap[size]}
            aria-hidden="true"
          />
        ) : iconLeft ? (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {iconLeft}
          </span>
        ) : null}

        <span>{children}</span>

        {iconRight && !loading ? (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        ) : null}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
