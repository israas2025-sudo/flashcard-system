"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Flame,
  BookOpen,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import { LanguageCard } from "@/components/LanguageCard";

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

export default function Dashboard() {
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

  const handleMetricMouse = (e: React.MouseEvent<HTMLDivElement>, glowColor: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
    e.currentTarget.style.setProperty("--glow-color", glowColor);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 1: HERO — cursor-tracking highlight
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        <div
          className="hero-gradient"
          style={{ padding: "40px 40px 36px" }}
          onMouseMove={handleHeroMouse}
        >
          {/* Animated color blobs with pulsing animation */}
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
                className="text-white text-[36px] font-bold"
                style={{ letterSpacing: "-0.03em" }}
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

          {/* CTA button — pill shape, Stripe-like with animated arrow */}
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
                  background: "white",
                  color: "#0A2540",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
                whileHover={{ scale: 1.03, y: -1, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
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
          SECTION 1.5: QUICK ACTIONS
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
          SECTION 2: QUICK METRICS ROW
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="grid grid-cols-4 gap-5">
          {[
            { label: "Cards Due", value: totalDue.toString(), icon: BookOpen, color: "#635BFF" },
            { label: "Accuracy", value: "91%", icon: Target, color: "#0CBF4C" },
            { label: "Day Streak", value: "5 days", icon: Flame, color: "#FF6B2C" },
            { label: "Total Cards", value: totalCards.toLocaleString(), icon: TrendingUp, color: "#14B8A6" },
          ].map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                className="metric-card"
                style={{ borderLeft: `3px solid ${metric.color}` }}
                onMouseMove={(e) => handleMetricMouse(e, metric.color)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5 + i * 0.08,
                  duration: 0.5,
                  ease: [0.165, 0.84, 0.44, 1],
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${metric.color}, ${metric.color}CC)`,
                  }}
                >
                  <Icon className="w-4 h-4 text-white" />
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
                  {metric.value}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 3: YOUR LANGUAGES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp} className="mb-8">
        {/* Gradient section divider */}
        <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, var(--surface-3), transparent)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-[16px] font-semibold text-[var(--text-primary)]"
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 4 & 5: PROGRESS + WEEKLY STATS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-5 gap-5">
          {/* Today's Progress -- 3 cols */}
          <div
            className="col-span-3 accent-top-card p-6"
            style={{ "--accent-color": "#635BFF" } as React.CSSProperties}
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

          {/* Weekly Stats -- 2 cols, 2x2 grid */}
          <div className="col-span-2 grid grid-cols-2 gap-3">
            {[
              { label: "Cards Reviewed", value: "284", icon: TrendingUp, color: "#635BFF", end: "#7C3AED" },
              { label: "Accuracy", value: "91%", icon: Target, color: "#0CBF4C", end: "#059669" },
              { label: "Day Streak", value: "5", icon: Flame, color: "#FF6B2C", end: "#FF9500" },
              { label: "Quran Progress", value: "73%", icon: Zap, color: "#14B8A6", end: "#0EA5E9" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  className="metric-tile"
                  style={{
                    "--accent-color": stat.color,
                    "--accent-end": stat.end,
                    padding: "16px",
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
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${stat.color}, ${stat.end})`,
                    }}
                  >
                    <Icon className="w-4 h-4 text-white" />
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
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 6: MOTIVATIONAL FOOTER
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
