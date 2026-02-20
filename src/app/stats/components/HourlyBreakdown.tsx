// @ts-nocheck
"use client";

import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HourlyBucket {
  hour: number;
  reviewCount: number;
  averageAccuracy: number;
  averageTimeMs: number;
}

interface HourlyBreakdownProps {
  data: HourlyBucket[];
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export function HourlyBreakdown({ data }: HourlyBreakdownProps) {
  const chartData = data.map((bucket) => ({
    hour: formatHour(bucket.hour),
    reviews: bucket.reviewCount,
    accuracy: Math.round(bucket.averageAccuracy * 100),
    avgSeconds: Math.round(bucket.averageTimeMs / 1000),
    rawHour: bucket.hour,
  }));

  // Find peak study hour
  const peakHour = data.reduce(
    (best, curr) => (curr.reviewCount > best.reviewCount ? curr : best),
    data[0]
  );

  const bestAccuracyHour = data
    .filter((h) => h.reviewCount > 10) // Only consider hours with enough data
    .reduce(
      (best, curr) =>
        curr.averageAccuracy > best.averageAccuracy ? curr : best,
      data[0]
    );

  return (
    <div>
      {/* Insights */}
      <div className="flex items-center gap-6 mb-4">
        {peakHour && (
          <div className="text-xs text-[var(--text-tertiary)]">
            Peak study time:{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatHour(peakHour.hour)}
            </span>
          </div>
        )}
        {bestAccuracyHour && bestAccuracyHour.reviewCount > 10 && (
          <div className="text-xs text-[var(--text-tertiary)]">
            Best accuracy:{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatHour(bestAccuracyHour.hour)} (
              {(bestAccuracyHour.averageAccuracy * 100).toFixed(0)}%)
            </span>
          </div>
        )}
      </div>

      <div className="w-full h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="var(--surface-3)" />
            <PolarAngleAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
            />
            <PolarRadiusAxis
              tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickCount={4}
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
              formatter={(value: number, name: string) => {
                if (name === "reviews") return [value, "Reviews"];
                if (name === "accuracy") return [`${value}%`, "Accuracy"];
                return [value, name];
              }}
            />
            <Radar
              name="reviews"
              dataKey="reviews"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Radar
              name="accuracy"
              dataKey="accuracy"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.1}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#6366f1] rounded-full" />
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
            Review Count
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#22c55e] rounded-full border-dashed" />
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
            Accuracy %
          </span>
        </div>
      </div>
    </div>
  );
}
