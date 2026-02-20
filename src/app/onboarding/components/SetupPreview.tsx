"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FolderOpen,
  FileText,
  Tags,
  Layers,
  Check,
  Sparkles,
} from "lucide-react";
import { OnboardingService } from "@/onboarding/onboarding-service";
import type { LanguageId, ProficiencyLevel } from "@/onboarding/onboarding-service";

interface LanguageLevelSelection {
  language: LanguageId;
  level: ProficiencyLevel;
}

interface SetupPreviewProps {
  selections: LanguageLevelSelection[];
  dailyGoal: number;
  studyTimePreference: string;
  loading: boolean;
  onGetStarted: () => void;
}

export function SetupPreview({
  selections,
  dailyGoal,
  studyTimePreference,
  loading,
  onGetStarted,
}: SetupPreviewProps) {
  // Build preview data from the service
  const previewData = selections.map(({ language, level }) => {
    const config = OnboardingService.getLanguageConfig(language);
    const cardCount = OnboardingService.getSampleCardCount(language, level);

    return {
      language,
      level,
      displayName: config?.displayName || language,
      color: config?.color || "#6366f1",
      decks: config?.decks || [],
      noteTypes: config?.noteTypes || [],
      tags: config?.tags || [],
      cardCount,
    };
  });

  const totalDecks = previewData.reduce(
    (sum, p) =>
      sum + p.decks.reduce((s, d) => s + 1 + d.subdecks.length, 0),
    0
  );
  const totalNoteTypes = previewData.reduce((sum, p) => sum + p.noteTypes.length, 0);
  const totalTags = previewData.reduce(
    (sum, p) =>
      sum + p.tags.reduce((s, t) => s + 1 + t.children.length, 0),
    0
  );
  const totalCards = previewData.reduce((sum, p) => sum + p.cardCount, 0);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/30 mb-4"
        >
          <Sparkles className="w-8 h-8 text-primary-500" />
        </motion.div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          Here's what we'll set up for you
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Review your selections before we create everything.
        </p>
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
      >
        <SummaryStat icon={<FolderOpen className="w-4 h-4" />} value={totalDecks} label="Decks" />
        <SummaryStat icon={<FileText className="w-4 h-4" />} value={totalNoteTypes} label="Note Types" />
        <SummaryStat icon={<Tags className="w-4 h-4" />} value={totalTags} label="Tags" />
        <SummaryStat icon={<Layers className="w-4 h-4" />} value={totalCards} label="Sample Cards" />
      </motion.div>

      {/* Language Breakdown */}
      <div className="max-w-2xl mx-auto space-y-4">
        {previewData.map((data, index) => (
          <motion.div
            key={data.language}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: data.color }}
                />
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  {data.displayName}
                </h3>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] capitalize">
                {data.level}
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Decks preview */}
              {data.decks.map((deck) => (
                <div key={deck.name} className="text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <FolderOpen className="w-3 h-3" />
                    <span className="font-medium">{deck.name}</span>
                  </div>
                  <div className="ml-5 mt-1 flex flex-wrap gap-1.5">
                    {deck.subdecks.map((sub) => (
                      <span
                        key={sub}
                        className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-tertiary)] text-[10px]"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Note types preview */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <FileText className="w-3 h-3" />
                <span>
                  {data.noteTypes.length} note type{data.noteTypes.length !== 1 ? "s" : ""}:{" "}
                  <span className="text-[var(--text-tertiary)]">
                    {data.noteTypes.map((nt) => nt.name).join(", ")}
                  </span>
                </span>
              </div>

              {/* Cards preview */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Layers className="w-3 h-3" />
                <span>{data.cardCount} sample cards to get you started</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Settings Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-2xl mx-auto bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5"
      >
        <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">
          Study Settings
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[var(--text-secondary)]">
              {dailyGoal} new cards per day
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[var(--text-secondary)] capitalize">
              {studyTimePreference} study reminders
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[var(--text-secondary)]">
              FSRS-5 scheduling algorithm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[var(--text-secondary)]">
              90% target retention
            </span>
          </div>
        </div>
      </motion.div>

      {/* Get Started Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGetStarted}
          disabled={loading}
          className="btn-gradient text-white rounded-xl py-3.5 px-10 text-sm font-semibold shadow-glow hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Setting up...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Get Started
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Stat Card
// ---------------------------------------------------------------------------

function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-4 text-center">
      <div className="flex items-center justify-center text-[var(--text-tertiary)] mb-1.5">
        {icon}
      </div>
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{label}</p>
    </div>
  );
}
