/**
 * weekly-review.ts -- Weekly Review Ritual Service.
 *
 * The weekly review serves as a structured reflection ritual that transforms
 * raw study data into meaningful progress narratives. This leverages the
 * "self-reflection" component of self-regulated learning theory (Zimmerman, 2002),
 * which shows that learners who regularly reflect on their performance develop
 * better strategies and persist longer.
 *
 * The weekly report provides:
 *   - Total cards reviewed and accuracy trends (quantitative feedback)
 *   - Most improved and most struggling cards (targeted awareness)
 *   - Language-by-language breakdown (for polyglots)
 *   - Streak status and time invested (effort recognition)
 *   - Personalized recommendations for the coming week (forward planning)
 *   - A motivational message calibrated to the user's performance
 *
 * Research Reference:
 *   Zimmerman, B. J. (2002) - "Becoming a Self-Regulated Learner: An Overview"
 *   Butler, D. L. & Winne, P. H. (1995) - "Feedback and Self-Regulated Learning"
 */

import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyStats {
  /** Start of the week (Monday, ISO date string). */
  weekStart: string;

  /** End of the week (Sunday, ISO date string). */
  weekEnd: string;

  /** Total number of individual card reviews during the week. */
  totalReviews: number;

  /** Total number of unique cards reviewed during the week. */
  uniqueCardsReviewed: number;

  /** Number of new cards introduced during the week. */
  newCardsIntroduced: number;

  /** Overall accuracy for the week (0-1). */
  accuracy: number;

  /** Accuracy broken down by day of week (Monday=0 through Sunday=6). */
  dailyAccuracy: { date: string; accuracy: number; reviewCount: number }[];

  /** Total estimated time spent studying in milliseconds. */
  totalTimeSpentMs: number;

  /** Total estimated time spent studying, human-readable. */
  totalTimeSpentFormatted: string;

  /** Current daily streak at end of week. */
  currentStreak: number;

  /** Number of days in this week where at least 1 review was done. */
  activeDays: number;

  /** Average reviews per active day. */
  averageReviewsPerActiveDay: number;
}

export interface CardPerformance {
  /** The card ID. */
  cardId: string;

  /** The front content of the card. */
  front: string;

  /** The back content of the card. */
  back: string;

  /** The deck name this card belongs to. */
  deckName: string;

  /** The language tag, if available. */
  language: string | null;

  /** Number of times reviewed this week. */
  reviewCount: number;

  /** Accuracy this week (0-1). */
  accuracy: number;

  /** The change in accuracy compared to previous week (-1 to 1). */
  accuracyChange: number;

  /** Current interval in days. */
  currentIntervalDays: number;
}

export interface LanguageBreakdown {
  /** The language identifier. */
  language: string;

  /** Total reviews for this language during the week. */
  totalReviews: number;

  /** Accuracy for this language (0-1). */
  accuracy: number;

  /** Number of unique cards reviewed in this language. */
  uniqueCards: number;

  /** Number of new cards introduced in this language. */
  newCards: number;

  /** Estimated time spent on this language in milliseconds. */
  timeSpentMs: number;
}

export interface WeeklyRecommendation {
  /** Type of recommendation. */
  type: 'focus-area' | 'study-habit' | 'goal-adjustment' | 'celebration';

  /** The recommendation text. */
  message: string;

  /** Priority (higher = more important). */
  priority: number;
}

export interface WeeklyReport {
  /** The user ID this report is for. */
  userId: string;

  /** When this report was generated. */
  generatedAt: Date;

  /** The week's statistics. */
  stats: WeeklyStats;

  /** Top 10 most improved cards (biggest positive accuracy change). */
  mostImprovedCards: CardPerformance[];

  /** Top 10 cards the user is struggling with (lowest accuracy). */
  strugglingCards: CardPerformance[];

  /** Per-language performance breakdown. */
  languageBreakdown: LanguageBreakdown[];

  /** Personalized recommendations for next week. */
  recommendations: WeeklyRecommendation[];

  /** Motivational message based on this week's performance. */
  motivationalMessage: string;
}

// ---------------------------------------------------------------------------
// WeeklyReviewService
// ---------------------------------------------------------------------------

