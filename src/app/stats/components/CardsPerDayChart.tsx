// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DailyCardData {
  date: string;
  value: number;
  /** Per-language breakdown (optional). */
  [language: string]: string | number;
}

interface CardsPerDayChartProps {
  data: DailyCardData[];
  languages?: { key: string; label: string; color: string }[];
  showTrend?: boolean;
}

const CHART_COLORS = {
  total: "#6366f1",
  trendLine: "#a5b4fc",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeTrendLine(data: DailyCardData[]): number {
  if (data.length === 0) return 0;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return Math.round(total / data.length);
}

export function CardsPerDayChart({
  data,
  languages,
  showTrend = true,
}: CardsPerDayChartProps) {
  const trendValue = useMemo(() => computeTrendLine(data), [data]);

  const hasLanguageBreakdown = languages && languages.length > 0;

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
            interval="preserveStartEnd"
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
            cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
          />
          {hasLanguageBreakdown ? (
            <>
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", color: "var(--text-secondary)" }}
              />
              {languages!.map((lang) => (
                <Bar
                  key={lang.key}
                  dataKey={lang.key}
                  name={lang.label}
                  stackId="languages"
                  fill={lang.color}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </>
          ) : (
            <Bar
              dataKey="value"
              name="Cards Reviewed"
              fill={CHART_COLORS.total}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          )}
          {showTrend && trendValue > 0 && (
            <ReferenceLine
              y={trendValue}
              stroke={CHART_COLORS.trendLine}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Avg: ${trendValue}`,
                position: "right",
                fontSize: 10,
                fill: "var(--text-tertiary)",
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
