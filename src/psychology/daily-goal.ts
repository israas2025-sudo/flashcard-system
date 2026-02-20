/**
 * daily-goal.ts -- Daily Goal Tracking Service.
 *
 * Daily goals create a concrete, achievable target that transforms the
 * abstract aspiration "learn a language" into the actionable task "review
 * 20 cards today." This leverages Goal Setting Theory (Locke & Latham, 2002),
 * which demonstrates that specific, challenging goals lead to higher performance
 * than vague "do your best" directives.
 *
 * The adaptive goal system monitors the user's recent performance and gently
 * adjusts recommendations:
 *   - If the user consistently exceeds their goal by 20%+, we suggest raising it.
 *   - If the user misses 3+ days in the past week, we suggest lowering it.
 *
 * This prevents two failure modes:
 *   1. Goals that are too easy become meaningless and provide no motivation.
 *   2. Goals that are too hard lead to discouragement and dropout.
 *
 * Research Reference:
 *   Locke, E. A. & Latham, G. P. (2002) - "Building a Practically Useful
 *   Theory of Goal Setting and Task Motivation"
 */

import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default daily goal if the user has not set one. */
const DEFAULT_DAILY_GOAL = 20;

/** Minimum allowed daily goal. */
const MIN_DAILY_GOAL = 5;

/** Maximum allowed daily goal. */
const MAX_DAILY_GOAL = 500;

/** Threshold above which we suggest increasing the goal (120% = exceeds by 20%). */
const OVERPERFORMANCE_RATIO = 1.2;

/** Number of days of consecutive overperformance before suggesting an increase. */
const OVERPERFORMANCE_DAYS_THRESHOLD = 5;

/** Number of missed days in the past week before suggesting a decrease. */
const MISSED_DAYS_THRESHOLD = 3;

/** Number of days to look back for adaptive goal calculation. */
const ADAPTIVE_LOOKBACK_DAYS = 7;

