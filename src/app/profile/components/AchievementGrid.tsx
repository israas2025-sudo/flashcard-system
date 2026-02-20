"use client";

/**
 * AchievementGrid -- Display grid for user achievements.
 *
 * Renders a filterable grid of achievement badges with three visual states:
 * - Earned: full color, icon, name, and date earned
 * - Known unearned: name visible with locked icon and progress bar
 * - Hidden unearned: "?" mystery badge with no details
 *
 * Layout: 4 columns on desktop, 2 on mobile.
 * Tapping a badge shows full details in a modal overlay.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, HelpCircle, Trophy, X, Filter } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AchievementWithStatus {
  definition: {
    id: string;
    name: string;
    description: string;
    icon: string;
    hidden: boolean;
  };
  earned: boolean;
  earnedAt: string | null;
  progress: number;
}

type AchievementFilter = "all" | "earned" | "locked";

interface AchievementGridProps {
  achievements: AchievementWithStatus[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const [filter, setFilter] = useState<AchievementFilter>("all");
  const [selectedAchievement, setSelectedAchievement] =
    useState<AchievementWithStatus | null>(null);

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    switch (filter) {
      case "earned":
        return achievements.filter((a) => a.earned);
      case "locked":
        return achievements.filter((a) => !a.earned);
      default:
        return achievements;
    }
  }, [achievements, filter]);

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalCount = achievements.length;

  // -------------------------------------------------------------------------
  // Date Formatter
  // -------------------------------------------------------------------------

  const formatEarnedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // -------------------------------------------------------------------------
  // Filter Buttons
  // -------------------------------------------------------------------------

  const filters: { key: AchievementFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalCount },
    { key: "earned", label: "Earned", count: earnedCount },
    { key: "locked", label: "Locked", count: totalCount - earnedCount },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <Card variant="default">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Achievements
              <Badge variant="primary" size="sm">
                {earnedCount}/{totalCount}
              </Badge>
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                  ${
                    filter === f.key
                      ? "bg-primary-500 text-white"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
                  }
                `}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                No achievements match this filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((achievement, index) => (
                  <AchievementBadgeCard
                    key={achievement.definition.id}
                    achievement={achievement}
                    index={index}
                    onClick={() => setSelectedAchievement(achievement)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <AchievementDetailModal
            achievement={selectedAchievement}
            onClose={() => setSelectedAchievement(null)}
            formatDate={formatEarnedDate}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Achievement Badge Card
// ---------------------------------------------------------------------------

function AchievementBadgeCard({
  achievement,
  index,
  onClick,
}: {
  achievement: AchievementWithStatus;
  index: number;
  onClick: () => void;
}) {
  const { definition, earned, earnedAt, progress } = achievement;
  const isHiddenLocked = !earned && definition.hidden;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-2 p-4 rounded-xl border
        transition-colors text-center cursor-pointer
        ${
          earned
            ? "bg-[var(--surface-1)] border-primary-200 dark:border-primary-800 shadow-sm"
            : "bg-[var(--surface-0)] border-[var(--surface-3)] opacity-70 hover:opacity-100"
        }
      `}
    >
      {/* Icon */}
      <div
        className={`
          w-12 h-12 rounded-full flex items-center justify-center text-2xl
          ${
            earned
              ? "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40"
              : isHiddenLocked
                ? "bg-[var(--surface-3)]"
                : "bg-[var(--surface-2)] grayscale"
          }
        `}
      >
        {isHiddenLocked ? (
          <HelpCircle className="w-6 h-6 text-[var(--text-tertiary)]" />
        ) : earned ? (
          <span>{definition.icon}</span>
        ) : (
          <div className="relative">
            <span className="opacity-30">{definition.icon}</span>
            <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute -bottom-0.5 -right-0.5" />
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className={`text-xs font-medium leading-tight ${
          earned
            ? "text-[var(--text-primary)]"
            : "text-[var(--text-tertiary)]"
        }`}
      >
        {isHiddenLocked ? "???" : definition.name}
      </span>

      {/* Earned Date or Progress */}
      {earned && earnedAt ? (
        <span className="text-[10px] text-primary-500 font-medium">
          Earned{" "}
          {new Date(earnedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ) : !isHiddenLocked && progress > 0 && progress < 1 ? (
        <div className="w-full mt-1">
          <div className="h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <motion.div
              className="h-full bg-primary-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.5, delay: index * 0.03 }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            {Math.round(progress * 100)}%
          </span>
        </div>
      ) : null}

      {/* Earned checkmark */}
      {earned && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Achievement Detail Modal
// ---------------------------------------------------------------------------

function AchievementDetailModal({
  achievement,
  onClose,
  formatDate,
}: {
  achievement: AchievementWithStatus;
  onClose: () => void;
  formatDate: (d: string) => string;
}) {
  const { definition, earned, earnedAt, progress } = achievement;
  const isHiddenLocked = !earned && definition.hidden;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="w-full max-w-sm bg-[var(--surface-0)] rounded-2xl border border-[var(--surface-3)] shadow-elevated overflow-hidden"
      >
        {/* Header with gradient */}
        <div
          className={`relative p-6 pb-8 text-center ${
            earned
              ? "bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-950/20"
              : "bg-gradient-to-b from-[var(--surface-2)] to-transparent"
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>

          {/* Large icon */}
          <div
            className={`
              w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl
              ${
                earned
                  ? "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 shadow-lg"
                  : isHiddenLocked
                    ? "bg-[var(--surface-3)]"
                    : "bg-[var(--surface-2)]"
              }
            `}
          >
            {isHiddenLocked ? (
              <HelpCircle className="w-10 h-10 text-[var(--text-tertiary)]" />
            ) : earned ? (
              <span>{definition.icon}</span>
            ) : (
              <div className="relative">
                <span className="opacity-30 text-3xl">{definition.icon}</span>
                <Lock className="w-5 h-5 text-[var(--text-tertiary)] absolute -bottom-1 -right-1" />
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            {isHiddenLocked ? "Hidden Achievement" : definition.name}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-[var(--text-secondary)] text-center">
            {isHiddenLocked
              ? "Keep studying to discover this hidden achievement!"
              : definition.description}
          </p>

          {/* Status */}
          {earned && earnedAt ? (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Earned on {formatDate(earnedAt)}
              </span>
            </div>
          ) : !isHiddenLocked ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>Progress</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                <motion.div
                  className="h-full bg-primary-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          ) : null}

          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
