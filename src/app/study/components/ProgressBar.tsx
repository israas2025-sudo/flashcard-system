"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0-100
  totalCards: number;
  currentIndex: number;
}

export function ProgressBar({ progress, totalCards, currentIndex }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  // Spring-based animation for smooth fill
  const springProgress = useSpring(clampedProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.01,
  });

  useEffect(() => {
    springProgress.set(clampedProgress);
  }, [clampedProgress, springProgress]);

  // Color shifts: start cool blue, shift through indigo, end green
  const getColor = (p: number) => {
    if (p < 30) return "#6366F1"; // Indigo
    if (p < 50) return "#818CF8"; // Lighter indigo
    if (p < 75) return "#6366F1"; // Back to indigo
    if (p < 90) return "#14B8A6"; // Teal
    return "#22C55E"; // Green for completion
  };

  const showShimmer = clampedProgress >= 50 && clampedProgress < 100;
  const showParticles = clampedProgress >= 100;

  return (
    <div className="relative w-full">
      {/* Track */}
      <div className="h-[3px] w-full bg-[var(--surface-2)]">
        {/* Fill */}
        <motion.div
          className="h-full relative overflow-hidden"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: getColor(clampedProgress),
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1], // Fast start, slow middle, fast end
          }}
        >
          {/* Shimmer effect at 50% and 75% */}
          {showShimmer && (
            <div className="absolute inset-0 shimmer" />
          )}
        </motion.div>
      </div>

      {/* Particle animation at 100% */}
      {showParticles && (
        <div className="absolute right-0 top-0 -mt-1">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 0,
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 20 - 10,
              }}
              transition={{
                duration: 0.6,
                delay: i * 0.05,
                ease: "easeOut",
              }}
              className="absolute w-1.5 h-1.5 rounded-full bg-green-400"
            />
          ))}
        </div>
      )}
    </div>
  );
}