export class WeeklyReviewService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate a complete weekly report for a user.
   *
   * This is the primary entry point. It aggregates all weekly data into
   * a single comprehensive report suitable for rendering in the weekly
   * review UI.
   *
   * @param userId - The user to generate the report for.
   * @param weekStart - Optional ISO date string for the start of the week.
   *                    Defaults to the most recent Monday.
   * @returns The complete weekly report.
   */
  async generateWeeklyReport(userId: string, weekStart?: string): Promise<WeeklyReport> {
    const resolvedWeekStart = weekStart ?? this.getMostRecentMonday();

    // Fetch all data in parallel for performance
    const [stats, mostImproved, struggling, languageBreakdown] = await Promise.all([
      this.getWeeklyStats(userId, resolvedWeekStart),
      this.getMostImprovedCards(userId, resolvedWeekStart),
      this.getStrugglingCards(userId, resolvedWeekStart),
      this.getLanguageBreakdown(userId, resolvedWeekStart),
    ]);

    const recommendations = this.generateRecommendations(stats, struggling, languageBreakdown);
    const motivationalMessage = this.getMotivationalMessage(stats);

    return {
      userId,
      generatedAt: new Date(),
      stats,
      mostImprovedCards: mostImproved,
      strugglingCards: struggling,
      languageBreakdown,
      recommendations,
      motivationalMessage,
    };
  }

  /**
   * Get aggregated statistics for a specific week.
   *
   * @param userId - The user to query.
   * @param weekStart - ISO date string for Monday of the target week.
   * @returns Aggregated weekly statistics.
   */
  async getWeeklyStats(userId: string, weekStart: string): Promise<WeeklyStats> {
    const weekEnd = this.getWeekEnd(weekStart);

    // Main stats query
    const statsResult = await this.pool.query(
      `SELECT
         COUNT(*)::int AS total_reviews,
         COUNT(DISTINCT rl.card_id)::int AS unique_cards,
         COALESCE(SUM(rl.time_spent_ms), 0)::bigint AS total_time_ms,
         COALESCE(
           AVG(CASE WHEN rl.rating IN ('good', 'easy') THEN 1.0 ELSE 0.0 END),
           0
         )::float AS accuracy
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at::date >= $2::date
         AND rl.reviewed_at::date <= $3::date`,
      [userId, weekStart, weekEnd]
    );

    // New cards introduced this week
    const newCardsResult = await this.pool.query(
      `SELECT COUNT(*)::int AS new_cards
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.created_at::date >= $2::date
         AND c.created_at::date <= $3::date`,
      [userId, weekStart, weekEnd]
    );

    // Daily breakdown
    const dailyResult = await this.pool.query(
      `SELECT
         rl.reviewed_at::date AS review_date,
         COUNT(*)::int AS review_count,
         COALESCE(
           AVG(CASE WHEN rl.rating IN ('good', 'easy') THEN 1.0 ELSE 0.0 END),
           0
         )::float AS accuracy
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at::date >= $2::date
         AND rl.reviewed_at::date <= $3::date
       GROUP BY rl.reviewed_at::date
       ORDER BY review_date`,
      [userId, weekStart, weekEnd]
    );

    // Current streak
    const streak = await this.calculateStreak(userId);

    const stats = statsResult.rows[0];
    const dailyAccuracy = dailyResult.rows.map((row: Record<string, unknown>) => ({
      date: new Date(row.review_date as string).toISOString().split('T')[0],
      accuracy: row.accuracy as number,
      reviewCount: row.review_count as number,
    }));

    const activeDays = dailyAccuracy.length;
    const totalReviews = stats.total_reviews;

    return {
      weekStart,
      weekEnd,
      totalReviews,
      uniqueCardsReviewed: stats.unique_cards,
      newCardsIntroduced: newCardsResult.rows[0].new_cards,
      accuracy: Math.round(stats.accuracy * 1000) / 1000,
      dailyAccuracy,
      totalTimeSpentMs: Number(stats.total_time_ms),
      totalTimeSpentFormatted: this.formatDuration(Number(stats.total_time_ms)),
      currentStreak: streak,
      activeDays,
      averageReviewsPerActiveDay: activeDays > 0
        ? Math.round(totalReviews / activeDays)
        : 0,
    };
  }

  /**
   * Get the top 10 most improved cards for the week.
   *
   * "Most improved" is defined as the cards with the largest positive change
   * in accuracy compared to the previous week. This highlights progress and
   * reinforces the feeling that effort is paying off.
   *
   * @param userId - The user to query.
   * @param weekStart - ISO date string for Monday of the target week.
   * @returns Up to 10 most improved cards, sorted by accuracy improvement.
   */
  async getMostImprovedCards(
    userId: string,
    weekStart?: string
  ): Promise<CardPerformance[]> {
    const resolvedWeekStart = weekStart ?? this.getMostRecentMonday();
    const weekEnd = this.getWeekEnd(resolvedWeekStart);
    const prevWeekStart = this.getPreviousWeekStart(resolvedWeekStart);
    const prevWeekEnd = resolvedWeekStart;

    const result = await this.pool.query(
      `WITH this_week AS (
         SELECT
           rl.card_id,
           COUNT(*)::int AS review_count,
           AVG(CASE WHEN rl.rating IN ('good', 'easy') THEN 1.0 ELSE 0.0 END)::float AS accuracy
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at::date >= $2::date
           AND rl.reviewed_at::date <= $3::date
         GROUP BY rl.card_id
       ),
       prev_week AS (
         SELECT
           rl.card_id,
           AVG(CASE WHEN rl.rating IN ('good', 'easy') THEN 1.0 ELSE 0.0 END)::float AS accuracy
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at::date >= $4::date
           AND rl.reviewed_at::date < $5::date
         GROUP BY rl.card_id
       )
       SELECT
         tw.card_id,
         tw.review_count,
         tw.accuracy AS this_week_accuracy,
         COALESCE(pw.accuracy, 0) AS prev_week_accuracy,
         (tw.accuracy - COALESCE(pw.accuracy, 0)) AS accuracy_change,
         c.interval_days,
         n.fields,
         d.name AS deck_name,
         (SELECT t.slug FROM note_tags nt JOIN tags t ON nt.tag_id = t.id
          WHERE nt.note_id = n.id AND t.slug LIKE 'language::%' LIMIT 1) AS language_tag
       FROM this_week tw
       JOIN cards c ON tw.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       JOIN decks d ON c.deck_id = d.id
       LEFT JOIN prev_week pw ON tw.card_id = pw.card_id
       WHERE tw.review_count >= 2
       ORDER BY accuracy_change DESC
       LIMIT 10`,
      [userId, resolvedWeekStart, weekEnd, prevWeekStart, prevWeekEnd]
    );

    return result.rows.map((row: Record<string, unknown>) =>
      this.mapCardPerformance(row)
    );
  }

  /**
   * Get the top 10 cards the user is struggling with.
   *
   * "Struggling" is defined as cards with the lowest accuracy this week
   * that have been reviewed at least twice (to avoid one-off mistakes).
   * These cards are candidates for reformulation or mnemonic addition.
   *
   * @param userId - The user to query.
   * @param weekStart - ISO date string for Monday of the target week.
   * @returns Up to 10 struggling cards, sorted by accuracy ascending.
   */
  async getStrugglingCards(
    userId: string,
    weekStart?: string
  ): Promise<CardPerformance[]> {
    const resolvedWeekStart = weekStart ?? this.getMostRecentMonday();
    const weekEnd = this.getWeekEnd(resolvedWeekStart);
    const prevWeekStart = this.getPreviousWeekStart(resolvedWeekStart);
    const prevWeekEnd = resolvedWeekStart;

    const result = await this.pool.query(
      `WITH this_week AS (
         SELECT
           rl.card_id,
           COUNT(*)::int AS review_count,
           AVG(CASE WHEN rl.rating IN ('good', 'easy') THEN 1.0 ELSE 0.0 END)::float AS accuracy
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at::date >= $2::date
           AND rl.reviewed_at::date <= $3::date
         GROUP BY rl.card_id
       ),
       prev_week AS (
         SELECT
           rl.card_id,
           AVG(CASE WHEN rl.rating IN ('good', 'easy') THEN 1.0 ELSE 0.0 END)::float AS accuracy
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at::date >= $4::date
           AND rl.reviewed_at::date < $5::date
         GROUP BY rl.card_id
       )
       SELECT
         tw.card_id,
         tw.review_count,
         tw.accuracy AS this_week_accuracy,
         COALESCE(pw.accuracy, 0) AS prev_week_accuracy,
         (tw.accuracy - COALESCE(pw.accuracy, 0)) AS accuracy_change,
         c.interval_days,
         n.fields,
         d.name AS deck_name,
         (SELECT t.slug FROM note_tags nt JOIN tags t ON nt.tag_id = t.id
          WHERE nt.note_id = n.id AND t.slug LIKE 'language::%' LIMIT 1) AS language_tag
       FROM this_week tw
       JOIN cards c ON tw.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       JOIN decks d ON c.deck_id = d.id
       LEFT JOIN prev_week pw ON tw.card_id = pw.card_id
       WHERE tw.review_count >= 2
       ORDER BY tw.accuracy ASC, tw.review_count DESC
       LIMIT 10`,
      [userId, resolvedWeekStart, weekEnd, prevWeekStart, prevWeekEnd]
    );

    return result.rows.map((row: Record<string, unknown>) =>
      this.mapCardPerformance(row)
    );
  }

  /**
   * Get a per-language breakdown of the week's study activity.
   *
   * Groups review data by the language tag on each card's note. Cards
   * without a language tag are grouped under "untagged."
   *
   * @param userId - The user to query.
   * @param weekStart - ISO date string for Monday of the target week.
   * @returns Per-language stats for the week.
   */
  async getLanguageBreakdown(
    userId: string,
    weekStart?: string
  ): Promise<LanguageBreakdown[]> {
    const resolvedWeekStart = weekStart ?? this.getMostRecentMonday();
    const weekEnd = this.getWeekEnd(resolvedWeekStart);

    const result = await this.pool.query(
      `SELECT
         COALESCE(
           (SELECT REPLACE(t.slug, 'language::', '')
            FROM note_tags nt
            JOIN tags t ON nt.tag_id = t.id
            WHERE nt.note_id = n.id AND t.slug LIKE 'language::%'
            LIMIT 1),
           'untagged'
         ) AS language,
         COUNT(*)::int AS total_reviews,
         COUNT(DISTINCT rl.card_id)::int AS unique_cards,
         COALESCE(
           AVG(CASE WHEN rl.rating IN ('good', 'easy') THEN 1.0 ELSE 0.0 END),
           0
         )::float AS accuracy,
         COALESCE(SUM(rl.time_spent_ms), 0)::bigint AS time_spent_ms
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at::date >= $2::date
         AND rl.reviewed_at::date <= $3::date
       GROUP BY language
       ORDER BY total_reviews DESC`,
      [userId, resolvedWeekStart, weekEnd]
    );

    // Also get new cards per language
    const newCardsResult = await this.pool.query(
      `SELECT
         COALESCE(
           (SELECT REPLACE(t.slug, 'language::', '')
            FROM note_tags nt
            JOIN tags t ON nt.tag_id = t.id
            WHERE nt.note_id = n.id AND t.slug LIKE 'language::%'
            LIMIT 1),
           'untagged'
         ) AS language,
         COUNT(*)::int AS new_cards
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.created_at::date >= $2::date
         AND c.created_at::date <= $3::date
       GROUP BY language`,
      [userId, resolvedWeekStart, weekEnd]
    );

    const newCardsByLang = new Map<string, number>();
    for (const row of newCardsResult.rows) {
      newCardsByLang.set(row.language, row.new_cards);
    }

    return result.rows.map((row: Record<string, unknown>) => ({
      language: row.language as string,
      totalReviews: row.total_reviews as number,
      accuracy: Math.round((row.accuracy as number) * 1000) / 1000,
      uniqueCards: row.unique_cards as number,
      newCards: newCardsByLang.get(row.language as string) ?? 0,
      timeSpentMs: Number(row.time_spent_ms),
    }));
  }

  /**
   * Generate a motivational message calibrated to the user's weekly performance.
   *
   * The message is selected based on multiple performance signals:
   *   - High activity + high accuracy: Celebrate excellence
   *   - High activity + low accuracy: Acknowledge effort, reframe difficulty
   *   - Low activity + any accuracy: Encourage return without guilt
   *   - Streak milestones: Recognize consistency
   *
   * @param stats - The week's statistics.
   * @returns A motivational message string.
   */
  getMotivationalMessage(stats: WeeklyStats): string {
    // Streak milestones take priority
    if (stats.currentStreak >= 100) {
      return `100+ day streak! You are in the top 1% of language learners. Your dedication is building something permanent -- the kind of deep knowledge that lasts a lifetime. Keep going, centurion.`;
    }
    if (stats.currentStreak >= 60) {
      return `60+ days of consistent practice! Research shows that habits formed over this duration are deeply ingrained. Learning has become part of who you are, not just something you do.`;
    }
    if (stats.currentStreak >= 30) {
      return `A full month of daily practice! Studies show that after 30 days, the neural pathways supporting your new language are significantly strengthened. You are past the hardest part.`;
    }
    if (stats.currentStreak >= 14) {
      return `Two weeks strong! You have pushed past the initial motivation phase and into the habit-building phase. This is where real progress happens. Keep showing up.`;
    }
    if (stats.currentStreak >= 7) {
      return `A full week of consistent practice! Weekly consistency is the #1 predictor of long-term language learning success. You are building a powerful habit.`;
    }

    // Activity-based messages
    if (stats.activeDays >= 6 && stats.accuracy >= 0.85) {
      return `Outstanding week! ${stats.totalReviews} reviews across ${stats.activeDays} days with ${Math.round(stats.accuracy * 100)}% accuracy. You are in the zone -- your brain is building lasting neural connections with every session.`;
    }
    if (stats.activeDays >= 6 && stats.accuracy < 0.7) {
      return `Incredible consistency this week with ${stats.activeDays} active days! Your accuracy of ${Math.round(stats.accuracy * 100)}% shows you are being challenged at the right level. Remember: struggling to recall is exactly how memories get stronger.`;
    }
    if (stats.activeDays >= 4 && stats.accuracy >= 0.8) {
      return `Great week! ${stats.activeDays} days of focused practice with solid ${Math.round(stats.accuracy * 100)}% accuracy. You are making real progress that compounds over time.`;
    }
    if (stats.activeDays >= 4) {
      return `${stats.activeDays} active days this week -- that is solid consistency! Every card you reviewed strengthened a neural pathway. The accuracy will naturally improve as these pathways strengthen.`;
    }
    if (stats.activeDays >= 2) {
      return `You showed up ${stats.activeDays} times this week. That is ${stats.activeDays} more times than giving up. Even small sessions keep your memories alive and your streak potential intact. A little more consistency next week will unlock bigger gains.`;
    }
    if (stats.activeDays === 1) {
      return `You came back this week and reviewed ${stats.totalReviews} cards. That single session kept neural pathways active that would have weakened otherwise. Try adding just one more day next week -- the compound effect will surprise you.`;
    }

    // Zero activity
    return `It looks like this was a rest week. That is okay -- life happens. The beautiful thing about spaced repetition is that your previously learned material has not disappeared. It is still there, waiting to be refreshed. Even 5 minutes today would reactivate those memories.`;
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Generate personalized recommendations based on the week's data.
   */
  private generateRecommendations(
    stats: WeeklyStats,
    struggling: CardPerformance[],
    languages: LanguageBreakdown[]
  ): WeeklyRecommendation[] {
    const recommendations: WeeklyRecommendation[] = [];

    // Recommendation: Focus on struggling cards
    if (struggling.length > 0) {
      const worstCard = struggling[0];
      recommendations.push({
        type: 'focus-area',
        message: `You have ${struggling.length} cards with low accuracy this week. Consider adding mnemonics or example sentences to your hardest card: "${worstCard.front}."`,
        priority: 90,
      });
    }

    // Recommendation: Increase consistency
    if (stats.activeDays < 5) {
      recommendations.push({
        type: 'study-habit',
        message: `You studied ${stats.activeDays} out of 7 days. Try setting a daily reminder or reducing your daily goal to make it easier to show up every day. Consistency matters more than session length.`,
        priority: 85,
      });
    }

    // Recommendation: Accuracy-based
    if (stats.accuracy < 0.65 && stats.totalReviews >= 20) {
      recommendations.push({
        type: 'study-habit',
        message: `Your accuracy was ${Math.round(stats.accuracy * 100)}% this week. Consider reviewing some of your challenging cards more carefully, adding context sentences, or breaking complex cards into simpler ones.`,
        priority: 80,
      });
    } else if (stats.accuracy > 0.95 && stats.totalReviews >= 20) {
      recommendations.push({
        type: 'goal-adjustment',
        message: `With ${Math.round(stats.accuracy * 100)}% accuracy, you might benefit from introducing more new cards. Your current material may not be challenging enough for optimal learning (the sweet spot is around 85%).`,
        priority: 75,
      });
    }

    // Recommendation: Language balance (for polyglots)
    if (languages.length > 1) {
      const sorted = [...languages].sort((a, b) => a.totalReviews - b.totalReviews);
      const leastStudied = sorted[0];
      const mostStudied = sorted[sorted.length - 1];

      if (mostStudied.totalReviews > leastStudied.totalReviews * 3) {
        recommendations.push({
          type: 'focus-area',
          message: `Your ${leastStudied.language} practice (${leastStudied.totalReviews} reviews) is falling behind ${mostStudied.language} (${mostStudied.totalReviews} reviews). Consider dedicating a session or two to ${leastStudied.language} next week.`,
          priority: 70,
        });
      }
    }

    // Recommendation: Session duration
    if (stats.totalTimeSpentMs > 0) {
      const avgSessionMinutes = stats.activeDays > 0
        ? (stats.totalTimeSpentMs / stats.activeDays) / 60000
        : 0;

      if (avgSessionMinutes > 45) {
        recommendations.push({
          type: 'study-habit',
          message: `Your average session is ${Math.round(avgSessionMinutes)} minutes. Research shows that sessions over 30 minutes have diminishing returns. Try splitting into two shorter sessions for better retention.`,
          priority: 65,
        });
      }
    }

    // Celebration for great weeks
    if (stats.activeDays >= 6 && stats.accuracy >= 0.8) {
      recommendations.push({
        type: 'celebration',
        message: `Exceptional week! ${stats.activeDays} active days with ${Math.round(stats.accuracy * 100)}% accuracy. You are building a powerful learning habit. Keep this momentum going!`,
        priority: 100,
      });
    }

    // Sort by priority descending
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Map a database row to a CardPerformance object.
   */
  private mapCardPerformance(row: Record<string, unknown>): CardPerformance {
    const fields = typeof row.fields === 'string'
      ? JSON.parse(row.fields)
      : row.fields as Record<string, string>;

    const languageTag = row.language_tag as string | null;
    const language = languageTag ? languageTag.replace('language::', '') : null;

    return {
      cardId: row.card_id as string,
      front: fields.front ?? '',
      back: fields.back ?? '',
      deckName: row.deck_name as string,
      language,
      reviewCount: row.review_count as number,
      accuracy: Math.round((row.this_week_accuracy as number) * 1000) / 1000,
      accuracyChange: Math.round((row.accuracy_change as number) * 1000) / 1000,
      currentIntervalDays: row.interval_days as number,
    };
  }

  /**
   * Calculate the current streak (consecutive days with at least 1 review).
   */
  private async calculateStreak(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT DISTINCT rl.reviewed_at::date AS review_date
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at >= NOW() - INTERVAL '365 days'
       ORDER BY review_date DESC`,
      [userId]
    );

    if (result.rows.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reviewDates = new Set(
      result.rows.map((row: Record<string, unknown>) =>
        new Date(row.review_date as string).toISOString().split('T')[0]
      )
    );

    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (reviewDates.has(dateStr)) {
        streak++;
      } else if (i === 0) {
        // Today might not have reviews yet -- skip without breaking
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  /**
   * Get the ISO date string for the most recent Monday (or today if Monday).
   */
  private getMostRecentMonday(): string {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return monday.toISOString().split('T')[0];
  }

  /**
   * Get the Sunday date for a given week start (Monday).
   */
  private getWeekEnd(weekStart: string): string {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  }

  /**
   * Get the previous week's start (Monday) given a week start.
   */
  private getPreviousWeekStart(weekStart: string): string {
    const start = new Date(weekStart);
    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);
    return prevStart.toISOString().split('T')[0];
  }

  /**
   * Format a duration in milliseconds to a human-readable string.
   */
  private formatDuration(ms: number): string {
    if (ms === 0) return '0 minutes';

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0 || parts.length === 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }
}
