"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  SkipForward,
  RotateCcw,
  Home,
  Trophy,
  Target,
  Clock,
  Headphones,
} from "lucide-react";
import { ProgressBar } from "../../components/ProgressBar";
import { RatingButtons } from "../../components/RatingButtons";
import { TTSService } from "@/study-modes/tts-service";
import type { TTSLanguage } from "@/study-modes/types";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
interface ListeningCard {
  id: string;
  front: string;
  back: string;
  language: TTSLanguage;
  languageLabel: string;
  isRTL: boolean;
  intervals: { again: string; hard: string; good: string; easy: string };
}

const mockCards: ListeningCard[] = [
  {
    id: "l1", front: "\u0643\u062a\u0627\u0628", back: "book",
    language: "ar", languageLabel: "Arabic (MSA)", isRTL: true,
    intervals: { again: "1m", hard: "6m", good: "10m", easy: "4d" },
  },
  {
    id: "l2", front: "\u0645\u062f\u0631\u0633\u0629", back: "school",
    language: "ar", languageLabel: "Arabic (MSA)", isRTL: true,
    intervals: { again: "1m", hard: "6m", good: "1d", easy: "4d" },
  },
  {
    id: "l3", front: "mariposa", back: "butterfly",
    language: "es", languageLabel: "Spanish", isRTL: false,
    intervals: { again: "1m", hard: "6m", good: "10m", easy: "4d" },
  },
  {
    id: "l4", front: "\u0625\u0632\u064a\u0651\u0643", back: "How are you? (Egyptian)",
    language: "ar-EG", languageLabel: "Egyptian Arabic", isRTL: true,
    intervals: { again: "1m", hard: "6m", good: "10m", easy: "4d" },
  },
  {
    id: "l5", front: "biblioteca", back: "library",
    language: "es-MX", languageLabel: "Spanish (Mexico)", isRTL: false,
    intervals: { again: "1m", hard: "6m", good: "1d", easy: "4d" },
  },
];

