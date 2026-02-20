/**
 * smart-scheduler.ts -- Cross-language study distribution and daily planning.
 *
 * When studying multiple languages, there is strong evidence that
 * interleaving (mixing topics/languages) produces better long-term
 * retention than blocking (studying all cards of one language, then
 * switching). However, too much interleaving can feel chaotic.
 *
 * This scheduler strikes a balance by:
 *
 * 1. **Respecting priorities** -- Users set per-language weights to
 *    control how many cards from each language appear.
 *
 * 2. **Limiting consecutive same-language cards** -- After N cards in
 *    the same language, it forces a switch to prevent monotony.
 *
 * 3. **Prioritizing overdue cards** -- Cards that are past their due
 *    date are prioritized regardless of language.
 *
 * 4. **Estimating study time** -- Uses historical average time per card
 *    per language to give accurate time estimates.
 *
 * The interleaving algorithm uses a weighted round-robin with a
 * maximum consecutive constraint, producing an ordering that feels
 * natural and varied.
 */

import { pool } from '../db/connection';
import type {
  LanguagePriority,
  StudyPlan,
  StudyPlanCard,
  LanguageDistributionEntry,
} from './types';

// ---------------------------------------------------------------------------
// Session-Based Study Plan Types
// ---------------------------------------------------------------------------

export interface PlannedSession {
  language: string;
  languageColor: string;
  dueCards: number;
  estimatedMinutes: number;
  priority: number;
}

export interface SessionStudyPlan {
  sessions: PlannedSession[];
  totalEstimatedMinutes: number;
  totalDueCards: number;
}

/**
 * Color mapping for language-colored session indicators.
 */
const LANGUAGE_COLORS: Record<string, string> = {
  'classical-arabic': '#f59e0b',
  'egyptian-arabic': '#8b5cf6',
  'spanish': '#f97316',
  'french': '#3b82f6',
  'german': '#ef4444',
  'japanese': '#ec4899',
  'mandarin': '#ef4444',
  'korean': '#14b8a6',
  'english': '#64748b',
  'turkish': '#f59e0b',
  'quran': '#14b8a6',
  '_unknown': '#94a3b8',
};

// ---------------------------------------------------------------------------
// Language Display Name Mapping
// ---------------------------------------------------------------------------

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  'spanish': 'Spanish',
  'classical-arabic': 'Classical Arabic',
  'egyptian-arabic': 'Egyptian Arabic',
  'french': 'French',
  'german': 'German',
  'japanese': 'Japanese',
  'mandarin': 'Mandarin Chinese',
  'korean': 'Korean',
  'turkish': 'Turkish',
  'urdu': 'Urdu',
  'persian': 'Persian',
  'hebrew': 'Hebrew',
  'swahili': 'Swahili',
  'portuguese': 'Portuguese',
  'italian': 'Italian',
  'russian': 'Russian',
  'hindi': 'Hindi',
};

// ---------------------------------------------------------------------------
// Default Priorities
// ---------------------------------------------------------------------------

/**
 * Default language priority settings when the user has not configured
 * their own. Equal weights for all languages with moderate interleaving.
 */
const DEFAULT_PRIORITY: Omit<LanguagePriority, 'language'> = {
  weight: 1.0,
  maxConsecutive: 5,
  active: true,
};

// ---------------------------------------------------------------------------
// SmartScheduler
// ---------------------------------------------------------------------------

