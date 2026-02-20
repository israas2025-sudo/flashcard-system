"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Sparkles, Trophy } from "lucide-react";

// ---------------------------------------------------------------------------
// StudyNowButton
// ---------------------------------------------------------------------------
// Dashboard CTA that reflects the user's daily study progress:
//
//  not_started  -> "Start Learning"              (neutral gradient)
//  in_progress  -> "Continue (23 left)"          (primary gradient)
//  almost_done  -> "Almost there! (5 left)"      (pulsing amber)
//  completed    -> "Bonus Round!"                (shimmer gold)
//
// Props:
//  goalState  -- one of the four states
//  remaining  -- number of cards left in today's goal
//  onClick    -- fired when the button is pressed
// ---------------------------------------------------------------------------

type GoalState = "not_started" | "in_progress" | "almost_done" | "completed";

interface StudyNowButtonProps {
  goalState: GoalState;
  remaining: number;
  onClick: () => void;
}

interface StateConfig {
  label: string;
  icon: React.ElementType;
  gradient: string;
  textColor: string;
  ariaLabel: string;
}

function getStateConfig(
  goalState: GoalState,
  remaining: number,
): StateConfig {
  switch (goalState) {
    case "not_started":
      return {
        label: "Start Learning",
        icon: BookOpen,
        gradient:
          "bg-gradient-to-r from-primary-500 to-primary-600",
        textColor: "text-white",
        ariaLabel: `Start learning. ${remaining} cards to study today.`,
      };
    case "in_progress":
      return {
        label: `Continue (${remaining} left)`,
        icon: ChevronRight,
        gradient:
          "bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600",
        textColor: "text-white",
        ariaLabel: `Continue studying. ${remaining} cards remaining.`,
      };
    case "almost_done":
      return {
        label: `Almost there! (${remaining} left)`,
        icon: Sparkles,
        gradient:
          "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500",
        textColor: "text-white",
        ariaLabel: `Almost done! Only ${remaining} cards left.`,
      };
    case "completed":
      return {
        label: "Bonus Round!",
        icon: Trophy,
        gradient:
          "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500",
        textColor: "text-amber-900",
        ariaLabel:
          "Daily goal completed! Start a bonus round for extra XP.",
      };
  }
}

export function StudyNowButton({
  goalState,
  remaining,
  onClick,
}: StudyNowButtonProps) {
  const config = useMemo(
    () => getStateConfig(goalState, remaining),
    [goalState, remaining],
  );

  const Icon = config.icon;

  const isPulsing = goalState === "almost_done";
  const isShimmering = goalState === "completed";

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      aria-label={config.ariaLabel}
      className={`
        relative overflow-hidden w-full rounded-2xl px-6 py-4
        font-semibold text-base select-none
        transition-shadow duration-300
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${config.gradient} ${config.textColor}
        shadow-lg hover:shadow-xl
      `}
    >
      {/* ---- Animated gradient background ---- */}
      <motion.div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundSize: "200% 200%",
          backgroundImage:
            goalState === "completed"
              ? "linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%)"
              : "linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 70%)",
        }}
        animate={
          isShimmering || isPulsing
            ? { backgroundPosition: ["200% 0%", "-200% 0%"] }
            : {}
        }
        transition={
          isShimmering
            ? { duration: 2, repeat: Infinity, ease: "linear" }
            : isPulsing
              ? { duration: 3, repeat: Infinity, ease: "linear" }
              : {}
        }
        aria-hidden="true"
      />

      {/* ---- Pulse ring (almost_done) ---- */}
      {isPulsing && (
        <motion.span
          className="absolute inset-0 rounded-2xl border-2 border-white/40 pointer-events-none"
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.04, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      )}

      {/* ---- Shimmer sweep (completed) ---- */}
      {isShimmering && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            className="absolute inset-y-0 w-1/3"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            }}
            animate={{ x: ["-100%", "400%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 1.5,
            }}
          />
        </motion.div>
      )}

      {/* ---- Content ---- */}
      <span className="relative z-10 flex items-center justify-center gap-2.5">
        <Icon className="w-5 h-5" />
        <motion.span
          key={config.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {config.label}
        </motion.span>
      </span>
    </motion.button>
  );
}
