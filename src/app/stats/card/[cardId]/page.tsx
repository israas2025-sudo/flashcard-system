// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  AlertTriangle,
  Calendar,
  BarChart3,
  Hash,
  Zap,
  Shield,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewHistoryEntry {
  id: string;
  reviewedAt: string;
  rating: "again" | "hard" | "good" | "easy";
  intervalBefore: number | null;
  intervalAfter: number | null;
  stabilityBefore: number | null;
  stabilityAfter: number | null;
  difficultyBefore: number | null;
  difficultyAfter: number | null;
  timeSpentMs: number | null;
  reviewType: string | null;
}

interface CardInfo {
  id: string;
  front: string;
  back: string;
  language: string;
  noteType: string;
  stability: number;
  difficulty: number;
  retrievability: number;
  intervalDays: number;
  nextDue: string;
  reviewCount: number;
  lapseCount: number;
  createdAt: string;
  state: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

function generateMockCardInfo(cardId: string): CardInfo {
  return {
    id: cardId,
    front: "\u0643\u062A\u0627\u0628",
    back: "book (noun)",
    language: "classical-arabic",
    noteType: "Arabic Vocabulary",
    stability: 45.2,
    difficulty: 5.8,
    retrievability: 0.92,
    intervalDays: 32,
    nextDue: new Date(Date.now() + 32 * 86400000).toISOString().split("T")[0],
    reviewCount: 28,
    lapseCount: 3,
    createdAt: "2025-06-15",
    state: "review",
  };
}

function generateMockHistory(): ReviewHistoryEntry[] {
  const ratings: Array<"again" | "hard" | "good" | "easy"> = [
    "good",
    "good",
    "again",
    "good",
    "good",
    "hard",
    "good",
    "easy",
    "good",
    "good",
    "good",
    "again",
    "hard",
    "good",
    "good",
    "easy",
    "good",
    "good",
    "good",
    "good",
    "easy",
    "good",
    "good",
    "good",
    "good",
    "easy",
    "good",
    "good",
  ];

  let interval = 0;
  let stability = 1;
  let difficulty = 5.5;
  const today = new Date();

  return ratings.map((rating, i) => {
    const reviewDate = new Date(today);
    reviewDate.setDate(reviewDate.getDate() - (ratings.length - i) * 3);

    const intervalBefore = interval;
    const stabilityBefore = stability;
    const difficultyBefore = difficulty;

    // Simulate FSRS-like interval growth
    if (rating === "again") {
      interval = 1;
      stability = Math.max(1, stability * 0.3);
      difficulty = Math.min(10, difficulty + 0.5);
    } else if (rating === "hard") {
      interval = Math.max(1, Math.round(interval * 1.2));
      stability = stability * 1.1;
      difficulty = Math.min(10, difficulty + 0.15);
    } else if (rating === "good") {
      interval = Math.max(1, Math.round(stability * 0.9));
      stability = stability * 2.5;
      difficulty = Math.max(1, difficulty - 0.05);
    } else {
      interval = Math.max(1, Math.round(stability * 1.3));
      stability = stability * 3.5;
      difficulty = Math.max(1, difficulty - 0.15);
    }

    return {
      id: `review-${i}`,
      reviewedAt: reviewDate.toISOString(),
      rating,
      intervalBefore: i === 0 ? null : intervalBefore,
      intervalAfter: interval,
      stabilityBefore: i === 0 ? null : parseFloat(stabilityBefore.toFixed(2)),
      stabilityAfter: parseFloat(stability.toFixed(2)),
      difficultyBefore: i === 0 ? null : parseFloat(difficultyBefore.toFixed(2)),
      difficultyAfter: parseFloat(difficulty.toFixed(2)),
      timeSpentMs: Math.floor(Math.random() * 15000) + 3000,
      reviewType: i < 3 ? "learning" : "review",
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RATING_COLORS: Record<string, string> = {
  again: "#ef4444",
  hard: "#f59e0b",
  good: "#6366f1",
  easy: "#22c55e",
};

const RATING_BG: Record<string, string> = {
  again: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  hard: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  good: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400",
  easy: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
};

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ms: number | null): string {
  if (ms === null) return "-";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatInterval(days: number | null): string {
  if (days === null) return "-";
  if (days === 0) return "< 1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30.44)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CardStatsPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.cardId as string;

  const cardInfo = useMemo(() => generateMockCardInfo(cardId), [cardId]);
  const history = useMemo(() => generateMockHistory(), []);

  // Prepare chart data for interval growth
  const intervalChartData = history
    .filter((r) => r.intervalAfter !== null)
    .map((r, i) => ({
      review: i + 1,
      interval: r.intervalAfter!,
      date: formatDateShort(r.reviewedAt),
      rating: r.rating,
    }));

  // Prepare chart data for stability growth
  const stabilityChartData = history
    .filter((r) => r.stabilityAfter !== null)
    .map((r, i) => ({
      review: i + 1,
      stability: r.stabilityAfter!,
      date: formatDateShort(r.reviewedAt),
      rating: r.rating,
    }));

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Card Statistics
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            Detailed review history and FSRS parameters
          </p>
        </div>
      </div>

      {/* Card Preview */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Front / Back preview */}
          <div className="flex-1 space-y-3">
            <div>
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Front
              </span>
              <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1 arabic-text">
                {cardInfo.front}
              </p>
            </div>
            <div className="w-12 h-px bg-[var(--surface-3)]" />
            <div>
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Back
              </span>
              <p className="text-lg text-[var(--text-secondary)] mt-1">
                {cardInfo.back}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-tertiary)] font-medium">
                {cardInfo.noteType}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-tertiary)] font-medium">
                {cardInfo.state}
              </span>
            </div>
          </div>

          {/* FSRS Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 min-w-[320px]">
            {[
              {
                label: "Stability",
                value: `${cardInfo.stability.toFixed(1)}d`,
                icon: Shield,
                color: "text-indigo-500",
                tooltip:
                  "Memory stability -- expected time to 90% recall probability",
              },
              {
                label: "Difficulty",
                value: cardInfo.difficulty.toFixed(1),
                icon: AlertTriangle,
                color: "text-amber-500",
                tooltip: "Card difficulty (1-10 scale)",
              },
              {
                label: "Retrievability",
                value: `${(cardInfo.retrievability * 100).toFixed(0)}%`,
                icon: Zap,
                color: "text-green-500",
                tooltip: "Current probability of recall",
              },
              {
                label: "Interval",
                value: formatInterval(cardInfo.intervalDays),
                icon: Calendar,
                color: "text-blue-500",
                tooltip: "Current review interval",
              },
              {
                label: "Reviews",
                value: cardInfo.reviewCount.toString(),
                icon: Hash,
                color: "text-violet-500",
                tooltip: "Total number of reviews",
              },
              {
                label: "Lapses",
                value: cardInfo.lapseCount.toString(),
                icon: Activity,
                color: "text-red-500",
                tooltip: "Number of times the card was forgotten",
              },
            ].map((param) => (
              <div
                key={param.label}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--surface-3)]"
                title={param.tooltip}
              >
                <div className={`mt-0.5 ${param.color}`}>
                  <param.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-medium">
                    {param.label}
                  </p>
                  <p className="text-base font-semibold text-[var(--text-primary)]">
                    {param.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next due date */}
        <div className="mt-4 pt-4 border-t border-[var(--surface-3)] flex items-center gap-4">
          <span className="text-xs text-[var(--text-tertiary)]">
            Next due:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {formatDateShort(cardInfo.nextDue)}
            </span>
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            Created:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {formatDateShort(cardInfo.createdAt)}
            </span>
          </span>
        </div>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interval Growth Chart */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Interval Growth</CardTitle>
              <CardDescription>
                How the review interval has changed over time
              </CardDescription>
            </div>
            <TrendingUp className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={intervalChartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--surface-3)"
                  vertical={false}
                />
                <XAxis
                  dataKey="review"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  axisLine={{ stroke: "var(--surface-3)" }}
                  tickLine={false}
                  label={{
                    value: "Review #",
                    position: "insideBottomRight",
                    fontSize: 10,
                    fill: "var(--text-tertiary)",
                    offset: -5,
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Days",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 10,
                    fill: "var(--text-tertiary)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-1)",
                    border: "1px solid var(--surface-3)",
                    borderRadius: "10px",
                    boxShadow: "var(--shadow-elevated)",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}d`,
                    `Interval (rated ${props.payload.rating})`,
                  ]}
                  labelFormatter={(label) => `Review #${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="interval"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        key={`dot-${payload.review}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={RATING_COLORS[payload.rating] || "#6366f1"}
                        strokeWidth={0}
                      />
                    );
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--surface-0)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stability Growth Chart */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Stability Growth</CardTitle>
              <CardDescription>
                FSRS stability parameter over reviews
              </CardDescription>
            </div>
            <Shield className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stabilityChartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--surface-3)"
                  vertical={false}
                />
                <XAxis
                  dataKey="review"
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  axisLine={{ stroke: "var(--surface-3)" }}
                  tickLine={false}
                  label={{
                    value: "Review #",
                    position: "insideBottomRight",
                    fontSize: 10,
                    fill: "var(--text-tertiary)",
                    offset: -5,
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Stability",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 10,
                    fill: "var(--text-tertiary)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-1)",
                    border: "1px solid var(--surface-3)",
                    borderRadius: "10px",
                    boxShadow: "var(--shadow-elevated)",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    value.toFixed(2),
                    `Stability (rated ${props.payload.rating})`,
                  ]}
                  labelFormatter={(label) => `Review #${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="stability"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        key={`dot-s-${payload.review}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={RATING_COLORS[payload.rating] || "#22c55e"}
                        strokeWidth={0}
                      />
                    );
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--surface-0)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Review History Table */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <div>
            <CardTitle>Complete Review History</CardTitle>
            <CardDescription>
              Every review with FSRS parameter snapshots
            </CardDescription>
          </div>
          <BarChart3 className="w-4 h-4 text-[var(--text-tertiary)]" />
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--surface-3)]">
                {[
                  "Date",
                  "Rating",
                  "Interval Before",
                  "Interval After",
                  "Stability",
                  "Difficulty",
                  "Time Spent",
                  "Type",
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left py-2.5 px-3 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-[var(--surface-3)]/50 hover:bg-[var(--surface-2)]/50 transition-colors"
                >
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {formatDateShort(entry.reviewedAt)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${RATING_BG[entry.rating]}`}
                    >
                      {entry.rating.charAt(0).toUpperCase() +
                        entry.rating.slice(1)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {formatInterval(entry.intervalBefore)}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                    {formatInterval(entry.intervalAfter)}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {entry.stabilityBefore !== null
                      ? `${entry.stabilityBefore} -> `
                      : ""}
                    <span className="font-medium text-[var(--text-primary)]">
                      {entry.stabilityAfter?.toFixed(2) ?? "-"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {entry.difficultyBefore !== null
                      ? `${entry.difficultyBefore} -> `
                      : ""}
                    <span className="font-medium text-[var(--text-primary)]">
                      {entry.difficultyAfter?.toFixed(2) ?? "-"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {formatTime(entry.timeSpentMs)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-tertiary)] font-medium">
                      {entry.reviewType || "-"}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