export class SmartScheduler {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Distribute review cards across languages to prevent fatigue.
   *
   * Uses a weighted round-robin algorithm with a maximum-consecutive
   * constraint. The algorithm:
   *
   * 1. Groups cards by language
   * 2. Assigns a priority score to each card based on:
   *    - Overdue status (overdue cards get highest priority)
   *    - Language weight (from user preferences)
   *    - Card type (relearning > review > new)
   * 3. Interleaves cards from different languages, ensuring no more
   *    than `maxConsecutive` cards from the same language appear in a row
   *
   * @param dueCards - Array of cards that are due for review.
   * @param priorities - Per-language priority configuration.
   * @returns Cards reordered for optimal cross-language study.
   */
  interleaveLanguages(
    dueCards: StudyPlanCard[],
    priorities: LanguagePriority[]
  ): StudyPlanCard[] {
    if (dueCards.length === 0) return [];

    // Build priority lookup
    const priorityMap = new Map<string, LanguagePriority>(
      priorities.map((p) => [p.language, p])
    );

    // Group cards by language
    const languageGroups = new Map<string, StudyPlanCard[]>();
    for (const card of dueCards) {
      const lang = card.language || '_unknown';
      if (!languageGroups.has(lang)) {
        languageGroups.set(lang, []);
      }
      languageGroups.get(lang)!.push(card);
    }

    // Sort within each language group by priority score (highest first)
    for (const [lang, cards] of languageGroups) {
      const priority = priorityMap.get(lang);
      const weight = priority?.weight ?? DEFAULT_PRIORITY.weight;

      cards.sort((a, b) => {
        const scoreA = this.computeCardPriority(a, weight);
        const scoreB = this.computeCardPriority(b, weight);
        return scoreB - scoreA;
      });
    }

    // Weighted round-robin interleaving
    const result: StudyPlanCard[] = [];
    const languageQueues = new Map<string, StudyPlanCard[]>(languageGroups);
    const languageWeights: Array<{ lang: string; weight: number; maxConsec: number }> = [];

    for (const [lang, cards] of languageQueues) {
      if (cards.length === 0) continue;
      const priority = priorityMap.get(lang);
      languageWeights.push({
        lang,
        weight: (priority?.weight ?? DEFAULT_PRIORITY.weight) * cards.length,
        maxConsec: priority?.maxConsecutive ?? DEFAULT_PRIORITY.maxConsecutive,
      });
    }

    // Sort language weights descending for initial ordering
    languageWeights.sort((a, b) => b.weight - a.weight);

    let lastLanguage: string | null = null;
    let consecutiveCount = 0;

    while (result.length < dueCards.length) {
      let picked = false;

      // Try to pick from the highest-weight language that is not at max consecutive
      for (const lw of languageWeights) {
        const queue = languageQueues.get(lw.lang);
        if (!queue || queue.length === 0) continue;

        // Check consecutive constraint
        if (lastLanguage === lw.lang && consecutiveCount >= lw.maxConsec) {
          continue;
        }

        // Pick the next card from this language
        const card = queue.shift()!;
        result.push(card);

        if (lastLanguage === lw.lang) {
          consecutiveCount++;
        } else {
          lastLanguage = lw.lang;
          consecutiveCount = 1;
        }

        // Reduce this language's effective weight
        lw.weight = (lw.weight * queue.length) / (queue.length + 1 || 1);
        picked = true;
        break;
      }

      if (!picked) {
        // All active languages are at max consecutive -- force reset
        // by picking from the language with the most remaining cards
        const maxQueue = [...languageQueues.entries()]
          .filter(([, q]) => q.length > 0)
          .sort(([, a], [, b]) => b.length - a.length)[0];

        if (maxQueue) {
          const card = maxQueue[1].shift()!;
          result.push(card);
          lastLanguage = maxQueue[0];
          consecutiveCount = 1;
        } else {
          break; // No more cards
        }
      }

      // Re-sort weights for next iteration
      languageWeights.sort((a, b) => {
        const qA = languageQueues.get(a.lang)?.length ?? 0;
        const qB = languageQueues.get(b.lang)?.length ?? 0;
        return qB * b.weight - qA * a.weight;
      });
    }

    return result;
  }

  /**
   * Generate a complete daily study plan for a user.
   *
   * Fetches all due cards, determines their languages, applies the
   * user's priority settings, and produces an interleaved study order
   * with time estimates.
   *
   * @param userId - The user to generate a plan for.
   * @returns A structured study plan with cards, distribution, and estimates.
   */
  async getDailyStudyPlan(userId: string): Promise<StudyPlan> {
    // Fetch user language priorities from settings
    const priorities = await this.getUserPriorities(userId);

    // Fetch all due cards with their language tags
    const dueCards = await this.fetchDueCardsWithLanguage(userId);

    // Filter to active languages only
    const activeLanguages = new Set(
      priorities.filter((p) => p.active).map((p) => p.language)
    );

    // If no priorities are set, all languages are active
    const filteredCards =
      activeLanguages.size > 0
        ? dueCards.filter(
            (c) =>
              activeLanguages.has(c.language) || c.language === '_unknown'
          )
        : dueCards;

    // Interleave the cards
    const orderedCards = this.interleaveLanguages(filteredCards, priorities);

    // Compute language distribution
    const languageDistribution = this.computeDistribution(orderedCards);

    // Estimate study time
    const estimatedMinutes = await this.estimateStudyTime(userId, orderedCards);

    return {
      cards: orderedCards,
      languageDistribution,
      estimatedMinutes,
      totalCards: orderedCards.length,
    };
  }

