"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Lock } from "lucide-react";

interface LanguageInfo {
  id: string;
  name: string;
  color: "arabic" | "quran" | "spanish" | "egyptian" | "english";
  dueCount: number;
  totalCards: number;
  reviewedToday: number;
  accuracy: number;
  comingSoon?: boolean;
}

interface LanguageCardProps {
  language: LanguageInfo;
}

const colorMap: Record<string, { dot: string; ring: string; text: string; bg: string; accent: string }> = {
  arabic: {
    dot: "bg-arabic-500",
    ring: "stroke-arabic-500",
    text: "text-arabic-600 dark:text-arabic-400",
    bg: "bg-arabic-50 dark:bg-arabic-950/20",
    accent: "#F59E0B",
  },
  quran: {
    dot: "bg-quran-500",
    ring: "stroke-quran-500",
    text: "text-quran-600 dark:text-quran-400",
    bg: "bg-quran-50 dark:bg-quran-950/20",
    accent: "#14B8A6",
  },
  spanish: {
    dot: "bg-spanish-500",
    ring: "stroke-spanish-500",
    text: "text-spanish-600 dark:text-spanish-400",
    bg: "bg-spanish-50 dark:bg-spanish-950/20",
    accent: "#F97316",
  },
  egyptian: {
    dot: "bg-egyptian-500",
    ring: "stroke-egyptian-500",
    text: "text-egyptian-600 dark:text-egyptian-400",
    bg: "bg-egyptian-50 dark:bg-egyptian-950/20",
    accent: "#8B5CF6",
  },
  english: {
    dot: "bg-english-500",
    ring: "stroke-english-500",
    text: "text-english-600 dark:text-english-400",
    bg: "bg-english-50 dark:bg-english-950/20",
    accent: "#64748B",
  },
};

function CircularProgress({
  percentage,
  colorClass,
  size = 52,
  strokeWidth = 3,
}: {
  percentage: number;
  colorClass: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-[var(--surface-3)]"
      />
      {/* Progress arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={colorClass}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      />
    </svg>
  );
}

export function LanguageCard({ language }: LanguageCardProps) {
  const colors = colorMap[language.color] || colorMap.arabic;
  const progressPercent =
    language.totalCards > 0
      ? Math.round(
          ((language.totalCards - language.dueCount) / language.totalCards) * 100
        )
      : 0;

  const cardContent = (
    <motion.div
      whileHover={language.comingSoon ? undefined : { y: -3, scale: 1.01 }}
      whileTap={language.comingSoon ? undefined : { scale: 0.99 }}
      className={`bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-4 shadow-card hover:shadow-card-hover transition-shadow relative ${language.comingSoon ? "opacity-60 cursor-default" : "cursor-pointer"}`}
    >
      {/* Coming Soon overlay */}
      {language.comingSoon && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl">
          <Lock className="w-6 h-6 text-[var(--text-tertiary)] mb-1" />
          <span className="text-xs font-medium text-[var(--text-tertiary)]">Coming Soon</span>
        </div>
      )}

      {/* Header row */}
      <div className={`flex items-center justify-between mb-3 ${language.comingSoon ? "opacity-40" : ""}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {language.name}
          </span>
        </div>
      </div>

      {/* Progress ring and due count */}
      <div className={`flex items-center justify-between mb-3 ${language.comingSoon ? "opacity-40" : ""}`}>
        <div className="relative">
          <CircularProgress
            percentage={progressPercent}
            colorClass={colors.ring}
            size={52}
            strokeWidth={3}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-[var(--text-primary)]">
              {progressPercent}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${colors.text}`}>
            {language.dueCount}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">to review</p>
        </div>
      </div>

      {/* Stats footer */}
      <div className={`flex items-center justify-between text-[10px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--surface-3)] ${language.comingSoon ? "opacity-40" : ""}`}>
        <span>{language.reviewedToday} today</span>
        <span>{language.accuracy}% acc.</span>
      </div>
    </motion.div>
  );

  if (language.comingSoon) {
    return <div>{cardContent}</div>;
  }

  return (
    <Link href={`/study/${language.id}`}>
      {cardContent}
    </Link>
  );
}
