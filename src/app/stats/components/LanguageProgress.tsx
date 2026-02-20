// @ts-nocheck
"use client";

import React from "react";
import { motion } from "framer-motion";

interface LanguageStat {
  language: string;
  displayName: string;
  totalCards: number;
  studiedCards: number;
  matureCards: number;
  recentAccuracy: number;
  dueToday: number;
  totalReviews: number;
  averageMatureInterval: number;
}

interface LanguageProgressProps {
  data: LanguageStat[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  "classical-arabic": "#f59e0b",
  "egyptian-arabic": "#8b5cf6",
  "spanish": "#f97316",
  "english": "#64748b",
  "french": "#3b82f6",
  "german": "#ef4444",
  "japanese": "#ec4899",
  "mandarin": "#ef4444",
  "korean": "#14b8a6",
  "turkish": "#f59e0b",
  "quran": "#14b8a6",
};

function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] || "#6366f1";
}

/**
 * Determine skill level based on mature card count and accuracy.
 */
function getLevel(
  matureCards: number,
  accuracy: number
): { label: string; color: string } {
  if (matureCards >= 500 && accuracy >= 0.85) {
    return { label: "Advanced", color: "text-green-500" };
  }
  if (matureCards >= 100 && accuracy >= 0.7) {
    return { label: "Intermediate", color: "text-amber-500" };
  }
  return { label: "Beginner", color: "text-blue-500" };
}

export function LanguageProgress({ data }: LanguageProgressProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">
        No language data available yet. Add cards tagged with a language to see progress.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {data.map((lang, index) => {
        const color = getLanguageColor(lang.language);
        const level = getLevel(lang.matureCards, lang.recentAccuracy);
        const studiedPercent =
          lang.totalCards > 0
            ? Math.round((lang.studiedCards / lang.totalCards) * 100)
            : 0;
        const maturePercent =
          lang.totalCards > 0
            ? Math.round((lang.matureCards / lang.totalCards) * 100)
            : 0;

        // Progress breakdown for stacked bar
        const newCards = lang.totalCards - lang.studiedCards;
        const learningCards = lang.studiedCards - lang.matureCards;

        return (
          <motion.div
            key={lang.language}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            {/* Language header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {lang.displayName}
                </span>
                <span className={`text-[10px] font-semibold ${level.color}`}>
                  {level.label}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {lang.totalCards} cards
                </span>
                {lang.dueToday > 0 && (
                  <span className="text-[11px] font-medium text-amber-500">
                    {lang.dueToday} due
                  </span>
                )}
              </div>
            </div>

            {/* Stacked progress bar */}
            <div className="h-3 bg-[var(--surface-2)] rounded-full overflow-hidden flex">
              {lang.matureCards > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${maturePercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
                  className="h-full rounded-l-full"
                  style={{ backgroundColor: color, opacity: 1 }}
                  title={`Mature: ${lang.matureCards} (${maturePercent}%)`}
                />
              )}
              {learningCards > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.round((learningCards / lang.totalCards) * 100)}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 + 0.1 }}
                  className="h-full"
                  style={{ backgroundColor: color, opacity: 0.4 }}
                  title={`Learning: ${learningCards}`}
                />
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-1.5">
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Studied: {studiedPercent}%
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Mature: {maturePercent}%
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Accuracy:{" "}
                {lang.recentAccuracy > 0
                  ? `${(lang.recentAccuracy * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Avg interval:{" "}
                {lang.averageMatureInterval > 0
                  ? `${Math.round(lang.averageMatureInterval)}d`
                  : "N/A"}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
