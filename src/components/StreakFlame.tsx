"use client";

import React from "react";
import { motion } from "framer-motion";

interface StreakFlameProps {
  days: number;
  className?: string;
}

type FlameState = "small" | "medium" | "large";

function getFlameState(days: number): FlameState {
  if (days >= 14) return "large";
  if (days >= 5) return "medium";
  return "small";
}

const flameSizes: Record<FlameState, { width: number; height: number }> = {
  small: { width: 20, height: 24 },
  medium: { width: 24, height: 30 },
  large: { width: 28, height: 36 },
};

const flameColors: Record<FlameState, { outer: string; inner: string; core: string }> = {
  small: { outer: "#F59E0B", inner: "#FBBF24", core: "#FDE68A" },
  medium: { outer: "#F97316", inner: "#FB923C", core: "#FDE68A" },
  large: { outer: "#EF4444", inner: "#F97316", core: "#FDE68A" },
};

export function StreakFlame({ days, className = "" }: StreakFlameProps) {
  if (days <= 0) {
    return (
      <svg
        width={20}
        height={24}
        viewBox="0 0 20 24"
        fill="none"
        className={`opacity-30 ${className}`}
      >
        <path
          d="M10 2C10 2 4 8 4 14C4 17.3137 6.68629 20 10 20C13.3137 20 16 17.3137 16 14C16 8 10 2 10 2Z"
          fill="#94A3B8"
        />
      </svg>
    );
  }

  const state = getFlameState(days);
  const size = flameSizes[state];
  const colors = flameColors[state];

  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        filter: [
          "brightness(1)",
          "brightness(1.1)",
          "brightness(1)",
        ],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg
        width={size.width}
        height={size.height}
        viewBox="0 0 28 36"
        fill="none"
      >
        {/* Outer flame */}
        <motion.path
          d="M14 2C14 2 4 10 4 20C4 25.5228 8.47715 30 14 30C19.5228 30 24 25.5228 24 20C24 10 14 2 14 2Z"
          fill={colors.outer}
          animate={{
            d: [
              "M14 2C14 2 4 10 4 20C4 25.5228 8.47715 30 14 30C19.5228 30 24 25.5228 24 20C24 10 14 2 14 2Z",
              "M14 3C14 3 5 11 5 20C5 25.5228 8.47715 30 14 30C19.5228 30 23 25.5228 23 20C23 11 14 3 14 3Z",
              "M14 2C14 2 4 10 4 20C4 25.5228 8.47715 30 14 30C19.5228 30 24 25.5228 24 20C24 10 14 2 14 2Z",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner flame */}
        <motion.path
          d="M14 10C14 10 8 16 8 22C8 25.3137 10.6863 28 14 28C17.3137 28 20 25.3137 20 22C20 16 14 10 14 10Z"
          fill={colors.inner}
          animate={{
            d: [
              "M14 10C14 10 8 16 8 22C8 25.3137 10.6863 28 14 28C17.3137 28 20 25.3137 20 22C20 16 14 10 14 10Z",
              "M14 11C14 11 9 17 9 22C9 25.3137 10.6863 28 14 28C17.3137 28 19 25.3137 19 22C19 17 14 11 14 11Z",
              "M14 10C14 10 8 16 8 22C8 25.3137 10.6863 28 14 28C17.3137 28 20 25.3137 20 22C20 16 14 10 14 10Z",
            ],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.1,
          }}
        />

        {/* Core (hottest part) */}
        <motion.path
          d="M14 18C14 18 11 21 11 24C11 25.6569 12.3431 27 14 27C15.6569 27 17 25.6569 17 24C17 21 14 18 14 18Z"
          fill={colors.core}
          animate={{
            opacity: [0.8, 1, 0.8],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Spark particles for large flame */}
        {state === "large" && (
          <>
            <motion.circle
              cx="10"
              cy="8"
              r="1"
              fill={colors.core}
              animate={{
                y: [-2, -8],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: 0,
              }}
            />
            <motion.circle
              cx="18"
              cy="6"
              r="0.8"
              fill={colors.core}
              animate={{
                y: [-2, -10],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.3,
              }}
            />
            <motion.circle
              cx="14"
              cy="4"
              r="0.6"
              fill={colors.inner}
              animate={{
                y: [-2, -6],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: 0.6,
              }}
            />
          </>
        )}
      </svg>
    </motion.div>
  );
}
