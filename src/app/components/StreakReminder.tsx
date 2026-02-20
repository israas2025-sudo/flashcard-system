"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Flame, X, Zap, Shield, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreakReminderProps {
  /** Current streak in days. */
  streakDays: number;
  /** Whether the user has already studied today. */
  studiedToday: boolean;
  /** Number of streak freeze tokens available. */
  freezesAvailable: number;
  /** URL to navigate to when the "Study now" button is clicked. */
  studyUrl?: string;
  /** Called when the reminder is dismissed. */
  onDismiss?: () => void;
  /** Optional CSS class. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Motivational messages using loss aversion psychology
// ---------------------------------------------------------------------------

interface MotivationalMessage {
  /** The main motivational text. */
  text: string;
  /** Urgency level controls visual intensity. */
  urgency: "low" | "medium" | "high" | "critical";
}

/**
 * Select a motivational message based on streak length and available freezes.
 * Uses loss aversion psychology: people are more motivated by the fear of
 * losing something they have than by the prospect of gaining something new.
 */
function getMotivationalMessage(
  streakDays: number,
  freezesAvailable: number
): MotivationalMessage {
  // Critical: Long streak, no freezes
  if (streakDays >= 30 && freezesAvailable === 0) {
    return {
      text: `Don't lose your incredible ${streakDays}-day streak! You've worked so hard to build it.`,
      urgency: "critical",
    };
  }

  if (streakDays >= 14 && freezesAvailable === 0) {
    return {
      text: `Your ${streakDays}-day streak is at risk! One missed day and it's gone.`,
      urgency: "critical",
    };
  }

  // High: Decent streak, no freezes
  if (streakDays >= 7 && freezesAvailable === 0) {
    return {
      text: `Don't break your ${streakDays}-day streak! You have no streak freezes left.`,
      urgency: "high",
    };
  }

  // Medium: Has a streak, has freezes
  if (streakDays >= 14 && freezesAvailable > 0) {
    return {
      text: `Keep your ${streakDays}-day streak going! You have ${freezesAvailable} freeze${freezesAvailable !== 1 ? "s" : ""}, but studying is always better.`,
      urgency: "medium",
    };
  }

  if (streakDays >= 7 && freezesAvailable > 0) {
    return {
      text: `Your ${streakDays}-day streak is waiting! A quick session keeps the momentum.`,
      urgency: "medium",
    };
  }

  // Low: Small streak or just starting
  if (streakDays >= 3) {
    return {
      text: `You're on a ${streakDays}-day roll! Keep it going with a quick review session.`,
      urgency: "low",
    };
  }

  if (streakDays >= 1) {
    return {
      text: `You started a streak yesterday! Study today to reach ${streakDays + 1} days.`,
      urgency: "low",
    };
  }

  // No streak
  return {
    text: "Start a new streak today! Even 5 minutes of review makes a difference.",
    urgency: "low",
  };
}

// ---------------------------------------------------------------------------
// Urgency style maps
// ---------------------------------------------------------------------------

const urgencyStyles: Record<
  string,
  {
    bg: string;
    border: string;
    iconColor: string;
    textColor: string;
    buttonBg: string;
    buttonHover: string;
  }
> = {
  low: {
    bg: "bg-primary-500/10",
    border: "border-primary-500/20",
    iconColor: "text-primary-400",
    textColor: "text-primary-300",
    buttonBg: "bg-primary-500",
    buttonHover: "hover:bg-primary-600",
  },
  medium: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    textColor: "text-amber-300",
    buttonBg: "bg-amber-500",
    buttonHover: "hover:bg-amber-600",
  },
  high: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    iconColor: "text-orange-400",
    textColor: "text-orange-300",
    buttonBg: "bg-orange-500",
    buttonHover: "hover:bg-orange-600",
  },
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    iconColor: "text-red-400",
    textColor: "text-red-300",
    buttonBg: "bg-red-500",
    buttonHover: "hover:bg-red-600",
  },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * StreakReminder - A notification component that appears when the user
 * hasn't studied today. Uses loss aversion psychology to motivate action
 * by emphasizing what they stand to lose (their streak).
 *
 * Features:
 *   - Urgency-scaled visual styling (from calm blue to urgent red)
 *   - Motivational messages personalized to streak length
 *   - Streak freeze status indicator
 *   - "Study now" CTA button
 *   - Dismissible with animation
 */
export function StreakReminder({
  streakDays,
  studiedToday,
  freezesAvailable,
  studyUrl = "/study",
  onDismiss,
  className = "",
}: StreakReminderProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const message = useMemo(
    () => getMotivationalMessage(streakDays, freezesAvailable),
    [streakDays, freezesAvailable]
  );

  const styles = urgencyStyles[message.urgency];

  // Don't render if user already studied today or dismissed
  if (studiedToday || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`
            relative rounded-xl border p-4
            ${styles.bg} ${styles.border}
            ${className}
          `}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <motion.div
              animate={
                message.urgency === "critical"
                  ? {
                      scale: [1, 1.15, 1],
                      rotate: [0, -5, 5, -5, 0],
                    }
                  : message.urgency === "high"
                  ? { scale: [1, 1.08, 1] }
                  : {}
              }
              transition={{
                duration: message.urgency === "critical" ? 1.5 : 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="shrink-0 mt-0.5"
            >
              {message.urgency === "critical" ? (
                <AlertTriangle className={`w-5 h-5 ${styles.iconColor}`} />
              ) : (
                <Flame className={`w-5 h-5 ${styles.iconColor}`} />
              )}
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Streak counter */}
              {streakDays > 0 && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className={`w-3.5 h-3.5 ${styles.iconColor}`} />
                  <span className={`text-xs font-bold ${styles.textColor}`}>
                    {streakDays}-day streak
                  </span>
                  {freezesAvailable > 0 && (
                    <span className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] text-[var(--text-tertiary)]">
                      <Shield className="w-3 h-3" />
                      {freezesAvailable} freeze{freezesAvailable !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Motivational message */}
              <p className={`text-sm ${styles.textColor} leading-relaxed`}>
                {message.text}
              </p>

              {/* CTA button */}
              <div className="mt-3 flex items-center gap-2">
                <Link href={studyUrl}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      inline-flex items-center gap-1.5
                      px-4 py-2 rounded-lg text-sm font-medium text-white
                      transition-colors duration-150
                      ${styles.buttonBg} ${styles.buttonHover}
                      shadow-sm
                    `}
                  >
                    <Zap className="w-4 h-4" />
                    Study now
                  </motion.button>
                </Link>

                {freezesAvailable > 0 && streakDays > 0 && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    or use a streak freeze
                  </span>
                )}
              </div>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="
                shrink-0 p-1 rounded-md
                text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
                hover:bg-[var(--surface-2)] transition-colors duration-150
              "
              aria-label="Dismiss streak reminder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar showing how much of the day has passed */}
          {message.urgency !== "low" && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-3 h-0.5 rounded-full bg-[var(--surface-3)] overflow-hidden origin-left"
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{
                  width: `${Math.min(
                    (new Date().getHours() / 24) * 100,
                    100
                  )}%`,
                }}
                transition={{ duration: 1.2, delay: 0.5 }}
                className={`h-full rounded-full ${
                  message.urgency === "critical"
                    ? "bg-red-500"
                    : message.urgency === "high"
                    ? "bg-orange-500"
                    : "bg-amber-500"
                }`}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
