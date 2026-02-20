"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  RotateCcw,
  Star,
  Trophy,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tajweed Rule Types (inline to avoid import issues in app directory)
// ---------------------------------------------------------------------------

type TajweedRule =
  | "idgham"
  | "ikhfa"
  | "iqlab"
  | "izhar"
  | "qalqalah"
  | "madd-natural"
  | "madd-connected"
  | "madd-separate"
  | "ghunnah"
  | "noon-saakinah"
  | "meem-saakinah"
  | "laam-shamsiyyah"
  | "laam-qamariyyah";

interface TajweedRuleInfo {
  id: TajweedRule;
  name: string;
  arabicName: string;
  color: string;
  description: string;
  example: string;
}

interface QuizQuestion {
  id: number;
  ayahText: string;
  highlightStart: number;
  highlightEnd: number;
  correctRule: TajweedRule;
  surahRef: string;
}

// ---------------------------------------------------------------------------
// Tajweed Rules Reference Data
// ---------------------------------------------------------------------------

const TAJWEED_RULES: TajweedRuleInfo[] = [
  {
    id: "idgham",
    name: "Idgham",
    arabicName: "\u0625\u062F\u063A\u0627\u0645",
    color: "#22c55e",
    description:
      "Merging/assimilation \u2014 noon saakinah or tanween merges into the following letter from \u064A \u0631 \u0645 \u0644 \u0648 \u0646 (yarmaloon). With \u064A \u0646 \u0645 \u0648 there is ghunnah; with \u0631 \u0644 there is no ghunnah.",
    example:
      "\u0645\u0650\u0646 \u064A\u0651\u064E\u0639\u0652\u0645\u064E\u0644\u0652",
  },
  {
    id: "ikhfa",
    name: "Ikhfa",
    arabicName: "\u0625\u062E\u0641\u0627\u0621",
    color: "#3b82f6",
    description:
      "Concealment \u2014 noon saakinah or tanween is partially hidden with nasalization before one of 15 letters. The tongue adjusts toward the following letter.",
    example:
      "\u0645\u0650\u0646\u0652 \u0642\u064E\u0628\u0652\u0644\u0650",
  },
  {
    id: "iqlab",
    name: "Iqlab",
    arabicName: "\u0625\u0642\u0644\u0627\u0628",
    color: "#8b5cf6",
    description:
      "Conversion \u2014 when noon saakinah or tanween is followed by \u0628 (ba), the noon sound converts to a meem sound with ghunnah for 2 counts.",
    example:
      "\u0645\u0650\u0646\u0652 \u0628\u064E\u0639\u0652\u062F\u0650",
  },
  {
    id: "izhar",
    name: "Izhar",
    arabicName: "\u0625\u0638\u0647\u0627\u0631",
    color: "#f97316",
    description:
      "Clear pronunciation \u2014 noon saakinah or tanween before a throat letter (\u0621 \u0647 \u0639 \u062D \u063A \u062E) is pronounced clearly without nasalization.",
    example:
      "\u0645\u0650\u0646\u0652 \u0639\u0650\u0646\u0652\u062F\u0650",
  },
  {
    id: "qalqalah",
    name: "Qalqalah",
    arabicName: "\u0642\u0644\u0642\u0644\u0629",
    color: "#ef4444",
    description:
      "Echoing/bouncing \u2014 when one of the 5 qalqalah letters (\u0642 \u0637 \u0628 \u062C \u062F) has sukoon, it is pronounced with a slight bounce. Stronger at the end of an ayah.",
    example: "\u064A\u064E\u062E\u0652\u0644\u064F\u0642\u0652",
  },
  {
    id: "madd-natural",
    name: "Madd Tabee'i",
    arabicName: "\u0645\u062F \u0637\u0628\u064A\u0639\u064A",
    color: "#06b6d4",
    description:
      "Natural elongation \u2014 a vowel letter (alif after fatha, waw after damma, ya after kasra) held for exactly 2 counts. No cause for extension beyond the natural length.",
    example: "\u0642\u064E\u0627\u0644\u064E",
  },
  {
    id: "madd-connected",
    name: "Madd Muttasil",
    arabicName: "\u0645\u062F \u0645\u062A\u0635\u0644",
    color: "#0891b2",
    description:
      "Connected prolongation \u2014 when a madd letter is followed by hamza in the same word, extend for 4-5 counts. This is obligatory (waajib).",
    example: "\u062C\u064E\u0627\u0621\u064E",
  },
  {
    id: "madd-separate",
    name: "Madd Munfasil",
    arabicName: "\u0645\u062F \u0645\u0646\u0641\u0635\u0644",
    color: "#0e7490",
    description:
      "Separated prolongation \u2014 when a word ends with a madd letter and the next word starts with hamza, extend for 4-5 counts. This is permissible (jaa'iz).",
    example:
      "\u0641\u0650\u064A \u0623\u064E\u0646\u0641\u064F\u0633\u0650\u0643\u064F\u0645\u0652",
  },
  {
    id: "ghunnah",
    name: "Ghunnah",
    arabicName: "\u063A\u0646\u0651\u0629",
    color: "#d946ef",
    description:
      "Nasalization \u2014 a nasal sound from the nose held for approximately 2 counts. Occurs with noon and meem when they have shadda.",
    example: "\u0625\u0650\u0646\u0651\u064E",
  },
  {
    id: "laam-shamsiyyah",
    name: "Laam Shamsiyyah",
    arabicName: "\u0644\u0627\u0645 \u0634\u0645\u0633\u064A\u0629",
    color: "#e11d48",
    description:
      "Sun-letter assimilation \u2014 the laam of \u0627\u0644 is silent before sun letters, and the following letter is doubled. Named after \u0627\u0644\u0634\u0645\u0633.",
    example:
      "\u0627\u0644\u0634\u0651\u064E\u0645\u0652\u0633\u064F",
  },
  {
    id: "laam-qamariyyah",
    name: "Laam Qamariyyah",
    arabicName: "\u0644\u0627\u0645 \u0642\u0645\u0631\u064A\u0629",
    color: "#6366f1",
    description:
      "Moon-letter pronunciation \u2014 the laam of \u0627\u0644 is pronounced clearly before moon letters. Named after \u0627\u0644\u0642\u0645\u0631.",
    example:
      "\u0627\u0644\u0652\u0642\u064E\u0645\u064E\u0631\u0650",
  },
];