  /**
   * Generate a session-based daily study plan.
   *
   * Returns suggested order of study sessions organized by language,
   * with estimated time per language based on cards due and historical
   * average review times.
   *
   * Example output:
   *   1. Quran review (15 min estimated, 25 cards)
   *   2. Arabic vocabulary (10 min, 18 cards)
   *   3. Spanish (20 min, 35 cards)
   *
   * @param userId - The user to generate a plan for.
   * @returns A session-based study plan with per-language breakdowns.
   */
  async getSessionBasedStudyPlan(userId: string): Promise<SessionStudyPlan> {
    // Fetch user language priorities from settings
    const priorities = await this.getUserPriorities(userId);
    const priorityMap = new Map<string, LanguagePriority>(
      priorities.map((p) => [p.language, p])
    );

    // Fetch all due cards with their language tags
    const dueCards = await this.fetchDueCardsWithLanguage(userId);

    // Filter to active languages only
    const activeLanguages = new Set(
      priorities.filter((p) => p.active).map((p) => p.language)
    );

    const filteredCards =
      activeLanguages.size > 0
        ? dueCards.filter(
            (c) =>
              activeLanguages.has(c.language) || c.language === '_unknown'
          )
        : dueCards;

    // Group by language
    const languageGroups = new Map<string, StudyPlanCard[]>();
    for (const card of filteredCards) {
      const lang = card.language || '_unknown';
      if (!languageGroups.has(lang)) {
        languageGroups.set(lang, []);
      }
      languageGroups.get(lang)!.push(card);
    }

    // Get average time per card per language from recent reviews
    const avgTimeResult = await pool.query(
      `SELECT
         COALESCE(
           (SELECT SUBSTRING(t.slug FROM 'language::(.+)')
            FROM note_tags nt
            JOIN tags t ON nt.tag_id = t.id
            WHERE nt.note_id = n.id
              AND t.slug LIKE 'language::%'
            LIMIT 1),
           '_unknown'
         ) AS language,
         AVG(COALESCE(rl.time_spent_ms, 15000))::float AS avg_time_ms
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY language`,
      [userId]
    );

    const avgTimeMap = new Map<string, number>(
      avgTimeResult.rows.map((r: any) => [r.language, r.avg_time_ms])
    );
    const defaultTimeMs = 15000; // 15 seconds default

    // Build sessions
    const sessions: PlannedSession[] = [];
    for (const [language, cards] of languageGroups) {
      const avgMs = avgTimeMap.get(language) ?? defaultTimeMs;
      const estimatedMinutes = Math.max(1, Math.round((cards.length * avgMs) / 60000));
      const priority = priorityMap.get(language)?.weight ?? 1.0;

      sessions.push({
        language:
          LANGUAGE_DISPLAY_NAMES[language] ?? this.formatLanguageName(language),
        languageColor: LANGUAGE_COLORS[language] ?? '#6366f1',
        dueCards: cards.length,
        estimatedMinutes,
        priority,
      });
    }

    // Sort by priority (descending) then by due cards (descending)
    sessions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.dueCards - a.dueCards;
    });

    const totalEstimatedMinutes = sessions.reduce(
      (sum, s) => sum + s.estimatedMinutes,
      0
    );
    const totalDueCards = sessions.reduce(
      (sum, s) => sum + s.dueCards,
      0
    );

    return {
      sessions,
      totalEstimatedMinutes,
      totalDueCards,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Compute a priority score for a single card.
   *
   * Scoring factors (higher = more urgent):
   * - Overdue: +100 (always study overdue cards first)
   * - Relearning: +50 (lapsed cards need immediate attention)
   * - Learning: +30 (in-progress learning should not be interrupted)
   * - Review: +10 (standard reviews)
   * - New: +5 (new cards have lowest priority)
   * - Language weight multiplier
   */
  private computeCardPriority(card: StudyPlanCard, languageWeight: number): number {
    let score = 0;

    if (card.isOverdue) score += 100;

    switch (card.cardType) {
      case 'relearning':
        score += 50;
        break;
      case 'learning':
        score += 30;
        break;
      case 'review':
        score += 10;
        break;
      case 'new':
        score += 5;
        break;
    }

    return score * languageWeight;
  }

  /**
   * Fetch the user's language priority settings from their profile.
   */
  private async getUserPriorities(userId: string): Promise<LanguagePriority[]> {
    const result = await pool.query(
      `SELECT settings->'language_priorities' AS priorities
       FROM users WHERE id = $1`,
      [userId]
    );

    if (
      result.rows.length === 0 ||
      !result.rows[0].priorities
    ) {
      return [];
    }

    const raw = result.rows[0].priorities;
    if (!Array.isArray(raw)) return [];

    return raw.map((p: any) => ({
      language: p.language ?? '',
      weight: p.weight ?? DEFAULT_PRIORITY.weight,
      maxConsecutive: p.maxConsecutive ?? DEFAULT_PRIORITY.maxConsecutive,
      active: p.active ?? DEFAULT_PRIORITY.active,
    }));
  }

  /**
   * Fetch all due cards for a user with their language classifications.
   *
   * Cards without a language tag are classified as '_unknown' and will
   * be interleaved with other languages.
   */
  private async fetchDueCardsWithLanguage(
    userId: string
  ): Promise<StudyPlanCard[]> {
    const result = await pool.query(
      `SELECT
         c.id AS "cardId",
         c.deck_id AS "deckId",
         c.card_type AS "cardType",
         c.due,
         COALESCE(
           (SELECT SUBSTRING(t.slug FROM 'language::(.+)')
            FROM note_tags nt
            JOIN tags t ON nt.tag_id = t.id
            WHERE nt.note_id = n.id
              AND t.slug LIKE 'language::%'
            LIMIT 1),
           '_unknown'
         ) AS language
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.status = 'active'
         AND (
           -- Due cards (review + relearning)
           (c.card_type IN ('review', 'relearning') AND c.due <= NOW())
           -- Learning cards (always due)
           OR c.card_type = 'learning'
           -- New cards (up to daily limit, handled by caller)
           OR c.card_type = 'new'
         )
       ORDER BY
         CASE c.card_type
           WHEN 'relearning' THEN 1
           WHEN 'learning'   THEN 2
           WHEN 'review'     THEN 3
           WHEN 'new'        THEN 4
         END,
         c.due ASC NULLS LAST`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      cardId: row.cardId,
      deckId: row.deckId,
      language: row.language,
      cardType: row.cardType,
      isOverdue:
        row.due !== null && new Date(row.due) < new Date(),
      priorityScore: 0, // Will be computed during interleaving
    }));
  }

  /**
   * Compute the language distribution summary for a set of ordered cards.
   */
  private computeDistribution(
    cards: StudyPlanCard[]
  ): LanguageDistributionEntry[] {
    const counts = new Map<string, number>();

    for (const card of cards) {
      const lang = card.language;
      counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }

    const total = cards.length || 1;

    return [...counts.entries()]
      .map(([language, cardCount]) => ({
        language,
        displayName:
          LANGUAGE_DISPLAY_NAMES[language] ??
          this.formatLanguageName(language),
        cardCount,
        percentage: Math.round((cardCount / total) * 100),
      }))
      .sort((a, b) => b.cardCount - a.cardCount);
  }

  /**
   * Estimate total study time based on historical average per-card time
   * for each language.
   */
  private async estimateStudyTime(
    userId: string,
    cards: StudyPlanCard[]
  ): Promise<number> {
    if (cards.length === 0) return 0;

    // Get average time per card per language from recent reviews
    const result = await pool.query(
      `SELECT
         COALESCE(
           (SELECT SUBSTRING(t.slug FROM 'language::(.+)')
            FROM note_tags nt
            JOIN tags t ON nt.tag_id = t.id
            WHERE nt.note_id = n.id
              AND t.slug LIKE 'language::%'
            LIMIT 1),
           '_unknown'
         ) AS language,
         AVG(COALESCE(rl.time_spent_ms, 15000))::float AS avg_time_ms
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY language`,
      [userId]
    );

    const avgTimeMap = new Map<string, number>(
      result.rows.map((r: any) => [r.language, r.avg_time_ms])
    );

    // Default 15 seconds per card if no history
    const defaultTimeMs = 15000;

    let totalTimeMs = 0;
    for (const card of cards) {
      totalTimeMs += avgTimeMap.get(card.language) ?? defaultTimeMs;
    }

    return Math.round(totalTimeMs / 60000); // Convert to minutes
  }

  /**
   * Format a language slug into a human-readable name.
   */
  private formatLanguageName(slug: string): string {
    if (slug === '_unknown') return 'Uncategorized';
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
