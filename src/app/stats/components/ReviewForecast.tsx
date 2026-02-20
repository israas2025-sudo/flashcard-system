// @ts-nocheck
"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ForecastData {
  date: string;
  reviewCount: number;
  newCount: number;
  totalCount: number;
  cumulativeOverdue: number;
}

interface ReviewForecastProps {
  data: ForecastData[];
  /** Number of cards per day considered manageable (default: 50). */
  manageableThreshold?: number;
  /** Number of cards per day considered heavy (default: 100). */
  heavyThreshold?: number;
}

const LOAD_COLORS = {
  manageable: "#22c55e",
  heavy: "#eab308",
  overloaded: "#ef4444",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLoadColor(total: number, manageable: number, heavy: number): string {
  if (total <= manageable) return LOAD_COLORS.manageable;
  if (total <= heavy) return LOAD_COLORS.heavy;
  return LOAD_COLORS.overloaded;
}

export function ReviewForecast({
  data,
  manageableThreshold = 50,
  heavyThreshold = 100,
}: ReviewForecastProps) {
  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
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
            interval={Math.max(Math.floor(data.length / 10), 1)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
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
            formatter={(value: number, name: string) => [
              value,
              name === "reviewCount"
                ? "Reviews"
                : name === "newCount"
                ? "New"
                : name === "cumulativeOverdue"
                ? "Overdue"
                : name,
            ]}
            cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", color: "var(--text-secondary)" }}
          />
          <Bar
            dataKey="reviewCount"
            name="Reviews"
            stackId="forecast"
            maxBarSize={24}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getLoadColor(
                  entry.totalCount,
                  manageableThreshold,
                  heavyThreshold
                )}
              />
            ))}
          </Bar>
          <Bar
            dataKey="newCount"
            name="New Cards"
            stackId="forecast"
            fill="#6366f1"
            opacity={0.5}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend for load colors */}
      <div className="flex items-center justify-center gap-6 mt-3">
        {[
          { color: LOAD_COLORS.manageable, label: "Manageable" },
          { color: LOAD_COLORS.heavy, label: "Heavy" },
          { color: LOAD_COLORS.overloaded, label: "Overloaded" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
