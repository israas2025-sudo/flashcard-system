"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, ClipboardCheck, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import type { PathwaySection } from "@/types/pathway";

interface SectionDetailPanelProps {
  section: PathwaySection | null;
  onClose: () => void;
  onStartStudy: (section: PathwaySection) => void;
  onTakeBenchmark: (section: PathwaySection) => void;
  accentColor: string;
  mounted: boolean;
}

export default function SectionDetailPanel({
  section,
  onClose,
  onStartStudy,
  onTakeBenchmark,
  accentColor,
  mounted,
}: SectionDetailPanelProps) {
  return (
    <AnimatePresence>
      {section && (
        <motion.div
          initial={mounted ? { x: 400, opacity: 0 } : false}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            bottom: 16,
            width: 340,
            background: "rgba(10, 15, 30, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 20,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  Section {section.order + 1}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3 }}>
                  {section.title}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.5)",
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 8, lineHeight: 1.5 }}>
              {section.description}
            </p>
          </div>

          {/* Stats */}
          <div style={{ padding: "16px 20px", display: "flex", gap: 12 }}>
            <div
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <BookOpen size={14} style={{ color: accentColor }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                  {(section.cardIds || []).length}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>cards</div>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Clock size={14} style={{ color: accentColor }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                  {section.estimatedMinutes}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>minutes</div>
              </div>
            </div>
          </div>

          {/* Topics */}
          {(section.topics || []).length > 0 && (
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                Topics covered
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(section.topics || []).map((topic) => (
                  <span
                    key={topic}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: `${accentColor}15`,
                      color: accentColor,
                      border: `1px solid ${accentColor}25`,
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status badge */}
          <div style={{ padding: "0 20px 16px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                background:
                  section.status === "completed"
                    ? "rgba(34,197,94,0.1)"
                    : section.status === "active"
                    ? `${accentColor}15`
                    : "rgba(255,255,255,0.04)",
                color:
                  section.status === "completed"
                    ? "#22C55E"
                    : section.status === "active"
                    ? accentColor
                    : "rgba(255,255,255,0.4)",
              }}
            >
              {section.status === "completed" && <CheckCircle2 size={12} />}
              <span style={{ textTransform: "capitalize" }}>{section.status}</span>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Actions */}
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {(section.status === "active" || section.status === "review") && (
              <button
                onClick={() => onStartStudy(section)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`,
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = `0 4px 20px ${accentColor}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Play size={16} />
                Start Studying
              </button>
            )}

            {section.status === "locked" && (
              <div
                style={{
                  textAlign: "center",
                  padding: "12px",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                🔒 Complete previous sections to unlock
              </div>
            )}

            {section.status === "completed" && section.benchmarkPassed === null && (
              <button
                onClick={() => onTakeBenchmark(section)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: `1px solid ${accentColor}40`,
                  background: "transparent",
                  color: accentColor,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ClipboardCheck size={16} />
                Take Benchmark
              </button>
            )}

            {section.benchmarkPassed === true && (
              <div
                style={{
                  textAlign: "center",
                  padding: "10px",
                  fontSize: 13,
                  color: "#22C55E",
                  fontWeight: 500,
                }}
              >
                Benchmark passed!
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
