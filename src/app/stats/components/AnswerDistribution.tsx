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
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailyAnswerData {
  date: string;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface AnswerDistributionProps {
  data: DailyAnswerData[];
}

const ANSWER_COLORS = {
  again: "#ef4444",
  hard: "#f59e0b",
  good: "#6366f1",
  easy: "#22c55e",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AnswerDistribution({ data }: AnswerDistributionProps) {
  // Compute summary totals
  const totals = data.reduce(
    (acc, day) => ({
      again: acc.again + day.again,
      hard: acc.hard + day.hard,
      good: acc.good + day.good,
      easy: acc.easy + day.easy,
    }),
    { again: 0, hard: 0, good: 0, easy: 0 }
  );
  const totalAll = totals.again + totals.hard + totals.good + totals.easy;
  const accuracy =
    totalAll > 0
      ? (((totals.good + totals.easy) / totalAll) * 100).toFixed(1)
      : "0.0";

  return (
    <div>
      {/* Summary pills */}
      <div className="flex items-center gap-4 mb-4">
        {(
          [
            { key: "again", label: "Again", color: ANSWER_COLORS.again },
            { key: "hard", label: "Hard", color: ANSWER_COLORS.hard },
            { key: "good", label: "Good", color: ANSWER_COLORS.good },
            { key: "easy", label: "Easy", color: ANSWER_COLORS.easy },
          ] as const
        ).map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {item.label}:
            </span>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              {totals[item.key]}
            </span>
          </div>
        ))}
        <div className="ml-auto text-xs text-[var(--text-secondary)]">
          Accuracy:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {accuracy}%
          </span>
        </div>
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
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: "11px",
                color: "var(--text-secondary)",
              }}
            />
            <Bar
              dataKey="again"
              name="Again"
              stackId="answers"
              fill={ANSWER_COLORS.again}
            />
            <Bar
              dataKey="hard"
              name="Hard"
              stackId="answers"
              fill={ANSWER_COLORS.hard}
            />
            <Bar
              dataKey="good"
              name="Good"
              stackId="answers"
              fill={ANSWER_COLORS.good}
            />
            <Bar
              dataKey="easy"
              name="Easy"
              stackId="answers"
              fill={ANSWER_COLORS.easy}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
