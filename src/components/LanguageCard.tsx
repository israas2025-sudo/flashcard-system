"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowUpRight } from "lucide-react";

interface LanguageInfo {
  id: string;
  name: string;
  color: "arabic" | "quran" | "spanish" | "egyptian" | "english";
  dueCount: number;
  totalCards: number;
  reviewedToday: number;
  accuracy: number;
  comingSoon?: boolean;
}

interface LanguageCardProps {
  language: LanguageInfo;
  index?: number;
}

const colorMap: Record<
  string,
  { gradient: string; accent: string; bg: string; text: string; patternClass: string }
> = {
  arabic: {
    gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
    accent: "#F59E0B",
    bg: "#FEF3C7",
    text: "#92400E",
    patternClass: "lang-pattern-arabic",
  },
  quran: {
    gradient: "linear-gradient(135deg, #14B8A6, #0D9488)",
    accent: "#14B8A6",
    bg: "#CCFBF1",
    text: "#115E59",
    patternClass: "lang-pattern-arabic",
  },
  spanish: {
    gradient: "linear-gradient(135deg, #F97316, #EA580C)",
    accent: "#F97316",
    bg: "#FFEDD5",
    text: "#9A3412",
    patternClass: "lang-pattern-spanish",
  },
  egyptian: {
    gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    accent: "#8B5CF6",
    bg: "#EDE9FE",
    text: "#5B21B6",
    patternClass: "lang-pattern-egyptian",
  },
  english: {
    gradient: "linear-gradient(135deg, #64748B, #475569)",
    accent: "#64748B",
    bg: "#F1F5F9",
    text: "#334155",
    patternClass: "",
  },
};

export function LanguageCard({ language, index = 0 }: LanguageCardProps) {
  const colors = colorMap[language.color] || colorMap.arabic;
  const [isHovered, setIsHovered] = useState(false);
  const progressPercent =
    language.totalCards > 0
      ? Math.round(
          ((language.totalCards - language.dueCount) / language.totalCards) * 100
        )
      : 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mouse-x", `${x}%`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}%`);
  };

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: index * 0.12,
        ease: [0.165, 0.84, 0.44, 1],
      }}
    >
      <div
        className={`lang-card ${
          language.comingSoon ? "opacity-50 cursor-default" : "cursor-pointer"
        }`}
        style={
          {
            "--accent-color": colors.accent,
            "--glow-color": `${colors.accent}22`,
            animationDelay: `${-index * 2.3}s`,
          } as React.CSSProperties
        }
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {language.comingSoon && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-2xl bg-[var(--surface-1)]/60 backdrop-blur-sm">
            <Lock className="w-5 h-5 text-[var(--text-tertiary)] mb-1.5" />
            <span className="text-xs font-medium text-[var(--text-tertiary)]">
              Coming Soon
            </span>
          </div>
        )}

        <div className={language.comingSoon ? "opacity-30" : ""}>
          {/* Gradient header with unique language pattern */}
          <div className="relative">
            <div
              className={`h-14 rounded-t-2xl flex items-center justify-between px-4 relative overflow-hidden ${colors.patternClass}`}
              style={{ background: colors.gradient }}
            >
              {/* Shimmer sweep on header */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmerSweep 5s ease-in-out infinite",
                  animationDelay: `${index * 1.5}s`,
                }}
              />
              {/* Hover brighten overlay */}
              <div
                className="absolute inset-0 bg-white transition-opacity duration-300"
                style={{ opacity: isHovered ? 0.08 : 0 }}
              />
              <span className="text-white font-bold text-lg relative z-[1]" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                {language.name.charAt(0)}
              </span>
              <ArrowUpRight className="w-4 h-4 text-white relative z-[1]" style={{ opacity: isHovered ? 1 : 0.6, transition: "opacity 0.2s ease" }} />
            </div>
            {/* Wave SVG divider */}
            <svg
              className="absolute bottom-0 left-0 right-0"
              viewBox="0 0 400 12"
              preserveAspectRatio="none"
              style={{ height: "12px", display: "block" }}
            >
              <path
                d="M0,12 C100,0 300,0 400,12 L400,12 L0,12Z"
                fill="var(--glass-bg)"
              />
            </svg>
          </div>

          {/* Card body */}
          <div className="p-5">
            {/* Language name + card count */}
            <div className="mb-4">
              <p
                className="text-[var(--text-primary)]"
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.4,
                }}
              >
                {language.name}
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)]">
                {language.totalCards.toLocaleString()} cards
              </p>
            </div>

            {/* Hero metric: due count */}
            <div className="mb-4">
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  color: colors.accent,
                  textShadow: `0 0 20px ${colors.accent}30`,
                }}
              >
                {language.dueCount}
              </p>
              <p
                className="text-[var(--text-tertiary)] mt-1"
                style={{ fontSize: "11px" }}
              >
                due today
              </p>
            </div>

            {/* Progress bar with inline percentage */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  Progress
                </span>
                <span
                  className="text-[11px] font-medium text-[var(--text-secondary)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {progressPercent}%
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: "6px", background: "var(--surface-2)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: colors.gradient,
                    filter: `drop-shadow(0 0 6px ${colors.accent}50)`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{
                    duration: 1,
                    delay: 0.3 + index * 0.15,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div
              className="flex items-center gap-4 pt-3 border-t"
              style={{ borderColor: "var(--surface-3)" }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#0CBF4C",
                    boxShadow: "0 0 6px #0CBF4C40",
                  }}
                />
                <span
                  className="text-[12px]"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color:
                      language.accuracy > 85
                        ? "#16A34A"
                        : "var(--text-secondary)",
                    fontWeight: language.accuracy > 85 ? 500 : 400,
                  }}
                >
                  {language.accuracy}% accuracy
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: colors.accent,
                    boxShadow: `0 0 6px ${colors.accent}40`,
                  }}
                />
                <span
                  className="text-[12px] text-[var(--text-secondary)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {language.reviewedToday} reviewed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (language.comingSoon) {
    return <div>{cardContent}</div>;
  }

  return <Link href={`/study?lang=${language.id}`}>{cardContent}</Link>;
}
