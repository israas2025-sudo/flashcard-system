"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  PenLine,
  Check,
  SkipForward,
  RotateCcw,
  Home,
  Trophy,
  Target,
  Clock,
} from "lucide-react";
import { ProgressBar } from "../../components/ProgressBar";
import { RatingButtons } from "../../components/RatingButtons";
import { AnswerChecker } from "@/study-modes/answer-checker";
import type { CheckResult, DiffResult } from "@/study-modes/types";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
interface WritingCard {
  id: string;
  prompt: string;        // Shown to the user (e.g. English meaning)
  correctAnswer: string; // What they should type (e.g. Arabic/Spanish word)
  language: "arabic" | "spanish" | "english";
  languageLabel: string;
  isRTL: boolean;
  intervals: { again: string; hard: string; good: string; easy: string };
}

const mockCards: WritingCard[] = [
  {
    id: "w1", prompt: "book", correctAnswer: "\u0643\u062a\u0627\u0628",
    language: "arabic", languageLabel: "Arabic (MSA)", isRTL: true,
    intervals: { again: "1m", hard: "6m", good: "10m", easy: "4d" },
  },
  {
    id: "w2", prompt: "school", correctAnswer: "\u0645\u062f\u0631\u0633\u0629",
    language: "arabic", languageLabel: "Arabic (MSA)", isRTL: true,
    intervals: { again: "1m", hard: "6m", good: "1d", easy: "4d" },
  },
  {
    id: "w3", prompt: "butterfly", correctAnswer: "mariposa",
    language: "spanish", languageLabel: "Spanish", isRTL: false,
    intervals: { again: "1m", hard: "6m", good: "10m", easy: "4d" },
  },
  {
    id: "w4", prompt: "library", correctAnswer: "biblioteca",
    language: "spanish", languageLabel: "Spanish", isRTL: false,
    intervals: { again: "1m", hard: "6m", good: "1d", easy: "4d" },
  },
  {
    id: "w5", prompt: "sun", correctAnswer: "\u0634\u0645\u0633",
    language: "arabic", languageLabel: "Arabic (MSA)", isRTL: true,
    intervals: { again: "1m", hard: "6m", good: "10m", easy: "4d" },
  },
];

