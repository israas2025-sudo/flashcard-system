"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Flame,
  Zap,
  ArrowRight,
} from "lucide-react";
import { LanguageCard } from "@/components/LanguageCard";
import { StreakFlame } from "@/components/StreakFlame";

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
];

const totalDue = languages.reduce((sum, l) => sum + l.dueCount, 0);
const totalCards = languages.reduce((sum, l) => sum + l.totalCards, 0);

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
// Dashboard Page — 5 Sections Only
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const totalReviewed = languages.reduce(
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
      {/* Section 1: Greeting Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]" style={{ letterSpacing: "-0.02em" }}>
            {getGreeting()}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--surface-1)] rounded-lg px-4 py-2.5 border border-[var(--surface-3)] shadow-card">
          <StreakFlame days={5} />
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">5</p>
            <p className="text-xs text-[var(--text-tertiary)]">day streak</p>
          </div>
        </div>
      </motion.div>

      {/* Section 2: Study Now CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href="/study">
          <motion.div
            whileHover={{ scale: 1.005, y: -1 }}
            whileTap={{ scale: 0.995 }}
            className="w-full bg-primary-500 text-white rounded-xl py-5 px-6 flex items-center gap-4 cursor-pointer transition-shadow"
            style={{
              boxShadow: "0 1px 3px rgba(99,91,255,0.2), 0 4px 12px rgba(99,91,255,0.15)",
            }}
          >
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-lg font-semibold">Study Now</p>
              <p className="text-sm text-white/70">
                {totalDue} cards due across {languages.length}{" "}
                languages &middot; {totalCards.toLocaleString()} total cards
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/60" />
          </motion.div>
        </Link>
      </motion.div>

      {/* Section 3: Your Languages */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Your Languages
          </h2>
          <Link
            href="/onboarding"
            className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            Add language
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Section 4: Today's Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-[var(--surface-1)] rounded-lg border border-[var(--surface-3)] p-5 shadow-card"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Today&apos;s Progress
          </h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            {totalReviewed} of {totalDue} reviewed
          </span>
        </div>
        <ProgressBarChart languages={languages} />
      </motion.div>

      {/* Section 5: Weekly Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: "This Week", value: "247", sublabel: "cards reviewed" },
          { label: "Accuracy", value: "91%", sublabel: "correct answers" },
          { label: "Streak", value: "5", sublabel: "days" },
          { label: "Quran", value: "86%", sublabel: "retention rate" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="bg-[var(--surface-1)] rounded-lg border border-[var(--surface-3)] p-4 shadow-card"
          >
            <p className="text-xs text-[var(--text-tertiary)] font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{stat.sublabel}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
