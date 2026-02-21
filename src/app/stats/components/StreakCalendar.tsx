// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import { useUIStore } from "@/store/ui-store";

interface DayData {
  date: string;
  value: number;
}

interface StreakCalendarProps {
  data: DayData[];
  /** Number of days to display (default: 365). */
  days?: number;
}

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Get intensity level for color mapping (0 = no activity, 1-4 = increasing intensity).
 */
function getIntensity(value: number, max: number): number {
  if (value === 0) return 0;
  if (max === 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const INTENSITY_COLORS = {
  light: [
    "bg-[var(--surface-2)]", // level 0
    "bg-indigo-200",          // level 1
    "bg-indigo-300",          // level 2
    "bg-indigo-400",          // level 3
    "bg-indigo-600",          // level 4
  ],
  dark: [
    "bg-[var(--surface-2)]",  // level 0
    "bg-indigo-900",           // level 1
    "bg-indigo-700",           // level 2
    "bg-indigo-500",           // level 3
    "bg-indigo-400",           // level 4
  ],
};

function formatDateForDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StreakCalendar({ data, days = 365 }: StreakCalendarProps) {
  const { darkMode } = useUIStore();

  const { grid, monthLabels, maxValue, totalDaysStudied, longestStreak, currentStreak } =
    useMemo(() => {
      // Build a lookup map from date string to value
      const dataMap = new Map<string, number>();
      for (const d of data) {
        dataMap.set(d.date, d.value);
      }

      // Generate the grid starting from (today - days) to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days + 1);

      // Align to start of week (Sunday)
      const startDayOfWeek = startDate.getDay();

      const gridData: { date: string; value: number; dayOfWeek: number }[][] = [];
      const months: { label: string; weekIndex: number }[] = [];

      let currentDate = new Date(startDate);
      let currentWeek: { date: string; value: number; dayOfWeek: number }[] = [];
      let lastMonth = -1;

      // Fill in empty cells at the beginning
      for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push({ date: "", value: -1, dayOfWeek: i });
      }

      let maxVal = 0;
      let totalStudied = 0;
      let longestStr = 0;
      let currentStr = 0;
      let tempStreak = 0;

      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const value = dataMap.get(dateStr) || 0;
        const dayOfWeek = currentDate.getDay();

        if (value > maxVal) maxVal = value;
        if (value > 0) {
          totalStudied++;
          tempStreak++;
          if (tempStreak > longestStr) longestStr = tempStreak;
        } else {
          tempStreak = 0;
        }

        // Track month labels
        const month = currentDate.getMonth();
        if (month !== lastMonth) {
          months.push({
            label: MONTH_LABELS[month],
            weekIndex: gridData.length,
          });
          lastMonth = month;
        }

        currentWeek.push({ date: dateStr, value, dayOfWeek });

        if (dayOfWeek === 6) {
          gridData.push(currentWeek);
          currentWeek = [];
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Push remaining partial week
      if (currentWeek.length > 0) {
        gridData.push(currentWeek);
      }

      // Current streak: count back from today
      let cs = 0;
      const checkDate = new Date(today);
      while (true) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if ((dataMap.get(dateStr) || 0) > 0) {
          cs++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        grid: gridData,
        monthLabels: months,
        maxValue: maxVal,
        totalDaysStudied: totalStudied,
        longestStreak: longestStr,
        currentStreak: cs,
      };
    }, [data, days]);

  // Pick colors based on dark mode state (avoids dynamic Tailwind class construction)
  const colors = darkMode ? INTENSITY_COLORS.dark : INTENSITY_COLORS.light;

  return (
    <div>
      {/* Stats summary */}
      <div className="flex items-center gap-6 mb-4">
        <div className="text-xs text-[var(--text-tertiary)]">
          Days studied:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {totalDaysStudied}
          </span>
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          Current streak:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {currentStreak}d
          </span>
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          Longest streak:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {longestStreak}d
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-0.5">
          {/* Month labels row */}
          <div className="flex ml-8 mb-1">
            {monthLabels.map((m, i) => (
              <div
                key={`${m.label}-${i}`}
                className="text-[10px] text-[var(--text-tertiary)]"
                style={{
                  position: "relative",
                  left: `${m.weekIndex * 14}px`,
                  width: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Grid rows (7 rows for days of week) */}
          <div className="flex gap-0.5">
            {/* Weekday labels */}
            <div className="flex flex-col gap-0.5 mr-1.5 justify-start">
              {WEEKDAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="text-[9px] text-[var(--text-tertiary)] h-[12px] flex items-center justify-end pr-0.5"
                  style={{ width: "24px" }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {grid.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day, dayIndex) => {
                  if (day.value === -1) {
                    return (
                      <div
                        key={dayIndex}
                        className="w-[12px] h-[12px] rounded-[2px]"
                      />
                    );
                  }

                  const intensity = getIntensity(day.value, maxValue);

                  return (
                    <div
                      key={dayIndex}
                      className={`w-[12px] h-[12px] rounded-[2px] transition-colors ${colors[intensity]}`}
                      title={`${formatDateForDisplay(day.date)}: ${day.value} reviews`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Intensity legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-[var(--text-tertiary)] mr-1">
          Less
        </span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-[12px] h-[12px] rounded-[2px] ${colors[level]}`}
          />
        ))}
        <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
          More
        </span>
      </div>
    </div>
  );
}
