"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Zap,
  Timer,
  Trophy,
  Target,
  Clock,
  Flame,
  RotateCcw,
  Home,
  Settings,
} from "lucide-react";
import type { SpeedTimerDuration, SpeedRoundStats } from "@/study-modes/types";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
interface SpeedCard {
  id: string;
  front: string;
  back: string;
  language: "arabic" | "spanish" | "english";
  isRTL: boolean;
}

const mockCards: SpeedCard[] = [
  { id: "s1", front: "\u0643\u062a\u0627\u0628", back: "book", language: "arabic", isRTL: true },
  { id: "s2", front: "\u0642\u0644\u0645", back: "pen", language: "arabic", isRTL: true },
  { id: "s3", front: "mariposa", back: "butterfly", language: "spanish", isRTL: false },
  { id: "s4", front: "\u0628\u064a\u062a", back: "house", language: "arabic", isRTL: true },
  { id: "s5", front: "estrella", back: "star", language: "spanish", isRTL: false },
  { id: "s6", front: "\u0645\u0627\u0621", back: "water", language: "arabic", isRTL: true },
  { id: "s7", front: "montaña", back: "mountain", language: "spanish", isRTL: false },
  { id: "s8", front: "\u0634\u0645\u0633", back: "sun", language: "arabic", isRTL: true },
  { id: "s9", front: "biblioteca", back: "library", language: "spanish", isRTL: false },
  { id: "s10", front: "\u0645\u062f\u0631\u0633\u0629", back: "school", language: "arabic", isRTL: true },
];

