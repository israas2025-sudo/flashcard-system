'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  ReactNode,
} from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabItem {
  /** Unique key for this tab */
  value: string;
  /** Visible label */
  label: string;
  /** Optional icon rendered before the label */
  icon?: ReactNode;
  /** Disable this tab */
  disabled?: boolean;
}

export interface TabsProps {
  /** Tab definitions */
  items: TabItem[];
  /** Currently active tab value */
  value?: string;
  /** Default active tab (uncontrolled) */
  defaultValue?: string;
  /** Called when active tab changes */
  onChange?: (value: string) => void;
  /** Additional class name */
  className?: string;
}

export interface TabsPanelProps {
  /** The tab value this panel corresponds to */
  value: string;
  /** The currently active tab value */
  activeValue: string;
  /** Panel content */
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

// ---------------------------------------------------------------------------
// Context (internal)
// ---------------------------------------------------------------------------

interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs compound components must be used within <Tabs>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Underline indicator
// ---------------------------------------------------------------------------

interface UnderlineProps {
  activeIndex: number;
  tabRefs: React.RefObject<(HTMLButtonElement | null)[]>;
}

function AnimatedUnderline({ activeIndex, tabRefs }: UnderlineProps) {
  const [style, setStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const tab = tabRefs.current?.[activeIndex];
    if (tab) {
      setStyle({ left: tab.offsetLeft, width: tab.offsetWidth });
    }
  }, [activeIndex, tabRefs]);

  return (
    <motion.div
      className="absolute bottom-0 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full"
      animate={style}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ items, value, defaultValue, onChange, className = '' }, ref) => {
    const [internalValue, setInternalValue] = useState(
      defaultValue ?? items[0]?.value ?? '',
    );

    const activeValue = value ?? internalValue;

    const handleChange = useCallback(
      (newValue: string) => {
        if (value === undefined) {
          setInternalValue(newValue);
        }
        onChange?.(newValue);
      },
      [value, onChange],
    );

    const activeIndex = items.findIndex((t) => t.value === activeValue);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    return (
      <div ref={ref} className={['relative', className].filter(Boolean).join(' ')}>
        <div
          role="tablist"
          className="flex gap-1 border-b border-gray-200 dark:border-gray-700 relative"
        >
          {items.map((item, i) => {
            const isActive = item.value === activeValue;

            return (
              <button
                key={item.value}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
                tabIndex={isActive ? 0 : -1}
                onClick={() => !item.disabled && handleChange(item.value)}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2.5',
                  'text-[14px] font-medium transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                  'rounded-t-md',
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer',
                ].join(' ')}
              >
                {item.icon && (
                  <span className="inline-flex shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            );
          })}

          {/* Animated underline */}
          {activeIndex >= 0 && (
            <AnimatedUnderline activeIndex={activeIndex} tabRefs={tabRefs} />
          )}
        </div>
      </div>
    );
  },
);

Tabs.displayName = 'Tabs';

// ---------------------------------------------------------------------------
// TabsPanel — renders only when active
// ---------------------------------------------------------------------------

export const TabsPanel = forwardRef<HTMLDivElement, TabsPanelProps>(
  ({ value, activeValue, children, className = '' }, ref) => {
    if (value !== activeValue) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        className={['pt-4', className].filter(Boolean).join(' ')}
      >
        {children}
      </div>
    );
  },
);

TabsPanel.displayName = 'TabsPanel';

export default Tabs;
