"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
  Clock,
  RotateCcw,
  Home,
  Zap,
} from "lucide-react";
import { ProgressBar } from "../../components/ProgressBar";
import { QuizGenerator } from "@/study-modes/quiz-generator";
import type { QuizOption } from "@/study-modes/types";
import type { Card } from "@/scheduling/types";

// ---------------------------------------------------------------------------
// Mock data (same cards as standard review, extended for quiz distractors)
// ---------------------------------------------------------------------------
const mockCards: Card[] = [
  {
    id: "1", deckId: "arabic-msa", front: "\u0643\u062a\u0627\u0628", back: "book",
    tags: ["arabic", "nouns"], scheduling: { stability: 5, difficulty: 3.5, elapsedDays: 2, scheduledDays: 5, reps: 8, lapses: 1, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "2", deckId: "arabic-msa", front: "\u0642\u0644\u0645", back: "pen",
    tags: ["arabic", "nouns"], scheduling: { stability: 3, difficulty: 4, elapsedDays: 1, scheduledDays: 3, reps: 5, lapses: 0, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "3", deckId: "arabic-msa", front: "\u0628\u064a\u062a", back: "house",
    tags: ["arabic", "nouns"], scheduling: { stability: 7, difficulty: 2.5, elapsedDays: 3, scheduledDays: 7, reps: 12, lapses: 0, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "4", deckId: "arabic-msa", front: "\u0645\u0627\u0621", back: "water",
    tags: ["arabic", "nouns"], scheduling: { stability: 10, difficulty: 2, elapsedDays: 5, scheduledDays: 10, reps: 15, lapses: 0, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "5", deckId: "arabic-msa", front: "\u0634\u0645\u0633", back: "sun",
    tags: ["arabic", "nouns"], scheduling: { stability: 6, difficulty: 3, elapsedDays: 2, scheduledDays: 6, reps: 10, lapses: 1, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "6", deckId: "spanish", front: "mariposa", back: "butterfly",
    tags: ["spanish", "nature"], scheduling: { stability: 4, difficulty: 3, elapsedDays: 1, scheduledDays: 4, reps: 6, lapses: 0, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "7", deckId: "spanish", front: "estrella", back: "star",
    tags: ["spanish", "nature"], scheduling: { stability: 5, difficulty: 2.5, elapsedDays: 2, scheduledDays: 5, reps: 8, lapses: 0, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "8", deckId: "spanish", front: "montaña", back: "mountain",
    tags: ["spanish", "nature"], scheduling: { stability: 3, difficulty: 4, elapsedDays: 1, scheduledDays: 3, reps: 4, lapses: 1, state: 2, lastReview: new Date() },
    status: "active" as any, due: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
];

// ---------------------------------------------------------------------------
// Option feedback colors
// ---------------------------------------------------------------------------
type OptionState = "default" | "correct" | "incorrect" | "missed";

function getOptionClasses(state: OptionState): string {
  switch (state) {
    case "correct":
      return "border-green-400 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300";
    case "incorrect":
      return "border-red-400 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300";
    case "missed":
      return "border-green-300 bg-green-50/50 dark:bg-green-950/20 text-green-600 dark:text-green-400 ring-2 ring-green-400";
    default:
      return "border-[var(--surface-3)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] hover:border-primary-300";
  }
}

// ---------------------------------------------------------------------------
// Quiz Mode Page
// ---------------------------------------------------------------------------
export default function QuizModePage() {
  const router = useRouter();
  const quizGen = useMemo(() => new QuizGenerator(), []);
  const cards = useMemo(() => mockCards, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [options, setOptions] = useState<QuizOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate options for the current card
  useEffect(() => {
    if (currentIndex < cards.length) {
      const opts = quizGen.generateOptions(cards[currentIndex], cards, 4);
      setOptions(opts);
      setSelectedId(null);
      setIsAnswered(false);
    }
  }, [currentIndex, cards, quizGen]);

  const currentCard = cards[currentIndex] || null;
  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 0;

  // Handle option selection
  const handleSelect = useCallback(
    (optionId: string) => {
      if (isAnswered || !currentCard) return;

      setSelectedId(optionId);
      setIsAnswered(true);
      setTotalAnswered((prev) => prev + 1);

      const isCorrect = quizGen.checkAnswer(optionId, currentCard.id);
      if (isCorrect) {
        setScore((prev) => prev + 1);
        // Auto-advance after 800ms on correct
        autoAdvanceTimer.current = setTimeout(() => {
          advanceToNext();
        }, 800);
      } else {
        // Show correct answer, longer pause on incorrect
        autoAdvanceTimer.current = setTimeout(() => {
          advanceToNext();
        }, 2000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAnswered, currentCard, quizGen]
  );

  const advanceToNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const next = currentIndex + 1;
    if (next >= cards.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, cards.length]);

  // Keyboard shortcuts: 1-4 for options, Enter/Space to advance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (!isAnswered) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= options.length) {
          e.preventDefault();
          handleSelect(options[num - 1].id);
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          advanceToNext();
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/study/modes");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnswered, options, handleSelect, advanceToNext, router]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Session Complete Screen
  // ---------------------------------------------------------------------------
  if (isComplete) {
    const accuracy = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--surface-0)] p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full max-w-md bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] shadow-elevated overflow-hidden"
        >
          <div className="text-center pt-8 pb-4 px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 rounded-2xl bg-quran-500 flex items-center justify-center mx-auto mb-4"
            >
              <Trophy className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Quiz Complete!</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {accuracy >= 80 ? "Excellent work!" : accuracy >= 60 ? "Good effort!" : "Keep practicing!"}
            </p>
          </div>

          <div className="px-6 pb-4 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-xl bg-quran-50 dark:bg-quran-950/40 text-center">
              <Target className="w-5 h-5 text-quran-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{score}/{totalAnswered}</span>
              <span className="text-xs text-[var(--text-tertiary)]">Correct</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-center">
              <Zap className="w-5 h-5 text-primary-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{accuracy}%</span>
              <span className="text-xs text-[var(--text-tertiary)]">Accuracy</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-arabic-50 dark:bg-arabic-950/40 text-center">
              <Clock className="w-5 h-5 text-arabic-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{elapsed}s</span>
              <span className="text-xs text-[var(--text-tertiary)]">Time</span>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setScore(0);
                setTotalAnswered(0);
                setIsComplete(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--surface-3)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={() => router.push("/study/modes")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              Modes
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Quiz Screen
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-0)]">
      {/* Progress bar */}
      <ProgressBar progress={progress} totalCards={cards.length} currentIndex={currentIndex} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <button
          onClick={() => router.push("/study/modes")}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Back to modes"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>

        {/* Score counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="font-medium text-green-600 dark:text-green-400">{score}</span>
          </div>
          <span className="text-[var(--text-tertiary)]">/</span>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-medium text-[var(--text-secondary)]">{totalAnswered}</span>
          </div>
        </div>

        <div className="text-sm text-[var(--text-secondary)]">
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl"
            >
              {/* Question card */}
              <div className="text-center mb-10">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-quran-50 dark:bg-quran-950/40 text-quran-600 dark:text-quran-400 mb-4">
                  What does this mean?
                </div>
                <p
                  className="text-4xl font-semibold text-[var(--text-primary)] arabic-text"
                  dir="rtl"
                >
                  {currentCard.front}
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((option, i) => {
                  let state: OptionState = "default";
                  if (isAnswered) {
                    if (option.isCorrect) {
                      state = selectedId === option.id ? "correct" : "missed";
                    } else if (selectedId === option.id) {
                      state = "incorrect";
                    }
                  }

                  return (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={!isAnswered ? { scale: 0.97 } : undefined}
                      onClick={() => handleSelect(option.id)}
                      disabled={isAnswered}
                      className={`
                        relative flex items-center gap-3 p-4 rounded-xl border-2
                        transition-all duration-200 text-left
                        focus:outline-none focus:ring-2 focus:ring-primary-500
                        ${getOptionClasses(state)}
                        ${isAnswered ? "cursor-default" : "cursor-pointer"}
                      `}
                    >
                      {/* Number badge */}
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-sm font-medium text-[var(--text-tertiary)]">
                        {i + 1}
                      </span>

                      <span className="flex-1 text-sm font-medium">
                        {option.text}
                      </span>

                      {/* Feedback icon */}
                      {isAnswered && state === "correct" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </motion.div>
                      )}
                      {isAnswered && state === "incorrect" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <XCircle className="w-5 h-5 text-red-500" />
                        </motion.div>
                      )}
                      {isAnswered && state === "missed" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Advance hint when answered */}
              {isAnswered && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center text-xs text-[var(--text-tertiary)] mt-6"
                >
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                    Enter
                  </kbd>{" "}
                  or{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                    Space
                  </kbd>{" "}
                  to continue
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
