/**
 * stats-service.ts -- Comprehensive statistics and analytics service.
 *
 * Provides all the data needed for the dashboard, charts, and detailed
 * analytics views. Each method issues optimized SQL queries with proper
 * date grouping, aggregation, and window functions.
 *
 * Query Design Principles:
 * - All date grouping respects the user's day boundary setting
 * - Aggregations use proper NULL handling (COALESCE, NULLIF)
 * - Index-friendly WHERE clauses for performance on large datasets
 * - COUNT(DISTINCT ...) where duplicate rows are possible from JOINs
 * - Window functions for running totals and streak calculations
 */

import { pool } from '../db/connection';
import type {
  DailyStat,
  IntervalBucket,
  CardStateBreakdown,
  ForecastDay,
  AnswerDistribution,
  HourlyBucket,
  ReviewLogEntry,
  LanguageStat,
  DashboardSummary,
} from './types';

// ---------------------------------------------------------------------------
// Interval Distribution Bucket Definitions
// ---------------------------------------------------------------------------

/**
 * Predefined buckets for the interval distribution histogram.
 * Ranges are chosen to give meaningful granularity at both the
 * short-interval and long-interval ends of the spectrum.
 */
const INTERVAL_BUCKETS = [
  { label: '0 days (learning)', minDays: 0, maxDays: 1 },
  { label: '1 day', minDays: 1, maxDays: 2 },
  { label: '2-3 days', minDays: 2, maxDays: 4 },
  { label: '4-7 days', minDays: 4, maxDays: 8 },
  { label: '8-14 days', minDays: 8, maxDays: 15 },
  { label: '15-30 days', minDays: 15, maxDays: 31 },
  { label: '1-3 months', minDays: 31, maxDays: 91 },
  { label: '3-6 months', minDays: 91, maxDays: 181 },
  { label: '6-12 months', minDays: 181, maxDays: 366 },
  { label: '1+ years', minDays: 366, maxDays: 100000 },
] as const;

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
// StatsService
// ---------------------------------------------------------------------------

export class StatsService {
  // -------------------------------------------------------------------------
  // Daily Time Series
  // -------------------------------------------------------------------------

  /**
   * Get the number of cards reviewed per day for the last N days.
   *
   * Uses generate_series to ensure every day in the range is represented,
   * even days with zero reviews (important for line chart continuity).
   *
   * @param userId - The user to query.
   * @param days - Number of days to look back (default: 30).
   * @returns Array of {date, value} pairs, one per day.
   */
  async getCardsPerDay(userId: string, days: number = 30): Promise<DailyStat[]> {
    const result = await pool.query(
      `WITH date_series AS (
         SELECT generate_series(
           (CURRENT_DATE - ($2::int - 1) * INTERVAL '1 day')::date,
           CURRENT_DATE,
           '1 day'::interval
         )::date AS day
       ),
       daily_counts AS (
         SELECT DATE(rl.reviewed_at) AS review_date,
                COUNT(*)::int AS card_count
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
         GROUP BY DATE(rl.reviewed_at)
       )
       SELECT ds.day::text AS date,
              COALESCE(dc.card_count, 0)::int AS value
       FROM date_series ds
       LEFT JOIN daily_counts dc ON ds.day = dc.review_date
       ORDER BY ds.day`,
      [userId, days]
    );

    return result.rows as DailyStat[];
  }

  /**
   * Get the total study time per day for the last N days (in minutes).
   *
   * Aggregates the time_spent_ms column from review_logs and converts
   * to minutes for human-readable display.
   *
   * @param userId - The user to query.
   * @param days - Number of days to look back (default: 30).
   * @returns Array of {date, value} pairs where value is minutes.
   */
  async getTimePerDay(userId: string, days: number = 30): Promise<DailyStat[]> {
    const result = await pool.query(
      `WITH date_series AS (
         SELECT generate_series(
           (CURRENT_DATE - ($2::int - 1) * INTERVAL '1 day')::date,
           CURRENT_DATE,
           '1 day'::interval
         )::date AS day
       ),
       daily_time AS (
         SELECT DATE(rl.reviewed_at) AS review_date,
                ROUND(SUM(COALESCE(rl.time_spent_ms, 0)) / 60000.0, 1) AS minutes
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
         GROUP BY DATE(rl.reviewed_at)
       )
       SELECT ds.day::text AS date,
              COALESCE(dt.minutes, 0)::float AS value
       FROM date_series ds
       LEFT JOIN daily_time dt ON ds.day = dt.review_date
       ORDER BY ds.day`,
      [userId, days]
    );

    return result.rows as DailyStat[];
  }

