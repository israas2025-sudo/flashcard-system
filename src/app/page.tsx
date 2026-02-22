"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame, BookOpen, Zap } from "lucide-react";
import { LanguageCard } from "@/components/LanguageCard";

// ============================================================================
// Animated Mini-Visualizations — unique per metric, replacing generic icons
// ============================================================================

/** 3 overlapping card shapes that gently fan/drift like a flashcard stack */
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

/** Animated SVG circular progress ring */
function MiniRing({ pct }: { pct: number }) {
  const r = 11;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r={r} stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" />
      <motion.circle
        cx="14" cy="14" r={r}
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        transform="rotate(-90 14 14)"
      />
    </svg>
  );
}

/** Breathing flame shape */
function MiniFlameVis() {
  return (
    <motion.svg
      width="20" height="26" viewBox="0 0 20 26"
      animate={{ scale: [1, 1.12, 1], y: [0, -1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M10 2 C10 2 3 10 3 17 C3 22 6 25 10 25 C14 25 17 22 17 17 C17 10 10 2 10 2Z"
        fill="white" opacity="0.9"
      />
      <path
        d="M10 10 C10 10 7 15 7 19 C7 21 8 23 10 23 C12 23 13 21 13 19 C13 15 10 10 10 10Z"
        fill="white" opacity="0.45"
      />
    </motion.svg>
  );
}

/** 5 bars that rise with staggered animation */
function MiniBarChart() {
  const heights = [12, 18, 24, 15, 28];
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      {heights.map((h, i) => (
        <motion.rect
          key={i}
          x={i * 5.6}
          width="4"
          rx="1.5"
          fill={`rgba(255,255,255,${0.4 + i * 0.12})`}
          initial={{ height: 0, y: 28 }}
          animate={{ height: h, y: 28 - h }}
          transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.165, 0.84, 0.44, 1] }}
        />
      ))}
    </svg>
  );
}

/** Self-drawing sparkline path */
function MiniSparkline() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <motion.path
        d="M1 22 L5 16 L9 19 L13 9 L17 14 L21 5 L25 11 L28 7"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
      />
    </svg>
  );
}

/** Row of animated dots representing streak/count */
function MiniDots({ count, total = 7 }: { count: number; total?: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      {[...Array(total)].map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: 4, height: 4,
            background: i < count ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
            boxShadow: i < count ? "0 0 4px rgba(255,255,255,0.5)" : "none",
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 500, damping: 25 }}
        />
      ))}
    </div>
  );
}

/** Animated number that counts up from 0 — makes metrics feel alive */
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

