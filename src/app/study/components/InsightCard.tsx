"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X } from "lucide-react";

// ---------------------------------------------------------------------------
// InsightCard
// ---------------------------------------------------------------------------
// "Did you know?" reward overlay displayed after answering a card.
// Features:
//  - Spring scale-in animation
//  - Lightbulb icon with subtle glow
//  - Category badge (grammar, culture, etymology, etc.)
//  - "Tap to continue" hint
//  - Keyboard (Escape / Enter / Space) and click to dismiss
// ---------------------------------------------------------------------------

interface Insight {
  title: string;
  fact: string;
  category: string;
  language: string;
}

interface InsightCardProps {
  /** The insight data to display. When null the overlay is hidden. */
  insight: Insight | null;
  /** Called when the user dismisses the insight. */
  onDismiss: () => void;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  grammar: {
    bg: "bg-primary-100 dark:bg-primary-900/40",
    text: "text-primary-700 dark:text-primary-300",
  },
  culture: {
    bg: "bg-arabic-100 dark:bg-arabic-900/40",
    text: "text-arabic-700 dark:text-arabic-300",
  },
  etymology: {
    bg: "bg-quran-100 dark:bg-quran-900/40",
    text: "text-quran-700 dark:text-quran-300",
  },
  pronunciation: {
    bg: "bg-spanish-100 dark:bg-spanish-900/40",
    text: "text-spanish-700 dark:text-spanish-300",
  },
  usage: {
    bg: "bg-egyptian-100 dark:bg-egyptian-900/40",
    text: "text-egyptian-700 dark:text-egyptian-300",
  },
};

const defaultCategoryColor = {
  bg: "bg-[var(--surface-2)]",
  text: "text-[var(--text-secondary)]",
};

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard dismiss
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        insight &&
        (e.key === "Escape" || e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        onDismiss();
      }
    },
    [insight, onDismiss],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap for accessibility
  useEffect(() => {
    if (insight && containerRef.current) {
      containerRef.current.focus();
    }
  }, [insight]);

  const colors =
    categoryColors[(insight?.category ?? "").toLowerCase()] ??
    defaultCategoryColor;

  return (
    <AnimatePresence>
      {insight && (
        <motion.div
          key="insight-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="Did you know?"
        >
          <motion.div
            ref={containerRef}
            tabIndex={-1}
            key="insight-card"
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 22,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] shadow-elevated overflow-hidden outline-none"
          >
            {/* Top glow accent */}
            <div
              className="absolute inset-x-0 top-0 h-24 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% -20%, rgba(234,179,8,0.12) 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors z-10"
              aria-label="Dismiss insight"
            >
              <X className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>

            <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center">
              {/* Lightbulb icon */}
              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 14,
                  delay: 0.1,
                }}
                className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4"
              >
                <Lightbulb className="w-7 h-7 text-amber-500" />
              </motion.div>

              {/* Header */}
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">
                Did you know?
              </p>

              {/* Title */}
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                {insight.title}
              </h3>

              {/* Category badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-4 ${colors.bg} ${colors.text}`}
              >
                {insight.category}
              </span>

              {/* Fact */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="text-sm leading-relaxed text-[var(--text-secondary)]"
              >
                {insight.fact}
              </motion.p>

              {/* Language tag */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-4 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]"
              >
                {insight.language}
              </motion.span>
            </div>

            {/* Footer: tap to continue */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="border-t border-[var(--surface-3)] py-3 text-center"
            >
              <button
                onClick={onDismiss}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Tap to continue
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
