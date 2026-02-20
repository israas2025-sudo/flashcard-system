'use client';

import React, { forwardRef, useMemo } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TagChipSize = 'sm' | 'md';

export interface TagChipProps
  extends Omit<HTMLMotionProps<'span'>, 'onClick' | 'children'> {
  /** Text label displayed in the chip */
  label: string;
  /** Override the auto-generated background color (Tailwind bg class) */
  color?: string;
  /** Size preset */
  size?: TagChipSize;
  /** Show a remove (X) button */
  removable?: boolean;
  /** Click handler for the chip body */
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  /** Click handler for the remove button */
  onRemove?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic hash-to-color: generates a pastel background + darker text
 * color pair from an arbitrary string label.
 */
const TAG_PALETTES = [
  { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
] as const;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function paletteFromLabel(label: string) {
  return TAG_PALETTES[hashString(label) % TAG_PALETTES.length];
}

/** Detect if the label contains Arabic / RTL script characters. */
const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isRtlText(text: string): boolean {
  return RTL_REGEX.test(text);
}

// ---------------------------------------------------------------------------
// Size styles
// ---------------------------------------------------------------------------

const sizeStyles: Record<TagChipSize, string> = {
  sm: 'h-6 px-2 text-[11px] gap-1',
  md: 'h-7 px-2.5 text-[13px] gap-1.5',
};

const removeButtonSize: Record<TagChipSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-4.5 w-4.5',
};

const removeIconSize: Record<TagChipSize, number> = {
  sm: 10,
  md: 12,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TagChip = forwardRef<HTMLSpanElement, TagChipProps>(
  (
    {
      label,
      color,
      size = 'md',
      removable = false,
      onClick,
      onRemove,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const palette = useMemo(() => paletteFromLabel(label), [label]);
    const rtl = useMemo(() => isRtlText(label), [label]);

    return (
      <motion.span
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={removable ? `${label}, press delete to remove` : label}
        dir={rtl ? 'rtl' : undefined}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLSpanElement>);
          }
        }}
        className={[
          // Base
          'inline-flex items-center rounded-full font-medium select-none',
          'transition-colors duration-150',
          // Size
          sizeStyles[size],
          // Color — custom override or hash-derived palette
          color
            ? color
            : `${palette.bg} ${palette.text}`,
          // Interactive styles
          onClick
            ? 'cursor-pointer hover:brightness-95 active:brightness-90'
            : '',
          // RTL font override for Arabic labels
          rtl ? 'font-[Amiri]' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <span className="truncate max-w-[160px]">{label}</span>

        {removable && (
          <button
            type="button"
            aria-label={`Remove ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(e);
            }}
            className={[
              'inline-flex items-center justify-center rounded-full',
              'hover:bg-black/10 dark:hover:bg-white/10',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current',
              removeButtonSize[size],
            ].join(' ')}
          >
            <X size={removeIconSize[size]} aria-hidden="true" />
          </button>
        )}
      </motion.span>
    );
  },
);

TagChip.displayName = 'TagChip';

export default TagChip;