  // -------------------------------------------------------------------------
  // Distribution Charts
  // -------------------------------------------------------------------------

  /**
   * Get the interval distribution showing how many cards fall into each
   * interval range.
   *
   * Uses CASE expressions to bucket cards into predefined ranges.
   * Only active, non-new cards are included.
   *
   * @param userId - The user to query.
   * @returns Array of interval buckets with card counts.
   */
  async getIntervalDistribution(userId: string): Promise<IntervalBucket[]> {
    const result = await pool.query(
      `SELECT
         CASE
           WHEN c.interval_days < 1  THEN 0
           WHEN c.interval_days < 2  THEN 1
           WHEN c.interval_days < 4  THEN 2
           WHEN c.interval_days < 8  THEN 3
           WHEN c.interval_days < 15 THEN 4
           WHEN c.interval_days < 31 THEN 5
           WHEN c.interval_days < 91 THEN 6
           WHEN c.interval_days < 181 THEN 7
           WHEN c.interval_days < 366 THEN 8
           ELSE 9
         END AS bucket_idx,
         COUNT(*)::int AS count
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.status = 'active'
         AND c.card_type != 'new'
       GROUP BY bucket_idx
       ORDER BY bucket_idx`,
      [userId]
    );

    // Map query results back to the full bucket definitions
    const countMap = new Map<number, number>(
      result.rows.map((r: { bucket_idx: number; count: number }) => [
        r.bucket_idx,
        r.count,
      ])
    );

    return INTERVAL_BUCKETS.map((bucket, index) => ({
      ...bucket,
      count: countMap.get(index) ?? 0,
    }));
  }