/** Streak bonus XP multipliers by streak length. */
const STREAK_BONUS_TABLE: { minDays: number; multiplier: number; label: string }[] = [
  { minDays: 100, multiplier: 2.0, label: 'Centurion' },
  { minDays: 60,  multiplier: 1.8, label: 'Master' },
  { minDays: 30,  multiplier: 1.5, label: 'Dedicated' },
  { minDays: 14,  multiplier: 1.3, label: 'Committed' },
  { minDays: 7,   multiplier: 1.2, label: 'Weekly Warrior' },
  { minDays: 3,   multiplier: 1.1, label: 'Getting Started' },
  { minDays: 0,   multiplier: 1.0, label: 'No Streak' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyGoal {
  /** The user's ID. */
  userId: string;

  /** Target number of cards to review per day. */
  targetCards: number;

  /** When this goal was set or last updated. */
  updatedAt: Date;
}

export interface DailyProgress {
  /** The user's ID. */
  userId: string;

  /** Today's date (YYYY-MM-DD). */
  date: string;

  /** Target number of cards for today. */
  targetCards: number;

  /** Number of cards reviewed so far today. */
  reviewedCards: number;

  /** Progress as a percentage (0-100). */
  percentComplete: number;

  /** Whether the daily goal has been met. */
  isComplete: boolean;

  /** Number of cards remaining to meet the goal. */
  remaining: number;

  /** Current streak in days. */
  currentStreak: number;
}

export interface StreakBonus {
  /** Current streak length in days. */
  streakDays: number;

  /** XP multiplier for this streak level. */
  multiplier: number;

  /** Human-readable label for this streak level. */
  label: string;

  /** Days until the next streak bonus tier. */
  daysToNextTier: number;

  /** Label of the next tier, or null if at max. */
  nextTierLabel: string | null;
}

export interface AdaptiveGoalSuggestion {
  /** The current daily goal. */
  currentGoal: number;

  /** The suggested new daily goal. */
  suggestedGoal: number;

  /** Why this suggestion was made. */
  reason: string;

  /** Whether the suggestion is to increase, decrease, or maintain. */
  direction: 'increase' | 'decrease' | 'maintain';

  /** Performance data that drove the suggestion. */
  performanceData: {
    /** Number of days with reviews in the lookback window. */
    activeDays: number;

    /** Number of days where goal was met in the lookback window. */
    goalMetDays: number;

    /** Number of days where goal was exceeded by 20%+. */
    overperformanceDays: number;

    /** Number of days with zero reviews. */
    missedDays: number;

    /** Average cards reviewed on active days. */
    averageCardsOnActiveDays: number;
  };
}

// ---------------------------------------------------------------------------
// DailyGoalService
// ---------------------------------------------------------------------------

export class DailyGoalService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Set or update the daily review goal for a user.
   *
   * The goal is clamped to [MIN_DAILY_GOAL, MAX_DAILY_GOAL] to prevent
   * unreasonable values. If the user has no existing goal, one is created.
   *
   * @param userId - The user whose goal to set.
   * @param cardCount - Target number of cards per day.
   * @returns The saved daily goal.
   */
  async setDailyGoal(userId: string, cardCount: number): Promise<DailyGoal> {
    const clampedCount = Math.max(MIN_DAILY_GOAL, Math.min(MAX_DAILY_GOAL, Math.round(cardCount)));

    const result = await this.pool.query(
      `INSERT INTO daily_goals (user_id, target_cards, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET target_cards = $2, updated_at = NOW()
       RETURNING user_id, target_cards, updated_at`,
      [userId, clampedCount]
    );

    const row = result.rows[0];
    return {
      userId: row.user_id,
      targetCards: row.target_cards,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get the user's current daily progress.
   *
   * Combines the user's daily goal with today's review count from the
   * review_logs table to produce a complete progress snapshot.
   *
   * @param userId - The user to check.
   * @returns Today's progress details.
   */
  async getProgress(userId: string): Promise<DailyProgress> {
    const today = this.getTodayDateString();

    // Fetch goal and today's review count in parallel
    const [goalResult, reviewResult, streakResult] = await Promise.all([
      this.pool.query(
        `SELECT target_cards FROM daily_goals WHERE user_id = $1`,
        [userId]
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS count
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at::date = $2::date`,
        [userId, today]
      ),
      this.getCurrentStreak(userId),
    ]);

    const targetCards = goalResult.rows.length > 0
      ? goalResult.rows[0].target_cards
      : DEFAULT_DAILY_GOAL;
    const reviewedCards = reviewResult.rows[0].count;
    const percentComplete = targetCards > 0
      ? Math.min(100, Math.round((reviewedCards / targetCards) * 100))
      : 0;

    return {
      userId,
      date: today,
      targetCards,
      reviewedCards,
      percentComplete,
      isComplete: reviewedCards >= targetCards,
      remaining: Math.max(0, targetCards - reviewedCards),
      currentStreak: streakResult,
    };
  }

  /**
   * Check if the user has completed today's daily goal.
   *
   * This is a lightweight check intended for quick UI updates and
   * notification triggers. For full details, use `getProgress`.
   *
   * @param userId - The user to check.
   * @returns true if the daily goal is met, false otherwise.
   */
  async checkCompletion(userId: string): Promise<boolean> {
    const today = this.getTodayDateString();

    const result = await this.pool.query(
      `SELECT
         COALESCE(dg.target_cards, $3) AS target,
         COUNT(rl.id)::int AS reviewed
       FROM daily_goals dg
       FULL OUTER JOIN (
         SELECT rl2.id
         FROM review_logs rl2
         JOIN cards c ON rl2.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl2.reviewed_at::date = $2::date
       ) rl ON true
       WHERE dg.user_id = $1 OR dg.user_id IS NULL
       GROUP BY dg.target_cards`,
      [userId, today, DEFAULT_DAILY_GOAL]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const { target, reviewed } = result.rows[0];
    return reviewed >= target;
  }

  /**
   * Get the streak bonus for a given streak length.
   *
   * Streak bonuses reward consistency with escalating XP multipliers.
   * The tier system provides intermediate milestones that maintain
   * motivation during the long journey to mastery.
   *
   * @param streakDays - Current streak length in days.
   * @returns Streak bonus details including multiplier and tier info.
   */
  getStreakBonus(streakDays: number): StreakBonus {
    let currentTierIndex = STREAK_BONUS_TABLE.length - 1;

    for (let i = 0; i < STREAK_BONUS_TABLE.length; i++) {
      if (streakDays >= STREAK_BONUS_TABLE[i].minDays) {
        currentTierIndex = i;
        break;
      }
    }

    const currentTier = STREAK_BONUS_TABLE[currentTierIndex];
    const nextTierIndex = currentTierIndex - 1;
    const nextTier = nextTierIndex >= 0 ? STREAK_BONUS_TABLE[nextTierIndex] : null;

    return {
      streakDays,
      multiplier: currentTier.multiplier,
      label: currentTier.label,
      daysToNextTier: nextTier ? nextTier.minDays - streakDays : 0,
      nextTierLabel: nextTier ? nextTier.label : null,
    };
  }

  /**
   * Calculate an adaptive goal suggestion based on the user's recent history.
   *
   * Examines the past 7 days of review activity and suggests adjustments:
   *   - If the user exceeded their goal by 20%+ on 5+ of 7 days, suggest
   *     raising the goal to match their demonstrated capacity.
   *   - If the user missed 3+ of the past 7 days, suggest lowering the goal
   *     to reduce the barrier to showing up.
   *   - Otherwise, maintain the current goal.
   *
   * @param userId - The user to analyze.
   * @param history - Optional pre-fetched history (for testing). If not
   *                  provided, history is fetched from the database.
   * @returns The adaptive goal suggestion with supporting data.
   */
  async calculateAdaptiveGoal(
    userId: string,
    history?: { date: string; reviewCount: number }[]
  ): Promise<AdaptiveGoalSuggestion> {
    // Fetch current goal
    const goalResult = await this.pool.query(
      `SELECT target_cards FROM daily_goals WHERE user_id = $1`,
      [userId]
    );
    const currentGoal = goalResult.rows.length > 0
      ? goalResult.rows[0].target_cards
      : DEFAULT_DAILY_GOAL;

    // Fetch recent history if not provided
    const recentHistory = history ?? await this.fetchRecentHistory(userId);

    // Analyze the history
    const activeDays = recentHistory.filter((d) => d.reviewCount > 0).length;
    const missedDays = ADAPTIVE_LOOKBACK_DAYS - activeDays;
    const goalMetDays = recentHistory.filter((d) => d.reviewCount >= currentGoal).length;
    const overperformanceDays = recentHistory.filter(
      (d) => d.reviewCount >= currentGoal * OVERPERFORMANCE_RATIO
    ).length;

    const totalReviewsOnActiveDays = recentHistory
      .filter((d) => d.reviewCount > 0)
      .reduce((sum, d) => sum + d.reviewCount, 0);
    const averageCardsOnActiveDays = activeDays > 0
      ? Math.round(totalReviewsOnActiveDays / activeDays)
      : 0;

    const performanceData = {
      activeDays,
      goalMetDays,
      overperformanceDays,
      missedDays,
      averageCardsOnActiveDays,
    };

    // Decision logic
    if (overperformanceDays >= OVERPERFORMANCE_DAYS_THRESHOLD) {
      // User is consistently crushing their goal -- suggest raising it
      const suggestedGoal = Math.min(
        MAX_DAILY_GOAL,
        Math.round(averageCardsOnActiveDays * 0.9) // Set to 90% of their average to keep it challenging but achievable
      );

      if (suggestedGoal > currentGoal) {
        return {
          currentGoal,
          suggestedGoal,
          reason: `You exceeded your goal on ${overperformanceDays} of the past ${ADAPTIVE_LOOKBACK_DAYS} days. You are ready for a bigger challenge!`,
          direction: 'increase',
          performanceData,
        };
      }
    }

    if (missedDays >= MISSED_DAYS_THRESHOLD) {
      // User is struggling to show up -- suggest lowering the goal
      const suggestedGoal = Math.max(
        MIN_DAILY_GOAL,
        Math.round(currentGoal * 0.7) // Reduce by 30% to lower the barrier
      );

      if (suggestedGoal < currentGoal) {
        return {
          currentGoal,
          suggestedGoal,
          reason: `You missed ${missedDays} days in the past week. A smaller daily goal can help you build consistency. Showing up matters more than the number.`,
          direction: 'decrease',
          performanceData,
        };
      }
    }

    // No change needed
    return {
      currentGoal,
      suggestedGoal: currentGoal,
      reason: 'Your current goal matches your recent performance well. Keep it up!',
      direction: 'maintain',
      performanceData,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Get the current streak (consecutive days with at least `target` reviews).
   */
  private async getCurrentStreak(userId: string): Promise<number> {
    // Get the user's goal
    const goalResult = await this.pool.query(
      `SELECT target_cards FROM daily_goals WHERE user_id = $1`,
      [userId]
    );
    const targetCards = goalResult.rows.length > 0
      ? goalResult.rows[0].target_cards
      : DEFAULT_DAILY_GOAL;

    // Get daily review counts for the past 365 days (max streak we track)
    const result = await this.pool.query(
      `SELECT
         rl.reviewed_at::date AS review_date,
         COUNT(*)::int AS review_count
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at >= NOW() - INTERVAL '365 days'
       GROUP BY rl.reviewed_at::date
       ORDER BY review_date DESC`,
      [userId]
    );

    // Count consecutive days from today (or yesterday if today hasn't met goal yet)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reviewsByDate = new Map<string, number>();
    for (const row of result.rows) {
      const dateStr = new Date(row.review_date).toISOString().split('T')[0];
      reviewsByDate.set(dateStr, row.review_count);
    }

    // Check from today backwards
    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const count = reviewsByDate.get(dateStr) ?? 0;

      if (count >= targetCards) {
        streak++;
      } else if (i === 0) {
        // Today hasn't met goal yet -- that's ok, don't break streak.
        // The streak is based on completed past days.
        // Continue checking from yesterday.
      } else {
        break;
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  /**
   * Fetch the review count per day for the past ADAPTIVE_LOOKBACK_DAYS.
   */
  private async fetchRecentHistory(
    userId: string
  ): Promise<{ date: string; reviewCount: number }[]> {
    const result = await this.pool.query(
      `SELECT
         d::date AS review_date,
         COALESCE(counts.review_count, 0)::int AS review_count
       FROM generate_series(
         (NOW() - INTERVAL '${ADAPTIVE_LOOKBACK_DAYS} days')::date,
         NOW()::date - INTERVAL '1 day',
         INTERVAL '1 day'
       ) AS d
       LEFT JOIN (
         SELECT
           rl.reviewed_at::date AS rdate,
           COUNT(*)::int AS review_count
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
           AND rl.reviewed_at >= NOW() - INTERVAL '${ADAPTIVE_LOOKBACK_DAYS} days'
         GROUP BY rl.reviewed_at::date
       ) counts ON counts.rdate = d::date
       ORDER BY review_date`,
      [userId]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      date: new Date(row.review_date as string).toISOString().split('T')[0],
      reviewCount: row.review_count as number,
    }));
  }

  /**
   * Get today's date as YYYY-MM-DD string in the server's timezone.
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}
