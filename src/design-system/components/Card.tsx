'use client';

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { fadeIn } from '../animations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CardVariant = 'flat' | 'elevated' | 'interactive';

export interface CardProps extends HTMLMotionProps<'div'> {
  /** Visual variant */
  variant?: CardVariant;
  /** Padding preset — maps to design-token spacing */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Optional header slot */
  header?: ReactNode;
  /** Optional footer slot */
  footer?: ReactNode;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Style mappings
// ---------------------------------------------------------------------------

const variantStyles: Record<CardVariant, string> = {
  flat: [
    'bg-white border border-gray-200',
    'dark:bg-[#1A1A2E] dark:border-gray-700',
  ].join(' '),
  elevated: [
    'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
    'dark:bg-[#1A1A2E] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
  ].join(' '),
  interactive: [
    'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
    'hover:shadow-[0_4px_6px_rgba(0,0,0,0.07)] hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    'transition-all duration-200 cursor-pointer',
    'dark:bg-[#1A1A2E] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
    'dark:hover:shadow-[0_4px_6px_rgba(0,0,0,0.4)]',
  ].join(' '),
};

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',     // 12px — spacing.3
  md: 'p-4',     // 16px — spacing.4
  lg: 'p-6',     // 24px — spacing.6
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'elevated',
      padding = 'md',
      header,
      footer,
      children,
      className = '',
      ...rest
    },
    ref,
  ) => {
    return (
      <motion.div
        ref={ref}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={[
          'rounded-xl overflow-hidden',  // radius.lg = 12px
          variantStyles[variant],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {/* Header */}
        {header && (
          <div
            className={[
              'border-b border-gray-200 dark:border-gray-700',
              paddingStyles[padding],
            ].join(' ')}
          >
            {header}
          </div>
        )}

        {/* Body */}
        <div className={paddingStyles[padding]}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={[
              'border-t border-gray-200 dark:border-gray-700',
              paddingStyles[padding],
            ].join(' ')}
          >
            {footer}
          </div>
        )}
      </motion.div>
    );
  },
);

Card.displayName = 'Card';

export default Card;
