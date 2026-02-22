// @ts-nocheck
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Timer,
  Target,
  Globe,
  Flame,
  ChevronDown,
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
import { CardsPerDayChart } from "./components/CardsPerDayChart";
import { ReviewForecast } from "./components/ReviewForecast";
import { CardStateDonut } from "./components/CardStateDonut";
import { AnswerDistribution } from "./components/AnswerDistribution";
import { IntervalHistogram } from "./components/IntervalHistogram";
import { HourlyBreakdown } from "./components/HourlyBreakdown";
import { StreakCalendar } from "./components/StreakCalendar";
import { LanguageProgress } from "./components/LanguageProgress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimePeriod = "today" | "week" | "month" | "year" | "all";

const TIME_PERIODS: { key: TimePeriod; label: string; days: number }[] = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "year", label: "Year", days: 365 },
  { key: "all", label: "All Time", days: 9999 },
];

// ---------------------------------------------------------------------------
// Mock Data Generators
// ---------------------------------------------------------------------------

function generateDatesBack(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function generateCardsPerDay(days: number) {
  return generateDatesBack(days).map((date) => ({
    date,
    value: Math.floor(Math.random() * 80) + 10,
    "classical-arabic": Math.floor(Math.random() * 30) + 5,
    "egyptian-arabic": Math.floor(Math.random() * 15),
    spanish: Math.floor(Math.random() * 20) + 3,
    english: Math.floor(Math.random() * 10),
  }));
}

function generateTimePerDay(days: number) {
  return generateDatesBack(days).map((date) => ({
    date,
    value: Math.round((Math.random() * 45 + 5) * 10) / 10,
  }));
}

function generateForecast(days: number) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const reviewCount = Math.floor(Math.random() * 80) + 20;
    const newCount = 20;
    return {
      date: d.toISOString().split("T")[0],
      reviewCount,
      newCount,
      totalCount: reviewCount + newCount,
      cumulativeOverdue: i === 0 ? Math.floor(Math.random() * 15) : 0,
    };
  });
}

function generateAnswerDistribution(days: number) {
  return generateDatesBack(days).map((date) => {
    const total = Math.floor(Math.random() * 60) + 20;
    const again = Math.floor(total * (Math.random() * 0.15 + 0.05));
    const hard = Math.floor(total * (Math.random() * 0.1 + 0.05));
    const easy = Math.floor(total * (Math.random() * 0.15 + 0.05));
    const good = total - again - hard - easy;
    return { date, again, hard, good, easy };
  });
}

function generateAccuracyOverTime(days: number) {
  return generateDatesBack(days).map((date) => ({
    date,
    value: Math.round((Math.random() * 20 + 75) * 10) / 10,
  }));
}

function generateHourlyData() {
  return Array.from({ length: 24 }, (_, hour) => {
    const baseReviews =
      hour >= 7 && hour <= 10
        ? Math.floor(Math.random() * 200) + 100
        : hour >= 19 && hour <= 22
        ? Math.floor(Math.random() * 180) + 80
        : Math.floor(Math.random() * 40);
    return {
      hour,
      reviewCount: baseReviews,
      averageAccuracy: Math.random() * 0.2 + 0.75,
      averageTimeMs: Math.random() * 10000 + 5000,
    };
  });
}

function generateStreakData(days: number) {
  return generateDatesBack(days).map((date) => ({
    date,
    value: Math.random() > 0.15 ? Math.floor(Math.random() * 100) + 5 : 0,
  }));
}

const MOCK_CARD_STATE = {
  newCount: 342,
  learningCount: 58,
  youngCount: 215,
  matureCount: 891,
  pausedCount: 44,
  totalCount: 1550,
};

