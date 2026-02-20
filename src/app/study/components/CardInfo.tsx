"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  RotateCcw,
  Clock,
  Brain,
  BarChart3,
  AlertTriangle,
  Tag,
  ChevronUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { CardInfoData, ReviewHistoryEntry } from "@/study-modes/types";
import { Rating } from "@/scheduling/types";

interface CardInfoProps {
  data: CardInfoData;
  isOpen: boolean;
  onClose: () => void;
}

const ratingColors: Record<Rating, string> = {
  [Rating.Again]: "bg-red-400",
  [Rating.Hard]: "bg-amber-400",
  [Rating.Good]: "bg-primary-400",
  [Rating.Easy]: "bg-green-400",
};

const ratingLabels: Record<Rating, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatInterval(days: number): string {
  if (days < 1) {
    const minutes = Math.round(days * 24 * 60);
    return `${minutes}m`;
  }
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

function MiniTimeline({ history }: { history: ReviewHistoryEntry[] }) {
  const recent = history.slice(-12); // Show last 12 reviews

  if (recent.length === 0) {
    return (
      <p className="text-xs text-[var(--text-tertiary)] italic">No reviews yet</p>
    );
  }

  return (
    <div className="flex items-end gap-1">
      {recent.map((entry, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            className={`w-3 h-3 rounded-full ${ratingColors[entry.rating]} opacity-80`}
            title={`${ratingLabels[entry.rating]} - ${formatDate(entry.date)} (${formatInterval(entry.intervalAfter)})`}
          />
          {/* Interval bar */}
          <div
            className="w-2 rounded-sm bg-[var(--surface-3)]"
            style={{
              height: `${Math.min(Math.max(entry.intervalAfter * 0.5, 2), 24)}px`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function CardInfo({ data, isOpen, onClose }: CardInfoProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />

          {/* Panel sliding up from bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-0)] rounded-t-2xl shadow-elevated border-t border-[var(--surface-3)] max-h-[70vh] overflow-y-auto"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--surface-3)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Card Details
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Close card info"
              >
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>

            {/* Info grid */}
            <div className="px-6 pb-6 space-y-5">
              {/* Top stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--surface-1)]">
                  <Calendar className="w-4 h-4 text-[var(--text-tertiary)] mb-1" />
                  <span className="text-xs text-[var(--text-tertiary)]">Created</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {formatDate(data.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--surface-1)]">
                  <RotateCcw className="w-4 h-4 text-[var(--text-tertiary)] mb-1" />
                  <span className="text-xs text-[var(--text-tertiary)]">Reviews</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {data.totalReviews}
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--surface-1)]">
                  <Clock className="w-4 h-4 text-[var(--text-tertiary)] mb-1" />
                  <span className="text-xs text-[var(--text-tertiary)]">Interval</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
                    {formatInterval(data.currentInterval)}
                  </span>
                </div>
              </div>

              {/* FSRS stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)]">
                  <Brain className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[var(--text-tertiary)] block">
                      Stability
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {data.stability.toFixed(1)}d
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)]">
                  <BarChart3 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[var(--text-tertiary)] block">
                      Difficulty
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {data.difficulty.toFixed(1)} / 10
                    </span>
                  </div>
                </div>
              </div>

              {/* Lapses */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)]">
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 ${
                    data.lapsesCount > 3 ? "text-red-400" : "text-[var(--text-tertiary)]"
                  }`}
                />
                <div>
                  <span className="text-xs text-[var(--text-tertiary)] block">
                    Lapses
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {data.lapsesCount}
                  </span>
                </div>
                {data.lapsesCount > 5 && (
                  <span className="ml-auto text-[10px] text-red-400 font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30">
                    Leech candidate
                  </span>
                )}
              </div>

              {/* Review history timeline */}
              <div>
                <h4 className="text-xs font-medium text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Review History
                </h4>
                <MiniTimeline history={data.reviewHistory} />
                {/* Legend */}
                <div className="flex items-center gap-3 mt-2">
                  {Object.entries(ratingLabels).map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                      <span className={`w-2 h-2 rounded-full ${ratingColors[Number(key) as Rating]}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {data.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
