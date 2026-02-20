"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  Target,
  Clock,
  Flame,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyStats {
  /** Total cards reviewed this week. */
  cardsReviewed: number;
  /** Cards reviewed last week (for comparison). */
  cardsReviewedLastWeek: number;
  /** Accuracy percentage (0-100). */
  accuracyPercent: number;
  /** Accuracy percentage last week (for comparison). */
  accuracyPercentLastWeek: number;
  /** Total time spent studying in minutes. */
  timeSpentMinutes: number;
  /** Time spent last week in minutes (for comparison). */
  timeSpentMinutesLastWeek: number;
  /** Current streak in days. */
  streakDays: number;
  /** Whether the user has studied today. */
  studiedToday: boolean;
  /** Daily breakdown for the mini bar chart (Sun-Sat). */
  dailyCards: number[];
}

interface WeeklyReviewCardProps {
  stats: WeeklyStats;
  /** URL for the full stats page. Defaults to "/stats". */
  statsPageUrl?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatItem({
  icon,
  label,
  value,
  change,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number | null;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center gap-3"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--surface-2)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {value}
          </span>
          {change !== null && (
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                change >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {change >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {change > 0 ? "+" : ""}
              {change}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MiniBarChart({
  data,
  delay,
}: {
  data: number[];
  delay: number;
}) {
  const max = Math.max(...data, 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      className="flex items-end gap-1.5 h-16"
    >
      {data.map((count, i) => {
        const heightPercent = (count / max) * 100;
        const isToday = i === new Date().getDay();

        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(heightPercent, 4)}%` }}
              transition={{
                duration: 0.6,
                delay: delay + i * 0.05,
                ease: "easeOut",
              }}
              className={`
                w-full rounded-sm min-h-[2px]
                ${
                  isToday
                    ? "bg-primary-500"
                    : count > 0
                    ? "bg-primary-500/40"
                    : "bg-[var(--surface-3)]"
                }
              `}
            />
            <span
              className={`text-[9px] ${
                isToday
                  ? "text-primary-400 font-semibold"
                  : "text-[var(--text-tertiary)]"
              }`}
            >
              {DAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * WeeklyReviewCard - Dashboard widget that shows a summary of the user's
 * weekly study activity: cards reviewed, accuracy, time spent, streak status,
 * and a mini bar chart of daily activity. Animated with framer-motion.
 */
export function WeeklyReviewCard({
  stats,
  statsPageUrl = "/stats",
  className = "",
}: WeeklyReviewCardProps) {
  const cardsChange = percentChange(
    stats.cardsReviewed,
    stats.cardsReviewedLastWeek
  );
  const accuracyChange = percentChange(
    stats.accuracyPercent,
    stats.accuracyPercentLastWeek
  );
  const timeChange = percentChange(
    stats.timeSpentMinutes,
    stats.timeSpentMinutesLastWeek
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        rounded-xl border border-[var(--surface-3)]
        bg-[var(--surface-1)] shadow-card p-5
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <motion.h3
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-semibold text-[var(--text-primary)]"
        >
          Weekly Review
        </motion.h3>
        <Link
          href={statsPageUrl}
          className="
            inline-flex items-center gap-1 text-xs text-primary-400
            hover:text-primary-300 transition-colors duration-150
          "
        >
          View all stats
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <StatItem
          icon={
            <BarChart3 className="w-4 h-4 text-primary-400" />
          }
          label="Cards reviewed"
          value={stats.cardsReviewed.toLocaleString()}
          change={cardsChange}
          delay={0.1}
        />
        <StatItem
          icon={
            <Target className="w-4 h-4 text-emerald-400" />
          }
          label="Accuracy"
          value={`${stats.accuracyPercent}%`}
          change={accuracyChange}
          delay={0.15}
        />
        <StatItem
          icon={
            <Clock className="w-4 h-4 text-amber-400" />
          }
          label="Time spent"
          value={formatTime(stats.timeSpentMinutes)}
          change={timeChange}
          delay={0.2}
        />
        <StatItem
          icon={
            <Flame className="w-4 h-4 text-orange-400" />
          }
          label="Streak"
          value={`${stats.streakDays} day${stats.streakDays !== 1 ? "s" : ""}`}
          change={null}
          delay={0.25}
        />
      </div>

      {/* Separator */}
      <div className="border-t border-[var(--surface-3)] mb-4" />

      {/* Daily activity mini chart */}
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          Daily activity
        </p>
        <MiniBarChart
          data={
            stats.dailyCards.length === 7
              ? stats.dailyCards
              : [0, 0, 0, 0, 0, 0, 0]
          }
          delay={0.3}
        />
      </div>

      {/* Streak status footer */}
      {!stats.studiedToday && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            Study today to keep your {stats.streakDays}-day streak alive!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
