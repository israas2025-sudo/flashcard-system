"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  ListChecks,
  Headphones,
  PenLine,
  Zap,
  MessageCircle,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { STUDY_MODES, StudyMode, type StudyModeInfo } from "@/study-modes/types";

// Map icon string names to Lucide components
const iconMap: Record<string, React.ElementType> = {
  Layers,
  ListChecks,
  Headphones,
  PenLine,
  Zap,
  MessageCircle,
};

// Route map for each study mode
const modeRoutes: Record<StudyMode, string> = {
  [StudyMode.StandardReview]: "/study/all",
  [StudyMode.Quiz]: "/study/modes/quiz",
  [StudyMode.Listening]: "/study/modes/listening",
  [StudyMode.Writing]: "/study/modes/writing",
  [StudyMode.SpeedRound]: "/study/modes/speed",
  [StudyMode.Conversation]: "/study/modes/conversation",
};

function ModeCard({
  mode,
  index,
  onSelect,
}: {
  mode: StudyModeInfo;
  index: number;
  onSelect: (mode: StudyModeInfo) => void;
}) {
  const Icon = iconMap[mode.icon] || Layers;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(mode)}
      className={`
        relative flex flex-col items-start text-left p-6 rounded-2xl
        bg-[var(--surface-1)] border border-[var(--surface-3)]
        hover:border-[var(--surface-3)] hover:bg-[var(--surface-0)]
        shadow-card transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        group cursor-pointer
      `}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${mode.accentBg} flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${mode.accentColor}`} />
      </div>

      {/* Name and shortcut */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {mode.name}
        </h3>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-tertiary)]">
          {mode.shortcut}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
        {mode.description}
      </p>

      {/* Recommended use */}
      <div className="mt-auto pt-3 border-t border-[var(--surface-3)] w-full">
        <p className="text-xs text-[var(--text-tertiary)]">
          <span className="font-medium">Best for:</span> {mode.recommendedUse}
        </p>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
      </div>
    </motion.button>
  );
}

export default function StudyModesPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<StudyModeInfo | null>(null);

  const handleSelectMode = useCallback(
    (mode: StudyModeInfo) => {
      setSelectedMode(mode);
      router.push(modeRoutes[mode.id]);
    },
    [router]
  );

  // Keyboard shortcuts: press 1-6 to enter a mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const modeIndex = parseInt(e.key, 10) - 1;
      if (modeIndex >= 0 && modeIndex < STUDY_MODES.length) {
        e.preventDefault();
        handleSelectMode(STUDY_MODES[modeIndex]);
      }

      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelectMode, router]);

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Study Modes
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Choose how you want to study. Press 1-6 or click a mode to begin.
            </p>
          </div>
        </motion.div>

        {/* Mode grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STUDY_MODES.map((mode, index) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              index={index}
              onSelect={handleSelectMode}
            />
          ))}
        </div>

        {/* Keyboard hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-[var(--text-tertiary)]">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
              Esc
            </kbd>{" "}
            to go back to dashboard
          </p>
        </motion.div>
      </div>
    </div>
  );
}
