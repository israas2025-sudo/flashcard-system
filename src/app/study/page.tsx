"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Play, Plus, Zap, Sparkles, BookOpen, Grid3X3 } from "lucide-react";
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
import { TopicGrid } from "@/components/TopicGrid";
import { getTopicsForLanguage } from "@/lib/topics";

const arabicTotal = arabicCards.length + quranAyahCards.length;

const languages = [
  { id: "arabic", name: "Arabic (MSA / Quran)", color: "arabic" as const, cards: arabicTotal, due: 52, reviewed: 31, accuracy: 88 },
  { id: "egyptian", name: "Egyptian Arabic", color: "egyptian" as const, cards: egyptianCards.length, due: 25, reviewed: 8, accuracy: 91 },
  { id: "spanish", name: "Spanish", color: "spanish" as const, cards: spanishCards.length, due: 35, reviewed: 18, accuracy: 94 },
];

const presetColors: Record<string, { color: string; end: string }> = {
  "bi-review-due": { color: "#635BFF", end: "#7C3AED" },
  "bi-quran-daily": { color: "#14B8A6", end: "#0EA5E9" },
  "bi-new-vocab": { color: "#F59E0B", end: "#FF6B2C" },
  "bi-egyptian-basics": { color: "#8B5CF6", end: "#6366F1" },
  "bi-spanish-daily": { color: "#F97316", end: "#EF4444" },
  "bi-top100": { color: "#3B82F6", end: "#0EA5E9" },
};

