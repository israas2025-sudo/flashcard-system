"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Lock,
  Check,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LanguageId = "quran" | "msa" | "egyptian" | "spanish" | "shami" | "urdu" | "french";
type ProficiencyLevel = "beginner" | "intermediate" | "advanced";
type DailyCards = 5 | 10 | 20 | 30;

interface LanguageConfig {
  id: LanguageId;
  label: string;
  accent: string;
  available: boolean;
  badge?: string;
}

interface LanguageSelection {
  id: LanguageId;
  level: ProficiencyLevel;
  dailyCards: DailyCards;
}

interface OnboardingData {
  completed: boolean;
  languages: { id: string; level: string; dailyCards: number }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 3;

const LANGUAGES: LanguageConfig[] = [
  { id: "quran", label: "Quranic Arabic", accent: "#14B8A6", available: true },
  { id: "msa", label: "Arabic MSA", accent: "#F59E0B", available: true },
  {
    id: "egyptian",
    label: "Egyptian Arabic / Masri",
    accent: "#8B5CF6",
    available: true,
  },
  { id: "spanish", label: "Spanish", accent: "#F97316", available: true },
  {
    id: "shami",
    label: "Shami Arabic",
    accent: "#6B7280",
    available: false,
    badge: "In Development",
  },
  {
    id: "urdu",
    label: "Urdu",
    accent: "#6B7280",
    available: false,
    badge: "In Development",
  },
  {
    id: "french",
    label: "French",
    accent: "#6B7280",
    available: false,
    badge: "In Development",
  },
];

const LEVELS: { value: ProficiencyLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const DAILY_CARD_OPTIONS: DailyCards[] = [5, 10, 20, 30];

// ---------------------------------------------------------------------------
// Slide animation variants
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// OnboardingPage
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state: tracks each selected language with its settings
  const [selections, setSelections] = useState<LanguageSelection[]>([]);

  // Track which language card is expanded (showing level/daily options)
  const [expandedLang, setExpandedLang] = useState<LanguageId | null>(null);

  // Helper: is a language selected?
  const isSelected = (id: LanguageId) =>
    selections.some((s) => s.id === id);

  // Helper: get selection for a language
  const getSelection = (id: LanguageId) =>
    selections.find((s) => s.id === id);

  // Toggle language selection
  const toggleLanguage = (id: LanguageId) => {
    if (isSelected(id)) {
      setSelections((prev) => prev.filter((s) => s.id !== id));
      if (expandedLang === id) setExpandedLang(null);
    } else {
      setSelections((prev) => [
        ...prev,
        { id, level: "beginner", dailyCards: 20 },
      ]);
      setExpandedLang(id);
    }
  };

  // Update a language's level
  const updateLevel = (id: LanguageId, level: ProficiencyLevel) => {
    setSelections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, level } : s))
    );
  };

  // Update a language's daily cards
  const updateDailyCards = (id: LanguageId, dailyCards: DailyCards) => {
    setSelections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dailyCards } : s))
    );
  };

  // Navigation
  const canGoNext = useCallback(() => {
    switch (step) {
      case 0:
        return true; // Welcome -- always can proceed
      case 1:
        return selections.length > 0;
      case 2:
        return true; // Review -- "Get Started" handles completion
      default:
        return false;
    }
  }, [step, selections]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1 && canGoNext()) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step, canGoNext]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  // Complete onboarding
  const handleComplete = useCallback(() => {
    setLoading(true);

    try {
      const data: OnboardingData = {
        completed: true,
        languages: selections.map(({ id, level, dailyCards }) => ({
          id,
          level,
          dailyCards,
        })),
      };

      localStorage.setItem("lughati-onboarding", JSON.stringify(data));
      router.push("/");
    } catch (error) {
      console.error("Onboarding save failed:", error);
      setLoading(false);
    }
  }, [selections, router]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--surface-0)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--surface-3)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <span
              className="text-white font-bold text-sm"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              ل
            </span>
          </div>
          <span className="font-semibold text-[15px] text-[var(--text-primary)] tracking-tight">
            Lughati
          </span>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className={`
                h-2 rounded-full transition-all duration-300
                ${
                  i === step
                    ? "w-6 bg-primary-500"
                    : i < step
                    ? "w-2 bg-primary-300 dark:bg-primary-700"
                    : "w-2 bg-[var(--surface-3)]"
                }
              `}
              layout
            />
          ))}
        </div>

        {/* Step label */}
        <span className="text-xs text-[var(--text-tertiary)] font-medium min-w-[80px] text-right">
          {step + 1} of {TOTAL_STEPS}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {/* Step 0: Welcome */}
              {step === 0 && <WelcomeStep />}

              {/* Step 1: Language Selection */}
              {step === 1 && (
                <LanguageStep
                  selections={selections}
                  expandedLang={expandedLang}
                  setExpandedLang={setExpandedLang}
                  isSelected={isSelected}
                  getSelection={getSelection}
                  toggleLanguage={toggleLanguage}
                  updateLevel={updateLevel}
                  updateDailyCards={updateDailyCards}
                />
              )}

              {/* Step 2: Review */}
              {step === 2 && (
                <ReviewStep
                  selections={selections}
                  loading={loading}
                  onGetStarted={handleComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation */}
      {step < TOTAL_STEPS - 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--surface-3)]">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goBack}
            disabled={step === 0}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${
                step === 0
                  ? "text-[var(--text-tertiary)] cursor-not-allowed opacity-40"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              }
            `}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goNext}
            disabled={!canGoNext()}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${
                canGoNext()
                  ? "bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--text-tertiary)] cursor-not-allowed"
              }
            `}
          >
            {step === 0 ? "Let's Go" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      )}

      {step === TOTAL_STEPS - 1 && (
        <div className="flex items-center justify-center px-6 py-4 border-t border-[var(--surface-3)]">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 0 -- Welcome
// ---------------------------------------------------------------------------

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 space-y-8">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-3xl bg-primary-500 flex items-center justify-center shadow-glow"
      >
        <span
          className="text-white font-bold text-4xl"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          ل
        </span>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">
          Welcome to Lughati
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-md">
          Master any language with spaced repetition. Let&apos;s set up your
          personalized study experience.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap items-center justify-center gap-3 max-w-md"
      >
        {[
          "FSRS-5 Algorithm",
          "Multilingual",
          "Streak Tracking",
          "Dark Mode",
        ].map((feature, i) => (
          <motion.span
            key={feature}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-1)] border border-[var(--surface-3)] text-xs font-medium text-[var(--text-secondary)]"
          >
            <Sparkles className="w-3 h-3 text-primary-500" />
            {feature}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 -- Language Selection (with inline level & daily cards)
// ---------------------------------------------------------------------------

function LanguageStep({
  selections,
  expandedLang,
  setExpandedLang,
  isSelected,
  getSelection,
  toggleLanguage,
  updateLevel,
  updateDailyCards,
}: {
  selections: LanguageSelection[];
  expandedLang: LanguageId | null;
  setExpandedLang: (id: LanguageId | null) => void;
  isSelected: (id: LanguageId) => boolean;
  getSelection: (id: LanguageId) => LanguageSelection | undefined;
  toggleLanguage: (id: LanguageId) => void;
  updateLevel: (id: LanguageId, level: ProficiencyLevel) => void;
  updateDailyCards: (id: LanguageId, dailyCards: DailyCards) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          Choose your languages
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Select one or more languages to study. You can always add more later.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LANGUAGES.map((lang, index) => {
          const selected = isSelected(lang.id);
          const locked = !lang.available;
          const expanded = expandedLang === lang.id && selected;
          const sel = getSelection(lang.id);

          return (
            <motion.div
              key={lang.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={`
                rounded-xl border-2 overflow-hidden transition-all duration-200
                ${
                  locked
                    ? "border-[var(--surface-3)] bg-[var(--surface-1)] opacity-60 cursor-not-allowed"
                    : selected
                    ? "border-current bg-[var(--surface-1)] shadow-card-hover"
                    : "border-[var(--surface-3)] bg-[var(--surface-1)] hover:border-[var(--text-tertiary)] hover:shadow-card"
                }
              `}
              style={
                selected && !locked
                  ? { borderColor: lang.accent }
                  : undefined
              }
            >
              {/* Card Header -- Clickable */}
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  if (selected) {
                    // If already selected, toggle expand or deselect
                    if (expanded) {
                      // Clicking the expanded card header deselects it
                      toggleLanguage(lang.id);
                    } else {
                      setExpandedLang(lang.id);
                    }
                  } else {
                    toggleLanguage(lang.id);
                  }
                }}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: locked
                      ? "var(--surface-2)"
                      : `${lang.accent}18`,
                  }}
                >
                  {locked ? (
                    <Lock
                      className="w-5 h-5"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  ) : (
                    <BookOpen
                      className="w-5 h-5"
                      style={{ color: lang.accent }}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`
                      block font-semibold text-sm truncate
                      ${locked ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}
                    `}
                  >
                    {lang.label}
                  </span>
                  {lang.badge && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-2)] text-[var(--text-tertiary)]">
                      {lang.badge}
                    </span>
                  )}
                </div>

                {/* Selection indicator */}
                {!locked && (
                  <div
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      transition-all duration-200
                    `}
                    style={
                      selected
                        ? {
                            borderColor: lang.accent,
                            backgroundColor: lang.accent,
                          }
                        : { borderColor: "var(--surface-3)" }
                    }
                  >
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                        }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </motion.div>
                    )}
                  </div>
                )}
              </button>

              {/* Expandable Settings Section */}
              <AnimatePresence>
                {expanded && sel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 pb-4 pt-1 border-t space-y-4"
                      style={{
                        borderColor: `${lang.accent}30`,
                      }}
                    >
                      {/* Level Selector */}
                      <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                          What&apos;s your level?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {LEVELS.map((lvl) => (
                            <label
                              key={lvl.value}
                              className={`
                                inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                                cursor-pointer border transition-all duration-150
                                ${
                                  sel.level === lvl.value
                                    ? "text-white border-transparent"
                                    : "text-[var(--text-secondary)] border-[var(--surface-3)] bg-[var(--surface-0)] hover:border-[var(--text-tertiary)]"
                                }
                              `}
                              style={
                                sel.level === lvl.value
                                  ? { backgroundColor: lang.accent }
                                  : undefined
                              }
                            >
                              <input
                                type="radio"
                                name={`level-${lang.id}`}
                                value={lvl.value}
                                checked={sel.level === lvl.value}
                                onChange={() => updateLevel(lang.id, lvl.value)}
                                className="sr-only"
                              />
                              {lvl.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Daily Cards Selector */}
                      <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                          How many new cards per day?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {DAILY_CARD_OPTIONS.map((num) => (
                            <label
                              key={num}
                              className={`
                                inline-flex items-center justify-center w-12 py-1.5 rounded-lg text-xs font-medium
                                cursor-pointer border transition-all duration-150
                                ${
                                  sel.dailyCards === num
                                    ? "text-white border-transparent"
                                    : "text-[var(--text-secondary)] border-[var(--surface-3)] bg-[var(--surface-0)] hover:border-[var(--text-tertiary)]"
                                }
                              `}
                              style={
                                sel.dailyCards === num
                                  ? { backgroundColor: lang.accent }
                                  : undefined
                              }
                            >
                              <input
                                type="radio"
                                name={`daily-${lang.id}`}
                                value={num}
                                checked={sel.dailyCards === num}
                                onChange={() => updateDailyCards(lang.id, num)}
                                className="sr-only"
                              />
                              {num}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Settings note */}
                      <p className="text-[10px] text-[var(--text-tertiary)] italic">
                        You can change this later in Settings
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 -- Review & Get Started
// ---------------------------------------------------------------------------

function ReviewStep({
  selections,
  loading,
  onGetStarted,
}: {
  selections: LanguageSelection[];
  loading: boolean;
  onGetStarted: () => void;
}) {
  const getLangLabel = (id: LanguageId) =>
    LANGUAGES.find((l) => l.id === id)?.label ?? id;

  const getLangAccent = (id: LanguageId) =>
    LANGUAGES.find((l) => l.id === id)?.accent ?? "#6366F1";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Sparkles className="w-10 h-10 text-primary-500 mx-auto mb-3" />
        </motion.div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          You&apos;re all set!
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Here&apos;s a summary of your study plan.
        </p>
      </div>

      {/* Selection Summary Cards */}
      <div className="max-w-md mx-auto space-y-3">
        {selections.map((sel, index) => (
          <motion.div
            key={sel.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)]"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${getLangAccent(sel.id)}18` }}
            >
              <BookOpen
                className="w-5 h-5"
                style={{ color: getLangAccent(sel.id) }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                {getLangLabel(sel.id)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {sel.level.charAt(0).toUpperCase() + sel.level.slice(1)} &middot;{" "}
                {sel.dailyCards} cards/day
              </p>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: getLangAccent(sel.id) }}
            >
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Get Started Button */}
      <div className="flex justify-center pt-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onGetStarted}
          disabled={loading}
          className={`
            inline-flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-semibold
            transition-all duration-200 shadow-md
            ${
              loading
                ? "bg-primary-400 text-white/80 cursor-wait"
                : "bg-primary-500 text-white hover:bg-primary-600 hover:shadow-lg"
            }
          `}
        >
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Setting up...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Get Started
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
