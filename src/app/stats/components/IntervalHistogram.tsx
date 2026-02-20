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
} from "recharts";

interface IntervalBucket {
  label: string;
  minDays: number;
  maxDays: number;
  count: number;
}

interface IntervalHistogramProps {
  data: IntervalBucket[];
}

/**
 * Color gradient from short intervals (lighter indigo) to long intervals (darker green).
 * Represents maturity growth.
 */
const BUCKET_COLORS = [
  "#818cf8", // 0d learning
  "#6366f1", // 1d
  "#4f46e5", // 2-3d
  "#4338ca", // 4-7d
  "#3730a3", // 8-14d
  "#22c55e", // 15-30d
  "#16a34a", // 1-3m
  "#15803d", // 3-6m
  "#166534", // 6-12m
  "#14532d", // 1y+
];

export function IntervalHistogram({ data }: IntervalHistogramProps) {
  const totalCards = data.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-xs text-[var(--text-tertiary)]">
          Total active cards:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {totalCards.toLocaleString()}
          </span>
        </span>
      </div>

      <div className="w-full h-[300px]">
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
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              axisLine={{ stroke: "var(--surface-3)" }}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              height={60}
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
              formatter={(value: number) => [
                `${value} cards (${totalCards > 0 ? ((value / totalCards) * 100).toFixed(1) : 0}%)`,
                "Count",
              ]}
              cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
            />
            <Bar dataKey="count" name="Cards" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BUCKET_COLORS[index] || BUCKET_COLORS[BUCKET_COLORS.length - 1]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
