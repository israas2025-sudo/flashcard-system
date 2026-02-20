'use client';

import React, {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useId,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputVariant = 'default' | 'error' | 'success';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual state variant */
  variant?: InputVariant;
  /** Visible label */
  label?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Error message — automatically sets variant to error when present */
  errorMessage?: string;
  /** Icon rendered inside the input on the left (or right when RTL) */
  icon?: ReactNode;
  /** Enable RTL text direction (for Arabic fields) */
  rtl?: boolean;
  /** Full-width toggle */
  fullWidth?: boolean;
}

// ---------------------------------------------------------------------------
// Style mappings
// ---------------------------------------------------------------------------

const variantRing: Record<InputVariant, string> = {
  default: [
    'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
    'dark:border-gray-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20',
  ].join(' '),
  error: [
    'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
    'dark:border-red-500 dark:focus:border-red-400',
  ].join(' '),
  success: [
    'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20',
    'dark:border-green-500 dark:focus:border-green-400',
  ].join(' '),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant: variantProp,
      label,
      helperText,
      errorMessage,
      icon,
      rtl = false,
      fullWidth = false,
      className = '',
      id: idProp,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = idProp || autoId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    // If there is an error message, force the error variant
    const variant = errorMessage ? 'error' : (variantProp ?? 'default');

    return (
      <div
        className={[
          'flex flex-col gap-1.5',
          fullWidth ? 'w-full' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={[
              'text-[13px] font-medium text-gray-700',
              'dark:text-gray-300',
            ].join(' ')}
          >
            {label}
          </label>
        )}

        {/* Input wrapper (for icon positioning) */}
        <div className="relative">
          {/* Left icon */}
          {icon && (
            <span
              className={[
                'absolute top-1/2 -translate-y-1/2 text-gray-400',
                'pointer-events-none',
                rtl ? 'right-3' : 'left-3',
              ].join(' ')}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            dir={rtl ? 'rtl' : undefined}
            aria-invalid={variant === 'error' || undefined}
            aria-describedby={
              [errorMessage ? errorId : '', helperText ? helperId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={[
              // Base
              'h-10 w-full rounded-lg border bg-white px-3',
              'text-[15px] text-gray-900 placeholder:text-gray-400',
              'outline-none transition-colors duration-200',
              // Disabled
              'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
              // Dark mode base
              'dark:bg-[#1A1A2E] dark:text-gray-100 dark:placeholder:text-gray-500',
              // Variant ring
              variantRing[variant],
              // Icon padding
              icon ? (rtl ? 'pr-10' : 'pl-10') : '',
              // RTL font
              rtl ? 'font-[Amiri] text-[17px] leading-[2]' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
        </div>

        {/* Error message */}
        {errorMessage && (
          <p
            id={errorId}
            role="alert"
            className="text-[11px] text-red-500 dark:text-red-400"
          >
            {errorMessage}
          </p>
        )}

        {/* Helper text (only shown when no error) */}
        {helperText && !errorMessage && (
          <p
            id={helperId}
            className="text-[11px] text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
