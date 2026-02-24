"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { PathwaySection } from "@/types/pathway";

interface PathwayTrailProps {
  sections: PathwaySection[];
  accentColor: string;
  nodePositions: { x: number; y: number }[];
  introMode?: boolean;
}

// Build a smooth SVG cubic bezier path through node positions
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Catmull-Rom to cubic bezier control points
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function PathwayTrail({
  sections,
  accentColor,
  nodePositions,
  introMode = false,
}: PathwayTrailProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [totalLength, setTotalLength] = useState(0);
  const [progressPoint, setProgressPoint] = useState<{ x: number; y: number } | null>(null);

  const pathD = useMemo(() => buildSmoothPath(nodePositions), [nodePositions]);

  // Progress fraction
  const progress = useMemo(() => {
    if (sections.length === 0) return 0;
    const completedCount = sections.filter((s) => s.status === "completed").length;
    const activeIdx = sections.findIndex((s) => s.status === "active");
    const effectiveIdx = activeIdx >= 0 ? activeIdx : completedCount;
    return effectiveIdx / Math.max(sections.length - 1, 1);
  }, [sections]);

  // Measure path and compute progress dot position
  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    setTotalLength(len);

    const pt = pathRef.current.getPointAtLength(Math.min(progress, 0.999) * len);
    setProgressPoint({ x: pt.x, y: pt.y });
  }, [pathD, progress]);

  if (nodePositions.length < 2 || !pathD) return null;

  const completedDash = totalLength * progress;
  const completedGap = totalLength - completedDash;

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        {/* Glow filter for the completed trail */}
        <filter id="trailGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Progress dot glow */}
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Layer 1: Ambient underglow */}
      <path
        d={pathD}
        fill="none"
        stroke={accentColor}
        strokeWidth={14}
        strokeOpacity={0.06}
        style={{ filter: "blur(8px)" }}
      />

      {/* Layer 2: Background/locked path (dashed) */}
      <path
        d={pathD}
        fill="none"
        stroke="#3A3F4B"
        strokeWidth={3}
        strokeDasharray="8 5"
        strokeLinecap="round"
        strokeOpacity={0.5}
      />

      {/* Layer 3: Completed path with glow */}
      <motion.path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke={accentColor}
        strokeWidth={4}
        strokeLinecap="round"
        filter="url(#trailGlow)"
        strokeDasharray={totalLength > 0 ? `${completedDash} ${completedGap}` : undefined}
        initial={introMode ? { strokeDashoffset: totalLength } : false}
        animate={{ strokeDashoffset: 0 }}
        transition={introMode ? { duration: 2.5, ease: [0.165, 0.84, 0.44, 1], delay: 0.3 } : { duration: 0 }}
      />

      {/* Layer 4: Energy flow particles on completed section */}
      {totalLength > 0 && progress > 0.01 && (
        <path
          className="pathway-trail-flow"
          d={pathD}
          fill="none"
          stroke={accentColor}
          strokeWidth={2}
          strokeOpacity={0.5}
          strokeLinecap="round"
          strokeDasharray={`2 22`}
          style={{
            animation: "pathFlow 2s linear infinite",
            // Only show on completed portion
            clipPath: totalLength > 0
              ? `inset(0 ${100 - progress * 100}% 0 0)`
              : undefined,
          }}
        />
      )}

      {/* Layer 5: Progress indicator dot */}
      {progressPoint && progress > 0.005 && (
        <>
          {/* Outer glow */}
          <motion.circle
            cx={progressPoint.x}
            cy={progressPoint.y}
            r={12}
            fill={accentColor}
            opacity={0.15}
            filter="url(#dotGlow)"
            initial={introMode ? { scale: 0 } : false}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: introMode ? 2.8 : 0 }}
          />
          {/* Core dot */}
          <motion.circle
            cx={progressPoint.x}
            cy={progressPoint.y}
            r={5}
            fill={accentColor}
            initial={introMode ? { scale: 0 } : false}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: introMode ? 2.8 : 0 }}
          />
          {/* Bright center */}
          <circle
            cx={progressPoint.x}
            cy={progressPoint.y}
            r={2}
            fill="#FFFFFF"
            opacity={0.9}
          />
        </>
      )}
    </svg>
  );
}
