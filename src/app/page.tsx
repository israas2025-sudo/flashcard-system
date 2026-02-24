"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import PathwayScene from "@/components/pathway/PathwayScene";
import {
  ArrowRight,
  Flame,
  BookOpen,
  Zap,
  Sparkles,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { LanguageCard } from "@/components/LanguageCard";
import { useUserPreferencesStore } from "@/store/user-preferences-store";
import { useReviewStore } from "@/store/review-store";
import { usePathwayStore } from "@/store/pathway-store";
import { LANGUAGE_DISPLAY, LANGUAGE_CARD_COUNTS } from "@/lib/language-stats";
import SectionDetailPanel from "@/components/pathway/SectionDetailPanel";
import type { PathwaySection } from "@/types/pathway";
import type { LanguageId } from "@/store/user-preferences-store";

// Dynamic import for AI Chat
const AIChat = dynamic(() => import("@/components/pathway/AIChat"), {
  ssr: false,
});

// ============================================================================
// Animated Mini-Visualizations
// ============================================================================

function MiniCardStack() {
  return (
    <div className="relative" style={{ width: 28, height: 28 }}>
      <motion.div
        className="absolute rounded"
        style={{
          width: 16, height: 20,
          background: "rgba(255,255,255,0.3)",
          border: "1px solid rgba(255,255,255,0.15)",
          top: 4, left: 0,
        }}
        animate={{ rotate: [-12, -6, -12], x: [0, -1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded"
        style={{
          width: 16, height: 20,
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.25)",
          top: 2, left: 6,
        }}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded"
        style={{
          width: 16, height: 20,
          background: "rgba(255,255,255,0.8)",
          border: "1px solid rgba(255,255,255,0.35)",
          top: 0, left: 12,
        }}
        animate={{ rotate: [5, 10, 5], x: [0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function MiniRing({ pct }: { pct: number }) {
  const r = 11;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r={r} stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" />
      <motion.circle
        cx="14" cy="14" r={r}
        stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        transform="rotate(-90 14 14)"
      />
    </svg>
  );
}

function MiniFlameVis() {
  return (
    <motion.svg
      width="20" height="26" viewBox="0 0 20 26"
      animate={{ scale: [1, 1.12, 1], y: [0, -1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M10 2 C10 2 3 10 3 17 C3 22 6 25 10 25 C14 25 17 22 17 17 C17 10 10 2 10 2Z" fill="white" opacity="0.9" />
      <path d="M10 10 C10 10 7 15 7 19 C7 21 8 23 10 23 C12 23 13 21 13 19 C13 15 10 10 10 10Z" fill="white" opacity="0.45" />
    </motion.svg>
  );
}

function MiniBarChart() {
  const heights = [12, 18, 24, 15, 28];
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      {heights.map((h, i) => (
        <motion.rect
          key={i} x={i * 5.6} width="4" rx="1.5"
          fill={`rgba(255,255,255,${0.4 + i * 0.12})`}
          initial={{ height: 0, y: 28 }}
          animate={{ height: h, y: 28 - h }}
          transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.165, 0.84, 0.44, 1] }}
        />
      ))}
    </svg>
  );
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(value);
  ref.current = value;
  useEffect(() => {
    const duration = 1400;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * ref.current));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// ============================================================================
// Animation variants
// ============================================================================

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.165, 0.84, 0.44, 1] } },
};

// ============================================================================
// Dashboard
// ============================================================================

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<LanguageId | null>(null);
  const [selectedSection, setSelectedSection] = useState<PathwaySection | null>(null);
  const [showChat, setShowChat] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  // Stores
  const userLanguages = useUserPreferencesStore((s) => s.languages);
  const intention = useUserPreferencesStore((s) => s.intention);
  const stage = useUserPreferencesStore((s) => s.stage);
  const dailyTimeMinutes = useUserPreferencesStore((s) => s.dailyTimeMinutes);
  const reviewStore = useReviewStore();
  const pathways = usePathwayStore((s) => s.pathways);
  const introPlayed = usePathwayStore((s) => s.introPlayed);
  const setIntroPlayed = usePathwayStore((s) => s.setIntroPlayed);

  // Set default active language
  useEffect(() => {
    if (!activeLanguage && userLanguages.length > 0) {
      setActiveLanguage(userLanguages[0].id);
    }
  }, [activeLanguage, userLanguages]);

  // Build languages data
  const languages = useMemo(
    () =>
      userLanguages.map((lang) => {
        const display = LANGUAGE_DISPLAY[lang.id];
        const cardCount = LANGUAGE_CARD_COUNTS[lang.id];
        const langStats = reviewStore.getLanguageStats(
          lang.id === "quran" ? "arabic" : lang.id
        );
        const todayReviews = reviewStore.getTodayLanguageReviews(
          lang.id === "quran" ? "arabic" : lang.id
        );
        return {
          id: lang.id,
          name: display.name,
          color: display.color,
          cards: cardCount,
          due: lang.dailyCards,
          reviewed: todayReviews,
          accuracy: langStats.accuracy,
        };
      }),
    [userLanguages, reviewStore]
  );

  const totalCards = languages.reduce((s, l) => s + l.cards, 0);
  const totalDue = languages.reduce((s, l) => s + l.due, 0);
  const totalReviewed = languages.reduce((s, l) => s + l.reviewed, 0);
  const todayAccuracy = reviewStore.getTodayAccuracy();
  const streakDays = reviewStore.streakDays;
  const weekTotal = reviewStore.getWeekTotal();

  // Current pathway
  const currentPathway = activeLanguage ? pathways[activeLanguage] : null;
  const hasAnyPathway = Object.keys(pathways).length > 0;
  const accentColor = activeLanguage
    ? LANGUAGE_DISPLAY[activeLanguage]?.accent || "#635BFF"
    : "#635BFF";

  const handleSelectSection = useCallback((section: PathwaySection) => {
    setSelectedSection(section);
  }, []);

  const handleStartStudy = useCallback(
    (section: PathwaySection) => {
      router.push(
        `/study?section=${section.id}&lang=${section.languageId}`
      );
    },
    [router]
  );

  const handleTakeBenchmark = useCallback(
    (section: PathwaySection) => {
      router.push(
        `/study?benchmark=${section.id}&lang=${section.languageId}`
      );
    },
    [router]
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const metrics = [
    { label: "Cards Due", numValue: totalDue, suffix: "", visual: <MiniCardStack />, color: "#635BFF" },
    { label: "Accuracy", numValue: todayAccuracy, suffix: "%", visual: <MiniRing pct={todayAccuracy} />, color: "#0CBF4C" },
    { label: "Day Streak", numValue: streakDays, suffix: " days", visual: <MiniFlameVis />, color: "#FF6B2C" },
    { label: "Total Cards", numValue: totalCards, suffix: "", visual: <MiniBarChart />, color: "#14B8A6" },
  ];

  return (
    <motion.div variants={stagger} initial={mounted ? "hidden" : false} animate="show">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2D PATHWAY SCENE (when pathway exists)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {hasAnyPathway && activeLanguage && currentPathway && (
        <motion.div variants={fadeUp} className="mb-6">
          {/* Language tabs */}
          <div className="flex items-center gap-2 mb-4">
            {userLanguages.map((lang) => {
              const display = LANGUAGE_DISPLAY[lang.id];
              const isActive = lang.id === activeLanguage;
              return (
                <button
                  key={lang.id}
                  onClick={() => {
                    setActiveLanguage(lang.id);
                    setSelectedSection(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    border: isActive
                      ? `1px solid ${display.accent}50`
                      : "1px solid rgba(255,255,255,0.06)",
                    background: isActive
                      ? `${display.accent}15`
                      : "rgba(255,255,255,0.03)",
                    color: isActive ? display.accent : "var(--text-tertiary)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {display.name}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              <Sparkles size={12} style={{ color: accentColor }} />
              AI Pathway
            </div>
          </div>

          {/* 2D Pathway Scene container */}
          <div
            style={{
              height: "clamp(320px, 50vh, 550px)",
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(10,15,30,0.5)",
            }}
          >
            <PathwayScene
              languageId={activeLanguage}
              sections={currentPathway.sections}
              introMode={!introPlayed}
              onSelectSection={handleSelectSection}
            />

            {/* Section detail panel (slides in from right) */}
            <SectionDetailPanel
              section={selectedSection}
              onClose={() => setSelectedSection(null)}
              onStartStudy={handleStartStudy}
              onTakeBenchmark={handleTakeBenchmark}
              accentColor={accentColor}
              mounted={mounted}
            />

          </div>

          {/* Pathway progress summary */}
          <div
            className="mt-3 flex items-center gap-4 px-2"
            style={{ fontSize: 13, color: "var(--text-tertiary)" }}
          >
            <span>
              <span style={{ color: accentColor, fontWeight: 600 }}>
                {currentPathway.sections.filter((s) => s.status === "completed").length}
              </span>{" "}
              / {currentPathway.sections.length} sections complete
            </span>
            <span style={{ color: "var(--surface-3)" }}>|</span>
            <span>
              ~{currentPathway.totalEstimatedHours}h total
            </span>
          </div>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO (when NO pathway yet)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!hasAnyPathway && (
        <motion.div variants={fadeUp} className="mb-8">
          <div
            className="hero-gradient"
            style={{ padding: "40px 40px 36px" }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
              e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
            }}
          >
            <motion.div className="hero-blob hero-blob-1" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            <motion.div className="hero-blob hero-blob-2" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
            <motion.div className="hero-blob hero-blob-3" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
            <motion.div className="hero-blob hero-blob-4" animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />

            <div className="hero-particle hero-particle-1" />
            <div className="hero-particle hero-particle-2" />
            <div className="hero-particle hero-particle-3" />
            <div className="hero-particle hero-particle-4" />
            <div className="hero-particle hero-particle-5" />
            <div className="hero-particle hero-particle-6" />

            <div className="absolute inset-0 pointer-events-none z-[5]" style={{ background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.04), transparent 40%)` }} />

            <div className="relative z-10 flex items-center justify-between mb-6">
              <div>
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <span className="inline-block rounded-full px-3 py-1 text-[12px] font-medium mb-3" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                    {today}
                  </span>
                </motion.div>
                <motion.h1
                  className="text-[36px] font-bold"
                  style={{
                    letterSpacing: "-0.03em",
                    background: "linear-gradient(90deg, #FFFFFF, rgba(255,255,255,0.7), #FFFFFF)",
                    backgroundSize: "200% 100%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    animation: "gradientTextFlow 6s linear infinite",
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  Welcome back
                </motion.h1>
                <motion.p className="text-white/50 text-[15px] mt-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  You&apos;ve got <span className="text-white/70 font-medium">{totalDue}</span> cards waiting. Let&apos;s make today count.
                </motion.p>
              </div>
              <motion.div
                className="streak-badge"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 20 }}
              >
                <Flame className="w-4 h-4" />
                <span>{streakDays} day{streakDays !== 1 ? "s" : ""}</span>
              </motion.div>
            </div>

            <motion.div className="relative z-10" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <Link href="/study">
                <motion.button
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[15px] font-semibold cursor-pointer border-none"
                  style={{
                    background: "linear-gradient(135deg, #FFFFFF, #F0F0FF)",
                    color: "#0A2540",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 20px rgba(99,91,255,0.2)",
                  }}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <BookOpen className="w-4 h-4" />
                  Start Studying
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          QUICK ACTIONS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
        <Link href="/study/all">
          <div className="btn-stripe">
            <Zap className="w-4 h-4" />
            Quick Review
          </div>
        </Link>
        <Link href="/browser">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-[var(--text-secondary)] border border-[var(--surface-3)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all">
            Browse Cards
          </div>
        </Link>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          QUICK METRICS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="grid grid-cols-4 gap-5">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              className="metric-card"
              style={{ borderLeft: `3px solid ${metric.color}`, animationDelay: `${-i * 1.25}s` }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: [0.165, 0.84, 0.44, 1] }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `linear-gradient(135deg, ${metric.color}, ${metric.color}CC)`, boxShadow: `0 4px 14px ${metric.color}30` }}
              >
                {metric.visual}
              </div>
              <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                {metric.label}
              </p>
              <p
                className="text-[28px] font-bold text-[var(--text-primary)]"
                style={{ letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}
              >
                <AnimatedNumber value={metric.numValue} suffix={metric.suffix} />
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          YOUR LANGUAGES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="h-px mb-8" style={{ background: "linear-gradient(90deg, transparent, rgba(99,91,255,0.3), rgba(255,0,128,0.2), transparent)" }} />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold page-header-gradient" style={{ letterSpacing: "-0.01em" }}>
            Your Languages
          </h2>
          <Link href="/onboarding" className="text-[13px] font-medium hover:opacity-80 transition-opacity" style={{ color: "#635BFF" }}>
            Add language
          </Link>
        </div>
        <div className={`grid gap-5 ${languages.length <= 2 ? "grid-cols-2" : languages.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PROGRESS + WEEKLY
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-5 gap-5">
          <div
            className="col-span-3 accent-top-card p-6"
            style={{ "--accent-color": "#635BFF", "--accent-end": "#FF0080" } as React.CSSProperties}
          >
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-5">
              Today&apos;s Progress
            </h3>
            <div className="space-y-4">
              {languages.map((lang, i) => {
                const pct = lang.due > 0 ? Math.min(Math.round((lang.reviewed / lang.due) * 100), 100) : 0;
                const gradientMap: Record<string, { from: string; to: string }> = {
                  arabic: { from: "#F59E0B", to: "#D97706" },
                  quran: { from: "#14B8A6", to: "#0D9488" },
                  egyptian: { from: "#8B5CF6", to: "#7C3AED" },
                  spanish: { from: "#F97316", to: "#EA580C" },
                };
                const gradient = gradientMap[lang.id] || { from: "#635BFF", to: "#7C3AED" };
                const barBg = pct >= 100
                  ? "linear-gradient(90deg, #0CBF4C, #059669)"
                  : `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`;
                return (
                  <div key={lang.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-[var(--text-secondary)]">{lang.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] text-[var(--text-tertiary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {lang.reviewed} / {lang.due}
                        </span>
                        <span className="text-[12px] font-semibold" style={{ color: pct >= 100 ? "#0CBF4C" : gradient.from, fontVariantNumeric: "tabular-nums" }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: barBg }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.6 + i * 0.15, ease: [0.165, 0.84, 0.44, 1] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--surface-3)" }}>
              <span className="text-[13px] text-[var(--text-tertiary)]">
                {totalReviewed} of {totalDue} cards
              </span>
              <span
                className="font-semibold"
                style={{
                  color: totalReviewed >= totalDue ? "#0CBF4C" : "#635BFF",
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {totalDue > 0 ? Math.round((totalReviewed / totalDue) * 100) : 0}% complete
              </span>
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-3">
            {[
              { label: "Cards Reviewed", numValue: weekTotal, suffix: "", color: "#635BFF", end: "#7C3AED" },
              { label: "Accuracy", numValue: todayAccuracy, suffix: "%", color: "#0CBF4C", end: "#059669" },
              { label: "Day Streak", numValue: streakDays, suffix: "", color: "#FF6B2C", end: "#FF9500" },
              { label: "Languages", numValue: languages.length, suffix: "", color: "#14B8A6", end: "#0EA5E9" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="metric-tile"
                style={{ "--accent-color": stat.color, "--accent-end": stat.end, padding: "16px", animationDelay: `${-i * 2}s` } as React.CSSProperties}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.08, duration: 0.4, ease: [0.165, 0.84, 0.44, 1] }}
              >
                <span className="text-[12px] text-[var(--text-tertiary)] font-medium block mb-2">{stat.label}</span>
                <p className="text-[24px] font-bold text-[var(--text-primary)]" style={{ letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                  <AnimatedNumber value={stat.numValue} suffix={stat.suffix} />
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp}>
        <div className="mt-8 text-center py-4">
          <p className="text-[13px] text-[var(--text-tertiary)]">
            {weekTotal > 0
              ? <>You&apos;ve reviewed <span className="font-semibold text-[var(--text-primary)]">{weekTotal}</span> cards this week. Keep it up!</>
              : <>Start studying to see your weekly progress here!</>}
          </p>
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          AI CHAT FLOATING BUTTON
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {hasAnyPathway && (
        <>
          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #635BFF, #7C3AED)",
              border: "none",
              boxShadow: "0 4px 20px rgba(99,91,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              zIndex: 50,
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <MessageCircle size={22} />
          </button>

          {showChat && (
            <AIChat
              onClose={() => setShowChat(false)}
              currentPathway={currentPathway || undefined}
              languageId={activeLanguage || undefined}
            />
          )}
        </>
      )}
    </motion.div>
  );
}
