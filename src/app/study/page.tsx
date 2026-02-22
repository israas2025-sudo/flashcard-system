"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Plus, Zap, Sparkles, BookOpen } from "lucide-react";
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
import { LanguageCard } from "@/components/LanguageCard";

const arabicTotal = arabicCards.length + quranAyahCards.length;

const languages = [
  { id: "arabic", name: "Arabic (MSA / Quran)", color: "arabic" as const, cards: arabicTotal, due: 52, reviewed: 31, accuracy: 88 },
  { id: "egyptian", name: "Egyptian Arabic", color: "egyptian" as const, cards: egyptianCards.length, due: 25, reviewed: 8, accuracy: 91 },
  { id: "spanish", name: "Spanish", color: "spanish" as const, cards: spanishCards.length, due: 35, reviewed: 18, accuracy: 94 },
];

/* Preset accent colors mapped to ACTUAL built-in preset IDs */
const presetColors: Record<string, { color: string; end: string }> = {
  "bi-review-due": { color: "#635BFF", end: "#7C3AED" },
  "bi-quran-daily": { color: "#14B8A6", end: "#0EA5E9" },
  "bi-new-vocab": { color: "#F59E0B", end: "#FF6B2C" },
  "bi-egyptian-basics": { color: "#8B5CF6", end: "#6366F1" },
  "bi-spanish-daily": { color: "#F97316", end: "#EF4444" },
  "bi-top100": { color: "#3B82F6", end: "#0EA5E9" },
};

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.165, 0.84, 0.44, 1] },
  },
};

export default function StudyLauncher() {
  const totalCards = allStudyCards.length;
  const totalDue = languages.reduce((s, l) => s + l.due, 0);
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

  const handleHeroMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center gap-3">
          <h1
            className="text-[32px] font-bold page-header-gradient"
            style={{ letterSpacing: "-0.03em" }}
          >
            Study
          </h1>
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#635BFF" }} />
          </motion.div>
        </div>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1.5">
          Choose a deck or preset to begin your session
        </p>
      </motion.div>

      {/* ---- Hero CTA -- Stripe gradient mesh ---- */}
      <motion.div variants={fadeUp} className="mb-10">
        <Link href="/study/all">
          <div
            className="hero-gradient cursor-pointer btn-spring"
            style={{
              padding: "36px 40px",
              transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            onMouseMove={handleHeroMouse}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.015)";
              e.currentTarget.style.boxShadow = "0 8px 40px rgba(99, 91, 255, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="hero-blob hero-blob-1" />
            <div className="hero-blob hero-blob-2" />
            <div className="hero-blob hero-blob-3" />
            <div className="hero-blob hero-blob-4" />

            {/* Cursor-tracking glow */}
            <div
              className="absolute inset-0 pointer-events-none z-[5]"
              style={{
                background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.04), transparent 40%)`,
              }}
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 4px 24px rgba(99, 91, 255, 0.3)",
                  }}
                >
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
                <div>
                  <p className="text-[24px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
                    Start Study Session
                  </p>
                  <p className="text-[15px] text-white/50 mt-1">
                    {totalDue} cards due &middot; {totalCards.toLocaleString()} total cards
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-white/70 text-[13px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  All Due Cards
                </div>
                <ArrowRight className="w-6 h-6 text-white/40" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ---- Section Divider ---- */}
      <motion.div variants={fadeUp} className="mb-8">
        <div
          className="h-px w-full"
          style={{
            background: "linear-gradient(90deg, transparent, var(--surface-3) 20%, var(--surface-3) 80%, transparent)",
          }}
        />
      </motion.div>

      {/* ---- Languages ---- */}
      <motion.div variants={fadeUp} className="mb-10">
        <div className="flex items-center gap-2.5 mb-6">
          <BookOpen className="w-4.5 h-4.5 text-[var(--text-tertiary)]" />
          <h2
            className="text-[17px] font-semibold text-[var(--text-primary)]"
            style={{ letterSpacing: "-0.01em" }}
          >
            Choose a Language
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {languages.map((lang, i) => (
            <LanguageCard
              key={lang.id}
              index={i}
              language={{
                id: lang.id,
                name: lang.name,
                color: lang.color,
                dueCount: lang.due,
                totalCards: lang.cards,
                reviewedToday: lang.reviewed,
                accuracy: lang.accuracy,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* ---- Section Divider ---- */}
      <motion.div variants={fadeUp} className="mb-8">
        <div
          className="h-px w-full"
          style={{
            background: "linear-gradient(90deg, transparent, var(--surface-3) 20%, var(--surface-3) 80%, transparent)",
          }}
        />
      </motion.div>

      {/* ---- Saved Presets ---- */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4.5 h-4.5 text-[var(--text-tertiary)]" />
            <h2
              className="text-[17px] font-semibold text-[var(--text-primary)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Saved Presets
            </h2>
          </div>
          <Link
            href="/study-presets"
            className="text-[13px] font-medium hover:opacity-80 transition-opacity"
            style={{ color: "#635BFF" }}
          >
            Manage presets
          </Link>
        </div>

        {!loaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[84px] rounded-xl shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((preset, i) => {
              const accent = presetColors[preset.id] || { color: "#635BFF", end: "#7C3AED" };
              return (
                <Link key={preset.id} href={`/study/all?preset=${preset.id}`}>
                  <motion.div
                    className="preset-card p-5 cursor-pointer"
                    style={{
                      "--accent-color": accent.color,
                      "--accent-end": accent.end,
                      "--glow-color": accent.color,
                    } as React.CSSProperties}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                      e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
                    }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.3 + i * 0.06,
                      duration: 0.45,
                      ease: [0.165, 0.84, 0.44, 1],
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                          {preset.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span
                            className="text-[13px] text-[var(--text-tertiary)]"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {preset.cardCount || "All"} cards
                          </span>
                          {preset.isBuiltIn ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-2)] text-[var(--text-tertiary)]">
                              Built-in
                            </span>
                          ) : (
                            <span
                              className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${accent.color}18`,
                                color: accent.color,
                              }}
                            >
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${accent.color}, ${accent.end})`,
                          boxShadow: `0 4px 14px ${accent.color}35`,
                        }}
                      >
                        <Play className="w-4.5 h-4.5 text-white fill-white" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}

            {/* Create preset CTA */}
            <Link href="/study-presets">
              <motion.div
                className="flex items-center gap-4 p-5 cursor-pointer h-full btn-spring"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "var(--glass-blur)",
                  border: "2px dashed var(--surface-3)",
                  borderRadius: "12px",
                  minHeight: "84px",
                  transition: "border-color 0.3s ease, background 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#635BFF";
                  e.currentTarget.style.background = "rgba(99, 91, 255, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--surface-3)";
                  e.currentTarget.style.background = "var(--glass-bg)";
                }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + presets.length * 0.06, duration: 0.45 }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--surface-3)",
                  }}
                >
                  <Plus className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-secondary)]">
                    Create new preset
                  </p>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                    Customize your study flow
                  </p>
                </div>
              </motion.div>
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
