/**
 * answer-checker.ts -- Fuzzy answer checking with language-aware comparison.
 *
 * Supports exact matching, close-match detection via Levenshtein distance,
 * Arabic diacritic-aware comparison, Spanish accent handling, and
 * character-level diff generation for visual feedback.
 */

import { Rating } from '@/scheduling/types';
import { CheckOptions, CheckResult, DiffResult } from './types';

/**
 * Arabic diacritical marks (tashkeel) Unicode range.
 * These are often omitted in casual writing.
 */
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g;

/**
 * Arabic tatweel (kashida) character used for text stretching.
 */
const ARABIC_TATWEEL = /\u0640/g;

export class AnswerChecker {
  /**
   * Check the user's typed answer against the correct answer.
   *
   * @param userAnswer    What the user typed.
   * @param correctAnswer The correct answer text.
   * @param options       Optional configuration for matching behavior.
   * @returns             A CheckResult with accuracy, diff, and suggested rating.
   */
  check(userAnswer: string, correctAnswer: string, options?: CheckOptions): CheckResult {
    const opts: Required<CheckOptions> = {
      ignoreDiacritics: options?.ignoreDiacritics ?? false,
      ignoreCase: options?.ignoreCase ?? true,
      closeThreshold: options?.closeThreshold ?? 2,
    };

    let userNorm = userAnswer.trim();
    let correctNorm = correctAnswer.trim();

    if (opts.ignoreCase) {
      userNorm = userNorm.toLowerCase();
      correctNorm = correctNorm.toLowerCase();
    }

    // Exact match
    if (userNorm === correctNorm) {
      return {
        isCorrect: true,
        isClose: false,
        accuracy: 1.0,
        diff: this.generateDiff(userAnswer.trim(), correctAnswer.trim()),
        suggestedRating: Rating.Easy,
      };
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(userNorm, correctNorm);
    const maxLen = Math.max(userNorm.length, correctNorm.length);
    const accuracy = maxLen > 0 ? 1 - distance / maxLen : 0;

    const isClose = distance <= opts.closeThreshold;
    const isCorrect = distance === 0;

    // Determine suggested rating based on accuracy
    let suggestedRating: Rating;
    if (accuracy >= 1.0) {
      suggestedRating = Rating.Easy;
    } else if (accuracy >= 0.85) {
      suggestedRating = Rating.Good;
    } else if (accuracy >= 0.6) {
      suggestedRating = Rating.Hard;
    } else {
      suggestedRating = Rating.Again;
    }

    return {
      isCorrect,
      isClose,
      accuracy,
      diff: this.generateDiff(userAnswer.trim(), correctAnswer.trim()),
      suggestedRating,
    };
  }

  /**
   * Check Arabic text, optionally ignoring diacritical marks.
   */
  checkArabic(
    userAnswer: string,
    correctAnswer: string,
    ignoreDiacritics: boolean = true
  ): CheckResult {
    let userNorm = userAnswer.trim();
    let correctNorm = correctAnswer.trim();

    if (ignoreDiacritics) {
      userNorm = this.stripArabicDiacritics(userNorm);
      correctNorm = this.stripArabicDiacritics(correctNorm);
    }

    // Also strip tatweel
    userNorm = userNorm.replace(ARABIC_TATWEEL, '');
    correctNorm = correctNorm.replace(ARABIC_TATWEEL, '');

    const result = this.check(userNorm, correctNorm, {
      ignoreDiacritics: false, // Already handled
      ignoreCase: false, // Arabic has no case
      closeThreshold: 1, // Stricter for Arabic since characters are distinct
    });

    // Re-generate diff against the original texts for display
    result.diff = this.generateDiff(userAnswer.trim(), correctAnswer.trim());

    return result;
  }

  /**
   * Check Spanish text with accent handling.
   * Treats accented and unaccented vowels as close matches.
   */
  checkSpanish(userAnswer: string, correctAnswer: string): CheckResult {
    const result = this.check(userAnswer, correctAnswer, {
      ignoreCase: true,
      closeThreshold: 2,
    });

    // If not exact, check if the difference is only in accents
    if (!result.isCorrect) {
      const userDeaccented = this.stripSpanishAccents(userAnswer.trim().toLowerCase());
      const correctDeaccented = this.stripSpanishAccents(correctAnswer.trim().toLowerCase());

      if (userDeaccented === correctDeaccented) {
        // Only accents differ -- close match
        return {
          ...result,
          isClose: true,
          accuracy: 0.9,
          suggestedRating: Rating.Good,
        };
      }
    }

    return result;
  }

  /**
   * Generate a character-level diff between user's answer and correct answer.
   * Uses a simple alignment approach based on LCS.
   */
  generateDiff(userAnswer: string, correctAnswer: string): DiffResult[] {
    const result: DiffResult[] = [];
    const user = userAnswer;
    const correct = correctAnswer;

    // Build LCS table
    const m = user.length;
    const n = correct.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array(n + 1).fill(0)
    );

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (user[i - 1] === correct[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to build diff
    let i = m;
    let j = n;
    const diffReverse: DiffResult[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && user[i - 1] === correct[j - 1]) {
        diffReverse.push({ char: user[i - 1], status: 'correct' });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diffReverse.push({ char: correct[j - 1], status: 'missing' });
        j--;
      } else {
        diffReverse.push({ char: user[i - 1], status: 'extra' });
        i--;
      }
    }

    return diffReverse.reverse();
  }

  /**
   * Calculate the Levenshtein (edit) distance between two strings.
   */
  levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    if (m === 0) return n;
    if (n === 0) return m;

    // Use single-row optimization
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array(n + 1);

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,       // Deletion
          curr[j - 1] + 1,   // Insertion
          prev[j - 1] + cost  // Substitution
        );
      }
      [prev, curr] = [curr, prev];
    }

    return prev[n];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Remove Arabic diacritical marks from text.
   */
  private stripArabicDiacritics(text: string): string {
    return text.replace(ARABIC_DIACRITICS, '');
  }

  /**
   * Remove Spanish accent marks, preserving the base vowels.
   */
  private stripSpanishAccents(text: string): string {
    const map: Record<string, string> = {
      '\u00e1': 'a', '\u00e9': 'e', '\u00ed': 'i', '\u00f3': 'o', '\u00fa': 'u',
      '\u00c1': 'A', '\u00c9': 'E', '\u00cd': 'I', '\u00d3': 'O', '\u00da': 'U',
      '\u00f1': 'n', '\u00d1': 'N', '\u00fc': 'u', '\u00dc': 'U',
    };
    return text.replace(/[áéíóúÁÉÍÓÚñÑüÜ]/g, (char) => map[char] || char);
  }
}
