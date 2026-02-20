// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
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
    // Simulate more activity during morning/evening hours
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
// Helper: Time Per Day Line Chart (inline, not a separate component)
// ---------------------------------------------------------------------------

function TimePerDayChart({ data }: { data: { date: string; value: number }[] }) {
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--surface-3)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={{ stroke: "var(--surface-3)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            unit=" min"
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
            labelFormatter={formatDate}
            formatter={(value: number) => [`${value} min`, "Study Time"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Accuracy Over Time Line Chart
// ---------------------------------------------------------------------------

function AccuracyChart({ data }: { data: { date: string; value: number }[] }) {
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--surface-3)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={{ stroke: "var(--surface-3)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            domain={[50, 100]}
            unit="%"
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
            labelFormatter={formatDate}
            formatter={(value: number) => [`${value}%`, "Accuracy"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#22c55e" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Statistics Page
// ---------------------------------------------------------------------------

export default function StatsPage() {
  const [activePeriod, setActivePeriod] = useState<TimePeriod>("month");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  const periodDays =
    TIME_PERIODS.find((p) => p.key === activePeriod)?.days || 30;

  // Generate data based on active period
  const cardsPerDay = useMemo(
    () => generateCardsPerDay(Math.min(periodDays, 365)),
    [periodDays]
  );
  const timePerDay = useMemo(
    () => generateTimePerDay(Math.min(periodDays, 365)),
    [periodDays]
  );
  const forecastData = useMemo(() => generateForecast(30), []);
  const answerDistribution = useMemo(
    () => generateAnswerDistribution(Math.min(periodDays, 90)),
    [periodDays]
  );
  const accuracyData = useMemo(
    () => generateAccuracyOverTime(Math.min(periodDays, 365)),
    [periodDays]
  );
  const hourlyData = useMemo(() => generateHourlyData(), []);
  const streakData = useMemo(() => generateStreakData(365), []);

  // Summary stats
  const totalReviewsPeriod = cardsPerDay.reduce((s, d) => s + d.value, 0);
  const avgPerDay =
    cardsPerDay.length > 0
      ? Math.round(totalReviewsPeriod / cardsPerDay.length)
      : 0;
  const totalTimePeriod = timePerDay.reduce((s, d) => s + d.value, 0);
  const avgTimePeriod =
    timePerDay.length > 0
      ? Math.round(totalTimePeriod / timePerDay.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Statistics
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Track your progress and study habits
          </p>
        </div>
      </div>

      {/* Controls Bar: Time Period Tabs + Language Filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Time Period Tabs */}
        <div className="flex items-center bg-[var(--surface-1)] border border-[var(--surface-3)] rounded-xl p-1 gap-0.5">
          {TIME_PERIODS.map((period) => (
            <button
              key={period.key}
              onClick={() => setActivePeriod(period.key)}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                ${
                  activePeriod === period.key
                    ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }
              `}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Language Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-1)] border border-[var(--surface-3)] rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)?.label}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <AnimatePresence>
            {languageDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-xl shadow-elevated overflow-hidden min-w-[180px]"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setSelectedLanguage(lang.value);
                      setLanguageDropdownOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2 text-xs transition-colors
                      ${
                        selectedLanguage === lang.value
                          ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                      }
                    `}
                  >
                    {lang.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Reviews",
            value: totalReviewsPeriod.toLocaleString(),
            icon: BarChart3,
            color: "text-indigo-500",
          },
          {
            label: "Avg Per Day",
            value: avgPerDay.toString(),
            icon: TrendingUp,
            color: "text-green-500",
          },
          {
            label: "Total Time",
            value: `${Math.round(totalTimePeriod)} min`,
            icon: Clock,
            color: "text-amber-500",
          },
          {
            label: "Avg Time/Day",
            value: `${avgTimePeriod} min`,
            icon: Timer,
            color: "text-blue-500",
          },
        ].map((stat) => (
          <Card key={stat.label} variant="default" padding="md">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg bg-[var(--surface-2)] ${stat.color}`}
              >
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cards Reviewed Per Day */}
        <Card variant="default" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Cards Reviewed Per Day</CardTitle>
              <CardDescription>
                Daily review count with language breakdown
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[var(--text-tertiary)]" />
            </div>
          </CardHeader>
          <CardsPerDayChart
            data={cardsPerDay}
            languages={
              selectedLanguage === "all" ? LANGUAGE_CHART_CONFIG : undefined
            }
            showTrend
          />
        </Card>

        {/* Time Spent Per Day */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Time Spent Per Day</CardTitle>
              <CardDescription>Minutes spent studying</CardDescription>
            </div>
            <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <TimePerDayChart data={timePerDay} />
        </Card>

        {/* Accuracy Over Time */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Accuracy Over Time</CardTitle>
              <CardDescription>
                (Good + Easy) / Total percentage per day
              </CardDescription>
            </div>
            <Target className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <AccuracyChart data={accuracyData} />
        </Card>

        {/* Review Forecast */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Review Forecast</CardTitle>
              <CardDescription>
                Predicted reviews for the next 30 days
              </CardDescription>
            </div>
            <TrendingUp className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <ReviewForecast data={forecastData} />
        </Card>

        {/* Card State Breakdown */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Card State Breakdown</CardTitle>
              <CardDescription>
                Distribution of cards by scheduling state
              </CardDescription>
            </div>
            <PieChartIcon className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <CardStateDonut data={MOCK_CARD_STATE} />
        </Card>

        {/* Answer Distribution */}
        <Card variant="default" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Answer Distribution</CardTitle>
              <CardDescription>
                Breakdown of answer buttons pressed per day
              </CardDescription>
            </div>
            <Activity className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <AnswerDistribution data={answerDistribution} />
        </Card>

        {/* Interval Distribution */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Interval Distribution</CardTitle>
              <CardDescription>
                Cards grouped by current review interval
              </CardDescription>
            </div>
            <BarChart3 className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <IntervalHistogram data={MOCK_INTERVAL_DISTRIBUTION} />
        </Card>

        {/* Hourly Breakdown */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Hourly Breakdown</CardTitle>
              <CardDescription>
                Study activity and performance by hour of day
              </CardDescription>
            </div>
            <Timer className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <HourlyBreakdown data={hourlyData} />
        </Card>

        {/* Language Progress */}
        <Card variant="default" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Language Progress</CardTitle>
              <CardDescription>
                Per-language cards learned with level breakdown
              </CardDescription>
            </div>
            <Globe className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <LanguageProgress data={MOCK_LANGUAGE_STATS} />
        </Card>

        {/* Streak Calendar */}
        <Card variant="default" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Study Activity</CardTitle>
              <CardDescription>
                Study intensity for the last year
              </CardDescription>
            </div>
            <Flame className="w-4 h-4 text-[var(--text-tertiary)]" />
          </CardHeader>
          <StreakCalendar data={streakData} />
        </Card>
      </div>
    </div>
  );
}
