'use client';

import React, {
  forwardRef,
  SelectHTMLAttributes,
  ReactNode,
  useId,
} from 'react';
import { ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Visible label */
  label?: string;
  /** Select options */
  options: SelectOption[];
  /** Placeholder text shown when no option is selected */
  placeholder?: string;
  /** Helper text shown below the select */
  helperText?: string;
  /** Error message */
  errorMessage?: string;
  /** Full-width toggle */
  fullWidth?: boolean;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
}

// ---------------------------------------------------------------------------
// Size styles
// ---------------------------------------------------------------------------

const sizeStyles: Record<NonNullable<SelectProps['size']>, string> = {
  sm: 'h-8 text-[13px] pl-2.5 pr-8',
  md: 'h-10 text-[15px] pl-3 pr-9',
  lg: 'h-12 text-[17px] pl-4 pr-10',
};

const chevronSize: Record<NonNullable<SelectProps['size']>, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder,
      helperText,
      errorMessage,
      fullWidth = false,
      size = 'md',
      className = '',
      id: idProp,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const selectId = idProp || autoId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;
    const hasError = Boolean(errorMessage);

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
            htmlFor={selectId}
            className="text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        {/* Select wrapper */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={
              [errorMessage ? errorId : '', helperText ? helperId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={[
              // Base
              'w-full rounded-lg border appearance-none bg-white',
              'text-gray-900 outline-none cursor-pointer',
              'transition-colors duration-200',
              // Focus
              hasError
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
              // Disabled
              'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
              // Dark
              'dark:bg-[#1A1A2E] dark:text-gray-100',
              hasError
                ? 'dark:border-red-500'
                : 'dark:border-gray-700 dark:focus:border-indigo-400',
              // Size
              sizeStyles[size],
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron */}
          <span
            className={[
              'absolute top-1/2 -translate-y-1/2 pointer-events-none text-gray-400',
              size === 'sm' ? 'right-2' : size === 'lg' ? 'right-3.5' : 'right-3',
            ].join(' ')}
            aria-hidden="true"
          >
            <ChevronDown size={chevronSize[size]} />
          </span>
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

        {/* Helper text */}
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

Select.displayName = 'Select';

export default Select;
