"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";

// ---------------------------------------------------------------------------
// BonusCardIndicator
// ---------------------------------------------------------------------------
// Wraps a card with a golden glow border + shimmer animation when the card
// is a bonus card (3x XP multiplier). Includes:
//  - Animated gradient border with shimmer sweep
//  - "BONUS 3x" badge with a star icon pinned to the top-right
//  - Pulsing ring effect radiating outward
// ---------------------------------------------------------------------------

interface BonusCardIndicatorProps {
  /** Whether the current card is a bonus card. */
  isBonus: boolean;
  /** Card content to wrap. */
  children?: React.ReactNode;
}

export function BonusCardIndicator({
  isBonus,
  children,
}: BonusCardIndicatorProps) {
  return (
    <div className="relative w-full" role="status" aria-live="polite">
      <AnimatePresence>
        {isBonus && (
          <>
            {/* ---- Pulse ring ---- */}
            <motion.div
              key="pulse-ring"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: [0, 0.5, 0],
                scale: [0.98, 1.04, 1.08],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute -inset-1 rounded-2xl border-2 border-amber-400/60 pointer-events-none"
              aria-hidden="true"
            />

            {/* ---- Shimmer gradient border ---- */}
            <motion.div
              key="shimmer-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute -inset-px rounded-2xl overflow-hidden pointer-events-none"
              aria-hidden="true"
            >
              {/* Gradient border using a pseudo-background + mask technique */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 p-px">
                <div className="absolute inset-px rounded-[15px] bg-[var(--surface-0)]" />
              </div>

              {/* Shimmer sweep overlay */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 1,
                }}
                className="absolute inset-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                }}
              />
            </motion.div>

            {/* ---- Outer glow ---- */}
            <motion.div
              key="outer-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute -inset-2 rounded-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />

            {/* ---- BONUS 3x Badge ---- */}
            <motion.div
              key="bonus-badge"
              initial={{ opacity: 0, scale: 0, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: -8 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 18,
                delay: 0.15,
              }}
              className="absolute -top-3 -right-3 z-20"
            >
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-lg shadow-amber-400/30"
                role="img"
                aria-label="Bonus card: triple XP"
              >
                <Star className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
                <span className="text-xs font-bold text-amber-900 tracking-wide">
                  BONUS 3x
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Card content ---- */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
