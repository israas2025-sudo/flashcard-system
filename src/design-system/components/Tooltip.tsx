'use client';

import React, {
  forwardRef,
  useState,
  useRef,
  useCallback,
  ReactNode,
  cloneElement,
  isValidElement,
  ReactElement,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { zIndex } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Tooltip text content */
  content: string;
  /** Preferred position relative to the trigger */
  position?: TooltipPosition;
  /** Delay in ms before showing the tooltip */
  delay?: number;
  /** The trigger element (single child) */
  children: ReactElement;
}

// ---------------------------------------------------------------------------
// Position styles (arrow + tooltip placement via Tailwind)
// ---------------------------------------------------------------------------

const positionClasses: Record<
  TooltipPosition,
  { container: string; arrow: string }
> = {
  top: {
    container: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow:
      'absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-700',
  },
  bottom: {
    container: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow:
      'absolute left-1/2 -translate-x-1/2 bottom-full border-4 border-transparent border-b-gray-900 dark:border-b-gray-700',
  },
  left: {
    container: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow:
      'absolute top-1/2 -translate-y-1/2 left-full border-4 border-transparent border-l-gray-900 dark:border-l-gray-700',
  },
  right: {
    container: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow:
      'absolute top-1/2 -translate-y-1/2 right-full border-4 border-transparent border-r-gray-900 dark:border-r-gray-700',
  },
};

const originMap: Record<TooltipPosition, string> = {
  top: 'translateY(4px)',
  bottom: 'translateY(-4px)',
  left: 'translateX(4px)',
  right: 'translateX(-4px)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, position = 'top', delay = 300, children }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = useCallback(() => {
      timerRef.current = setTimeout(() => setIsVisible(true), delay);
    }, [delay]);

    const hide = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsVisible(false);
    }, []);

    // Clone the child to attach hover/focus handlers
    const trigger = isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          onMouseEnter: (e: React.MouseEvent) => {
            show();
            const origHandler = (children.props as Record<string, unknown>)
              .onMouseEnter as ((e: React.MouseEvent) => void) | undefined;
            origHandler?.(e);
          },
          onMouseLeave: (e: React.MouseEvent) => {
            hide();
            const origHandler = (children.props as Record<string, unknown>)
              .onMouseLeave as ((e: React.MouseEvent) => void) | undefined;
            origHandler?.(e);
          },
          onFocus: (e: React.FocusEvent) => {
            show();
            const origHandler = (children.props as Record<string, unknown>)
              .onFocus as ((e: React.FocusEvent) => void) | undefined;
            origHandler?.(e);
          },
          onBlur: (e: React.FocusEvent) => {
            hide();
            const origHandler = (children.props as Record<string, unknown>)
              .onBlur as ((e: React.FocusEvent) => void) | undefined;
            origHandler?.(e);
          },
          'aria-describedby': isVisible ? 'ds-tooltip' : undefined,
        })
      : children;

    const pos = positionClasses[position];

    return (
      <div ref={ref} className="relative inline-flex">
        {trigger}

        <AnimatePresence>
          {isVisible && (
            <motion.div
              id="ds-tooltip"
              role="tooltip"
              initial={{ opacity: 0, transform: originMap[position] }}
              animate={{ opacity: 1, transform: 'translate(0)' }}
              exit={{ opacity: 0, transform: originMap[position] }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={[
                'absolute pointer-events-none whitespace-nowrap',
                'rounded-md bg-gray-900 px-2.5 py-1.5',
                'text-[12px] text-white font-medium',
                'shadow-lg',
                'dark:bg-gray-700',
                pos.container,
              ].join(' ')}
              style={{ zIndex: zIndex.tooltip }}
            >
              {content}
              {/* Arrow */}
              <span className={pos.arrow} aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

Tooltip.displayName = 'Tooltip';

export default Tooltip;
