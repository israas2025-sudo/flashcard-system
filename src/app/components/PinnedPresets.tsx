"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Play, Star, Sparkles } from "lucide-react";
import {
  type StudyPreset,
  builtInPresets,
  loadPresetsFromStorage,
} from "@/lib/presets";

// ---------------------------------------------------------------------------
// Accent color mapping
// ---------------------------------------------------------------------------

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
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

// ---------------------------------------------------------------------------
// Pinned Preset Card
// ---------------------------------------------------------------------------

function PinnedPresetCard({
  preset,
  index,
}: {
  preset: StudyPreset;
  index: number;
}) {
  const accentColor = getAccentColor(preset.name);
  const dueCount = preset.cardCount ?? 0;

  return (
    <Link href={`/study/all?preset=${preset.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex-shrink-0 w-[220px] bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-4 cursor-pointer shadow-card hover:shadow-card-hover transition-shadow"
      >
        {/* Header with accent dot and name */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {preset.name}
          </span>
        </div>

        {/* Card count and action */}
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-2xl font-bold"
              style={{ color: dueCount > 0 ? accentColor : "var(--text-tertiary)" }}
            >
              {dueCount || "All"}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              {dueCount ? `${dueCount === 1 ? "card" : "cards"} per session` : "cards included"}
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Play className="w-5 h-5" style={{ color: accentColor }} />
          </motion.div>
        </div>

        {/* State filter indicators */}
        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[var(--surface-3)]">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-[10px] text-[var(--text-tertiary)]">Pinned</span>
          <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">
            {[
              preset.stateFilter.includeNew && "New",
              preset.stateFilter.includeReview && "Rev",
              preset.stateFilter.includeLearning && "Learn",
            ]
              .filter(Boolean)
              .join(" / ")}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// PinnedPresets Component (Dashboard Section)
// ---------------------------------------------------------------------------

export function PinnedPresets() {
  const [presets, setPresets] = useState<StudyPreset[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Merge built-in pinned + user pinned presets from localStorage
    const userPresets = loadPresetsFromStorage();
    const pinnedBuiltIn = builtInPresets.filter((p) => p.isPinned);
    const pinnedUser = userPresets.filter((p) => p.isPinned);

    const seen = new Set<string>();
    const merged: StudyPreset[] = [];
    for (const p of [...pinnedBuiltIn, ...pinnedUser]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }

    setPresets(merged);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div>
        <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-500" />
          Quick Study
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[220px] h-[130px] rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (presets.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-500" />
          Quick Study
        </h2>
        <Link
          href="/study-presets"
          className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
        >
          Manage presets
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {presets.map((preset, i) => (
          <PinnedPresetCard key={preset.id} preset={preset} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