// ---------------------------------------------------------------------------
// Diff display component
// ---------------------------------------------------------------------------
function DiffDisplay({ diff, isRTL }: { diff: DiffResult[]; isRTL: boolean }) {
  const statusStyles: Record<string, string> = {
    correct: "text-green-600 dark:text-green-400",
    wrong: "text-red-500 dark:text-red-400 line-through",
    missing: "text-amber-500 dark:text-amber-400 underline decoration-wavy",
    extra: "text-red-400 dark:text-red-500 line-through opacity-60",
  };

  return (
    <div
      className={`flex flex-wrap gap-0 text-2xl font-medium ${isRTL ? "direction-rtl justify-center" : "justify-center"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {diff.map((d, i) => (
        <span
          key={i}
          className={`${statusStyles[d.status]} ${isRTL ? "arabic-text" : ""}`}
          title={d.status}
        >
          {d.char === " " ? "\u00a0" : d.char}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accuracy badge
// ---------------------------------------------------------------------------
function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const pct = Math.round(accuracy * 100);
  let color: string;
  let label: string;

  if (pct === 100) {
    color = "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400";
    label = "Perfect!";
  } else if (pct >= 85) {
    color = "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400";
    label = "Close!";
  } else {
    color = "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400";
    label = "Keep trying";
  }

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${color}`}
    >
      {label} ({pct}%)
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Writing Mode Page
// ---------------------------------------------------------------------------
export default function WritingModePage() {
  const router = useRouter();
  const checker = useMemo(() => new AnswerChecker(), []);

  const [cards] = useState(mockCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 });
  const [startTime] = useState(Date.now());

  const inputRef = useRef<HTMLInputElement>(null);
  const currentCard = cards[currentIndex] || null;
  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 0;

  // Focus input when card changes
  useEffect(() => {
    if (inputRef.current && !isSubmitted) {
      inputRef.current.focus();
    }
  }, [currentIndex, isSubmitted]);

  const handleSubmit = useCallback(() => {
    if (!currentCard || isSubmitted || !userAnswer.trim()) return;

    let result: CheckResult;
    if (currentCard.language === "arabic") {
      result = checker.checkArabic(userAnswer, currentCard.correctAnswer, true);
    } else if (currentCard.language === "spanish") {
      result = checker.checkSpanish(userAnswer, currentCard.correctAnswer);
    } else {
      result = checker.check(userAnswer, currentCard.correctAnswer);
    }

    setCheckResult(result);
    setIsSubmitted(true);
  }, [currentCard, isSubmitted, userAnswer, checker]);

  const handleRate = useCallback(
    (rating: "again" | "hard" | "good" | "easy") => {
      setStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (rating === "good" || rating === "easy" ? 1 : 0),
      }));

      const next = currentIndex + 1;
      if (next >= cards.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex(next);
        setUserAnswer("");
        setIsSubmitted(false);
        setCheckResult(null);
      }
    },
    [currentIndex, cards.length]
  );

  const handleSkip = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= cards.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(next);
      setUserAnswer("");
      setIsSubmitted(false);
      setCheckResult(null);
    }
  }, [currentIndex, cards.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (isInput) {
        // Enter to submit answer
        if (e.key === "Enter" && !isSubmitted && userAnswer.trim()) {
          e.preventDefault();
          handleSubmit();
        }
        return;
      }

      // Rating shortcuts when submitted
      if (isSubmitted) {
        const ratingMap: Record<string, "again" | "hard" | "good" | "easy"> = {
          "1": "again", "2": "hard", "3": "good", "4": "easy",
        };
        if (ratingMap[e.key]) {
          e.preventDefault();
          handleRate(ratingMap[e.key]);
        }
      }

      if ((e.key === "s" || e.key === "S") && !isInput) {
        e.preventDefault();
        handleSkip();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/study/modes");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitted, userAnswer, handleSubmit, handleRate, handleSkip, router]);

  // ---------------------------------------------------------------------------
  // Complete screen
  // ---------------------------------------------------------------------------
  if (isComplete) {
    const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0;
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
              className="w-16 h-16 rounded-2xl bg-spanish-500 flex items-center justify-center mx-auto mb-4"
            >
              <PenLine className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Writing Complete!</h2>
          </div>

          <div className="px-6 pb-4 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-xl bg-spanish-50 dark:bg-spanish-950/40 text-center">
              <Target className="w-5 h-5 text-spanish-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{stats.reviewed}</span>
              <span className="text-xs text-[var(--text-tertiary)]">Written</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-center">
              <Trophy className="w-5 h-5 text-primary-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{accuracy}%</span>
              <span className="text-xs text-[var(--text-tertiary)]">Accuracy</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-quran-50 dark:bg-quran-950/40 text-center">
              <Clock className="w-5 h-5 text-quran-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{elapsed}s</span>
              <span className="text-xs text-[var(--text-tertiary)]">Time</span>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsComplete(false);
                setIsSubmitted(false);
                setUserAnswer("");
                setCheckResult(null);
                setStats({ reviewed: 0, correct: 0 });
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
  // Writing UI
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-0)]">
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
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <PenLine className="w-4 h-4 text-spanish-500" />
          <span className="font-medium">Writing Mode</span>
        </div>
        <button
          onClick={handleSkip}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Skip card"
        >
          <SkipForward className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg flex flex-col items-center"
            >
              {/* Language badge */}
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-spanish-50 dark:bg-spanish-950/40 text-spanish-600 dark:text-spanish-400 mb-6">
                {currentCard.languageLabel}
              </div>

              {/* Prompt */}
              <div className="text-center mb-8">
                <p className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wide">
                  Type the translation
                </p>
                <p className="text-3xl font-semibold text-[var(--text-primary)]">
                  {currentCard.prompt}
                </p>
              </div>

              {/* Input area */}
              <div className="w-full bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] p-6">
                {!isSubmitted ? (
                  <div className="flex flex-col items-center gap-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && userAnswer.trim()) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      placeholder={
                        currentCard.isRTL
                          ? "...اكتب الإجابة هنا"
                          : "Type your answer here..."
                      }
                      dir={currentCard.isRTL ? "rtl" : "ltr"}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className={`
                        w-full px-4 py-3 rounded-xl text-center text-xl
                        bg-[var(--surface-0)] border border-[var(--surface-3)]
                        text-[var(--text-primary)]
                        placeholder:text-[var(--text-tertiary)]
                        focus:outline-none focus:ring-2 focus:ring-spanish-500 focus:border-transparent
                        ${currentCard.isRTL ? "arabic-text" : ""}
                      `}
                    />

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmit}
                      disabled={!userAnswer.trim()}
                      className="px-6 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Check Answer
                    </motion.button>

                    <p className="text-xs text-[var(--text-tertiary)]">
                      Press{" "}
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                        Enter
                      </kbd>{" "}
                      to submit
                    </p>
                  </div>
                ) : (
                  checkResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      {/* Accuracy badge */}
                      <div className="text-center">
                        <AccuracyBadge accuracy={checkResult.accuracy} />
                      </div>

                      {/* Diff display */}
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-tertiary)] mb-2">
                          Your answer:
                        </p>
                        <DiffDisplay diff={checkResult.diff} isRTL={currentCard.isRTL} />
                      </div>

                      {/* Correct answer */}
                      <div className="text-center pt-3 border-t border-[var(--surface-3)]">
                        <p className="text-xs text-[var(--text-tertiary)] mb-2">
                          Correct answer:
                        </p>
                        <p
                          className={`text-2xl font-medium text-[var(--text-primary)] ${
                            currentCard.isRTL ? "arabic-text" : ""
                          }`}
                          dir={currentCard.isRTL ? "rtl" : "ltr"}
                        >
                          {currentCard.correctAnswer}
                        </p>
                      </div>

                      {/* Color legend */}
                      <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Correct
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Extra
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Missing
                        </span>
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rating buttons (shown after submission) */}
      <div className="px-6 pb-8 pt-4">
        <AnimatePresence mode="wait">
          {isSubmitted && currentCard ? (
            <RatingButtons
              key="rating"
              intervals={currentCard.intervals}
              onRate={handleRate}
            />
          ) : !isSubmitted ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-sm text-[var(--text-tertiary)]">
                Type the answer in the target language, then press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-xs font-mono">
                  Enter
                </kbd>
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
