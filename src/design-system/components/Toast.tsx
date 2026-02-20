'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { zIndex } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  description?: string;
  /** Auto-dismiss duration in ms. Defaults based on type (3000-5000). */
  duration?: number;
}

interface ToastContextValue {
  /** Add a toast to the queue. */
  toast: (options: ToastOptions) => string;
  /** Dismiss a specific toast by ID. */
  dismiss: (id: string) => void;
  /** Dismiss all toasts. */
  dismissAll: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 3;

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 4000,
  error: 5000,
};

let toastCounter = 0;
function generateId(): string {
  return `toast-${++toastCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Icon & style per type
// ---------------------------------------------------------------------------

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; containerClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    containerClass: 'border-emerald-200 dark:border-emerald-800',
    iconClass: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'border-red-200 dark:border-red-800',
    iconClass: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'border-amber-200 dark:border-amber-800',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    containerClass: 'border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-500',
  },
};

// ---------------------------------------------------------------------------
// Single Toast Item
// ---------------------------------------------------------------------------

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast: t, onDismiss }: ToastItemProps) {
  const config = typeConfig[t.type];
  const Icon = config.icon;

  // Auto-dismiss timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const duration = t.duration ?? DEFAULT_DURATIONS[t.type];
    timerRef.current = setTimeout(() => onDismiss(t.id), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, t.type, t.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={[
        'pointer-events-auto flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3',
        'rounded-xl border bg-white p-4 shadow-lg',
        'dark:bg-[#1A1A2E]',
        config.containerClass,
      ].join(' ')}
    >
      <Icon size={20} className={['shrink-0 mt-0.5', config.iconClass].join(' ')} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
          {t.title}
        </p>
        {t.description && (
          <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400 leading-snug">
            {t.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss notification"
        className={[
          'shrink-0 rounded-md p-0.5',
          'text-gray-400 hover:text-gray-600',
          'dark:text-gray-500 dark:hover:text-gray-300',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        ].join(' ')}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (options: ToastOptions): string => {
      const id = generateId();
      const newToast: ToastMessage = {
        id,
        type: options.type ?? 'info',
        title: options.title,
        description: options.description,
        duration: options.duration,
      };

      setToasts((prev) => {
        const next = [...prev, newToast];
        // Keep only the last MAX_VISIBLE toasts
        return next.length > MAX_VISIBLE
          ? next.slice(next.length - MAX_VISIBLE)
          : next;
      });

      return id;
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}

      {/* Toast container — bottom-right */}
      <div
        aria-label="Notifications"
        className="fixed bottom-0 right-0 flex flex-col-reverse gap-2 p-4 pointer-events-none"
        style={{ zIndex: zIndex.toast }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = 'ToastProvider';

export default ToastProvider;
