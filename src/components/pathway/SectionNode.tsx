"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, Play, RotateCcw } from "lucide-react";
import type { PathwaySection } from "@/types/pathway";

interface SectionNodeProps {
  section: PathwaySection;
  position: { x: number; y: number };
  accentColor: string;
  onSelect: (section: PathwaySection) => void;
  introDelay?: number;
  introMode?: boolean;
}

const STATUS_STYLES: Record<
  string,
  {
    gradient: string;
    glowColor: string;
    glowOuter: string;
    orbSize: number;
    showRing: boolean;
    showHalo: boolean;
    opacity: number;
  }
> = {
  active: {
    gradient: "var(--active-grad)",
    glowColor: "var(--orb-glow)",
    glowOuter: "var(--orb-glow-outer)",
    orbSize: 52,
    showRing: true,
    showHalo: true,
    opacity: 1,
  },
  completed: {
    gradient: "linear-gradient(135deg, #22C55E, #16A34A)",
    glowColor: "rgba(34,197,94,0.35)",
    glowOuter: "rgba(34,197,94,0.1)",
    orbSize: 48,
    showRing: false,
    showHalo: true,
    opacity: 1,
  },
  review: {
    gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
    glowColor: "rgba(245,158,11,0.35)",
    glowOuter: "rgba(245,158,11,0.1)",
    orbSize: 48,
    showRing: true,
    showHalo: true,
    opacity: 1,
  },
  locked: {
    gradient: "linear-gradient(135deg, #6B7280, #4B5563)",
    glowColor: "rgba(107,114,128,0.15)",
    glowOuter: "rgba(107,114,128,0.05)",
    orbSize: 44,
    showRing: false,
    showHalo: false,
    opacity: 0.55,
  },
};

function StatusIcon({ status }: { status: string }) {
  const iconProps = { size: 18, strokeWidth: 2.5 };
  switch (status) {
    case "completed":
      return <Check {...iconProps} />;
    case "locked":
      return <Lock {...iconProps} size={16} />;
    case "review":
      return <RotateCcw {...iconProps} size={16} />;
    default:
      return <Play {...iconProps} style={{ marginLeft: 2 }} />;
  }
}

export default function SectionNode({
  section,
  position,
  accentColor,
  onSelect,
  introDelay = 0,
  introMode = false,
}: SectionNodeProps) {
  const [hovered, setHovered] = useState(false);

  const config =
    section.status === "active"
      ? STATUS_STYLES.active
      : STATUS_STYLES[section.status] || STATUS_STYLES.locked;

  const handleClick = useCallback(() => {
    onSelect(section);
  }, [onSelect, section]);

  const statusColor =
    section.status === "completed"
      ? "#22C55E"
      : section.status === "active"
      ? accentColor
      : section.status === "review"
      ? "#F59E0B"
      : "#8B95A5";

  return (
    <motion.div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        zIndex: hovered ? 15 : 10,
      }}
      initial={introMode ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        introMode
          ? { delay: introDelay, type: "spring", damping: 18, stiffness: 280 }
          : { duration: 0 }
      }
    >
      {/* Layer 1: Ambient halo */}
      {config.showHalo && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 80,
            height: 80,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${statusColor}18 0%, transparent 70%)`,
            animation: "breathe 4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Layer 2: Orbital ring */}
      {config.showRing && (
        <div
          className="pathway-orb-ring"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 64,
            height: 64,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: `2px solid ${statusColor}30`,
            animation: "orbitalSpin 6s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Layer 3: Core orb (clickable) */}
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ scale: 1.18 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
        style={{
          position: "relative",
          width: config.orbSize,
          height: config.orbSize,
          borderRadius: "50%",
          background:
            section.status === "active"
              ? `linear-gradient(135deg, ${accentColor}, ${accentColor}BB)`
              : config.gradient,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          opacity: config.opacity,
          boxShadow: `0 0 12px 3px ${config.glowColor}, 0 0 24px 8px ${config.glowOuter}`,
          animation:
            section.status === "active" || section.status === "review"
              ? "orbPulse 3s ease-in-out infinite"
              : undefined,
          ["--orb-glow" as string]: config.glowColor,
          ["--orb-glow-outer" as string]: config.glowOuter,
          overflow: "hidden",
        } as React.CSSProperties}
      >
        {/* Inner shimmer for active */}
        {section.status === "active" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)",
              animation: "shimmerSweep 3s ease-in-out infinite",
            }}
          />
        )}

        {/* Status icon */}
        <span style={{ position: "relative", zIndex: 2, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
          <StatusIcon status={section.status} />
        </span>
      </motion.button>

      {/* Section number label */}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: 8,
          fontSize: 11,
          fontWeight: 700,
          color: statusColor,
          textShadow: `0 0 8px ${statusColor}50`,
          whiteSpace: "nowrap",
          letterSpacing: "0.04em",
          opacity: section.status === "locked" ? 0.5 : 0.85,
          pointerEvents: "none",
        }}
      >
        {section.order + 1}
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ type: "spring", damping: 20, stiffness: 400 }}
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: 14,
              background: "rgba(8, 12, 24, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: 14,
              padding: "14px 18px",
              minWidth: 190,
              maxWidth: 250,
              border: `1px solid ${statusColor}40`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
              pointerEvents: "none",
              zIndex: 30,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", marginBottom: 4, letterSpacing: "-0.01em" }}>
              {section.title}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, lineHeight: 1.4 }}>
              {section.description}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 10, fontWeight: 600 }}>
              <span style={{ color: statusColor }}>{(section.cardIds || []).length} cards</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>~{section.estimatedMinutes}min</span>
            </div>
            <div
              style={{
                marginTop: 6,
                paddingTop: 6,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                fontSize: 10,
                color: statusColor,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {section.status === "active"
                ? "Click to start"
                : section.status === "locked"
                ? "Complete previous to unlock"
                : section.status === "completed"
                ? "Completed"
                : "Click to review"}
            </div>
            {/* Arrow pointer */}
            <div
              style={{
                position: "absolute",
                bottom: -6,
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
                width: 12,
                height: 12,
                background: "rgba(8, 12, 24, 0.95)",
                borderRight: `1px solid ${statusColor}40`,
                borderBottom: `1px solid ${statusColor}40`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