// ---------------------------------------------------------------------------
// Quiz Questions (sample questions demonstrating various rules)
// ---------------------------------------------------------------------------

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    ayahText:
      "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650",
    highlightStart: 10,
    highlightEnd: 20,
    correctRule: "laam-shamsiyyah",
    surahRef: "Al-Fatihah 1:1",
  },
  {
    id: 2,
    ayahText:
      "\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0639\u0652\u0628\u064F\u062F\u064F \u0648\u064E\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0633\u0652\u062A\u064E\u0639\u0650\u064A\u0646\u064F",
    highlightStart: 8,
    highlightEnd: 13,
    correctRule: "qalqalah",
    surahRef: "Al-Fatihah 1:5",
  },
  {
    id: 3,
    ayahText:
      "\u0635\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0651\u064E\u0630\u0650\u064A\u0646\u064E \u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652",
    highlightStart: 15,
    highlightEnd: 20,
    correctRule: "izhar",
    surahRef: "Al-Fatihah 1:7",
  },
  {
    id: 4,
    ayahText:
      "\u063A\u064E\u064A\u0652\u0631\u0650 \u0627\u0644\u0652\u0645\u064E\u063A\u0652\u0636\u064F\u0648\u0628\u0650 \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u0648\u064E\u0644\u064E\u0627 \u0627\u0644\u0636\u0651\u064E\u0627\u0644\u0651\u0650\u064A\u0646\u064E",
    highlightStart: 5,
    highlightEnd: 10,
    correctRule: "laam-qamariyyah",
    surahRef: "Al-Fatihah 1:7",
  },
  {
    id: 5,
    ayahText:
      "\u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0631\u064E\u0628\u0651\u0650 \u0627\u0644\u0652\u0639\u064E\u0627\u0644\u064E\u0645\u0650\u064A\u0646\u064E",
    highlightStart: 5,
    highlightEnd: 8,
    correctRule: "qalqalah",
    surahRef: "Al-Fatihah 1:2",
  },
  {
    id: 6,
    ayahText:
      "\u0648\u064E\u0644\u064E\u0627 \u0627\u0644\u0636\u0651\u064E\u0627\u0644\u0651\u0650\u064A\u0646\u064E",
    highlightStart: 3,
    highlightEnd: 8,
    correctRule: "laam-shamsiyyah",
    surahRef: "Al-Fatihah 1:7",
  },
  {
    id: 7,
    ayahText:
      "\u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650",
    highlightStart: 0,
    highlightEnd: 11,
    correctRule: "madd-natural",
    surahRef: "Al-Fatihah 1:3",
  },
  {
    id: 8,
    ayahText:
      "\u0625\u0650\u0646\u0651\u064E\u0627 \u0623\u064E\u0639\u0652\u0637\u064E\u064A\u0652\u0646\u064E\u0627\u0643\u064E \u0627\u0644\u0652\u0643\u064E\u0648\u0652\u062B\u064E\u0631\u064E",
    highlightStart: 0,
    highlightEnd: 5,
    correctRule: "ghunnah",
    surahRef: "Al-Kawthar 108:1",
  },
  {
    id: 9,
    ayahText:
      "\u0642\u064F\u0644\u0652 \u0647\u064F\u0648\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u062D\u064E\u062F\u0652",
    highlightStart: 0,
    highlightEnd: 3,
    correctRule: "qalqalah",
    surahRef: "Al-Ikhlas 112:1",
  },
  {
    id: 10,
    ayahText:
      "\u0645\u0650\u0646 \u0634\u064E\u0631\u0651\u0650 \u0645\u064E\u0627 \u062E\u064E\u0644\u064E\u0642\u064E",
    highlightStart: 0,
    highlightEnd: 5,
    correctRule: "ikhfa",
    surahRef: "Al-Falaq 113:2",
  },
];

