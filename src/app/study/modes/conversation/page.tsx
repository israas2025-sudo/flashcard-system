"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Globe,
  ChevronDown,
  Sparkles,
  GripVertical,
} from "lucide-react";
import type {
  Scenario,
  WordBankItem,
  ConversationState,
} from "@/study-modes/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: "ar", label: "Arabic (MSA)" },
  { code: "ar-EG", label: "Egyptian Arabic" },
  { code: "es", label: "Spanish" },
  { code: "en", label: "English" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

// Placeholder scenarios keyed by language
const SAMPLE_SCENARIOS: Record<LanguageCode, Scenario> = {
  ar: {
    prompt: "You are at a restaurant ordering food for two people.",
    topic: "Dining",
    difficulty: "beginner",
    modelAnswer: "أريد طبقين من الأرز مع الدجاج، من فضلك.",
    modelAnswerTranslation:
      "I would like two plates of rice with chicken, please.",
    requiredVocabulary: ["أريد", "طبق", "أرز", "دجاج", "من فضلك"],
  },
  "ar-EG": {
    prompt: "You are asking for directions to the train station.",
    topic: "Directions",
    difficulty: "beginner",
    modelAnswer: "لو سمحت، محطة القطر فين؟",
    modelAnswerTranslation:
      "Excuse me, where is the train station?",
    requiredVocabulary: ["لو سمحت", "محطة", "قطر", "فين"],
  },
  es: {
    prompt: "You are introducing yourself at a new job.",
    topic: "Introductions",
    difficulty: "beginner",
    modelAnswer:
      "Hola, me llamo Ana. Soy la nueva ingeniera del equipo.",
    modelAnswerTranslation:
      "Hello, my name is Ana. I am the new engineer on the team.",
    requiredVocabulary: ["hola", "me llamo", "soy", "nueva", "equipo"],
  },
  en: {
    prompt: "You are calling to make a doctor's appointment.",
    topic: "Healthcare",
    difficulty: "intermediate",
    modelAnswer:
      "Hi, I'd like to schedule an appointment for next week, please.",
    modelAnswerTranslation: "",
    requiredVocabulary: ["schedule", "appointment", "next week", "please"],
  },
};

// ---------------------------------------------------------------------------
// Word Bank Chip
// ---------------------------------------------------------------------------

function WordChip({
  item,
  onToggle,
  disabled,
}: {
  item: WordBankItem;
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: item.isUsed ? 0.4 : 1,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={!item.isUsed && !disabled ? { scale: 1.06 } : undefined}
      whileTap={!item.isUsed && !disabled ? { scale: 0.95 } : undefined}
      onClick={() => !item.isUsed && !disabled && onToggle(item.id)}
      disabled={item.isUsed || disabled}
      className={`
        relative px-3 py-1.5 rounded-xl text-sm font-medium
        transition-colors duration-150
        ${
          item.isUsed
            ? "bg-[var(--surface-2)] text-[var(--text-tertiary)] cursor-default line-through"
            : "bg-egyptian-50 dark:bg-egyptian-950/40 text-egyptian-700 dark:text-egyptian-300 cursor-pointer hover:bg-egyptian-100 dark:hover:bg-egyptian-950/60"
        }
        focus:outline-none focus:ring-2 focus:ring-egyptian-400 focus:ring-offset-1
      `}
      title={item.translation}
    >
      {item.word}
      {!item.isUsed && (
        <span className="block text-[10px] opacity-60 font-normal mt-0.5">
          {item.translation}
        </span>
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Sentence Builder Area
// ---------------------------------------------------------------------------

function SentenceBuilder({
  words,
  onRemove,
  onReorder,
  disabled,
}: {
  words: { id: string; word: string }[];
  onRemove: (id: string) => void;
  onReorder: (newOrder: { id: string; word: string }[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="min-h-[80px] rounded-xl border-2 border-dashed border-[var(--surface-3)] bg-[var(--surface-1)] p-4">
      {words.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
          Tap words from the bank below to build your sentence...
        </p>
      ) : (
        <Reorder.Group
          axis="x"
          values={words}
          onReorder={onReorder}
          className="flex flex-wrap gap-2"
        >
          {words.map((w) => (
            <Reorder.Item key={w.id} value={w} dragListener={!disabled}>
              <motion.button
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                whileHover={!disabled ? { scale: 1.05 } : undefined}
                onClick={() => !disabled && onRemove(w.id)}
                disabled={disabled}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium
                  bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300
                  hover:bg-primary-200 dark:hover:bg-primary-900/60
                  cursor-grab active:cursor-grabbing
                  focus:outline-none focus:ring-2 focus:ring-primary-400
                `}
              >
                <GripVertical className="w-3 h-3 opacity-40" />
                {w.word}
              </motion.button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback Panel
// ---------------------------------------------------------------------------

function FeedbackPanel({
  isCorrect,
  modelAnswer,
  modelAnswerTranslation,
  userSentence,
}: {
  isCorrect: boolean;
  modelAnswer: string;
  modelAnswerTranslation: string;
  userSentence: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`
        rounded-xl p-5 border
        ${
          isCorrect
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        }
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        {isCorrect ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-amber-600" />
        )}
        <span
          className={`text-sm font-semibold ${
            isCorrect
              ? "text-green-700 dark:text-green-400"
              : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {isCorrect ? "Great job!" : "Good try! Here's a better version:"}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
            Your answer
          </p>
          <p className="text-sm text-[var(--text-primary)]">{userSentence}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
            Model answer
          </p>
          <p className="text-sm text-[var(--text-primary)] font-medium">
            {modelAnswer}
          </p>
          {modelAnswerTranslation && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 italic">
              {modelAnswerTranslation}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Language Selector
// ---------------------------------------------------------------------------

function LanguageSelector({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === value)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)] hover:bg-[var(--surface-2)] transition-colors text-sm font-medium text-[var(--text-primary)]"
      >
        <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
        {current.label}
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 z-20 w-52 rounded-xl bg-[var(--surface-0)] border border-[var(--surface-3)] shadow-elevated overflow-hidden"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${
                    lang.code === value
                      ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
                  }
                `}
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ConversationModePage() {
  const router = useRouter();

  // State
  const [language, setLanguage] = useState<LanguageCode>("ar");
  const [state, setState] = useState<ConversationState>({
    scenario: null,
    wordBank: [],
    builtSentence: [],
    isRevealed: false,
    selfRating: null,
  });
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Derive the current scenario
  const scenario = state.scenario;

  // Build word bank from scenario
  const generateSession = useCallback(
    (lang: LanguageCode) => {
      const sc = SAMPLE_SCENARIOS[lang];
      const bank: WordBankItem[] = sc.requiredVocabulary.map((word, i) => ({
        id: `word-${i}`,
        word,
        translation: "",
        cardId: `card-${i}`,
        isUsed: false,
      }));
      // Shuffle the word bank
      const shuffled = [...bank].sort(() => Math.random() - 0.5);
      setState({
        scenario: sc,
        wordBank: shuffled,
        builtSentence: [],
        isRevealed: false,
        selfRating: null,
      });
      setIsChecked(false);
      setIsCorrect(false);
    },
    []
  );

  // Start a session on first render or language change
  React.useEffect(() => {
    generateSession(language);
  }, [language, generateSession]);

  // Sentence pieces in order
  const sentencePieces = useMemo(() => {
    return state.builtSentence
      .map((id) => {
        const item = state.wordBank.find((w) => w.id === id);
        return item ? { id: item.id, word: item.word } : null;
      })
      .filter(Boolean) as { id: string; word: string }[];
  }, [state.builtSentence, state.wordBank]);

  // Add word to sentence
  const handleAddWord = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      builtSentence: [...prev.builtSentence, id],
      wordBank: prev.wordBank.map((w) =>
        w.id === id ? { ...w, isUsed: true } : w
      ),
    }));
  }, []);

  // Remove word from sentence
  const handleRemoveWord = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      builtSentence: prev.builtSentence.filter((wId) => wId !== id),
      wordBank: prev.wordBank.map((w) =>
        w.id === id ? { ...w, isUsed: false } : w
      ),
    }));
  }, []);

  // Reorder sentence
  const handleReorder = useCallback(
    (newOrder: { id: string; word: string }[]) => {
      setState((prev) => ({
        ...prev,
        builtSentence: newOrder.map((w) => w.id),
      }));
    },
    []
  );

  // Submit & check
  const handleSubmit = useCallback(() => {
    if (!scenario || sentencePieces.length === 0) return;

    const userSentence = sentencePieces.map((p) => p.word).join(" ");
    const allUsed = state.wordBank.every((w) => w.isUsed);
    // Simple heuristic: correct if all required words are used
    const correct = allUsed;

    setIsCorrect(correct);
    setIsChecked(true);
    setState((prev) => ({ ...prev, isRevealed: true }));
  }, [scenario, sentencePieces, state.wordBank]);

  // Reset
  const handleReset = useCallback(() => {
    generateSession(language);
  }, [language, generateSession]);

  // Change language
  const handleLanguageChange = useCallback((code: LanguageCode) => {
    setLanguage(code);
  }, []);

  const userSentence = sentencePieces.map((p) => p.word).join(" ");

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/study/modes")}
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-egyptian-500" />
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Conversation Practice
                </h1>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Build sentences from vocabulary in real-world scenarios
              </p>
            </div>
          </div>

          <LanguageSelector value={language} onChange={handleLanguageChange} />
        </motion.div>

        {/* Scenario Prompt */}
        {scenario && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6"
          >
            <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-egyptian-500" />
                <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Scenario &middot; {scenario.topic}
                </span>
                <span
                  className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    scenario.difficulty === "beginner"
                      ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                      : scenario.difficulty === "intermediate"
                      ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                      : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                  }`}
                >
                  {scenario.difficulty}
                </span>
              </div>
              <p className="text-base text-[var(--text-primary)] leading-relaxed">
                {scenario.prompt}
              </p>
            </div>
          </motion.div>
        )}

        {/* Sentence Builder */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-6"
        >
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 block">
            Your Sentence
          </label>
          <SentenceBuilder
            words={sentencePieces}
            onRemove={handleRemoveWord}
            onReorder={handleReorder}
            disabled={isChecked}
          />
        </motion.div>

        {/* Word Bank */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-8"
        >
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 block">
            Word Bank
          </label>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {state.wordBank.map((item) => (
                <WordChip
                  key={item.id}
                  item={item}
                  onToggle={handleAddWord}
                  disabled={isChecked}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          {!isChecked ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={sentencePieces.length === 0}
              className={`
                inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-egyptian-400 focus:ring-offset-2
                ${
                  sentencePieces.length === 0
                    ? "bg-[var(--surface-2)] text-[var(--text-tertiary)] cursor-not-allowed"
                    : "bg-egyptian-500 text-white hover:bg-egyptian-600 shadow-sm"
                }
              `}
            >
              <Send className="w-4 h-4" />
              Submit & Check
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4" />
              Next Scenario
            </motion.button>
          )}
        </motion.div>

        {/* Feedback */}
        <AnimatePresence>
          {isChecked && scenario && (
            <FeedbackPanel
              isCorrect={isCorrect}
              modelAnswer={scenario.modelAnswer}
              modelAnswerTranslation={scenario.modelAnswerTranslation}
              userSentence={userSentence}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