// ---------------------------------------------------------------------------
// Listening Mode Page
// ---------------------------------------------------------------------------
export default function ListeningModePage() {
  const router = useRouter();
  const tts = useMemo(() => new TTSService(), []);

  const [cards] = useState(mockCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 });
  const [startTime] = useState(Date.now());

  const inputRef = useRef<HTMLInputElement>(null);
  const currentCard = cards[currentIndex] || null;
  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 0;

  // Auto-play audio when card changes
  useEffect(() => {
    if (currentCard && tts.isAvailable()) {
      setPlayCount(0);
      playAudio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const playAudio = useCallback(async () => {
    if (!currentCard || !tts.isAvailable()) return;
    setIsPlaying(true);
    try {
      await tts.speak(currentCard.front, currentCard.language);
    } catch {
      // TTS may fail silently on some browsers
    } finally {
      setIsPlaying(false);
      setPlayCount((prev) => prev + 1);
    }
  }, [currentCard, tts]);

  const handleReveal = useCallback(() => {
    setIsRevealed(true);
    // Focus will stay for rating
  }, []);

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
        setIsRevealed(false);
        setUserInput("");
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
      setIsRevealed(false);
      setUserInput("");
    }
  }, [currentIndex, cards.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // R to replay audio (works globally)
      if ((e.key === "r" || e.key === "R") && !isInput) {
        e.preventDefault();
        playAudio();
        return;
      }

      if (isInput) return;

      // Space/Enter to reveal
      if ((e.key === " " || e.key === "Enter") && !isRevealed) {
        e.preventDefault();
        handleReveal();
        return;
      }

      // Rating shortcuts when revealed
      if (isRevealed) {
        const ratingMap: Record<string, "again" | "hard" | "good" | "easy"> = {
          "1": "again",
          "2": "hard",
          "3": "good",
          "4": "easy",
        };
        if (ratingMap[e.key]) {
          e.preventDefault();
          handleRate(ratingMap[e.key]);
        }
      }

      // S to skip
      if (e.key === "s" || e.key === "S") {
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
  }, [isRevealed, playAudio, handleReveal, handleRate, handleSkip, router]);

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
              className="w-16 h-16 rounded-2xl bg-arabic-500 flex items-center justify-center mx-auto mb-4"
            >
              <Headphones className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Listening Complete!</h2>
          </div>

          <div className="px-6 pb-4 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-xl bg-arabic-50 dark:bg-arabic-950/40 text-center">
              <Target className="w-5 h-5 text-arabic-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{stats.reviewed}</span>
              <span className="text-xs text-[var(--text-tertiary)]">Reviewed</span>
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
                setIsRevealed(false);
                setUserInput("");
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
  // Listening UI
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
          <Headphones className="w-4 h-4 text-arabic-500" />
          <span className="font-medium">Listening Mode</span>
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
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-arabic-50 dark:bg-arabic-950/40 text-arabic-600 dark:text-arabic-400 mb-6">
                {currentCard.languageLabel}
              </div>

              {/* Audio play button (central, prominent) */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={playAudio}
                disabled={isPlaying}
                className={`
                  w-28 h-28 rounded-full flex items-center justify-center mb-8
                  transition-all duration-300 shadow-elevated
                  ${isPlaying
                    ? "bg-arabic-400 dark:bg-arabic-600 scale-105"
                    : "bg-arabic-500 hover:bg-arabic-600"
                  }
                `}
              >
                {isPlaying ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Volume2 className="w-12 h-12 text-white" />
                  </motion.div>
                ) : (
                  <Volume2 className="w-12 h-12 text-white" />
                )}
              </motion.button>

              {/* Play count */}
              <p className="text-xs text-[var(--text-tertiary)] mb-6">
                Played {playCount} time{playCount !== 1 ? "s" : ""} -{" "}
                <button onClick={playAudio} className="underline hover:text-[var(--text-secondary)]">
                  Replay
                </button>{" "}
                <kbd className="px-1 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono ml-1">R</kbd>
              </p>

              {/* Text area - hidden or revealed */}
              <div className="w-full bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                {!isRevealed ? (
                  <>
                    <EyeOff className="w-8 h-8 text-[var(--text-tertiary)] mb-3" />
                    <p className="text-sm text-[var(--text-tertiary)] mb-4">
                      Listen and try to identify the word
                    </p>

                    {/* Optional user input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleReveal();
                        }
                      }}
                      placeholder="Type what you heard (optional)..."
                      dir={currentCard.isRTL ? "rtl" : "ltr"}
                      className={`
                        w-full max-w-sm px-4 py-2.5 rounded-xl
                        bg-[var(--surface-0)] border border-[var(--surface-3)]
                        text-[var(--text-primary)] text-center text-sm
                        placeholder:text-[var(--text-tertiary)]
                        focus:outline-none focus:ring-2 focus:ring-arabic-500
                        ${currentCard.isRTL ? "arabic-text text-lg" : ""}
                      `}
                    />

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleReveal}
                      className="mt-4 px-6 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Reveal Answer
                      </span>
                    </motion.button>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Word in target language */}
                    <p
                      className={`text-3xl font-semibold text-[var(--text-primary)] ${
                        currentCard.isRTL ? "arabic-text" : ""
                      }`}
                      dir={currentCard.isRTL ? "rtl" : "ltr"}
                    >
                      {currentCard.front}
                    </p>

                    <div className="w-12 h-px bg-[var(--surface-3)] mx-auto" />

                    {/* Translation */}
                    <p className="text-lg text-[var(--text-secondary)]">
                      {currentCard.back}
                    </p>

                    {/* Show user's attempt if they typed something */}
                    {userInput.trim() && (
                      <div className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-xs text-[var(--text-tertiary)]">
                        Your guess: <span className="font-medium text-[var(--text-secondary)]">{userInput}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rating buttons (shown when revealed) */}
      <div className="px-6 pb-8 pt-4">
        <AnimatePresence mode="wait">
          {isRevealed && currentCard ? (
            <RatingButtons
              key="rating"
              intervals={currentCard.intervals}
              onRate={handleRate}
            />
          ) : !isRevealed ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-sm text-[var(--text-tertiary)]">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-xs font-mono">Space</kbd>{" "}
                to reveal or type your answer
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