// ---------------------------------------------------------------------------
// Tajweed Rule Reference Sidebar
// ---------------------------------------------------------------------------

function RuleReferencePanel({
  isOpen,
  onToggle,
  rules,
}: {
  isOpen: boolean;
  onToggle: () => void;
  rules: TajweedRuleInfo[];
}) {
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-1/2 right-0 -translate-y-1/2 z-50 flex items-center gap-1 px-2 py-3 bg-[var(--surface-1)] border border-[var(--surface-3)] border-r-0 rounded-l-xl shadow-lg hover:bg-[var(--surface-2)] transition-colors"
        title={isOpen ? "Close reference panel" : "Open rule reference"}
      >
        <HelpCircle className="w-4 h-4 text-quran-500" />
        {!isOpen && (
          <span className="text-xs font-medium text-[var(--text-secondary)] writing-mode-vertical hidden sm:block">
            Rules
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-[var(--surface-1)] border-l border-[var(--surface-3)] shadow-elevated z-40 overflow-y-auto"
          >
            <div className="p-4 border-b border-[var(--surface-3)] sticky top-0 bg-[var(--surface-1)]">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Tajweed Rules Reference
                </h3>
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  <XCircle className="w-4 h-4 text-[var(--text-tertiary)]" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-0)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: rule.color }}
                    />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {rule.name}
                    </span>
                    <span
                      className="text-sm text-[var(--text-secondary)] mr-auto"
                      dir="rtl"
                    >
                      {rule.arabicName}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                    {rule.description}
                  </p>
                  <div
                    className="text-lg text-center py-1.5 rounded-lg bg-[var(--surface-1)]"
                    dir="rtl"
                    style={{
                      fontFamily:
                        "'KFGQPC Uthmanic Script HAFS', 'Amiri Quran', serif",
                      color: rule.color,
                    }}
                  >
                    {rule.example}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Tajweed Practice Page
// ---------------------------------------------------------------------------

