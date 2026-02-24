"use client";

import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import type { LanguageId } from "@/store/user-preferences-store";
import type { PathwaySection } from "@/types/pathway";
import { LANGUAGE_DISPLAY } from "@/lib/language-stats";

import QuranEnvironment from "./environments/QuranEnvironment";
import ArabicEnvironment from "./environments/ArabicEnvironment";
import EgyptianEnvironment from "./environments/EgyptianEnvironment";
import SpanishEnvironment from "./environments/SpanishEnvironment";
import PathwayTrail from "./PathwayTrail";
import SectionNode from "./SectionNode";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PathwaySceneProps {
  languageId: LanguageId;
  sections: PathwaySection[];
  introMode?: boolean;
  onSelectSection: (section: PathwaySection) => void;
}

// ---------------------------------------------------------------------------
// Generate 2D node positions in a gentle sine-wave curve
// ---------------------------------------------------------------------------
const NODE_SPACING = 160;
const PADDING_X = 100;
const AMPLITUDE = 45;

function generateNodePositions(
  count: number,
  containerHeight: number
): { x: number; y: number }[] {
  const centerY = containerHeight * 0.48;
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const x = PADDING_X + i * NODE_SPACING;
    const t = i / Math.max(count - 1, 1);
    const y = centerY + Math.sin(t * Math.PI * 2.2 + 0.5) * AMPLITUDE;
    positions.push({ x, y });
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Environment selector
// ---------------------------------------------------------------------------
function EnvironmentForLanguage({ languageId }: { languageId: LanguageId }) {
  switch (languageId) {
    case "quran":
      return <QuranEnvironment />;
    case "arabic":
      return <ArabicEnvironment />;
    case "egyptian":
      return <EgyptianEnvironment />;
    case "spanish":
      return <SpanishEnvironment />;
    default:
      return <QuranEnvironment />;
  }
}

// ---------------------------------------------------------------------------
// Main Scene Component
// ---------------------------------------------------------------------------
export default function PathwayScene({
  languageId,
  sections,
  introMode = false,
  onSelectSection,
}: PathwaySceneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);
  const containerHeight = 420; // Matches clamp mid value

  const nodePositions = useMemo(
    () => generateNodePositions(sections.length, containerHeight),
    [sections.length, containerHeight]
  );

  const scrollWidth = useMemo(
    () => Math.max(800, sections.length * NODE_SPACING + PADDING_X * 2),
    [sections.length]
  );

  const accentColor = LANGUAGE_DISPLAY[languageId]?.accent || "#635BFF";

  // Find active section index for auto-scroll
  const activeIdx = useMemo(
    () => sections.findIndex((s) => s.status === "active"),
    [sections]
  );

  // Auto-scroll to active section on mount
  const scrollToActive = useCallback(() => {
    if (activeIdx >= 0 && scrollRef.current) {
      const targetX = nodePositions[activeIdx]?.x || 0;
      const containerW = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: Math.max(0, targetX - containerW / 2),
        behavior: "smooth",
      });
    }
  }, [activeIdx, nodePositions]);

  useEffect(() => {
    const delay = introMode ? 3200 : 400;
    const timer = setTimeout(scrollToActive, delay);
    return () => clearTimeout(timer);
  }, [scrollToActive, introMode]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Environment background (fills entire visible area) */}
      <EnvironmentForLanguage languageId={languageId} />

      {/* Scrollable pathway layer */}
      <div
        ref={scrollRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          zIndex: 5,
          // Hide scrollbar
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Hide webkit scrollbar */}
        <style>{`
          .pathway-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        <div
          className="pathway-scroll"
          style={{
            position: "relative",
            width: scrollWidth,
            height: "100%",
            minWidth: "100%",
          }}
        >
          {/* SVG Trail */}
          <PathwayTrail
            sections={sections}
            accentColor={accentColor}
            nodePositions={nodePositions}
            introMode={introMode}
          />

          {/* Section Nodes */}
          {sections.map((section, i) => (
            <div
              key={section.id}
              ref={i === activeIdx ? activeNodeRef : undefined}
            >
              <SectionNode
                section={section}
                position={nodePositions[i] || { x: PADDING_X + i * NODE_SPACING, y: containerHeight * 0.48 }}
                accentColor={accentColor}
                onSelect={onSelectSection}
                introDelay={introMode ? 0.5 + i * 0.15 : 0}
                introMode={introMode}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background:
            "linear-gradient(to top, var(--surface-0, #0A0F1E), transparent)",
          pointerEvents: "none",
          zIndex: 6,
        }}
      />

      {/* Intro fade-in from black */}
      {introMode && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{
            position: "absolute",
            inset: 0,
            background: "#000000",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}
    </div>
  );
}
