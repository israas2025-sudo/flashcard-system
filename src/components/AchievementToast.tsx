"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Star, Flame, Target, Zap } from "lucide-react";

interface AchievementToastProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onDismiss: () => void;
  autoDismissMs?: number;
}

const achievementIcons: Record<string, React.ReactNode> = {
  Sharpshooter: <Target className="w-5 h-5 text-white" />,
  "Week Warrior": <Flame className="w-5 h-5 text-white" />,
  "Speed Demon": <Zap className="w-5 h-5 text-white" />,
  "First Steps": <Star className="w-5 h-5 text-white" />,
};

export function AchievementToast({
  title,
  description,
  icon,
  onDismiss,
  autoDismissMs = 5000,
}: AchievementToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissMs]);

  const displayIcon = icon || achievementIcons[title] || (
    <Trophy className="w-5 h-5 text-white" />
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -60, x: "-50%", scale: 0.9 }}
        animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
        exit={{ opacity: 0, y: -60, x: "-50%", scale: 0.9 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        className="fixed top-6 left-1/2 z-50 min-w-[320px]"
      >
        <div className="bg-[var(--surface-0)] rounded-2xl border border-[var(--surface-3)] shadow-elevated overflow-hidden">
          {/* Gradient top strip */}
          <div className="h-1 bg-gradient-to-r from-primary-500 via-arabic-500 to-egyptian-500" />

          <div className="flex items-center gap-4 p-4">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
                delay: 0.2,
              }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-egyptian-500 flex items-center justify-center flex-shrink-0"
            >
              {displayIcon}
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[10px] font-semibold uppercase tracking-wider text-primary-500 mb-0.5"
              >
                Achievement Unlocked
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="text-sm font-bold text-[var(--text-primary)]"
              >
                {title}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-[var(--text-secondary)]"
              >
                {description}
              </motion.p>
            </div>

            {/* Dismiss */}
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          </div>

          {/* Auto-dismiss progress bar */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
            className="h-0.5 bg-primary-500/30"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
