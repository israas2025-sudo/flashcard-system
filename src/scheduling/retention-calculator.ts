/**
 * retention-calculator.ts -- Minimum Recommended Retention Calculator.
 *
 * Calculates the optimal desired retention setting based on the user's
 * available study time, collection size, and historical accuracy.
 *
 * The key insight is that retention and workload are inversely related
 * through the FSRS scheduling formula:
 *
 *   Interval = 9 * Stability * (1/Retention - 1)
 *
 * Higher retention -> shorter intervals -> more reviews per day.
 * Lower retention  -> longer intervals  -> fewer reviews, but more forgetting.
 *
 * The "sweet spot" depends on the individual user's constraints:
 *   - A student with 2 hours/day can afford high retention (0.95).
 *   - A casual learner with 15 minutes/day may need to accept lower
 *     retention (0.85) to avoid an unsustainable review pile.
 *
 * The typical recommended range is 0.80-0.95, with most users doing
 * well at 0.85-0.90.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Input parameters for the retention recommendation calculation.
 */
export interface RetentionCalcParams {
  /** Total number of cards in the collection. */
  totalCards: number;

  /** Average daily study time available in minutes. */
  avgDailyMinutes: number;

  /** Current answer accuracy (fraction 0-1). */
  currentAccuracy: number;

  /** Average seconds spent per review card. */
  avgSecondsPerReview: number;
}

/**
 * The output recommendation for desired retention.
 */
export interface RetentionRecommendation {
  /** The recommended desired retention value (e.g., 0.90). */
  recommended: number;

  /** The minimum retention below which forgetting becomes excessive. */
  minimum: number;

  /** The maximum useful retention (above this, diminishing returns). */
  maximum: number;

  /** Estimated daily reviews at the recommended retention. */
  estimatedDailyReviews: number;

  /** Estimated daily minutes at the recommended retention. */
  estimatedDailyMinutes: number;

