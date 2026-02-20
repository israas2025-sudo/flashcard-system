"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, ExternalLink, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BridgeDisplayData {
  sourceType: "fusha" | "ammiya";
  equivalentCardId: string | null;
  equivalentWord: string | null;
  notes: string;
  sharedRoot: string | null;
  isCognate: boolean;
}

interface FushaBridgeProps {
  /** Bridge data to display. */
  bridgeInfo: BridgeDisplayData | null;
  /** Whether the bridge is visible by default (user setting). */
  visible?: boolean;
  /** Callback when visibility is toggled. */
  onToggleVisibility?: (visible: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FushaBridge -- Small pill displayed below a flashcard during review.
 *
 * Shows the equivalent word in the other Arabic register:
 * - For Egyptian Arabic cards: Shows the Fusha (Classical) equivalent
 * - For Classical Arabic cards: Shows the Egyptian (Ammiya) equivalent
 *
 * Design: Subtle pill that doesn't distract from the main card content.
 * Includes a toggle in settings to show/hide.
 */
export function FushaBridge({
  bridgeInfo,
  visible = true,
  onToggleVisibility,
}: FushaBridgeProps) {
  const [isVisible, setIsVisible] = useState(visible);

  if (!bridgeInfo || !bridgeInfo.equivalentWord) {
    return null;
  }

  const handleToggle = () => {
    const newValue = !isVisible;
    setIsVisible(newValue);
    onToggleVisibility?.(newValue);
  };

  const isFusha = bridgeInfo.sourceType === "fusha";
  const registerLabel = isFusha ? "Egyptian" : "Fusha";
  const registerSubLabel = isFusha
    ? "Ammiya equivalent"
    : "Classical equivalent";

  // Color scheme: Fusha gets amber tones, Ammiya gets purple tones
  const pillStyles = isFusha
    ? "bg-egyptian-50 dark:bg-egyptian-950/30 text-egyptian-700 dark:text-egyptian-400 border-egyptian-200 dark:border-egyptian-800"
    : "bg-arabic-50 dark:bg-arabic-950/30 text-arabic-700 dark:text-arabic-400 border-arabic-200 dark:border-arabic-800";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
      className="w-full max-w-2xl mx-auto mt-2"
    >
      <div className="flex items-center justify-center gap-2">
        {/* Bridge pill */}
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: "auto" }}
              exit={{ opacity: 0, scale: 0.95, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className={`
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                  border text-[11px] font-medium
                  ${pillStyles}
                  transition-colors duration-150
                `}
              >
                <ArrowLeftRight className="w-3 h-3 flex-shrink-0 opacity-60" />

                <span className="opacity-70">{registerLabel}:</span>

                {bridgeInfo.equivalentCardId ? (
                  <Link href={`/stats/card/${bridgeInfo.equivalentCardId}`}>
                    <span
                      className="arabic-text text-[13px] font-semibold cursor-pointer hover:underline underline-offset-2"
                      dir="rtl"
                    >
                      {bridgeInfo.equivalentWord}
                    </span>
                  </Link>
                ) : (
                  <span
                    className="arabic-text text-[13px] font-semibold"
                    dir="rtl"
                  >
                    {bridgeInfo.equivalentWord}
                  </span>
                )}

                {/* Cognate indicator */}
                {bridgeInfo.isCognate && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full
                      bg-green-50 dark:bg-green-950/30
                      text-green-600 dark:text-green-400
                      font-semibold"
                    title="These words share the same root (cognate)"
                  >
                    cognate
                  </span>
                )}

                {/* Shared root */}
                {bridgeInfo.sharedRoot && (
                  <span
                    className="text-[9px] opacity-50 arabic-text"
                    dir="rtl"
                    title={`Shared root: ${bridgeInfo.sharedRoot}`}
                  >
                    ({bridgeInfo.sharedRoot})
                  </span>
                )}

                {/* Link to card stats */}
                {bridgeInfo.equivalentCardId && (
                  <Link href={`/stats/card/${bridgeInfo.equivalentCardId}`}>
                    <ExternalLink className="w-2.5 h-2.5 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visibility toggle */}
        <button
          onClick={handleToggle}
          className="p-1 rounded-md hover:bg-[var(--surface-2)] transition-colors
            text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          aria-label={isVisible ? "Hide bridge info" : "Show bridge info"}
          title={isVisible ? "Hide Fusha-Ammiya bridge" : "Show Fusha-Ammiya bridge"}
        >
          {isVisible ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Detailed notes (shown on hover/tap for more context) */}
      {isVisible && bridgeInfo.notes && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-[10px] text-[var(--text-tertiary)] mt-1.5 max-w-md mx-auto leading-relaxed"
        >
          {bridgeInfo.notes}
        </motion.p>
      )}
    </motion.div>
  );
}