// ---------------------------------------------------------------------------
// Timer ring component
// ---------------------------------------------------------------------------
function TimerRing({
  timeRemaining,
  totalTime,
}: {
  timeRemaining: number;
  totalTime: number;
}) {
  const fraction = timeRemaining / totalTime;
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference * (1 - fraction);

  // Color transitions: green -> yellow -> red
  let color: string;
  if (fraction > 0.5) {
    color = "#22C55E"; // Green
  } else if (fraction > 0.25) {
    color = "#F59E0B"; // Amber
  } else {
    color = "#EF4444"; // Red
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full -rotate-90"
      viewBox="0 0 120 120"
    >
      {/* Background circle */}
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="4"
      />
      {/* Progress circle */}
      <motion.circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.1, ease: "linear" }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Speed Round Page
// ---------------------------------------------------------------------------
export default function SpeedRoundPage() {
  const router = useRouter();
  const [cards] = useState(mockCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [timerDuration, setTimerDuration] = useState<SpeedTimerDuration>(5);
  const [timeRemaining, setTimeRemaining] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true); // Show settings first
  const [isComplete, setIsComplete] = useState(false);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [timedOutCount, setTimedOutCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [cardStartTime, setCardStartTime] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCard = cards[currentIndex] || null;

  // Timer tick
  useEffect(() => {
    if (!isRunning || isFlipped) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 0.1;
        if (next <= 0) {
          // Time's up -- count as "Again"
          handleTimedOut();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isFlipped, currentIndex]);

  const handleTimedOut = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsFlipped(true);
    setTimedOutCount((prev) => prev + 1);
    setCurrentStreak(0);

    // Haptic feedback (if available)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(200);
    }

    // Auto-advance after showing answer briefly
    setTimeout(() => advanceToNext(), 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceToNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const next = currentIndex + 1;
    if (next >= cards.length) {
      setIsComplete(true);
      setIsRunning(false);
    } else {
      setCurrentIndex(next);
      setIsFlipped(false);
      setTimeRemaining(timerDuration);
      setCardStartTime(Date.now());
    }
  }, [currentIndex, cards.length, timerDuration]);

  // Know it (correct -- right side tap)
  const handleCorrect = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const responseTime = Date.now() - cardStartTime;
    setResponseTimes((prev) => [...prev, responseTime]);
    setCorrectCount((prev) => prev + 1);
    const newStreak = currentStreak + 1;
    setCurrentStreak(newStreak);
    if (newStreak > longestStreak) setLongestStreak(newStreak);
    setIsFlipped(true);

    setTimeout(() => advanceToNext(), 600);
  }, [cardStartTime, currentStreak, longestStreak, advanceToNext]);

  // Don't know (incorrect -- left side tap)
  const handleIncorrect = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const responseTime = Date.now() - cardStartTime;
    setResponseTimes((prev) => [...prev, responseTime]);
    setIncorrectCount((prev) => prev + 1);
    setCurrentStreak(0);
    setIsFlipped(true);

    setTimeout(() => advanceToNext(), 1200);
  }, [cardStartTime, advanceToNext]);

  // Start game
  const handleStart = useCallback(() => {
    setShowSettings(false);
    setIsRunning(true);
    setTimeRemaining(timerDuration);
    setCardStartTime(Date.now());
    setStartTime(Date.now());
    setCurrentIndex(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setTimedOutCount(0);
    setCurrentStreak(0);
    setLongestStreak(0);
    setResponseTimes([]);
    setIsFlipped(false);
    setIsComplete(false);
  }, [timerDuration]);

  // Keyboard shortcuts
  useEffect(() => {
    if (showSettings || isComplete) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (!isFlipped) {
        // ArrowRight or Enter = correct
        if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCorrect();
        }
        // ArrowLeft = incorrect
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleIncorrect();
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/study/modes");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, isComplete, isFlipped, handleCorrect, handleIncorrect, router]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Settings screen
  // ---------------------------------------------------------------------------
  if (showSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--surface-0)] p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full max-w-sm"
        >
          <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] shadow-elevated p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Speed Round</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Race the clock! Quick binary judgments.
              </p>
            </div>

            {/* Timer selection */}
            <div className="mb-6">
              <p className="text-xs font-medium text-[var(--text-tertiary)] mb-3 uppercase tracking-wide">
                Time per card
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([3, 5, 10] as SpeedTimerDuration[]).map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setTimerDuration(duration)}
                    className={`
                      py-3 rounded-xl text-sm font-medium transition-all border
                      ${
                        timerDuration === duration
                          ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                          : "bg-[var(--surface-0)] border-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                      }
                    `}
                  >
                    {duration}s
                  </button>
                ))}
              </div>
            </div>

            {/* Card count */}
            <div className="mb-6 p-3 rounded-xl bg-[var(--surface-0)] text-center">
              <p className="text-xs text-[var(--text-tertiary)]">Cards to review</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{cards.length}</p>
            </div>

            {/* Start button */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/study/modes")}
                className="flex-1 py-3 rounded-xl border border-[var(--surface-3)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
              >
                Back
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Start!
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Complete screen
  // ---------------------------------------------------------------------------
  if (isComplete) {
    const totalCards = correctCount + incorrectCount + timedOutCount;
    const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    const avgResponseMs =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const cpm = elapsed > 0 ? Math.round((totalCards / elapsed) * 60) : 0;

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
              className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center mx-auto mb-4"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Speed Stats</h2>
          </div>

          <div className="px-6 pb-4 grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-center">
              <Target className="w-5 h-5 text-red-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{accuracy}%</span>
              <span className="text-xs text-[var(--text-tertiary)]">Accuracy</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-center">
              <Clock className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{avgResponseMs}ms</span>
              <span className="text-xs text-[var(--text-tertiary)]">Avg Response</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-center">
              <Zap className="w-5 h-5 text-primary-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{cpm}</span>
              <span className="text-xs text-[var(--text-tertiary)]">Cards/min</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-quran-50 dark:bg-quran-950/40 text-center">
              <Flame className="w-5 h-5 text-quran-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{longestStreak}</span>
              <span className="text-xs text-[var(--text-tertiary)]">Best Streak</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 justify-center text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {correctCount} correct
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {incorrectCount} wrong
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {timedOutCount} timed out
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => {
                setShowSettings(true);
                setIsComplete(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--surface-3)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Again
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
  // Speed Round UI
  // ---------------------------------------------------------------------------
  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-0)]">
      {/* Thin progress bar */}
      <div className="h-[3px] w-full bg-[var(--surface-2)]">
        <motion.div
          className="h-full bg-red-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <button
          onClick={() => {
            setIsRunning(false);
            router.push("/study/modes");
          }}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Exit"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>

        {/* Streak display */}
        <div className="flex items-center gap-3">
          {currentStreak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-sm font-medium text-amber-500"
            >
              <Flame className="w-4 h-4" />
              {currentStreak}
            </motion.div>
          )}
          <span className="text-sm text-[var(--text-secondary)]">
            {currentIndex + 1}/{cards.length}
          </span>
        </div>

        <div className="text-sm font-medium">
          <span className="text-green-500">{correctCount}</span>
          <span className="text-[var(--text-tertiary)]"> / </span>
          <span className="text-red-500">{incorrectCount}</span>
        </div>
      </div>

      {/* Main card area */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm"
            >
              {/* Timer ring container */}
              <div className="relative aspect-square max-w-[280px] mx-auto">
                {!isFlipped && (
                  <TimerRing timeRemaining={timeRemaining} totalTime={timerDuration} />
                )}

                {/* Card content */}
                <div className="absolute inset-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--surface-3)] shadow-card flex flex-col items-center justify-center p-6">
                  {!isFlipped ? (
                    <>
                      {/* Timer text */}
                      <div className="text-xs text-[var(--text-tertiary)] mb-4">
                        {Math.ceil(timeRemaining)}s
                      </div>

                      {/* Front */}
                      <p
                        className={`text-3xl font-semibold text-[var(--text-primary)] text-center ${
                          currentCard.isRTL ? "arabic-text" : ""
                        }`}
                        dir={currentCard.isRTL ? "rtl" : "ltr"}
                      >
                        {currentCard.front}
                      </p>
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, rotateY: 90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      className="text-center"
                    >
                      <p
                        className={`text-xl text-[var(--text-secondary)] mb-3 ${
                          currentCard.isRTL ? "arabic-text" : ""
                        }`}
                        dir={currentCard.isRTL ? "rtl" : "ltr"}
                      >
                        {currentCard.front}
                      </p>
                      <div className="w-10 h-px bg-[var(--surface-3)] mx-auto mb-3" />
                      <p className="text-2xl font-medium text-[var(--text-primary)]">
                        {currentCard.back}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Tap zones (only when not flipped) */}
              {!isFlipped && (
                <div className="flex gap-3 mt-6">
                  <motion.button
                    whileTap={{ scale: 0.95, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                    onClick={handleIncorrect}
                    className="flex-1 py-4 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30">&larr;</span>
                    Don't Know
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95, backgroundColor: "rgba(34, 197, 94, 0.1)" }}
                    onClick={handleCorrect}
                    className="flex-1 py-4 rounded-xl border-2 border-green-200 dark:border-green-800 text-green-500 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex items-center justify-center gap-2"
                  >
                    Know It
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/30">&rarr;</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom hint */}
      <div className="px-6 pb-6 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">&larr;</kbd>{" "}
          Don't know{" "}
          <span className="mx-2 text-[var(--surface-3)]">|</span>{" "}
          Know it{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">&rarr;</kbd>
        </p>
      </div>
    </div>
  );
}
