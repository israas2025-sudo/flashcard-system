/**
 * types.ts -- Type definitions for the statistics and analytics subsystem.
 *
 * These types power the dashboard, charts, and detailed analytics views.
 * They are designed to be directly consumable by charting libraries
 * (e.g., Recharts, Chart.js) without transformation.
 */

// ---------------------------------------------------------------------------
// Daily Statistics
// ---------------------------------------------------------------------------

/**
 * A single data point for per-day time series charts.
 *
 * Used for "cards per day," "time per day," and similar visualizations.
 */
export interface DailyStat {
  /** ISO date string (YYYY-MM-DD). */
  date: string;

  /** The metric value for this day. */
  value: number;
}

// ---------------------------------------------------------------------------
// Interval Distribution
// ---------------------------------------------------------------------------

/**
 * A bucket in the interval distribution histogram.
 *
 * Shows how many cards have a given interval range, providing insight
 * into the overall maturity of the user's card collection.
 */
export interface IntervalBucket {
  /** Human-readable label for the bucket (e.g., "1-3 days", "1-3 months"). */
  label: string;

  /** Lower bound of the interval range in days (inclusive). */
  minDays: number;

  /** Upper bound of the interval range in days (exclusive). */
  maxDays: number;

  /** Number of cards with intervals in this range. */
  count: number;
}

// ---------------------------------------------------------------------------
// Card State Breakdown
// ---------------------------------------------------------------------------

/**
 * Breakdown of cards by their current scheduling state.
 *
 * "Young" and "mature" are subsets of the "review" state, split by
 * interval threshold (cards with interval >= 21 days are mature).
 */
export interface CardStateBreakdown {
  /** Cards that have never been reviewed. */
  newCount: number;

  /** Cards currently in learning or relearning steps. */
  learningCount: number;

  /** Review cards with interval < 21 days. */
  youngCount: number;

  /** Review cards with interval >= 21 days. */
  matureCount: number;

  /** Cards that are paused/suspended. */
  pausedCount: number;

  /** Total cards across all states. */
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Review Forecast
// ---------------------------------------------------------------------------

/**
 * Predicted review load for a single future day.
 *
 * The forecast helps users plan their study schedule and manage
 * their new-card intake to avoid overwhelming review days.
 */
export interface ForecastDay {
  /** ISO date string (YYYY-MM-DD). */
  date: string;

  /** Number of review cards predicted to be due. */
  reviewCount: number;

  /** Number of new cards expected (based on daily new card limit). */
  newCount: number;

  /** Combined total due cards. */
  totalCount: number;

  /** Cumulative overdue cards carried forward from previous days. */
  cumulativeOverdue: number;
}

// ---------------------------------------------------------------------------
// Answer Distribution
// ---------------------------------------------------------------------------

/**
 * Distribution of answer buttons pressed over a period.
 *
 * Useful for diagnosing study habits: a high "again" rate may indicate
 * cards are too difficult or introduced too quickly.
 */
export interface AnswerDistribution {
  /** Number of "again" presses. */
  again: number;

  /** Number of "hard" presses. */
  hard: number;

  /** Number of "good" presses. */
  good: number;

  /** Number of "easy" presses. */
  easy: number;

  /** Total reviews in the period. */
  total: number;

  /** Accuracy: fraction of non-"again" answers. */
  accuracy: number;
}

// ---------------------------------------------------------------------------
// Hourly Breakdown
// ---------------------------------------------------------------------------

/**
 * Review activity and performance for a single hour of the day.
 *
 * Helps users identify their optimal study times.
 */
export interface HourlyBucket {
  /** Hour of the day (0-23). */
  hour: number;

  /** Total reviews performed in this hour across all days. */
  reviewCount: number;

  /** Average accuracy in this hour (fraction). */
  averageAccuracy: number;

  /** Average time per card in this hour (milliseconds). */
  averageTimeMs: number;
}

// ---------------------------------------------------------------------------
// Review Log Entry
// ---------------------------------------------------------------------------

/**
 * A single review log entry with full FSRS parameter snapshots.
 *
 * Used for per-card history views and parameter analysis.
 */
export interface ReviewLogEntry {
  /** Log entry ID. */
  id: string;

  /** Card ID. */
  cardId: string;

  /** When the review occurred. */
  reviewedAt: Date;

  /** Rating given. */
  rating: string;

  /** Interval before the review (days). */
  intervalBefore: number | null;

  /** Interval after the review (days). */
  intervalAfter: number | null;

  /** Stability before the review. */
  stabilityBefore: number | null;

  /** Stability after the review. */
  stabilityAfter: number | null;

  /** Difficulty before the review. */
  difficultyBefore: number | null;

  /** Difficulty after the review. */
  difficultyAfter: number | null;

  /** Time spent on the card (ms). */
  timeSpentMs: number | null;

  /** Type of review (learning, review, relearning, filtered). */
  reviewType: string | null;
}

// ---------------------------------------------------------------------------
// Language Statistics
// ---------------------------------------------------------------------------

/**
 * Study statistics for a single language.
 *
 * Derived from cards tagged with `language::*` tags.
 */
export interface LanguageStat {
  /** Language identifier (e.g., 'spanish', 'classical-arabic'). */
  language: string;

  /** Human-readable language name. */
  displayName: string;

  /** Total cards in this language. */
  totalCards: number;

  /** Cards studied at least once. */
  studiedCards: number;

  /** Cards due today. */
  dueToday: number;

  /** Mature cards (interval >= 21 days). */
  matureCards: number;

  /** Average accuracy over the last 30 days. */
  recentAccuracy: number;

  /** Average interval of mature cards (days). */
  averageMatureInterval: number;

  /** Total reviews in this language. */
  totalReviews: number;
}

// ---------------------------------------------------------------------------
// Dashboard Summary
// ---------------------------------------------------------------------------

/**
 * Aggregated summary data for the main dashboard view.
 *
 * Combines card counts, daily stats, streak info, XP/level data,
 * and per-language breakdowns into a single response.
 */
export interface DashboardSummary {
  /** Total cards in the user's collection. */
  totalCards: number;

  /** Cards studied today. */
  cardsStudiedToday: number;

  /** Cards due today (including overdue). */
  dueToday: number;

  /** Accuracy today (fraction). */
  accuracyToday: number;

  /** Current streak in days. */
  streakDays: number;

  /** Total XP. */
  totalXP: number;

  /** Current level. */
  level: number;

  /** Cards studied this week (last 7 days). */
  weeklyCards: number;

  /** Accuracy this week (fraction). */
  weeklyAccuracy: number;

  /** Per-language breakdown. */
  languages: LanguageStat[];
}
