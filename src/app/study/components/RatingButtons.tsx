"use client";

import React from "react";
import { motion } from "framer-motion";

interface RatingButtonsProps {
  intervals: {
    again: string;
    hard: string;
    good: string;
    easy: string;
  };
  onRate: (rating: "again" | "hard" | "good" | "easy") => void;
}

const ratingConfig = [
  {
    key: "again" as const,
    label: "Again",
    shortcut: "1",
    bgClass: "bg-[#FCA5A5] hover:bg-[#F87171] dark:bg-red-900/60 dark:hover:bg-red-800/70",
    textClass: "text-[#DC2626] dark:text-red-200",
    borderClass: "border-transparent",
  },
  {
    key: "hard" as const,
    label: "Hard",
    shortcut: "2",
    bgClass: "bg-[#FDE68A] hover:bg-[#FCD34D] dark:bg-amber-900/60 dark:hover:bg-amber-800/70",
    textClass: "text-[#D97706] dark:text-amber-200",
    borderClass: "border-transparent",
  },
  {
    key: "good" as const,
    label: "Good",
    shortcut: "3",
    bgClass: "bg-[#A5B4FC] hover:bg-[#818CF8] dark:bg-indigo-900/60 dark:hover:bg-indigo-800/70",
    textClass: "text-[#4F46E5] dark:text-indigo-200",
    borderClass: "border-transparent",
  },
  {
    key: "easy" as const,
    label: "Easy",
    shortcut: "4",
    bgClass: "bg-[#86EFAC] hover:bg-[#4ADE80] dark:bg-green-900/60 dark:hover:bg-green-800/70",
    textClass: "text-[#16A34A] dark:text-green-200",
    borderClass: "border-transparent",
  },
];

export function RatingButtons({ intervals, onRate }: RatingButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-stretch gap-3 justify-center max-w-xl mx-auto"
    >
      {ratingConfig.map((rating, i) => (
        <motion.button
          key={rating.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onRate(rating.key)}
          className={`
            flex-1 flex flex-col items-center gap-1 py-3.5 px-4 rounded-[12px]
            ${rating.bgClass}
            transition-all duration-100 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            active:scale-95
          `}
        >
          <span className={`text-sm font-semibold ${rating.textClass}`}>
            {rating.label}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {intervals[rating.key]}
          </span>
          {/* Keyboard shortcut hint */}
          <span className="hidden sm:inline-block text-[10px] text-[var(--text-tertiary)] mt-1 px-1.5 py-0.5 rounded bg-[var(--surface-2)]">
            {rating.shortcut}
          </span>
        </motion.button>
      ))}
    </motion.div>
  );
}
