'use client';

import React, {
  forwardRef,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { zIndex } from '../tokens';
import { scaleSpring } from '../animations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the modal requests to close (Escape, backdrop click, X) */
  onClose: () => void;
  /** Optional title displayed in the modal header */
  title?: string;
  /** Size preset */
  size?: ModalSize;
  /** Content */
  children: ReactNode;
  /** Additional class name for the modal panel */
  className?: string;
}

// ---------------------------------------------------------------------------
// Size styles
// ---------------------------------------------------------------------------

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

// ---------------------------------------------------------------------------
// Focus trap helper
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store currently focused element to restore later
    previousActiveRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element inside the modal
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      // Restore focus when modal closes
      previousActiveRef.current?.focus();
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

  return { containerRef, handleKeyDown };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      size = 'md',
      children,
      className = '',
    },
    ref,
  ) => {
    const { containerRef, handleKeyDown } = useFocusTrap(isOpen);

    // Close on Escape
    useEffect(() => {
      if (!isOpen) return;

      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
      if (!isOpen) return;

      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }, [isOpen]);

    return (
      <AnimatePresence>
        {isOpen && (
          <div
            ref={ref}
            className="fixed inset-0"
            style={{ zIndex: zIndex.modal }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Centering wrapper */}
            <div className="flex min-h-full items-center justify-center p-4">
              {/* Modal panel */}
              <motion.div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-label={title || 'Dialog'}
                variants={scaleSpring}
                initial="hidden"
                animate="visible"
                exit="exit"
                onKeyDown={handleKeyDown}
                className={[
                  'relative w-full rounded-2xl',
                  'bg-white shadow-xl',
                  'dark:bg-[#1A1A2E] dark:shadow-[0_20px_25px_rgba(0,0,0,0.4)]',
                  sizeStyles[size],
                  className,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* Header */}
                {title && (
                  <div
                    className={[
                      'flex items-center justify-between',
                      'border-b border-gray-200 dark:border-gray-700',
                      'px-6 py-4',
                    ].join(' ')}
                  >
                    <h2 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">
                      {title}
                    </h2>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close dialog"
                      className={[
                        'rounded-lg p-1.5',
                        'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                        'dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800',
                        'transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      ].join(' ')}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}

                {/* Close button when there is no title */}
                {!title && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className={[
                      'absolute top-3 right-3 rounded-lg p-1.5',
                      'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                      'dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    ].join(' ')}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}

                {/* Body */}
                <div className="px-6 py-5">{children}</div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    );
  },
);

Modal.displayName = 'Modal';

export default Modal;
