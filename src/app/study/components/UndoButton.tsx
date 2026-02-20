"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, X } from "lucide-react";
import type { UndoAction } from "@/study-modes/types";
import { Rating } from "@/scheduling/types";

interface UndoButtonProps {
  /** The most recent action that can be undone */
  lastAction: UndoAction | null;
  /** Callback to execute the undo */
  onUndo: (action: UndoAction) => void;
  /** Whether undo is currently available */
  enabled?: boolean;
}

const ratingLabels: Record<Rating, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
};

const ratingColors: Record<Rating, string> = {
  [Rating.Again]: "text-red-500",
  [Rating.Hard]: "text-amber-500",
  [Rating.Good]: "text-primary-500",
  [Rating.Easy]: "text-green-500",
};

export function UndoButton({ lastAction, onUndo, enabled = true }: UndoButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const [undoneAction, setUndoneAction] = useState<UndoAction | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  // Show undo button when there is a new action
  const canUndo = enabled && lastAction !== null;

  const handleUndo = () => {
    if (!lastAction) return;

    // Execute undo
    onUndo(lastAction);
    setUndoneAction(lastAction);
    setShowToast(true);

    // Auto-dismiss toast after 3 seconds
    if (toastTimer) clearTimeout(toastTimer);
    const timer = setTimeout(() => {
      setShowToast(false);
      setUndoneAction(null);
    }, 3000);
    setToastTimer(timer);
  };

  const dismissToast = () => {
    setShowToast(false);
    setUndoneAction(null);
    if (toastTimer) clearTimeout(toastTimer);
  };

  // Keyboard shortcut: Ctrl+Z or Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && canUndo) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, lastAction]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [toastTimer]);

  return (
    <>
      {/* Undo button */}
      <AnimatePresence>
        {canUndo && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUndo}
            className="
              fixed bottom-24 left-6 z-30
              flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-[var(--surface-1)] border border-[var(--surface-3)]
              shadow-elevated text-sm font-medium text-[var(--text-secondary)]
              hover:bg-[var(--surface-2)] transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500
            "
            aria-label="Undo last review"
          >
            <Undo2 className="w-4 h-4" />
            <span>Undo</span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)] ml-1 px-1 py-0.5 rounded bg-[var(--surface-2)]">
              {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "Cmd" : "Ctrl"}+Z
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {showToast && undoneAction && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="
              fixed bottom-6 left-1/2 -translate-x-1/2 z-50
              flex items-center gap-3 px-5 py-3 rounded-xl
              bg-[var(--surface-1)] border border-[var(--surface-3)]
              shadow-elevated
            "
          >
            <Undo2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <div className="text-sm">
              <span className="text-[var(--text-secondary)]">
                Undid{" "}
              </span>
              <span className={`font-medium ${ratingColors[undoneAction.rating]}`}>
                {ratingLabels[undoneAction.rating]}
              </span>
              <span className="text-[var(--text-secondary)]">
                {" "}rating
              </span>
            </div>
            <button
              onClick={dismissToast}
              className="ml-2 p-1 rounded-md hover:bg-[var(--surface-2)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
