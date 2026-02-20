// @ts-nocheck
"use client";

import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";

interface CardStateData {
  newCount: number;
  learningCount: number;
  youngCount: number;
  matureCount: number;
  pausedCount: number;
}

interface CardStateDonutProps {
  data: CardStateData;
}

const STATE_CONFIG = [
  { key: "newCount", label: "New", color: "#3b82f6" },
  { key: "learningCount", label: "Learning", color: "#f97316" },
  { key: "youngCount", label: "Young", color: "#22c55e" },
  { key: "matureCount", label: "Mature", color: "#15803d" },
  { key: "pausedCount", label: "Paused", color: "#94a3b8" },
] as const;

function renderActiveShape(props: any) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
    percent,
  } = props;

  return (
    <g>
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="var(--text-primary)"
        className="text-lg font-semibold"
        style={{ fontSize: "18px", fontWeight: 600 }}
      >
        {value}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="var(--text-secondary)"
        style={{ fontSize: "12px" }}
      >
        {payload.label}
      </text>
      <text
        x={cx}
        y={cy + 28}
        textAnchor="middle"
        fill="var(--text-tertiary)"
        style={{ fontSize: "10px" }}
      >
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
}

export function CardStateDonut({ data }: CardStateDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = STATE_CONFIG.map(({ key, label, color }) => ({
    label,
    value: data[key],
    color,
  })).filter((d) => d.value > 0);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            {activeIndex === undefined && (
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text-primary)"
                style={{ fontSize: "20px", fontWeight: 600 }}
              >
                {total}
              </text>
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
        {STATE_CONFIG.map(({ key, label, color }) => {
          const count = data[key];
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {label}
              </span>
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