function PresetVisual({ presetId }: { presetId: string }) {
  switch (presetId) {
    case "bi-review-due":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          {[6, 11, 16, 9, 14].map((h, i) => (
            <motion.rect key={i} x={i * 3.6} width="2.5" rx="1" fill={`rgba(255,255,255,${0.4 + i * 0.12})`}
              initial={{ height: 0, y: 18 }} animate={{ height: h, y: 18 - h }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: [0.165, 0.84, 0.44, 1] }} />
          ))}
        </svg>
      );
    case "bi-quran-daily":
      return (
        <motion.svg width="18" height="18" viewBox="0 0 18 18"
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M12 2C8 2 5 5 5 9s3 7 7 7c-2.5 0-5-2-5-5s2-5 5-5c-.5-1.5-1-3-2-4h2z"
            fill="white" opacity="0.85" />
          <circle cx="13" cy="5" r="1" fill="white" opacity="0.5" />
        </motion.svg>
      );
    case "bi-new-vocab":
      return (
        <motion.svg width="18" height="18" viewBox="0 0 18 18"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M9 1l1.5 5.5L16 9l-5.5 1.5L9 16l-1.5-5.5L2 9l5.5-1.5z" fill="white" opacity="0.85" />
          <path d="M14 2l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z" fill="white" opacity="0.5" />
        </motion.svg>
      );
    case "bi-egyptian-basics":
      return (
        <motion.svg width="18" height="18" viewBox="0 0 18 18"
          animate={{ y: [0, -1.5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M9 2L16 16H2z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.8" />
          <motion.path d="M9 2L16 16H2z" fill="white" opacity="0.15"
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
        </motion.svg>
      );
    case "bi-spanish-daily":
      return (
        <motion.svg width="18" height="18" viewBox="0 0 18 18"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
          <circle cx="9" cy="9" r="4" fill="white" opacity="0.8" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <motion.line key={i} x1="9" y1="2" x2="9" y2="4" stroke="white" strokeWidth="1.2" strokeLinecap="round"
              opacity={0.5 + (i % 2) * 0.2} transform={`rotate(${deg} 9 9)`} />
          ))}
        </motion.svg>
      );
    case "bi-top100":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <motion.path d="M1 14L4 10L7 12L10 5L13 8L16 3" fill="none" stroke="white" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }} />
        </svg>
      );
    default:
      return (
        <>
          <motion.div className="absolute rounded"
            style={{ width: 14, height: 18, background: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.15)" }}
            animate={{ rotate: [-10, -5, -10], x: [-3, -2, -3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute rounded"
            style={{ width: 14, height: 18, background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.3)" }}
            animate={{ rotate: [5, 9, 5], x: [3, 2, 3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} />
        </>
      );
  }
}

function FloatingAccentDots() {
  return (
    <div className="relative h-6 overflow-hidden my-1 pointer-events-none">
      {[
        { color: "#635BFF", x: "12%", size: 4, dur: 3 },
        { color: "#FF0080", x: "32%", size: 3, dur: 3.5 },
        { color: "#00D4FF", x: "52%", size: 5, dur: 4 },
        { color: "#FFB800", x: "72%", size: 3.5, dur: 3.2 },
        { color: "#14B8A6", x: "90%", size: 4, dur: 3.8 },
      ].map((p, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: p.color, left: p.x, top: "50%" }}
          animate={{ y: [0, -8, 0], opacity: [0.2, 0.55, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }} />
      ))}
    </div>
  );
}

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

// ============================================================================
// Topic Selection View — shown when ?lang=X is present
// ============================================================================

function TopicSelectionView({ langId }: { langId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const lang = languages.find((l) => l.id === langId);
  const topics = getTopicsForLanguage(langId);
  const langCards = allStudyCards.filter((c) => {
    if (langId === "arabic") return c.language === "arabic";
    return c.language === langId;
  });

  const langColorMap: Record<string, string> = {
    arabic: "#F59E0B",
    egyptian: "#8B5CF6",
    spanish: "#F97316",
  };
  const accent = langColorMap[langId] || "#635BFF";

  return (
    <motion.div variants={stagger} initial={mounted ? "hidden" : false} animate="show">
      {/* Back + Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <Link
          href="/study"
          className="inline-flex items-center gap-2 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Study
        </Link>
        <div className="flex items-center gap-3">
          <h1
            className="text-[28px] font-bold page-header-gradient"
            style={{ letterSpacing: "-0.03em" }}
          >
            {lang?.name || langId}
          </h1>
          <motion.div
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: accent }} />
          </motion.div>
        </div>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1.5">
          {langCards.length.toLocaleString()} cards available &middot; Choose a topic to study
        </p>
      </motion.div>

      {/* Review All CTA */}
      <motion.div variants={fadeUp} className="mb-8">
        <Link href={`/study/${langId}`}>
          <div
            className="hero-gradient cursor-pointer btn-spring"
            style={{ padding: "24px 32px" }}
          >
            <div className="hero-blob hero-blob-1" />
            <div className="hero-blob hero-blob-2" />
            <div className="hero-blob hero-blob-3" />
            <div className="hero-particle hero-particle-1" />
            <div className="hero-particle hero-particle-2" />
            <div className="hero-particle hero-particle-3" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Play className="w-6 h-6 text-white fill-white" />
                </motion.div>
                <div>
                  <p className="text-[20px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
                    Review All {lang?.name || langId}
                  </p>
                  <p className="text-[13px] text-white/50 mt-0.5">
                    {lang?.due || 0} cards due &middot; {langCards.length} total
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white/40" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Divider */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(99,91,255,0.3), rgba(255,0,128,0.2), transparent)" }} />
        <FloatingAccentDots />
      </motion.div>

      {/* Topic Grid */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2.5 mb-5">
          <Grid3X3 className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-[17px] font-semibold page-header-gradient" style={{ letterSpacing: "-0.01em" }}>
            Topics
          </h2>
          <span className="text-[12px] text-[var(--text-tertiary)]">
            {topics.length} available
          </span>
        </div>
        <TopicGrid languageId={langId} topics={topics} allCards={allStudyCards} />
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Default Study View — languages + presets
// ============================================================================

function DefaultStudyView() {
  const totalCards = allStudyCards.length;
  const totalDue = languages.reduce((s, l) => s + l.due, 0);
  const [presets, setPresets] = useState<StudyPreset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    <motion.div variants={stagger} initial={mounted ? "hidden" : false} animate="show">
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
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#FF0080" }} />
          </motion.div>
        </div>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1.5">
          Choose a language or preset to begin your session
        </p>
      </motion.div>

      {/* Hero CTA */}
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
            <div className="hero-particle hero-particle-1" />
            <div className="hero-particle hero-particle-2" />
            <div className="hero-particle hero-particle-3" />
            <div className="hero-particle hero-particle-4" />
            <div className="hero-particle hero-particle-5" />
            <div
              className="absolute inset-0 pointer-events-none z-[5]"
              style={{
                background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.04), transparent 40%)`,
              }}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <motion.div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 4px 24px rgba(99, 91, 255, 0.3)",
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Play className="w-8 h-8 text-white fill-white" />
                </motion.div>
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

      {/* Divider */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(99,91,255,0.3), rgba(255,0,128,0.2), transparent)" }} />
        <FloatingAccentDots />
      </motion.div>

      {/* Languages */}
      <motion.div variants={fadeUp} className="mb-10">
        <div className="flex items-center gap-2.5 mb-6">
          <BookOpen className="w-4.5 h-4.5 text-[var(--text-tertiary)]" />
          <h2 className="text-[17px] font-semibold page-header-gradient" style={{ letterSpacing: "-0.01em" }}>
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

      {/* Divider */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(99,91,255,0.3), rgba(255,0,128,0.2), transparent)" }} />
        <FloatingAccentDots />
      </motion.div>

      {/* Saved Presets */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4.5 h-4.5 text-[var(--text-tertiary)]" />
            <h2 className="text-[17px] font-semibold page-header-gradient" style={{ letterSpacing: "-0.01em" }}>
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
                      animationDelay: `${-i * 1.5}s`,
                    } as React.CSSProperties}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                      e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
                    }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.45, ease: [0.165, 0.84, 0.44, 1] }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                          {preset.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[13px] text-[var(--text-tertiary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {preset.cardCount || "All"} cards
                          </span>
                          {preset.isBuiltIn ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-2)] text-[var(--text-tertiary)]">
                              Built-in
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{ backgroundColor: `${accent.color}18`, color: accent.color }}>
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                      <motion.div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${accent.color}, ${accent.end})`,
                          boxShadow: `0 4px 14px ${accent.color}35`,
                        }}
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                      >
                        <PresetVisual presetId={preset.id} />
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}

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
                  style={{ background: "var(--surface-2)", border: "1px solid var(--surface-3)" }}
                >
                  <Plus className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-secondary)]">Create new preset</p>
                  <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">Customize your study flow</p>
                </div>
              </motion.div>
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Main Study Page — routes between default and topic selection
// ============================================================================

function StudyContent() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");

  if (langParam) {
    return <TopicSelectionView langId={langParam} />;
  }

  return <DefaultStudyView />;
}

export default function StudyLauncher() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-5rem)]"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <StudyContent />
    </Suspense>
  );
}