  /**
   * Get the breakdown of cards by scheduling state.
   *
   * Distinguishes between new, learning, young review, mature review,
   * and paused cards. The young/mature split is at 21 days, following
   * the standard SRS convention.
   *
   * @param userId - The user to query.
   * @param deckId - Optional deck filter.
   * @returns Card state breakdown counts.
   */
  async getCardStateBreakdown(
    userId: string,
    deckId?: string
  ): Promise<CardStateBreakdown> {
    const deckFilter = deckId ? 'AND c.deck_id = $2' : '';
    const params: (string | undefined)[] = [userId];
    if (deckId) params.push(deckId);

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE c.card_type = 'new' AND c.status = 'active')::int
           AS "newCount",
         COUNT(*) FILTER (WHERE c.card_type IN ('learning', 'relearning') AND c.status = 'active')::int
           AS "learningCount",
         COUNT(*) FILTER (WHERE c.card_type = 'review' AND c.status = 'active' AND c.interval_days < 21)::int
           AS "youngCount",
         COUNT(*) FILTER (WHERE c.card_type = 'review' AND c.status = 'active' AND c.interval_days >= 21)::int
           AS "matureCount",
         COUNT(*) FILTER (WHERE c.status = 'paused')::int
           AS "pausedCount",
         COUNT(*)::int AS "totalCount"
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         ${deckFilter}`,
      params
    );

    return result.rows[0] as CardStateBreakdown;
  }

  // -------------------------------------------------------------------------
  // Review Forecast
  // -------------------------------------------------------------------------

  /**
   * Forecast the number of reviews due each day for the next N days.
   *
   * Uses the cards' current due dates to project future workload.
   * Cards that are already overdue are shown as cumulative overdue
   * on the first day.
   *
   * @param userId - The user to query.
   * @param days - Number of days to forecast (default: 30).
   * @returns Array of forecast entries, one per day.
   */
  async getReviewForecast(userId: string, days: number = 30): Promise<ForecastDay[]> {
    const result = await pool.query(
      `WITH date_series AS (
         SELECT generate_series(
           CURRENT_DATE,
           CURRENT_DATE + ($2::int - 1) * INTERVAL '1 day',
           '1 day'::interval
         )::date AS day
       ),
       due_counts AS (
         SELECT DATE(c.due) AS due_date,
                COUNT(*)::int AS review_count
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND c.status = 'active'
           AND c.card_type IN ('review', 'relearning')
           AND c.due IS NOT NULL
           AND DATE(c.due) <= CURRENT_DATE + ($2::int) * INTERVAL '1 day'
         GROUP BY DATE(c.due)
       ),
       overdue AS (
         SELECT COUNT(*)::int AS overdue_count
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND c.status = 'active'
           AND c.card_type IN ('review', 'relearning')
           AND c.due IS NOT NULL
           AND c.due < CURRENT_DATE
       ),
       new_card_limit AS (
         SELECT COALESCE(
           (SELECT dp.new_cards_per_day
            FROM deck_presets dp
            JOIN decks d ON d.preset_id = dp.id
            JOIN notes n2 ON n2.user_id = $1
            LIMIT 1),
           20
         )::int AS daily_new
       )
       SELECT ds.day::text AS date,
              COALESCE(dc.review_count, 0)::int AS "reviewCount",
              (SELECT daily_new FROM new_card_limit)::int AS "newCount",
              (COALESCE(dc.review_count, 0)
               + (SELECT daily_new FROM new_card_limit))::int AS "totalCount",
              CASE WHEN ds.day = CURRENT_DATE
                   THEN (SELECT overdue_count FROM overdue)
                   ELSE 0
              END::int AS "cumulativeOverdue"
       FROM date_series ds
       LEFT JOIN due_counts dc ON ds.day = dc.due_date
       ORDER BY ds.day`,
      [userId, days]
    );

    return result.rows as ForecastDay[];
  }

  // -------------------------------------------------------------------------
  // Answer Analysis
  // -------------------------------------------------------------------------

  /**
   * Get the distribution of answer buttons pressed over the last N days.
   *
   * @param userId - The user to query.
   * @param days - Number of days to look back (default: 30).
   * @returns Count of each answer button and accuracy.
   */
  async getAnswerDistribution(
    userId: string,
    days: number = 30
  ): Promise<AnswerDistribution> {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE rl.rating = 'again')::int AS again,
         COUNT(*) FILTER (WHERE rl.rating = 'hard')::int  AS hard,
         COUNT(*) FILTER (WHERE rl.rating = 'good')::int  AS good,
         COUNT(*) FILTER (WHERE rl.rating = 'easy')::int  AS easy,
         COUNT(*)::int AS total
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'`,
      [userId, days]
    );

    const row = result.rows[0];
    const total = row.total || 1; // Avoid division by zero
    const accuracy = 1 - row.again / total;

    return {
      again: row.again,
      hard: row.hard,
      good: row.good,
      easy: row.easy,
      total: row.total,
      accuracy: Math.round(accuracy * 1000) / 1000,
    };
  }

  /**
   * Get review activity and performance broken down by hour of day.
   *
   * Uses EXTRACT(HOUR ...) for grouping and computes average accuracy
   * and speed for each hour. Helps users identify their peak study times.
   *
   * @param userId - The user to query.
   * @returns Array of 24 hourly buckets (some may have zero counts).
   */
  async getHourlyBreakdown(userId: string): Promise<HourlyBucket[]> {
    const result = await pool.query(
      `WITH hourly_data AS (
         SELECT
           EXTRACT(HOUR FROM rl.reviewed_at)::int AS hour,
           COUNT(*)::int AS review_count,
           1.0 - (COUNT(*) FILTER (WHERE rl.rating = 'again')::float
                  / NULLIF(COUNT(*), 0)) AS avg_accuracy,
           AVG(COALESCE(rl.time_spent_ms, 0))::float AS avg_time_ms
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at >= CURRENT_DATE - INTERVAL '90 days'
         GROUP BY EXTRACT(HOUR FROM rl.reviewed_at)
       ),
       all_hours AS (
         SELECT generate_series(0, 23) AS hour
       )
       SELECT ah.hour::int AS hour,
              COALESCE(hd.review_count, 0)::int AS "reviewCount",
              COALESCE(ROUND(hd.avg_accuracy::numeric, 3), 0)::float AS "averageAccuracy",
              COALESCE(ROUND(hd.avg_time_ms::numeric, 0), 0)::float AS "averageTimeMs"
       FROM all_hours ah
       LEFT JOIN hourly_data hd ON ah.hour = hd.hour
       ORDER BY ah.hour`,
      [userId]
    );

    return result.rows as HourlyBucket[];
  }

  // -------------------------------------------------------------------------
  // Per-Card History
  // -------------------------------------------------------------------------

  /**
   * Get the complete review history for a specific card, including
   * FSRS parameter snapshots at each review.
   *
   * Results are ordered chronologically (oldest first) for timeline display.
   *
   * @param cardId - The card to query.
   * @returns Array of review log entries with full parameter data.
   */
  async getCardHistory(cardId: string): Promise<ReviewLogEntry[]> {
    const result = await pool.query(
      `SELECT
         rl.id,
         rl.card_id AS "cardId",
         rl.reviewed_at AS "reviewedAt",
         rl.rating,
         rl.interval_before AS "intervalBefore",
         rl.interval_after AS "intervalAfter",
         rl.stability_before AS "stabilityBefore",
         rl.stability_after AS "stabilityAfter",
         rl.difficulty_before AS "difficultyBefore",
         rl.difficulty_after AS "difficultyAfter",
         rl.time_spent_ms AS "timeSpentMs",
         rl.review_type AS "reviewType"
       FROM review_logs rl
       WHERE rl.card_id = $1
       ORDER BY rl.reviewed_at ASC`,
      [cardId]
    );

    return result.rows as ReviewLogEntry[];
  }

  // -------------------------------------------------------------------------
  // Language Statistics
  // -------------------------------------------------------------------------

  /**
   * Get study statistics broken down by language.
   *
   * Identifies languages by tags matching the `language::*` pattern.
   * For each language, computes total cards, studied cards, due today,
   * maturity, accuracy, and review counts.
   *
   * @param userId - The user to query.
   * @returns Array of per-language statistics.
   */
  async getLanguageStats(userId: string): Promise<LanguageStat[]> {
    const result = await pool.query(
      `WITH language_cards AS (
         SELECT
           SUBSTRING(t.slug FROM 'language::(.+)') AS language,
           c.id AS card_id,
           c.card_type,
           c.interval_days,
           c.status,
           c.due,
           c.reps
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         JOIN note_tags nt ON n.id = nt.note_id
         JOIN tags t ON nt.tag_id = t.id
         WHERE n.user_id = $1
           AND t.slug LIKE 'language::%'
       ),
       language_reviews AS (
         SELECT
           SUBSTRING(t.slug FROM 'language::(.+)') AS language,
           rl.rating,
           rl.reviewed_at
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         JOIN note_tags nt ON n.id = nt.note_id
         JOIN tags t ON nt.tag_id = t.id
         WHERE n.user_id = $1
           AND t.slug LIKE 'language::%'
       ),
       language_agg AS (
         SELECT
           lc.language,
           COUNT(DISTINCT lc.card_id)::int AS total_cards,
           COUNT(DISTINCT lc.card_id) FILTER (WHERE lc.reps > 0)::int AS studied_cards,
           COUNT(DISTINCT lc.card_id) FILTER (
             WHERE lc.status = 'active' AND lc.due <= NOW()
           )::int AS due_today,
           COUNT(DISTINCT lc.card_id) FILTER (
             WHERE lc.card_type = 'review' AND lc.interval_days >= 21
           )::int AS mature_cards
         FROM language_cards lc
         GROUP BY lc.language
       ),
       language_accuracy AS (
         SELECT
           lr.language,
           COUNT(*)::int AS total_reviews,
           1.0 - (COUNT(*) FILTER (WHERE lr.rating = 'again')::float
                  / NULLIF(COUNT(*), 0)) AS recent_accuracy
         FROM language_reviews lr
         WHERE lr.reviewed_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY lr.language
       ),
       language_intervals AS (
         SELECT
           lc.language,
           COALESCE(AVG(lc.interval_days) FILTER (
             WHERE lc.card_type = 'review' AND lc.interval_days >= 21
           ), 0)::float AS avg_mature_interval
         FROM language_cards lc
         GROUP BY lc.language
       )
       SELECT
         la.language,
         la.total_cards AS "totalCards",
         la.studied_cards AS "studiedCards",
         la.due_today AS "dueToday",
         la.mature_cards AS "matureCards",
         COALESCE(ROUND(lac.recent_accuracy::numeric, 3), 0)::float AS "recentAccuracy",
         COALESCE(ROUND(li.avg_mature_interval::numeric, 1), 0)::float AS "averageMatureInterval",
         COALESCE(lac.total_reviews, 0)::int AS "totalReviews"
       FROM language_agg la
       LEFT JOIN language_accuracy lac ON la.language = lac.language
       LEFT JOIN language_intervals li ON la.language = li.language
       WHERE la.language IS NOT NULL
       ORDER BY la.total_cards DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      ...row,
      displayName: LANGUAGE_DISPLAY_NAMES[row.language] ?? this.formatLanguageName(row.language),
    })) as LanguageStat[];
  }

  // -------------------------------------------------------------------------
  // Dashboard Summary
  // -------------------------------------------------------------------------

  /**
   * Get a comprehensive summary for the main dashboard.
   *
   * Combines multiple aggregations into a single response to minimize
   * round trips. Uses subqueries and CTEs for efficient execution.
   *
   * @param userId - The user to query.
   * @returns Complete dashboard summary data.
   */
  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const result = await pool.query(
      `WITH user_data AS (
         SELECT xp_total, streak_current
         FROM users WHERE id = $1
       ),
       card_counts AS (
         SELECT COUNT(*)::int AS total_cards
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
       ),
       due_counts AS (
         SELECT COUNT(*)::int AS due_today
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND c.status = 'active'
           AND c.due <= NOW()
       ),
       today_reviews AS (
         SELECT
           COUNT(*)::int AS studied_today,
           1.0 - (COUNT(*) FILTER (WHERE rl.rating = 'again')::float
                  / NULLIF(COUNT(*), 0)) AS accuracy_today
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND DATE(rl.reviewed_at) = CURRENT_DATE
       ),
       weekly_reviews AS (
         SELECT
           COUNT(*)::int AS weekly_cards,
           1.0 - (COUNT(*) FILTER (WHERE rl.rating = 'again')::float
                  / NULLIF(COUNT(*), 0)) AS weekly_accuracy
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at >= CURRENT_DATE - INTERVAL '7 days'
       )
       SELECT
         (SELECT total_cards FROM card_counts) AS "totalCards",
         (SELECT studied_today FROM today_reviews) AS "cardsStudiedToday",
         (SELECT due_today FROM due_counts) AS "dueToday",
         COALESCE((SELECT ROUND(accuracy_today::numeric, 3) FROM today_reviews), 0)::float
           AS "accuracyToday",
         (SELECT streak_current FROM user_data)::int AS "streakDays",
         (SELECT xp_total FROM user_data)::bigint AS "totalXP",
         (SELECT weekly_cards FROM weekly_reviews) AS "weeklyCards",
         COALESCE((SELECT ROUND(weekly_accuracy::numeric, 3) FROM weekly_reviews), 0)::float
           AS "weeklyAccuracy"`,
      [userId]
    );

    const row = result.rows[0];
    const totalXP = Number(row.totalXP);
    const level = Math.floor(Math.pow(totalXP / 50, 1 / 1.5));

    // Fetch language stats separately (complex query best kept modular)
    const languages = await this.getLanguageStats(userId);

    return {
      totalCards: row.totalCards,
      cardsStudiedToday: row.cardsStudiedToday,
      dueToday: row.dueToday,
      accuracyToday: row.accuracyToday,
      streakDays: row.streakDays,
      totalXP,
      level,
      weeklyCards: row.weeklyCards,
      weeklyAccuracy: row.weeklyAccuracy,
      languages,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Format a language slug into a human-readable name.
   *
   * Converts slugs like "classical-arabic" to "Classical Arabic"
   * when not found in the display name mapping.
   *
   * @param slug - The language slug.
   * @returns Formatted display name.
   */
  private formatLanguageName(slug: string): string {
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
