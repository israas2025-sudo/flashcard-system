"use client";

/**
 * LevelDisplay -- Level number with circular progress ring and XP bar.
 *
 * Visual components:
 * 1. Large level number centered in a circular SVG progress ring
 * 2. XP bar showing progress to the next level
 * 3. Cosmetic unlocks list showing items unlocked at the current level
 *
 * The circular ring animates from 0 to the current progress on mount.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, Palette, Layout, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CosmeticUnlock {
  type: string;
  name: string;
  description: string;
  unlockedAtLevel: number;
}

interface LevelDisplayProps {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  unlockedCosmetics: CosmeticUnlock[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RING_SIZE = 140;
const RING_STROKE_WIDTH = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Icon map for cosmetic types. */
const cosmeticIcons: Record<string, typeof Palette> = {
  card_theme: Palette,
  accent_color: Sparkles,
  dashboard_widget: Layout,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LevelDisplay({
  level,
  currentXP,
  xpForCurrentLevel,
  xpForNextLevel,
  progressPercent,
  unlockedCosmetics,
}: LevelDisplayProps) {
  const [showCosmetics, setShowCosmetics] = useState(false);

  // Compute XP values for display
  const xpIntoCurrentLevel = currentXP - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const strokeDashoffset =
    RING_CIRCUMFERENCE - (progressPercent / 100) * RING_CIRCUMFERENCE;

  // Format large numbers
  const formatXP = (xp: number) => {
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toLocaleString();
  };

  return (
    <Card variant="elevated">
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6 py-2">
          {/* ============================================================= */}
          {/* Circular Progress Ring with Level Number                      */}
          {/* ============================================================= */}

          <div className="relative flex-shrink-0">
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="transform -rotate-90"
            >
              {/* Background ring */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--surface-3)"
                strokeWidth={RING_STROKE_WIDTH}
              />

              {/* Progress ring */}
              <motion.circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="url(#levelGradient)"
                strokeWidth={RING_STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                animate={{ strokeDashoffset }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.2,
                }}
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient
                  id="levelGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#D946EF" />
                </linearGradient>
              </defs>
            </svg>

            {/* Level number overlay (centered) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                Level
              </span>
              <motion.span
                className="text-3xl font-black text-[var(--text-primary)]"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              >
                {level}
              </motion.span>
            </div>
          </div>

          {/* ============================================================= */}
          {/* XP Bar and Details                                            */}
          {/* ============================================================= */}

          <div className="flex-1 w-full space-y-3">
            {/* XP header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Experience Points
                </span>
              </div>
              <span className="text-sm text-[var(--text-secondary)]">
                {formatXP(currentXP)} XP total
              </span>
            </div>

            {/* XP progress bar */}
            <div className="space-y-1.5">
              <div className="h-3 rounded-full bg-[var(--surface-3)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 via-purple-500 to-fuchsia-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{
                    duration: 1,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.4,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>
                  {formatXP(xpIntoCurrentLevel)} / {formatXP(xpNeededForNextLevel)} XP
                </span>
                <span>
                  Next level: {formatXP(xpForNextLevel - currentXP)} XP to go
                </span>
              </div>
            </div>

            {/* Level milestones */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                Level {level} ({formatXP(xpForCurrentLevel)} XP)
              </span>
              <span className="text-[var(--surface-3)]">&rarr;</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                Level {level + 1} ({formatXP(xpForNextLevel)} XP)
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Cosmetic Unlocks (collapsible)                                    */}
        {/* ================================================================= */}

        {unlockedCosmetics.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--surface-3)]">
            <button
              onClick={() => setShowCosmetics(!showCosmetics)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                Unlocked Cosmetics ({unlockedCosmetics.length})
              </span>
              {showCosmetics ? (
                <ChevronUp className="w-4 h-4 ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-auto" />
              )}
            </button>

            <AnimatePresence>
              {showCosmetics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {unlockedCosmetics.map((cosmetic) => {
                      const Icon =
                        cosmeticIcons[cosmetic.type] || Sparkles;

                      return (
                        <div
                          key={`${cosmetic.type}-${cosmetic.name}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--surface-3)]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {cosmetic.name}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                              {cosmetic.description}
                            </p>
                          </div>
                          <span className="ml-auto text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                            Lv.{cosmetic.unlockedAtLevel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