const MOCK_INTERVAL_DISTRIBUTION = [
  { label: "0d (learning)", minDays: 0, maxDays: 1, count: 58 },
  { label: "1d", minDays: 1, maxDays: 2, count: 45 },
  { label: "2-3d", minDays: 2, maxDays: 4, count: 67 },
  { label: "4-7d", minDays: 4, maxDays: 8, count: 89 },
  { label: "8-14d", minDays: 8, maxDays: 15, count: 112 },
  { label: "15-30d", minDays: 15, maxDays: 31, count: 156 },
  { label: "1-3mo", minDays: 31, maxDays: 91, count: 234 },
  { label: "3-6mo", minDays: 91, maxDays: 181, count: 189 },
  { label: "6-12mo", minDays: 181, maxDays: 366, count: 145 },
  { label: "1y+", minDays: 366, maxDays: 100000, count: 67 },
];

const MOCK_LANGUAGE_STATS = [
  {
    language: "classical-arabic",
    displayName: "Classical Arabic",
    totalCards: 520,
    studiedCards: 385,
    matureCards: 210,
    recentAccuracy: 0.82,
    dueToday: 35,
    totalReviews: 4200,
    averageMatureInterval: 45,
  },
  {
    language: "egyptian-arabic",
    displayName: "Egyptian Arabic",
    totalCards: 280,
    studiedCards: 195,
    matureCards: 88,
    recentAccuracy: 0.78,
    dueToday: 18,
    totalReviews: 1800,
    averageMatureInterval: 32,
  },
  {
    language: "spanish",
    displayName: "Spanish",
    totalCards: 450,
    studiedCards: 320,
    matureCards: 245,
    recentAccuracy: 0.91,
    dueToday: 22,
    totalReviews: 5600,
    averageMatureInterval: 62,
  },
  {
    language: "english",
    displayName: "English",
    totalCards: 180,
    studiedCards: 145,
    matureCards: 120,
    recentAccuracy: 0.95,
    dueToday: 8,
    totalReviews: 2200,
    averageMatureInterval: 78,
  },
];

const LANGUAGE_OPTIONS = [
  { value: "all", label: "All Languages" },
  { value: "classical-arabic", label: "Classical Arabic" },
  { value: "egyptian-arabic", label: "Egyptian Arabic" },
  { value: "spanish", label: "Spanish" },
  { value: "english", label: "English" },
];

const LANGUAGE_CHART_CONFIG = [
  { key: "classical-arabic", label: "Classical Arabic", color: "#f59e0b" },
  { key: "egyptian-arabic", label: "Egyptian Arabic", color: "#8b5cf6" },
  { key: "spanish", label: "Spanish", color: "#f97316" },
  { key: "english", label: "English", color: "#64748b" },
];

// ---------------------------------------------------------------------------
// Inline Charts
// ---------------------------------------------------------------------------