export default function TajweedPracticePage() {
  const router = useRouter();

  // State
  const [questions] = useState<QuizQuestion[]>(QUIZ_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRule, setSelectedRule] = useState<TajweedRule | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  // Find the rule info for the correct answer
  const correctRuleInfo = useMemo(
    () => TAJWEED_RULES.find((r) => r.id === currentQuestion?.correctRule),
    [currentQuestion]
  );

  // Handle rule selection
  const handleSelectRule = useCallback(
    (rule: TajweedRule) => {
      if (isAnswered) return;

      setSelectedRule(rule);
      setIsAnswered(true);
      setTotalAnswered((prev) => prev + 1);

      const isCorrect = rule === currentQuestion?.correctRule;
      if (isCorrect) {
        setScore((prev) => prev + 1);
        setStreak((prev) => {
          const newStreak = prev + 1;
          setBestStreak((best) => Math.max(best, newStreak));
          return newStreak;
        });
      } else {
        setStreak(0);
      }
    },
    [isAnswered, currentQuestion]
  );

  // Advance to next question
  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedRule(null);
      setIsAnswered(false);
      setShowHint(false);
    }
  }, [currentIndex, questions.length]);

  // Restart quiz
  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setSelectedRule(null);
    setIsAnswered(false);
    setScore(0);
    setTotalAnswered(0);
    setStreak(0);
    setIsComplete(false);
    setShowHint(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (isAnswered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }

      if (e.key === "h") {
        e.preventDefault();
        setShowHint((prev) => !prev);
      }

      if (e.key === "r") {
        e.preventDefault();
        setShowReferencePanel((prev) => !prev);
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (showReferencePanel) {
          setShowReferencePanel(false);
        } else {
          router.push("/study/modes");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnswered, handleNext, showReferencePanel, router]);

  // ---------------------------------------------------------------------------
  // Completion Screen
  // ---------------------------------------------------------------------------

  if (isComplete) {
    const accuracy =
      totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;

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
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Tajweed Practice Complete!
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {accuracy >= 80
                ? "Mashallah! Excellent tajweed knowledge!"
                : accuracy >= 60
                  ? "Good effort! Keep practicing!"
                  : "Keep learning the rules, you'll improve!"}
            </p>
          </div>

          <div className="px-6 pb-4 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded-xl bg-quran-50 dark:bg-quran-950/40 text-center">
              <CheckCircle2 className="w-5 h-5 text-quran-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {score}/{totalAnswered}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Correct
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-center">
              <Star className="w-5 h-5 text-primary-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {accuracy}%
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Accuracy
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-arabic-50 dark:bg-arabic-950/40 text-center">
              <Trophy className="w-5 h-5 text-arabic-500 mb-1" />
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {bestStreak}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Best streak
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleRestart}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--surface-3)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={() => router.push("/study/modes")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-quran-500 text-white text-sm font-medium hover:bg-quran-600 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
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

  // Render the ayah with the highlighted section
  const renderHighlightedAyah = () => {
    if (!currentQuestion) return null;

    const { ayahText, highlightStart, highlightEnd } = currentQuestion;
    const safeStart = Math.min(highlightStart, ayahText.length);
    const safeEnd = Math.min(highlightEnd, ayahText.length);

    const before = ayahText.slice(0, safeStart);
    const highlighted = ayahText.slice(safeStart, safeEnd);
    const after = ayahText.slice(safeEnd);

    // After answering, show the correct rule color; before, show neutral yellow
    const highlightColor = isAnswered && correctRuleInfo ? correctRuleInfo.color : "#f59e0b";
    const highlightBg = isAnswered && correctRuleInfo
      ? `${correctRuleInfo.color}20`
      : "#fef3c7";

    return (
      <div
        className="text-3xl md:text-4xl leading-[2.4] text-[var(--text-primary)] text-center"
        dir="rtl"
        style={{
          fontFamily:
            "'KFGQPC Uthmanic Script HAFS', 'me_quran', 'Scheherazade New', 'Amiri Quran', serif",
        }}
      >
        {before}
        <span
          style={{
            backgroundColor: highlightBg,
            color: isAnswered ? highlightColor : "inherit",
            padding: "2px 4px",
            borderRadius: "4px",
            borderBottom: `3px solid ${highlightColor}`,
            fontWeight: isAnswered ? 700 : "inherit",
          }}
        >
          {highlighted}
        </span>
        {after}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-0)]">
      {/* Reference Panel */}
      <RuleReferencePanel
        isOpen={showReferencePanel}
        onToggle={() => setShowReferencePanel(!showReferencePanel)}
        rules={TAJWEED_RULES}
      />

      {/* Progress bar */}
      <div className="h-1 bg-[var(--surface-2)]">
        <motion.div
          className="h-full bg-quran-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <button
          onClick={() => router.push("/study/modes")}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Back to modes"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>

        <div className="flex items-center gap-4">
          {/* Streak */}
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-quran-50 dark:bg-quran-950/40"
            >
              <Star className="w-3.5 h-3.5 text-quran-500" />
              <span className="text-xs font-bold text-quran-600 dark:text-quran-400">
                {streak}
              </span>
            </motion.div>
          )}

          {/* Score */}
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="font-medium text-green-600 dark:text-green-400">
              {score}
            </span>
            <span className="text-[var(--text-tertiary)]">/</span>
            <span className="font-medium text-[var(--text-secondary)]">
              {totalAnswered}
            </span>
          </div>
        </div>

        <div className="text-sm text-[var(--text-secondary)]">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Main quiz area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-8">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl"
            >
              {/* Ayah card */}
              <div className="bg-[var(--surface-1)] border border-[var(--surface-3)] rounded-2xl shadow-card p-6 sm:p-8 mb-6">
                {renderHighlightedAyah()}
                <p className="text-center text-xs text-[var(--text-tertiary)] mt-3">
                  {currentQuestion.surahRef}
                </p>

                {/* Hint */}
                {showHint && !isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 p-3 bg-[var(--surface-2)] rounded-lg text-center"
                  >
                    <p className="text-sm text-[var(--text-secondary)]">
                      {correctRuleInfo
                        ? `Category: ${
                            ["idgham", "ikhfa", "iqlab", "izhar"].includes(
                              correctRuleInfo.id
                            )
                              ? "Noon Saakinah / Tanween"
                              : correctRuleInfo.id.startsWith("madd-")
                                ? "Madd (Elongation)"
                                : correctRuleInfo.id.startsWith("laam-")
                                  ? "Laam al-Ta'reef"
                                  : correctRuleInfo.name
                          }`
                        : "Think about the interaction between the letters"}
                    </p>
                  </motion.div>
                )}

                {/* Prompt */}
                <div className="mt-6 text-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    What tajweed rule applies to the highlighted section?
                  </p>
                  {!isAnswered && (
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="mt-2 text-xs text-quran-500 hover:text-quran-600 transition-colors"
                    >
                      {showHint ? (
                        <>
                          <EyeOff className="w-3 h-3 inline-block mr-1" />
                          Hide hint
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 inline-block mr-1" />
                          Show hint
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Answer feedback (shown after answering) */}
              <AnimatePresence>
                {isAnswered && correctRuleInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-6 p-4 rounded-xl border-2 ${
                      selectedRule === currentQuestion.correctRule
                        ? "border-green-400 bg-green-50 dark:bg-green-950/30"
                        : "border-red-400 bg-red-50 dark:bg-red-950/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {selectedRule === currentQuestion.correctRule ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-3 h-3 rounded-sm"
                            style={{
                              backgroundColor: correctRuleInfo.color,
                            }}
                          />
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {correctRuleInfo.name}
                          </span>
                          <span
                            className="text-sm text-[var(--text-secondary)]"
                            dir="rtl"
                          >
                            {correctRuleInfo.arabicName}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {correctRuleInfo.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rule selection grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TAJWEED_RULES.map((rule) => {
                  let buttonStyle =
                    "border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]";

                  if (isAnswered) {
                    if (rule.id === currentQuestion.correctRule) {
                      buttonStyle =
                        "border-green-400 bg-green-50 dark:bg-green-950/30";
                    } else if (
                      rule.id === selectedRule &&
                      rule.id !== currentQuestion.correctRule
                    ) {
                      buttonStyle =
                        "border-red-400 bg-red-50 dark:bg-red-950/30 opacity-60";
                    } else {
                      buttonStyle =
                        "border-[var(--surface-3)] bg-[var(--surface-1)] opacity-40";
                    }
                  } else if (rule.id === selectedRule) {
                    buttonStyle =
                      "border-quran-400 bg-quran-50 dark:bg-quran-950/30";
                  }

                  return (
                    <motion.button
                      key={rule.id}
                      whileTap={!isAnswered ? { scale: 0.97 } : undefined}
                      onClick={() => handleSelectRule(rule.id)}
                      disabled={isAnswered}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${buttonStyle} ${
                        isAnswered ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: rule.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {rule.name}
                        </div>
                        <div
                          className="text-[10px] text-[var(--text-tertiary)] truncate"
                          dir="rtl"
                        >
                          {rule.arabicName}
                        </div>
                      </div>
                      {isAnswered &&
                        rule.id === currentQuestion.correctRule && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 ml-auto" />
                        )}
                      {isAnswered &&
                        rule.id === selectedRule &&
                        rule.id !== currentQuestion.correctRule && (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto" />
                        )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Continue button / hint */}
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 text-center"
                >
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-quran-500 text-white text-sm font-medium hover:bg-quran-600 transition-colors"
                  >
                    {currentIndex + 1 >= questions.length
                      ? "See Results"
                      : "Next Question"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                      Enter
                    </kbd>{" "}
                    to continue
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom shortcuts bar */}
      <div className="text-center pb-4">
        <p className="text-xs text-[var(--text-tertiary)]">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
            H
          </kbd>{" "}
          hint &bull;{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
            R
          </kbd>{" "}
          rules reference &bull;{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
            Esc
          </kbd>{" "}
          back
        </p>
      </div>
    </div>
  );
}
