"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Flame,
  Target,
  Zap,
  TrendingUp,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { LanguageCard } from "@/components/LanguageCard";
import { StreakFlame } from "@/components/StreakFlame";
import { PinnedPresets } from "@/app/components/PinnedPresets";

// ---------------------------------------------------------------------------
// Language data (static — card data is loaded only on the study page)
// ---------------------------------------------------------------------------

const languages = [
  {
    id: "arabic",
    name: "Arabic (MSA / Quran)",
    color: "arabic" as const,
    dueCount: 52,
    totalCards: 207,
    reviewedToday: 31,
    accuracy: 88,
  },
  {
    id: "egyptian",
    name: "Egyptian Arabic",
    color: "egyptian" as const,
    dueCount: 25,
    totalCards: 1000,
    reviewedToday: 8,
    accuracy: 91,
  },
  {
    id: "spanish",
    name: "Spanish",
    color: "spanish" as const,
    dueCount: 35,
    totalCards: 1000,
    reviewedToday: 18,
    accuracy: 94,
  },
  {
    id: "english",
    name: "English",
    color: "english" as const,
    dueCount: 0,
    totalCards: 0,
    reviewedToday: 0,
    accuracy: 0,
    comingSoon: true,
  },
];

const activeLanguages = languages.filter((l) => !l.comingSoon);
const totalDue = activeLanguages.reduce((sum, l) => sum + l.dueCount, 0);
const totalCards = activeLanguages.reduce((sum, l) => sum + l.totalCards, 0);

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Progress Bar Chart
// ---------------------------------------------------------------------------

function ProgressBarChart({
  languages,
}: {
  languages: Array<{
    id: string;
    name: string;
    color: string;
    reviewedToday: number;
  }>;
}) {
  const maxReviewed = Math.max(...languages.map((l) => l.reviewedToday), 1);

  return (
    <div className="space-y-3">
      {languages.map((lang, i) => {
        const colorMap: Record<string, string> = {
          arabic: "bg-arabic-500",
          quran: "bg-quran-500",
          spanish: "bg-spanish-500",
          egyptian: "bg-egyptian-500",
          english: "bg-english-500",
        };
        const percentage = (lang.reviewedToday / maxReviewed) * 100;

        return (
          <motion.div
            key={lang.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-[var(--text-secondary)] w-24 truncate">
              {lang.name}
            </span>
            <div className="flex-1 h-6 bg-[var(--surface-2)] rounded-md overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`h-full ${colorMap[lang.color]} rounded-md flex items-center justify-end pr-2`}
              >
                {percentage > 20 && (
                  <span className="text-xs font-medium text-white">
                    {lang.reviewedToday}
                  </span>
                )}
              </motion.div>
            </div>
            {percentage <= 20 && (
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {lang.reviewedToday}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const totalReviewed = activeLanguages.reduce(
    (sum, l) => sum + l.reviewedToday,
    0
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Greeting Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {getGreeting()}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--surface-1)] rounded-xl px-4 py-2.5 border border-[var(--surface-3)]">
          <StreakFlame days={5} />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">5</p>
            <p className="text-xs text-[var(--text-tertiary)]">day streak</p>
          </div>
        </div>
      </motion.div>

      {/* Study Now Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href="/study/all">
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            className="w-full bg-primary-500 text-white rounded-xl py-4 px-8 flex items-center gap-3 shadow-lg hover:shadow-xl transition-shadow"
          >
            <Zap className="w-5 h-5 text-white" />
            <div className="text-left flex-1">
              <p className="text-lg font-semibold">Study Now</p>
              <p className="text-sm text-white/70">
                {totalDue} cards due across {activeLanguages.length}{" "}
                languages &middot; {totalCards.toLocaleString()} total
                cards
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/60" />
          </motion.button>
        </Link>
      </motion.div>

      {/* Pinned Study Presets */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <PinnedPresets />
      </motion.div>

      {/* Language Cards Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-[var(--text-secondary)]">
            Your Languages
          </h2>
          <Link
            href="/onboarding"
            className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            Add language
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {languages.map((lang, i) => (
            <motion.div
              key={lang.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
            >
              <LanguageCard language={lang} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Today's Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[13px] font-medium text-[var(--text-secondary)]">
            Today&apos;s Progress
          </h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            {totalReviewed} of {totalDue} reviewed
          </span>
        </div>
        <ProgressBarChart languages={activeLanguages} />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Link href="/study-presets">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Smart Study
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Focused preset sessions
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </motion.div>
        </Link>

        <Link href="/browser">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-quran-50 dark:bg-quran-950 flex items-center justify-center">
              <Target className="w-5 h-5 text-quran-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Browse Cards
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {totalCards.toLocaleString()} cards in library
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </motion.div>
        </Link>

        <Link href="/stats">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-arabic-50 dark:bg-arabic-950 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-arabic-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Statistics
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Track your progress
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </motion.div>
        </Link>
      </motion.div>

      {/* Bottom Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
            <Target className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {totalCards.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              total cards in library
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="w-10 h-10 rounded-lg bg-quran-50 dark:bg-quran-950 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-quran-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {activeLanguages.length}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              active languages
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="w-10 h-10 rounded-lg bg-arabic-50 dark:bg-arabic-950 flex items-center justify-center">
            <Flame className="w-6 h-6 text-arabic-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">5</p>
            <p className="text-xs text-[var(--text-tertiary)]">day streak</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
