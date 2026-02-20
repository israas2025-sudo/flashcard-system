/**
 * quiz-generator.ts -- Generate multiple-choice quiz options from flashcards.
 *
 * Selects plausible distractors from the same deck/note type.
 * Applies language-specific heuristics for Arabic (similar root patterns)
 * and Spanish (same part of speech).
 */

import { Card } from '@/scheduling/types';
import { QuizOption } from './types';

export class QuizGenerator {
  /**
   * Generate multiple-choice options for a card.
   *
   * Selects distractors from the same deck/note type that are plausible
   * but wrong. Falls back to random cards if not enough same-type cards.
   *
   * @param card       The card being quizzed (correct answer).
   * @param allCards   All available cards to draw distractors from.
   * @param count      Total number of options (default 4, including correct).
   * @returns          Shuffled array of QuizOption objects.
   */
  generateOptions(card: Card, allCards: Card[], count: number = 4): QuizOption[] {
    const distractorCount = count - 1;

    // Filter out the correct card itself
    const candidates = allCards.filter((c) => c.id !== card.id);

    // Prefer cards from the same deck
    const sameDeck = candidates.filter((c) => c.deckId === card.deckId);

    // Language detection from tags or deck name
    const language = this.detectLanguage(card);

    let distractors: Card[];
    if (language === 'arabic') {
      distractors = this.selectArabicDistractors(card, sameDeck.length >= distractorCount ? sameDeck : candidates, distractorCount);
    } else if (language === 'spanish') {
      distractors = this.selectSpanishDistractors(card, sameDeck.length >= distractorCount ? sameDeck : candidates, distractorCount);
    } else {
      distractors = this.selectRandomDistractors(sameDeck.length >= distractorCount ? sameDeck : candidates, distractorCount);
    }

    // Build options
    const correctOption: QuizOption = {
      id: `opt-${card.id}`,
      text: card.back,
      isCorrect: true,
      cardId: card.id,
    };

    const distractorOptions: QuizOption[] = distractors.map((d) => ({
      id: `opt-${d.id}`,
      text: d.back,
      isCorrect: false,
      cardId: d.id,
    }));

    // Combine and shuffle
    const options = [correctOption, ...distractorOptions];
    return this.shuffle(options);
  }

  /**
   * Check if the selected option is the correct answer.
   */
  checkAnswer(selectedOptionId: string, correctCardId: string): boolean {
    return selectedOptionId === `opt-${correctCardId}`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Detect language from card tags or deck information.
   */
  private detectLanguage(card: Card): string {
    const deckLower = card.deckId.toLowerCase();
    const tagsLower = card.tags.map((t) => t.toLowerCase());

    if (
      deckLower.includes('arabic') ||
      deckLower.includes('quran') ||
      deckLower.includes('egyptian') ||
      tagsLower.some((t) => t.includes('arabic') || t.includes('quran'))
    ) {
      return 'arabic';
    }
    if (
      deckLower.includes('spanish') ||
      tagsLower.some((t) => t.includes('spanish'))
    ) {
      return 'spanish';
    }
    return 'english';
  }

  /**
   * Select distractors with similar Arabic root patterns.
   * Prefers words of similar length (likely similar morphological pattern).
   */
  private selectArabicDistractors(card: Card, candidates: Card[], count: number): Card[] {
    const targetLength = card.back.length;

    // Sort by closeness in back-text length (rough proxy for morphological similarity)
    const sorted = [...candidates].sort((a, b) => {
      const diffA = Math.abs(a.back.length - targetLength);
      const diffB = Math.abs(b.back.length - targetLength);
      return diffA - diffB;
    });

    // Take top candidates with some randomization
    const pool = sorted.slice(0, Math.min(count * 3, sorted.length));
    return this.selectRandomDistractors(pool, count);
  }

  /**
   * Select distractors that are the same "part of speech" for Spanish.
   * Uses simple heuristics: words ending similarly are likely same POS.
   */
  private selectSpanishDistractors(card: Card, candidates: Card[], count: number): Card[] {
    const backText = card.back.toLowerCase();

    // Simple POS heuristic for Spanish based on common endings
    const getEndingClass = (text: string): string => {
      const t = text.toLowerCase().trim();
      if (t.endsWith('ar') || t.endsWith('er') || t.endsWith('ir')) return 'verb';
      if (t.endsWith('ción') || t.endsWith('dad') || t.endsWith('mente')) return 'noun-adj';
      if (t.endsWith('o') || t.endsWith('a') || t.endsWith('os') || t.endsWith('as')) return 'noun-adj';
      return 'other';
    };

    const targetClass = getEndingClass(backText);
    const sameClass = candidates.filter((c) => getEndingClass(c.back) === targetClass);

    if (sameClass.length >= count) {
      return this.selectRandomDistractors(sameClass, count);
    }
    return this.selectRandomDistractors(candidates, count);
  }

  /**
   * Select random distractors from the candidate pool.
   */
  private selectRandomDistractors(candidates: Card[], count: number): Card[] {
    const shuffled = this.shuffle([...candidates]);
    return shuffled.slice(0, count);
  }

  /**
   * Fisher-Yates shuffle.
   */
  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