function TimePerDayChart({ data }: { data: { date: string; value: number }[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (!mounted) {
    return <div className="w-full" style={{ height: "320px", minHeight: "320px" }} />;
  }

  return (
    <div className="w-full" style={{ height: "320px", minHeight: "320px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-3)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--surface-3)" }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} unit=" min" />
          <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--surface-3)", borderRadius: "10px", boxShadow: "var(--shadow-elevated)", fontSize: "12px", color: "var(--text-primary)" }} labelFormatter={formatDate} formatter={(value: number) => [`${value} min`, "Study Time"]} />
          <Line type="monotone" dataKey="value" stroke="#635BFF" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#635BFF" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AccuracyChart({ data }: { data: { date: string; value: number }[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (!mounted) {
    return <div className="w-full" style={{ height: "320px", minHeight: "320px" }} />;
  }

  return (
    <div className="w-full" style={{ height: "320px", minHeight: "320px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-3)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--surface-3)" }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} domain={[50, 100]} unit="%" />
          <Tooltip contentStyle={{ backgroundColor: "var(--surface-1)", border: "1px solid var(--surface-3)", borderRadius: "10px", boxShadow: "var(--shadow-elevated)", fontSize: "12px", color: "var(--text-primary)" }} labelFormatter={formatDate} formatter={(value: number) => [`${value}%`, "Accuracy"]} />
          <Line type="monotone" dataKey="value" stroke="#0CBF4C" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#0CBF4C" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart Card with gradient left border and inner glow
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  description,
  accentColor,
  className = "",
  children,
}: {
  title: string;
  description: string;
  accentColor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`chart-card ${className}`}
      style={{
        padding: "24px 28px",
        ...(accentColor ? {
          "--accent-color": accentColor,
          "--accent-end": accentColor,
          "--glow-color": `${accentColor}08`,
        } as React.CSSProperties : {}),
      }}
    >
      <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-3)] mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            {accentColor && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 8px ${accentColor}40`,
                }}
              />
            )}
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{description}</p>
        </div>
      </div>
      <div style={{ minHeight: "280px" }}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function StatsPage() {
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("month");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const periodDays = TIME_PERIODS.find((p) => p.key === activePeriod)?.days || 30;

  const cardsPerDay = useMemo(() => generateCardsPerDay(Math.min(periodDays, 365)), [periodDays]);
  const timePerDay = useMemo(() => generateTimePerDay(Math.min(periodDays, 365)), [periodDays]);
  const forecastData = useMemo(() => generateForecast(30), []);
  const answerDistribution = useMemo(() => generateAnswerDistribution(Math.min(periodDays, 90)), [periodDays]);
  const accuracyData = useMemo(() => generateAccuracyOverTime(Math.min(periodDays, 365)), [periodDays]);
  const hourlyData = useMemo(() => generateHourlyData(), []);
  const streakData = useMemo(() => generateStreakData(365), []);

  const totalReviewsPeriod = cardsPerDay.reduce((s, d) => s + d.value, 0);
  const avgPerDay = cardsPerDay.length > 0 ? Math.round(totalReviewsPeriod / cardsPerDay.length) : 0;
  const totalTimePeriod = timePerDay.reduce((s, d) => s + d.value, 0);
  const avgTimePeriod = timePerDay.length > 0 ? Math.round(totalTimePeriod / timePerDay.length) : 0;

  const metricTiles = [
    { label: "Total Reviews", value: totalReviewsPeriod.toLocaleString(), icon: BarChart3, color: "#635BFF" },
    { label: "Avg Per Day", value: avgPerDay.toString(), icon: TrendingUp, color: "#F59E0B" },
    { label: "Total Time", value: `${Math.round(totalTimePeriod)} min`, icon: Clock, color: "#14B8A6" },
    { label: "Avg Time/Day", value: `${avgTimePeriod} min`, icon: Timer, color: "#F97316" },
  ];

  const chartEntries: {
    key: string;
    title: string;
    description: string;
    accentColor?: string;
    className?: string;
    content: React.ReactNode;
  }[] = [
    {
      key: "cards-per-day",
      title: "Cards Reviewed Per Day",
      description: "Daily review count with language breakdown",
      accentColor: "#635BFF",
      className: "lg:col-span-2",
      content: <CardsPerDayChart data={cardsPerDay} languages={selectedLanguage === "all" ? LANGUAGE_CHART_CONFIG : undefined} showTrend />,
    },
    {
      key: "time-per-day",
      title: "Time Spent Per Day",
      description: "Minutes spent studying",
      accentColor: "#14B8A6",
      content: <TimePerDayChart data={timePerDay} />,
    },
    {
      key: "accuracy",
      title: "Accuracy Over Time",
      description: "(Good + Easy) / Total percentage per day",
      accentColor: "#0CBF4C",
      content: <AccuracyChart data={accuracyData} />,
    },
    {
      key: "forecast",
      title: "Review Forecast",
      description: "Predicted reviews for the next 30 days",
      accentColor: "#F59E0B",
      content: <ReviewForecast data={forecastData} />,
    },
    {
      key: "card-state",
      title: "Card State Breakdown",
      description: "Distribution of cards by scheduling state",
      accentColor: "#8B5CF6",
      content: <CardStateDonut data={MOCK_CARD_STATE} />,
    },
    {
      key: "answer-dist",
      title: "Answer Distribution",
      description: "Breakdown of answer buttons pressed per day",
      accentColor: "#DF1B41",
      className: "lg:col-span-2",
      content: <AnswerDistribution data={answerDistribution} />,
    },
    {
      key: "interval",
      title: "Interval Distribution",
      description: "Cards grouped by current review interval",
      accentColor: "#F97316",
      content: <IntervalHistogram data={MOCK_INTERVAL_DISTRIBUTION} />,
    },
    {
      key: "hourly",
      title: "Hourly Breakdown",
      description: "Study activity and performance by hour of day",
      accentColor: "#3B82F6",
      content: <HourlyBreakdown data={hourlyData} />,
    },
    {
      key: "language-progress",
      title: "Language Progress",
      description: "Per-language cards learned with level breakdown",
      className: "lg:col-span-2",
      content: <LanguageProgress data={MOCK_LANGUAGE_STATS} />,
    },
    {
      key: "streak",
      title: "Study Activity",
      description: "Study intensity for the last year",
      accentColor: "#635BFF",
      className: "lg:col-span-2",
      content: <StreakCalendar data={streakData} />,
    },
  ];

  return (
    <div>
      {/* Page title */}
      <div className="flex items-center gap-3 mb-1.5">
        <h1
          className="text-[32px] font-bold page-header-gradient"
          style={{ letterSpacing: "-0.03em" }}
        >
          Statistics
        </h1>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Activity className="w-5 h-5" style={{ color: "#635BFF" }} />
        </motion.div>
      </div>
      <p className="text-[14px] text-[var(--text-tertiary)] mb-8">
        Track your progress and study habits
      </p>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
        {/* Period tabs */}
        <div
          className="flex items-center gap-1.5 p-1.5 rounded-xl"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "var(--glass-blur)",
          }}
        >
          {TIME_PERIODS.map((period) => (
            <button
              key={period.key}
              onClick={() => setActivePeriod(period.key)}
              className="relative rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer"
              style={{
                padding: activePeriod === period.key ? "8px 20px" : "8px 16px",
                fontWeight: activePeriod === period.key ? 700 : 500,
                color: activePeriod === period.key ? "white" : "var(--text-tertiary)",
                background: activePeriod === period.key
                  ? "linear-gradient(135deg, #635BFF, #7C3AED)"
                  : "transparent",
                boxShadow: activePeriod === period.key
                  ? "0 4px 14px rgba(99,91,255,0.35)"
                  : "none",
                letterSpacing: activePeriod === period.key ? "-0.01em" : "0",
              }}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Language filter */}
        <div className="relative">
          <button
            onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors btn-spring"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "var(--glass-blur)",
            }}
          >
            <Globe className="w-3.5 h-3.5" />
            {LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)?.label}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <AnimatePresence>
            {languageDropdownOpen && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLanguageDropdownOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-elevated overflow-hidden min-w-[200px]"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--shadow-elevated)",
                  }}
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => { setSelectedLanguage(lang.value); setLanguageDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                        selectedLanguage === lang.value
                          ? "font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                      }`}
                      style={selectedLanguage === lang.value ? {
                        background: "rgba(99, 91, 255, 0.08)",
                        color: "#635BFF",
                      } : undefined}
                    >
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {metricTiles.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <div
                className="metric-tile"
                style={{
                  "--accent-color": stat.color,
                  "--accent-end": stat.color,
                  "--glow-color": `${stat.color}15`,
                } as React.CSSProperties}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                  e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${stat.color}, ${stat.color}cc)`,
                      boxShadow: `0 4px 14px ${stat.color}30`,
                    }}
                  >
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <p className="text-[13px] text-[var(--text-tertiary)] font-medium">
                    {stat.label}
                  </p>
                </div>
                <p
                  className="text-[30px] font-bold text-[var(--text-primary)]"
                  style={{ letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
                >
                  {stat.value}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Section Divider */}
      <div className="mb-10">
        <div
          className="h-px w-full"
          style={{
            background: "linear-gradient(90deg, transparent, var(--surface-3) 20%, var(--surface-3) 80%, transparent)",
          }}
        />
      </div>

      {/* Chart grid with staggered entrance */}
      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartEntries.map((chart, i) => (
            <motion.div
              key={chart.key}
              className={chart.className || ""}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
            >
              <ChartCard
                title={chart.title}
                description={chart.description}
                accentColor={chart.accentColor}
              >
                {chart.content}
              </ChartCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
