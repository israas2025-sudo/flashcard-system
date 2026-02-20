"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// MicroFeedback
// ---------------------------------------------------------------------------
// Renders brief per-card micro-feedback after the user rates a card:
//  - Checkmark (path draw animation) for hard / good / easy
//  - X mark (path draw animation) for "again"
//  - Border color flash matching the rating
//  - "+N XP" text that floats up and fades out
//
// The component auto-hides after a short duration when `visible` goes false,
// allowing the parent to control the lifecycle.
// ---------------------------------------------------------------------------

type Rating = "again" | "hard" | "good" | "easy";

interface MicroFeedbackProps {
  /** The rating the user selected. */
  rating: Rating;
  /** XP earned for this card. */
  xpEarned: number;
  /** Controls mount/unmount. */
  visible: boolean;
}

const ratingStyles: Record<
  Rating,
  { borderColor: string; iconColor: string; bgFlash: string; label: string }
> = {
  again: {
    borderColor: "border-red-400",
    iconColor: "stroke-red-500",
    bgFlash: "bg-red-50 dark:bg-red-950/30",
    label: "Try again",
  },
  hard: {
    borderColor: "border-amber-400",
    iconColor: "stroke-amber-500",
    bgFlash: "bg-amber-50 dark:bg-amber-950/30",
    label: "Hard",
  },
  good: {
    borderColor: "border-primary-400",
    iconColor: "stroke-primary-500",
    bgFlash: "bg-primary-50 dark:bg-primary-950/30",
    label: "Good",
  },
  easy: {
    borderColor: "border-green-400",
    iconColor: "stroke-green-500",
    bgFlash: "bg-green-50 dark:bg-green-950/30",
    label: "Easy",
  },
};

/** Animated SVG checkmark drawn with a single path stroke. */
function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <motion.path
        d="M10 18 L16 24 L26 12"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </svg>
  );
}

/** Animated SVG X mark drawn with two paths. */
function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <motion.path
        d="M12 12 L24 24"
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
      <motion.path
        d="M24 12 L12 24"
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
      />
    </svg>
  );
}

export function MicroFeedback({
  rating,
  xpEarned,
  visible,
}: MicroFeedbackProps) {
  const style = ratingStyles[rating];
  const isCorrect = rating !== "again";

  // Internal visibility that adds a slight linger after `visible` goes false
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 600);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="micro-feedback"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center"
          role="status"
          aria-live="polite"
          aria-label={`${style.label}. ${xpEarned > 0 ? `Plus ${xpEarned} XP` : ""}`}
        >
          {/* Border flash container */}
          <motion.div
            initial={{ borderColor: "transparent" }}
            animate={{
              borderColor: [
                "transparent",
                "var(--tw-border-opacity, currentColor)",
                "transparent",
              ],
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className={`
              flex items-center justify-center
              w-16 h-16 rounded-2xl border-2
              ${style.borderColor} ${style.bgFlash}
            `}
          >
            {isCorrect ? (
              <CheckmarkIcon className={style.iconColor} />
            ) : (
              <CrossIcon className={style.iconColor} />
            )}
          </motion.div>

          {/* +XP float-up text */}
          {xpEarned > 0 && (
            <motion.span
              key={`xp-${rating}-${xpEarned}`}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -28 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              className="absolute -top-2 text-sm font-bold text-amber-500 pointer-events-none select-none"
            >
              +{xpEarned} XP
            </motion.span>
          )}

          {/* Label */}
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-2 text-xs font-medium text-[var(--text-tertiary)]"
          >
            {style.label}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
