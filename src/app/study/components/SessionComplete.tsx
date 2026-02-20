"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  Clock,
  Target,
  Zap,
  ArrowRight,
  RotateCcw,
  Home,
} from "lucide-react";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";
import { AchievementToast } from "@/components/AchievementToast";

interface SessionStats {
  cardsReviewed: number;
  correctCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  streakDays: number;
  timeSpentSeconds: number;
  xpEarned: number;
}

interface SessionCompleteProps {
  stats: SessionStats;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function SessionComplete({ stats }: SessionCompleteProps) {
  const [showAchievement, setShowAchievement] = useState(false);
  const accuracy =
    stats.cardsReviewed > 0
      ? Math.round((stats.correctCount / stats.cardsReviewed) * 100)
      : 0;

  // Check for achievements
  useEffect(() => {
    const timer = setTimeout(() => {
      if (accuracy >= 90 || stats.streakDays >= 7) {
        setShowAchievement(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [accuracy, stats.streakDays]);

  const statItems = [
    {
      icon: Target,
      label: "Cards Reviewed",
      value: stats.cardsReviewed,
      color: "text-primary-500",
      bgColor: "bg-primary-50 dark:bg-primary-950/40",
    },
    {
      icon: Zap,
      label: "Accuracy",
      value: `${accuracy}%`,
      color: "text-quran-500",
      bgColor: "bg-quran-50 dark:bg-quran-950/40",
    },
    {
      icon: Trophy,
      label: "Streak",
      value: `${stats.streakDays} days`,
      color: "text-arabic-500",
      bgColor: "bg-arabic-50 dark:bg-arabic-950/40",
    },
    {
      icon: Clock,
      label: "Time",
      value: formatTime(stats.timeSpentSeconds),
      color: "text-english-500",
      bgColor: "bg-english-50 dark:bg-english-900/30",
    },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      {/* Confetti */}
      <ConfettiCelebration trigger={true} />

      {/* Achievement toast */}
      {showAchievement && (
        <AchievementToast
          title={accuracy >= 90 ? "Sharpshooter" : "Week Warrior"}
          description={
            accuracy >= 90
              ? "90%+ accuracy in a study session!"
              : "7-day study streak achieved!"
          }
          onDismiss={() => setShowAchievement(false)}
        />
      )}

      {/* Summary card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.3,
        }}
        className="w-full max-w-md"
      >
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] shadow-elevated overflow-hidden">
          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
                delay: 0.5,
              }}
              className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4"
            >
              <Trophy className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Session Complete!
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Great work, keep it up!
            </p>
          </div>

          {/* XP Earned */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mx-6 mb-4 p-4 rounded-xl btn-gradient text-center"
          >
            <p className="text-sm text-white/70">XP Earned</p>
            <p className="text-3xl font-bold text-white">
              +{stats.xpEarned}
            </p>
          </motion.div>

          {/* Stats grid */}
          <div className="px-6 pb-4 grid grid-cols-2 gap-3">
            {statItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className={`${item.bgColor} rounded-xl p-4 text-center`}
                >
                  <Icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {item.label}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Rating breakdown */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 justify-center text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {stats.againCount} again
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {stats.hardCount} hard
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-400" />
                {stats.goodCount} good
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {stats.easyCount} easy
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <Link href="/study/all" className="flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--surface-3)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Study More
              </motion.button>
            </Link>
            <Link href="/" className="flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