/** Floating ambient accent dots — adds life between sections */
function FloatingAccentDots() {
  return (
    <div className="relative h-6 overflow-hidden my-1 pointer-events-none">
      {[
        { color: "#635BFF", x: "10%", size: 4, dur: 3 },
        { color: "#FF0080", x: "28%", size: 3, dur: 3.5 },
        { color: "#00D4FF", x: "50%", size: 5, dur: 4 },
        { color: "#FFB800", x: "70%", size: 3.5, dur: 3.2 },
        { color: "#14B8A6", x: "88%", size: 4, dur: 3.8 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: p.color, left: p.x, top: "50%" }}
          animate={{ y: [0, -8, 0], opacity: [0.2, 0.55, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Data
// ============================================================================

const languages = [
  { id: "arabic", name: "Arabic (MSA / Quran)", color: "arabic" as const, cards: 207, due: 52, reviewed: 31, accuracy: 88 },
  { id: "egyptian", name: "Egyptian Arabic", color: "egyptian" as const, cards: 1000, due: 25, reviewed: 8, accuracy: 91 },
  { id: "spanish", name: "Spanish", color: "spanish" as const, cards: 1000, due: 35, reviewed: 18, accuracy: 94 },
];

const totalCards = languages.reduce((s, l) => s + l.cards, 0);
const totalDue = languages.reduce((s, l) => s + l.due, 0);
const totalReviewed = languages.reduce((s, l) => s + l.reviewed, 0);

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.165, 0.84, 0.44, 1] },
  },
};

// ============================================================================
// Dashboard
// ============================================================================

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const overallProgress = Math.round((totalReviewed / totalDue) * 100);

  const handleHeroMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
  };

  /* Metrics — each with a unique animated visualization instead of generic icons */
  const metrics = [
    { label: "Cards Due", numValue: totalDue, suffix: "", visual: <MiniCardStack />, color: "#635BFF" },
    { label: "Accuracy", numValue: 91, suffix: "%", visual: <MiniRing pct={91} />, color: "#0CBF4C" },
    { label: "Day Streak", numValue: 5, suffix: " days", visual: <MiniFlameVis />, color: "#FF6B2C" },
    { label: "Total Cards", numValue: totalCards, suffix: "", visual: <MiniBarChart />, color: "#14B8A6" },
  ];

  /* Weekly stat tiles — each with a unique animated preview */
  const weeklyStats = [
    { label: "Cards Reviewed", numValue: 284, suffix: "", visual: <MiniSparkline />, color: "#635BFF", end: "#7C3AED" },
    { label: "Accuracy", numValue: 91, suffix: "%", visual: <MiniRing pct={91} />, color: "#0CBF4C", end: "#059669" },
    { label: "Day Streak", numValue: 5, suffix: "", visual: <MiniDots count={5} />, color: "#FF6B2C", end: "#FF9500" },
    { label: "Quran Progress", numValue: 73, suffix: "%", visual: <MiniRing pct={73} />, color: "#14B8A6", end: "#0EA5E9" },
  ];

  return (
    <motion.div variants={stagger} initial={mounted ? "hidden" : false} animate="show">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — autonomous particles + cursor glow
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        <div
          className="hero-gradient"
          style={{ padding: "40px 40px 36px" }}
          onMouseMove={handleHeroMouse}
        >
          {/* Animated color blobs */}
          <motion.div
            className="hero-blob hero-blob-1"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="hero-blob hero-blob-2"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="hero-blob hero-blob-3"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="hero-blob hero-blob-4"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />

          {/* Autonomous floating particles */}
          <div className="hero-particle hero-particle-1" />
          <div className="hero-particle hero-particle-2" />
          <div className="hero-particle hero-particle-3" />
          <div className="hero-particle hero-particle-4" />
          <div className="hero-particle hero-particle-5" />
          <div className="hero-particle hero-particle-6" />

          {/* Cursor-tracking radial glow */}
          <div
            className="absolute inset-0 pointer-events-none z-[5]"
            style={{
              background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.04), transparent 40%)`,
            }}
          />

          {/* Top: greeting + streak */}
          <div className="relative z-10 flex items-center justify-between mb-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span
                  className="inline-block rounded-full px-3 py-1 text-[12px] font-medium mb-3"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(8px)",
                  }}
                >
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
              <motion.p
                className="text-white/50 text-[15px] mt-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                You&apos;ve got <span className="text-white/70 font-medium">{totalDue}</span> cards waiting. Let&apos;s make today count.
              </motion.p>
              <motion.p
                className="text-white/40 text-[13px] mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                {totalCards.toLocaleString()} total across {languages.length} languages
              </motion.p>
            </div>

            <motion.div
              className="streak-badge"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 20 }}
            >
              <Flame className="w-4 h-4" />
              <span>5 days</span>
            </motion.div>
          </div>

          {/* CTA button */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Link href="/study">
              <motion.button
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[15px] font-semibold cursor-pointer border-none"
                style={{
                  background: "linear-gradient(135deg, #FFFFFF, #F0F0FF)",
                  color: "#0A2540",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 20px rgba(99,91,255,0.2)",
                }}
                whileHover={{ scale: 1.03, y: -1, boxShadow: "0 8px 24px rgba(0,0,0,0.2), 0 0 30px rgba(99,91,255,0.3)" }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <BookOpen className="w-4 h-4" />
                Start Studying
                <motion.span
                  className="inline-flex"
                  initial={{ x: 0 }}
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </motion.span>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.div>

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

      <FloatingAccentDots />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          QUICK METRICS — animated mini-visualizations
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="grid grid-cols-4 gap-5">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              className="metric-card"
              style={{
                borderLeft: `3px solid ${metric.color}`,
                animationDelay: `${-i * 1.25}s`,
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                e.currentTarget.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
                e.currentTarget.style.setProperty("--glow-color", metric.color);
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5 + i * 0.08,
                duration: 0.5,
                ease: [0.165, 0.84, 0.44, 1],
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{
                  background: `linear-gradient(135deg, ${metric.color}, ${metric.color}CC)`,
                  boxShadow: `0 4px 14px ${metric.color}30`,
                }}
              >
                {metric.visual}
              </div>
              <p
                className="text-[13px] font-medium mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {metric.label}
              </p>
              <p
                className="text-[28px] font-bold text-[var(--text-primary)]"
                style={{
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                <AnimatedNumber value={metric.numValue} suffix={metric.suffix} />
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          YOUR LANGUAGES — floating cards
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        {/* Gradient section divider */}
        <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,91,255,0.3), rgba(255,0,128,0.2), transparent)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-[16px] font-semibold page-header-gradient"
            style={{ letterSpacing: "-0.01em" }}
          >
            Your Languages
          </h2>
          <Link
            href="/onboarding"
            className="text-[13px] font-medium hover:opacity-80 transition-opacity"
            style={{ color: "#635BFF" }}
          >
            Add language
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-5">
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

      <FloatingAccentDots />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PROGRESS + WEEKLY STATS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-5 gap-5">
          {/* Today's Progress -- 3 cols */}
          <div
            className="col-span-3 accent-top-card p-6"
            style={{ "--accent-color": "#635BFF", "--accent-end": "#FF0080" } as React.CSSProperties}
          >
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-5">
              Today&apos;s Progress
            </h3>
            <div className="space-y-4">
              {languages.map((lang, i) => {
                const pct = lang.due > 0
                  ? Math.min(Math.round((lang.reviewed / lang.due) * 100), 100)
                  : 0;
                const gradientMap: Record<string, { from: string; to: string }> = {
                  arabic: { from: "#F59E0B", to: "#D97706" },
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
                      <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                        {lang.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[13px] text-[var(--text-tertiary)]"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {lang.reviewed} / {lang.due}
                        </span>
                        <span
                          className="text-[12px] font-semibold"
                          style={{
                            color: pct >= 100 ? "#0CBF4C" : gradient.from,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-[6px] rounded-full overflow-hidden"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: barBg }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 1,
                          delay: 0.6 + i * 0.15,
                          ease: [0.165, 0.84, 0.44, 1],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="mt-5 pt-4 border-t flex items-center justify-between"
              style={{ borderColor: "var(--surface-3)" }}
            >
              <span className="text-[13px] text-[var(--text-tertiary)]">
                {totalReviewed} of {totalDue} cards
              </span>
              <span
                className="font-semibold"
                style={{
                  color: totalReviewed >= totalDue ? "#0CBF4C" : "#635BFF",
                  fontSize: overallProgress >= 100 ? "18px" : "13px",
                  fontWeight: overallProgress >= 100 ? 800 : 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {overallProgress}% complete
              </span>
            </div>
          </div>

          {/* Weekly Stats — animated mini-visualizations */}
          <div className="col-span-2 grid grid-cols-2 gap-3">
            {weeklyStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="metric-tile"
                style={{
                  "--accent-color": stat.color,
                  "--accent-end": stat.end,
                  padding: "16px",
                  animationDelay: `${-i * 2}s`,
                } as React.CSSProperties}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.8 + i * 0.08,
                  duration: 0.4,
                  ease: [0.165, 0.84, 0.44, 1],
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${stat.color}, ${stat.end})`,
                    boxShadow: `0 4px 14px ${stat.color}30`,
                  }}
                >
                  {stat.visual}
                </div>
                <span className="text-[12px] text-[var(--text-tertiary)] font-medium block mb-1">
                  {stat.label}
                </span>
                <p
                  className="text-[24px] font-bold text-[var(--text-primary)]"
                  style={{
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                  }}
                >
                  <AnimatedNumber value={stat.numValue} suffix={stat.suffix} />
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MOTIVATIONAL FOOTER
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp}>
        <div className="mt-8 text-center py-4">
          <p className="text-[13px] text-[var(--text-tertiary)]">
            You&apos;ve reviewed <span className="font-semibold text-[var(--text-primary)]">284</span> cards this week. Keep it up!
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