  /** Human-readable explanation of the recommendation. */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The absolute floor for desired retention. Below this, the forgetting
 * rate is too high for effective learning. At 0.70, roughly 30% of cards
 * would be forgotten at review time, which is demoralizing and inefficient.
 */
const ABSOLUTE_MINIMUM_RETENTION = 0.70;

/**
 * The practical ceiling for desired retention. Above 0.97, intervals
 * become extremely short and the workload explodes for negligible
 * memory benefit. The FSRS formula gives:
 *   At R=0.97: interval = 9 * S * (1/0.97 - 1) = 0.278 * S
 *   At R=0.90: interval = 9 * S * (1/0.90 - 1) = S
 *
 * So at 0.97, intervals are about 3.6x shorter than at 0.90.
 */
const ABSOLUTE_MAXIMUM_RETENTION = 0.97;

/**
 * Default average stability assumed for a mature collection.
 * Used when we don't have card-level data.
 */
const DEFAULT_AVG_STABILITY = 30; // days

// ---------------------------------------------------------------------------
// RetentionCalculator
// ---------------------------------------------------------------------------

/**
 * Calculator for the optimal desired retention setting.
 *
 * The algorithm works by:
 *   1. Estimating the average stability of cards in the collection.
 *   2. For each candidate retention level, computing the expected daily
 *      review count using the FSRS interval formula.
 *   3. Finding the highest retention that fits within the user's available
 *      study time.
 *   4. Clamping to sensible minimum/maximum bounds.
 */
export class RetentionCalculator {
  /**
   * Calculate the recommended desired retention.
   *
   * @param params - User's collection stats and time constraints.
   * @returns A recommendation with the optimal retention and explanation.
   */
  calculateMinimumRetention(params: RetentionCalcParams): RetentionRecommendation {
    const {
      totalCards,
      avgDailyMinutes,
      currentAccuracy,
      avgSecondsPerReview,
    } = params;

    // Estimate average stability from current accuracy.
    // If the user has high accuracy, their cards are well-learned (high S).
    // If accuracy is low, stability is lower.
    const avgStability = this.estimateAverageStability(currentAccuracy);

    // Calculate daily review capacity from available time
    const secondsPerReview = Math.max(avgSecondsPerReview, 3);
    const dailyReviewCapacity = Math.floor((avgDailyMinutes * 60) / secondsPerReview);

    // For each candidate retention level, estimate daily reviews.
    // The expected number of reviews per day for N cards with average
    // stability S at retention R is:
    //
    //   daily_reviews = N / average_interval
    //
    // where average_interval = 9 * S * (1/R - 1)
    //
    // This formula comes from the steady-state analysis: in a stable
    // collection, each card is reviewed once per interval, so the daily
    // review count is the total cards divided by the average interval.

    const candidates = this.evaluateRetentionLevels(
      totalCards,
      avgStability,
      secondsPerReview,
    );

    // Find the highest retention that fits within the daily capacity
    let recommended = 0.85; // Default fallback
    let estimatedReviews = 0;

    for (const candidate of candidates) {
      if (candidate.dailyReviews <= dailyReviewCapacity) {
        if (candidate.retention > recommended) {
          recommended = candidate.retention;
          estimatedReviews = candidate.dailyReviews;
        }
      }
    }

    // If even the lowest retention exceeds capacity, use the lowest
    if (estimatedReviews === 0) {
      const lowest = candidates[candidates.length - 1];
      if (lowest) {
        recommended = lowest.retention;
        estimatedReviews = lowest.dailyReviews;
      }
    }

    // Compute the minimum and maximum
    const minimum = this.computeMinimumRetention(currentAccuracy);
    const maximum = this.computeMaximumRetention(dailyReviewCapacity, totalCards, avgStability);

    // Clamp recommended to [minimum, maximum]
    recommended = Math.max(minimum, Math.min(maximum, recommended));
    recommended = Math.round(recommended * 100) / 100;

    // Recompute estimated reviews at the final recommended retention
    const finalInterval = this.computeAverageInterval(avgStability, recommended);
    estimatedReviews = Math.round(totalCards / Math.max(finalInterval, 1));
    const estimatedDailyMinutes =
      Math.round((estimatedReviews * secondsPerReview) / 60 * 10) / 10;

    // Generate explanation
    const explanation = this.generateExplanation(
      recommended,
      minimum,
      maximum,
      estimatedReviews,
      estimatedDailyMinutes,
      avgDailyMinutes,
      totalCards,
    );

    return {
      recommended,
      minimum,
      maximum,
      estimatedDailyReviews: estimatedReviews,
      estimatedDailyMinutes,
      explanation,
    };
  }

  // -----------------------------------------------------------------------
  // Internal computation
  // -----------------------------------------------------------------------

  /**
   * Estimate average stability from current accuracy.
   *
   * Higher accuracy implies cards are well-learned with high stability.
   * This is a rough heuristic when we don't have per-card data.
   *
   * The mapping:
   *   accuracy 0.50 -> stability ~5 days
   *   accuracy 0.70 -> stability ~15 days
   *   accuracy 0.85 -> stability ~30 days
   *   accuracy 0.90 -> stability ~50 days
   *   accuracy 0.95 -> stability ~90 days
   *   accuracy 0.99 -> stability ~200 days
   */
  private estimateAverageStability(accuracy: number): number {
    // Clamp accuracy to valid range
    const a = Math.max(0.3, Math.min(0.99, accuracy));

    // Use an exponential mapping:
    //   S = base * exp(k * accuracy)
    // Tuned so that accuracy=0.85 -> S~30 and accuracy=0.95 -> S~90
    const base = 0.5;
    const k = 5.3;
    const stability = base * Math.exp(k * a);

    return Math.max(1, Math.round(stability));
  }

  /**
   * Compute the average interval at a given retention for a given stability.
   *
   * FSRS interval formula: I = 9 * S * (1/R - 1)
   */
  private computeAverageInterval(stability: number, retention: number): number {
    if (retention <= 0 || retention >= 1) return stability;
    return 9 * stability * (1 / retention - 1);
  }

