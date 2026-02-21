"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, ArrowRight, Plus, BookOpen } from "lucide-react";
import {
  type StudyPreset,
  builtInPresets,
  loadPresetsFromStorage,
} from "@/lib/presets";
import {
  allStudyCards,
  arabicCards,
  quranAyahCards,
  spanishCards,
  egyptianCards,
} from "@/lib/cards";

const ACCENT_PATTERNS: { pattern: RegExp; color: string }[] = [
  { pattern: /quran|quranic/i, color: "#14B8A6" },
  { pattern: /arabic|nahw|sarf/i, color: "#F59E0B" },
  { pattern: /spanish|dele|espanol/i, color: "#F97316" },
  { pattern: /egyptian/i, color: "#8B5CF6" },
  { pattern: /english/i, color: "#64748B" },
  { pattern: /vocab|new|learn/i, color: "#6366F1" },
  { pattern: /review|due/i, color: "#EF4444" },
  { pattern: /frequent|top/i, color: "#F43F5E" },
];

function getAccentColor(name: string): string {
  for (const { pattern, color } of ACCENT_PATTERNS) {
    if (pattern.test(name)) return color;
  }
  return "#6366F1";
}

const arabicTotal = arabicCards.length + quranAyahCards.length;

const languages = [
  {
    id: "arabic",
    name: "Arabic (MSA / Quran)",
    cardCount: arabicTotal,
    color: "#F59E0B",
    bgClass: "bg-arabic-50 dark:bg-arabic-950/20",
  },
  {
    id: "egyptian",
    name: "Egyptian Arabic",
    cardCount: egyptianCards.length,
    color: "#8B5CF6",
    bgClass: "bg-egyptian-50 dark:bg-egyptian-950/20",
  },
  {
    id: "spanish",
    name: "Spanish",
    cardCount: spanishCards.length,
    color: "#F97316",
    bgClass: "bg-spanish-50 dark:bg-spanish-950/20",
  },
];

export default function StudyLauncher() {
  const totalCards = allStudyCards.length;
  const [presets, setPresets] = useState<StudyPreset[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const userPresets = loadPresetsFromStorage();
    const all = [...builtInPresets, ...userPresets];
    const seen = new Set<string>();
    const deduped: StudyPreset[] = [];
    for (const p of all) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        deduped.push(p);
      }
    }
    setPresets(deduped);
    setLoaded(true);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Study
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Choose a language or preset to begin
        </p>
      </motion.div>

      {/* Start Session CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href="/study/all">
          <motion.div
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            className="w-full bg-primary-500 text-white rounded-xl py-5 px-6 flex items-center gap-4 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">Start Session</p>
              <p className="text-sm text-white/70 mt-0.5">
                All Due Cards &middot; {totalCards.toLocaleString()} cards across{" "}
                {languages.length} languages
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/60" />
          </motion.div>
        </Link>
      </motion.div>

      {/* Languages */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-[13px] font-medium text-[var(--text-secondary)] mb-4">
          Choose a language
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {languages.map((lang, i) => (
            <motion.div
              key={lang.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
            >
              <Link href={`/study/${lang.id}`}>
                <motion.div
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {lang.name}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        {lang.cardCount.toLocaleString()} cards
                      </p>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${lang.color}15` }}
                    >
                      <BookOpen
                        className="w-5 h-5"
                        style={{ color: lang.color }}
                      />
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Presets */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-[var(--text-secondary)]">
            Saved Presets
          </h2>
          <Link
            href="/study-presets"
            className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            Manage Presets &rarr;
          </Link>
        </div>

        {!loaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[72px] rounded-xl bg-[var(--surface-2)] border border-[var(--surface-3)] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((preset, i) => {
              const accent = getAccentColor(preset.name);
              return (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                >
                  <Link href={`/study/all?preset=${preset.id}`}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer flex items-center gap-3"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {preset.cardCount
                            ? `${preset.cardCount} cards`
                            : "All cards"}
                          {preset.isBuiltIn && " · Built-in"}
                        </p>
                      </div>
                      <Play
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: accent }}
                      />
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + presets.length * 0.04 }}
            >
              <Link href="/study-presets">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="bg-[var(--surface-1)] rounded-xl border border-dashed border-[var(--surface-3)] p-4 cursor-pointer flex items-center gap-3 hover:border-[var(--text-tertiary)] transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--surface-3)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                      Create New Preset
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      Custom study sessions
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
