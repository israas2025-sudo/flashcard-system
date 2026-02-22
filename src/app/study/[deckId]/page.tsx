"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, SkipForward, X, Sparkles } from "lucide-react";
import { Flashcard } from "../components/Flashcard";
import { RatingButtons } from "../components/RatingButtons";
import { ProgressBar } from "../components/ProgressBar";
import { SessionComplete } from "../components/SessionComplete";
import { useStudyStore } from "@/store/study-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { allStudyCards, type StudyCard } from "@/lib/cards";
import { findPresetById, filterCardsByPreset, type StudyPreset } from "@/lib/presets";
import { getCardsForTopic } from "@/lib/topics";

const allCards = allStudyCards;

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.deckId as string;
  const presetId = searchParams.get("preset");
  const topicId = searchParams.get("topic");

  const {
    currentIndex,
    isFlipped,
    isPaused,
    isSessionComplete,
    sessionStats,
    flipCard,
    rateCard,
    skipCard,
    togglePause,
    startSession,
    totalCards,
  } = useStudyStore();

  // Resolve preset if one is specified in the URL
  const activePreset = useMemo<StudyPreset | null>(() => {
    if (!presetId) return null;
    return findPresetById(presetId);
  }, [presetId]);

  // Filter cards by the selected language/deck, preset, or topic
  const cards = useMemo(() => {
    // If a valid preset is active, use preset-based filtering
    if (activePreset) {
      return filterCardsByPreset(allCards, activePreset);
    }

    // If a topic is specified, filter by topic
    if (topicId) {
      const topicCards = getCardsForTopic(deckId, topicId, allCards);
      if (topicCards.length > 0) return topicCards;
    }

    // Otherwise fall back to deck-based filtering
    if (deckId === "all") return allCards;
    if (deckId === "arabic" || deckId === "arabic-msa") {
      return allCards.filter((c) => c.language === "arabic");
    }
    if (deckId === "arabic-msa-only") {
      return allCards.filter((c) => c.language === "arabic" && c.subtab === "msa");
    }
    if (deckId === "arabic-quran-only" || deckId === "quran") {
      return allCards.filter((c) => c.language === "arabic" && c.subtab === "quran");
    }
    return allCards.filter(
      (c) => c.language === deckId || c.deck.toLowerCase().startsWith(deckId.toLowerCase())
    );
  }, [deckId, activePreset, topicId]);

  // Subtab state for Arabic (MSA / Quran) — only when not using a preset
  const [subtab, setSubtab] = useState<"all" | "msa" | "quran">("all");
  const isArabicDeck = !activePreset && (deckId === "arabic" || deckId === "arabic-msa");

  const filteredCards = useMemo(() => {
    if (!isArabicDeck || subtab === "all") return cards;
    return cards.filter((c) => c.subtab === subtab);
  }, [cards, subtab, isArabicDeck]);

  useEffect(() => {
    startSession(filteredCards.length);
  }, [filteredCards.length, startSession]);

  const currentCard = filteredCards[currentIndex] || null;
  const progress = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0;

  const handleFlip = useCallback(() => {
    if (!isFlipped && !isPaused && !isSessionComplete) {
      flipCard();
    }
  }, [isFlipped, isPaused, isSessionComplete, flipCard]);

  const handleRate = useCallback(
    (rating: "again" | "hard" | "good" | "easy") => {
      if (isFlipped && !isPaused) {
        rateCard(rating);
      }
    },
    [isFlipped, isPaused, rateCard]
  );

  const handleSkip = useCallback(() => {
    if (!isPaused && !isSessionComplete) {
      skipCard();
    }
  }, [isPaused, isSessionComplete, skipCard]);

  useKeyboardShortcuts({
    onFlip: handleFlip,
    onRate: handleRate,
    onPause: togglePause,
    onSkip: handleSkip,
    enabled: !isSessionComplete,
  });

  if (isSessionComplete) {
    return <SessionComplete stats={sessionStats} />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Progress bar - full width, 3px */}
      <ProgressBar progress={progress} totalCards={totalCards} currentIndex={currentIndex} />

      {/* Paused overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-[var(--surface-0)]/90 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center"
            >
              <Pause className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
              <p className="text-lg font-medium text-[var(--text-primary)]">
                Session Paused
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Press P or click to resume
              </p>
              <button
                onClick={togglePause}
                className="mt-6 px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                Resume
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top toolbar */}
      <div className="flex items-center justify-between px-6 py-3">
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Exit study session"
        >
          <X className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>

        {/* Preset name badge — shown when studying via a preset */}
        {activePreset && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
              {activePreset.name}
            </span>
          </div>
        )}

        {/* Arabic subtabs — only when NOT using a preset */}
        {isArabicDeck && (
          <div className="flex bg-[var(--surface-2)] rounded-lg p-0.5">
            {[
              { key: "all" as const, label: "All" },
              { key: "msa" as const, label: "MSA" },
              { key: "quran" as const, label: "Quran" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSubtab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  subtab === tab.key
                    ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className="font-medium">{currentIndex + 1}</span>
          <span>/</span>
          <span>{totalCards}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSkip}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Skip card"
          >
            <SkipForward className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={togglePause}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Pause session"
          >
            <Pause className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Flashcard area */}
      <div
        className="flex-1 flex items-center justify-center px-6"
        onClick={!isFlipped ? handleFlip : undefined}
      >
        <AnimatePresence mode="wait">
          {currentCard && (
            <Flashcard
              key={currentCard.id}
              front={currentCard.front}
              back={currentCard.back}
              transliteration={currentCard.transliteration}
              language={currentCard.language}
              noteType={currentCard.noteType}
              audioUrl={currentCard.audioUrl}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              exampleSentence={currentCard.exampleSentence}
              exampleTranslation={currentCard.exampleTranslation}
              root={currentCard.root}
              partOfSpeech={currentCard.partOfSpeech}
              notes={currentCard.notes}
              surahNumber={currentCard.surahNumber}
              ayahNumber={currentCard.ayahNumber}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Rating buttons / Tap to reveal */}
      <div className="px-6 pb-8 pt-4">
        <AnimatePresence mode="wait">
          {isFlipped && currentCard ? (
            <RatingButtons
              key="rating"
              intervals={currentCard.intervals}
              onRate={handleRate}
            />
          ) : (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-sm text-[var(--text-tertiary)]">
                Tap card or press <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-xs font-mono">Space</kbd> to reveal answer
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