  /**
   * Evaluate multiple retention levels and their corresponding daily reviews.
   */
  private evaluateRetentionLevels(
    totalCards: number,
    avgStability: number,
    secondsPerReview: number,
  ): { retention: number; dailyReviews: number; dailyMinutes: number }[] {
    const levels: { retention: number; dailyReviews: number; dailyMinutes: number }[] = [];

    // Test retention from 0.97 down to 0.70 in steps of 0.01
    for (let r = ABSOLUTE_MAXIMUM_RETENTION; r >= ABSOLUTE_MINIMUM_RETENTION; r -= 0.01) {
      const interval = this.computeAverageInterval(avgStability, r);
      const dailyReviews = Math.round(totalCards / Math.max(interval, 1));
      const dailyMinutes = Math.round((dailyReviews * secondsPerReview) / 60 * 10) / 10;

      levels.push({
        retention: Math.round(r * 100) / 100,
        dailyReviews,
        dailyMinutes,
      });
    }

    return levels;
  }

  /**
   * Compute the minimum acceptable retention based on current accuracy.
   *
   * If the user already has high accuracy, the minimum can be lower
   * (they're doing well). If accuracy is already low, the minimum
   * should be higher to prevent further degradation.
   */
  private computeMinimumRetention(currentAccuracy: number): number {
    // If accuracy is high (>90%), minimum can be 0.80 (the user has headroom).
    // If accuracy is moderate (75-90%), minimum is 0.82-0.85.
    // If accuracy is low (<75%), minimum is 0.85+ (need to retain more).
    if (currentAccuracy >= 0.90) {
      return 0.80;
    } else if (currentAccuracy >= 0.80) {
      return 0.82;
    } else if (currentAccuracy >= 0.70) {
      return 0.85;
    } else {
      return 0.87;
    }
  }

  /**
   * Compute the maximum useful retention based on workload capacity.
   *
   * If the user has lots of time and few cards, they can afford very
   * high retention. Otherwise, cap it to avoid unsustainable workload.
   */
  private computeMaximumRetention(
    dailyCapacity: number,
    totalCards: number,
    avgStability: number,
  ): number {
    // Find the highest retention where reviews fit in capacity
    for (let r = 0.97; r >= 0.80; r -= 0.01) {
      const interval = this.computeAverageInterval(avgStability, r);
      const reviews = totalCards / Math.max(interval, 1);
      if (reviews <= dailyCapacity * 1.1) {
        // Allow 10% overshoot
        return Math.round(r * 100) / 100;
      }
    }

    // Even at 0.80, reviews exceed capacity
    return 0.85;
  }

  /**
   * Generate a human-readable explanation of the recommendation.
   */
  private generateExplanation(
    recommended: number,
    minimum: number,
    maximum: number,
    estimatedReviews: number,
    estimatedMinutes: number,
    availableMinutes: number,
    totalCards: number,
  ): string {
    const parts: string[] = [];

    parts.push(
      `With ${totalCards} cards, a desired retention of ${(recommended * 100).toFixed(0)}% ` +
      `would result in approximately ${estimatedReviews} reviews per day ` +
      `(~${estimatedMinutes} minutes).`,
    );

    if (estimatedMinutes > availableMinutes) {
      parts.push(
        `This exceeds your available ${availableMinutes} minutes/day. ` +
        `Consider reducing your collection size or accepting a lower retention rate.`,
      );
    } else if (estimatedMinutes < availableMinutes * 0.5) {
      parts.push(
        `You have plenty of available time. You could increase retention to ` +
        `${(Math.min(maximum, recommended + 0.03) * 100).toFixed(0)}% ` +
        `for stronger memory.`,
      );
    } else {
      parts.push(
        `This fits well within your available ${availableMinutes} minutes/day.`,
      );
    }

    if (recommended <= 0.82) {
      parts.push(
        `Note: retention below 85% means you'll forget a significant portion ` +
        `of cards between reviews. This is acceptable for casual learning but ` +
        `not ideal for exam preparation.`,
      );
    }

    parts.push(
      `Recommended range: ${(minimum * 100).toFixed(0)}% - ${(maximum * 100).toFixed(0)}%.`,
    );

    return parts.join(' ');
  }
}
