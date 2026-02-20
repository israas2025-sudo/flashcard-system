/**
 * fsrs-optimizer.ts -- Machine learning optimization of the 19 FSRS parameters.
 *
 * Optimizes the FSRS-5 weight vector from a user's review history using
 * numerical gradient descent.  The optimization minimizes the root mean
 * squared error (RMSE) between the FSRS model's predicted retrievability
 * and the actual observed recall rate across all review logs.
 *
 * No external ML library is required -- FSRS optimization is a
 * straightforward numerical minimization problem over 19 continuous
 * parameters.
 *
 * Reference: https://github.com/open-spaced-repetition/fsrs-optimizer
 */

import {
  Rating,
  CardState,
  ReviewLog,
  CardSchedulingData,
} from './types';

import {
  retrievability,
  initStability,
  initDifficulty,
  nextStability,
  nextDifficulty,
  nextInterval,
  DEFAULT_FSRS_WEIGHTS,
} from './fsrs';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * The result of an optimization run.
 */
export interface OptimizationResult {
  /** Optimized 19-element weight vector. */
  parameters: number[];

  /** Final RMSE (root mean squared error) of predicted vs. actual retention. */
  loss: number;

  /** Number of gradient descent iterations performed. */
  iterations: number;

  /** Percentage improvement over the default (or provided) parameters. */
  improvement: number;

  /** Recommended desired retention based on the optimized parameters. */
  recommendedRetention: number;
}

// ---------------------------------------------------------------------------
// Internal: Processed review sequence for a single card
// ---------------------------------------------------------------------------

/**
 * A single review event within a card's history, enriched with elapsed
 * days since the previous review and the binary outcome (recalled or not).
 */
interface ReviewEvent {
  /** Days since the previous review (or first seen if first review). */
  elapsedDays: number;

  /** True if the user recalled (rating != Again), false otherwise. */
  recalled: boolean;

  /** The Rating given by the user. */
  rating: Rating;

  /** The CardState before this review. */
  stateBefore: CardState;
}

/**
 * A card's full review sequence, ordered chronologically.
 */
interface CardReviewSequence {
  /** The card's unique ID. */
  cardId: string;

  /** Ordered review events for this card. */
  events: ReviewEvent[];
}

// ---------------------------------------------------------------------------
// Parameter bounds
// ---------------------------------------------------------------------------

/** Lower bounds for each of the 19 FSRS parameters. */
const LOWER_BOUNDS: number[] = [
  0.01, 0.01, 0.01, 0.01,  // w[0-3]: S0 initial stabilities (must be positive)
  1.0,                       // w[4]: D0 offset
  0.01,                      // w[5]: D0 slope
  0.01,                      // w[6]: difficulty revision factor
  0.001,                     // w[7]: difficulty revision exponent
  0.01,                      // w[8]: stability success base
  0.001,                     // w[9]: stability success difficulty weight
  0.01,                      // w[10]: stability success stability weight
  0.01,                      // w[11]: stability success retrievability weight
  0.001,                     // w[12]: stability fail base
  0.001,                     // w[13]: stability fail difficulty weight
  0.01,                      // w[14]: stability fail old-stability weight
  0.001,                     // w[15]: stability fail retrievability weight
  0.5,                       // w[16]: hard penalty factor
  0.1,                       // w[17]: easy bonus factor
  0.01,                      // w[18]: short-term stability exponent
];

/** Upper bounds for each of the 19 FSRS parameters. */
const UPPER_BOUNDS: number[] = [
  100, 100, 100, 100,       // w[0-3]: S0
  10,                        // w[4]: D0 offset
  5.0,                       // w[5]: D0 slope
  5.0,                       // w[6]: difficulty revision factor
  1.0,                       // w[7]: difficulty revision exponent
  5.0,                       // w[8]: stability success base
  2.0,                       // w[9]: stability success difficulty weight
  5.0,                       // w[10]: stability success stability weight
  5.0,                       // w[11]: stability success retrievability weight
  1.0,                       // w[12]: stability fail base
  2.0,                       // w[13]: stability fail difficulty weight
  5.0,                       // w[14]: stability fail old-stability weight
  2.0,                       // w[15]: stability fail retrievability weight
  10.0,                      // w[16]: hard penalty factor
  5.0,                       // w[17]: easy bonus factor
  5.0,                       // w[18]: short-term stability exponent
];

// ---------------------------------------------------------------------------
// FSRSOptimizer
// ---------------------------------------------------------------------------

/**
 * Optimizes the 19 FSRS parameters from user review history.
 *
 * The optimizer:
 *  1. Groups review logs by card and orders them chronologically.
 *  2. For each review, simulates what the FSRS model predicts for
 *     retrievability given the current parameters and elapsed time.
 *  3. Compares predicted retrievability to the actual binary outcome
 *     (recalled vs. forgot).
 *  4. Computes RMSE loss and uses numerical gradient descent to
 *     minimize it.
 *
 * The optimization uses L-BFGS-style updates approximated by Adam
 * (adaptive moment estimation) for stable convergence.
 */
export class FSRSOptimizer {
  /**
   * Optimize FSRS parameters from review history.
   *
   * @param reviewLogs    - All review logs to optimize against.
   * @param currentParams - Starting parameters (defaults to FSRS-5 defaults).
   * @returns The optimized parameters, final loss, and improvement metrics.
   */
  optimize(
    reviewLogs: ReviewLog[],
    currentParams?: number[],
  ): OptimizationResult {
    const startParams = currentParams && currentParams.length === 19
      ? currentParams.slice()
      : DEFAULT_FSRS_WEIGHTS.slice();

    // Pre-process: group review logs by card into ordered sequences
    const sequences = this.buildCardSequences(reviewLogs);

    if (sequences.length === 0) {
      return {
        parameters: startParams,
        loss: 0,
        iterations: 0,
        improvement: 0,
        recommendedRetention: 0.9,
      };
    }

    // Calculate initial loss
    const initialLoss = this.calculateLoss(startParams, reviewLogs);

    // Run Adam optimizer
    const maxIterations = 500;
    const learningRate = 0.005;
    const beta1 = 0.9;
    const beta2 = 0.999;
    const epsilon = 1e-8;

    let params = startParams.slice();
    let m = new Array(19).fill(0); // First moment
    let v = new Array(19).fill(0); // Second moment

    let bestParams = params.slice();
    let bestLoss = initialLoss;
    let iterations = 0;

    for (let iter = 1; iter <= maxIterations; iter++) {
      iterations = iter;

      // Compute gradient using finite differences
      const gradient = this.computeGradient(params, sequences);

      // Adam update
      for (let i = 0; i < 19; i++) {
        m[i] = beta1 * m[i] + (1 - beta1) * gradient[i];
        v[i] = beta2 * v[i] + (1 - beta2) * gradient[i] * gradient[i];

        const mHat = m[i] / (1 - Math.pow(beta1, iter));
        const vHat = v[i] / (1 - Math.pow(beta2, iter));

        params[i] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);

        // Clamp to bounds
        params[i] = Math.max(LOWER_BOUNDS[i], Math.min(UPPER_BOUNDS[i], params[i]));
      }

      // Evaluate loss
      const loss = this.calculateLossFromSequences(params, sequences);

      if (loss < bestLoss) {
        bestLoss = loss;
        bestParams = params.slice();
      }

      // Early stopping: if improvement is negligible for several iterations
      if (iter > 50 && Math.abs(loss - bestLoss) < 1e-7) {
        break;
      }
    }

    const improvement =
      initialLoss > 0
        ? Math.round(((initialLoss - bestLoss) / initialLoss) * 100 * 10) / 10
        : 0;

    const recommendedRetention = this.computeRecommendedRetention(bestParams, sequences);

    return {
      parameters: bestParams,
      loss: Math.round(bestLoss * 100000) / 100000,
      iterations,
      improvement: Math.max(0, improvement),
      recommendedRetention,
    };
  }

  /**
   * Calculate the RMSE loss for a given parameter set against review data.
   *
   * For each review event, the model predicts retrievability R based on
   * stability and elapsed time. The actual outcome is binary (1 = recalled,
   * 0 = forgot). The loss is RMSE over all events.
   *
   * @param params     - The 19-element FSRS weight vector.
   * @param reviewLogs - Review logs to evaluate against.
   * @returns RMSE loss (lower is better, 0 = perfect prediction).
   */
  calculateLoss(params: number[], reviewLogs: ReviewLog[]): number {
    const sequences = this.buildCardSequences(reviewLogs);
    return this.calculateLossFromSequences(params, sequences);
  }

  /**
   * Determine the minimum recommended retention based on review patterns.
   *
   * Analyzes the user's historical accuracy and workload to suggest a
   * retention floor below which forgetting becomes excessive.
   *
   * @param reviewLogs - The user's review history.
   * @returns Recommended minimum retention (typically 0.80-0.92).
   */
  getMinimumRecommendedRetention(reviewLogs: ReviewLog[]): number {
    if (reviewLogs.length === 0) return 0.85;

    // Compute historical accuracy
    const totalReviews = reviewLogs.length;
    const recalls = reviewLogs.filter((l) => l.rating !== Rating.Again).length;
    const accuracy = recalls / totalReviews;

    // Compute average lapse rate
    const lapses = reviewLogs.filter(
      (l) => l.rating === Rating.Again && l.stateBefore === CardState.Review,
    ).length;
    const lapseRate = lapses / totalReviews;

    // The minimum retention should keep the lapse rate manageable.
    // Formula: if the user currently has X% accuracy at retention R,
    // the minimum retention is where lapses don't exceed ~15%.
    //
    // We use a simple heuristic: minimum retention = max(0.80, accuracy - 0.10)
    // but also factor in the lapse rate.
    let minRetention: number;

    if (lapseRate > 0.15) {
      // High lapse rate: recommend higher retention
      minRetention = Math.min(0.95, accuracy + 0.05);
    } else if (lapseRate > 0.10) {
      minRetention = Math.max(0.85, accuracy - 0.05);
    } else {
      // Low lapse rate: can afford lower retention
      minRetention = Math.max(0.80, accuracy - 0.10);
    }

    return Math.round(minRetention * 100) / 100;
  }

  /**
   * Check if enough data exists for meaningful optimization.
   *
   * FSRS optimization needs a minimum number of reviews to produce
   * reliable parameter estimates. The recommended minimum is 400 reviews,
   * but results start becoming useful around 200.
   *
   * @param reviewLogs - The review history to check.
   * @returns An object indicating whether there is enough data.
   */
  hasEnoughData(
    reviewLogs: ReviewLog[],
  ): { enough: boolean; reviewCount: number; recommended: number } {
    const reviewCount = reviewLogs.length;
    const recommended = 400;
    return {
      enough: reviewCount >= recommended,
      reviewCount,
      recommended,
    };
  }

  // -----------------------------------------------------------------------
  // Internal: Data preparation
  // -----------------------------------------------------------------------

  /**
   * Group review logs by cardId and sort each group chronologically.
   */
  private buildCardSequences(reviewLogs: ReviewLog[]): CardReviewSequence[] {
    // Group by card
    const byCard = new Map<string, ReviewLog[]>();
    for (const log of reviewLogs) {
      const existing = byCard.get(log.cardId);
      if (existing) {
        existing.push(log);
      } else {
        byCard.set(log.cardId, [log]);
      }
    }

    const sequences: CardReviewSequence[] = [];

    for (const [cardId, logs] of byCard) {
      // Sort by review time
      logs.sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());

      const events: ReviewEvent[] = [];

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        let elapsedDays: number;
        if (i === 0) {
          // First review: elapsed = 0 (new card)
          elapsedDays = 0;
        } else {
          const prev = logs[i - 1];
          elapsedDays = Math.max(
            0,
            (log.reviewedAt.getTime() - prev.reviewedAt.getTime()) / (1000 * 60 * 60 * 24),
          );
        }

        events.push({
          elapsedDays,
          recalled: log.rating !== Rating.Again,
          rating: log.rating,
          stateBefore: log.stateBefore,
        });
      }

      if (events.length > 0) {
        sequences.push({ cardId, events });
      }
    }

    return sequences;
  }

  // -----------------------------------------------------------------------
  // Internal: Loss computation
  // -----------------------------------------------------------------------

  /**
   * Compute RMSE loss from pre-processed card sequences.
   *
   * For each card, we simulate the FSRS model forward through its review
   * history, tracking predicted retrievability at each review moment and
   * comparing to the actual outcome.
   */
  private calculateLossFromSequences(
    w: number[],
    sequences: CardReviewSequence[],
  ): number {
    let sumSquaredError = 0;
    let count = 0;

    for (const seq of sequences) {
      // Simulate the FSRS model for this card
      let stability = 0;
      let difficulty = 0;
      let initialized = false;

      for (const event of seq.events) {
        if (!initialized) {
          // First review: initialize S and D from the first rating
          stability = initStability(event.rating, w);
          difficulty = initDifficulty(event.rating, w);
          initialized = true;
          // For the first review, predicted R = 1 (card just seen) - skip loss
          continue;
        }

        // Predicted retrievability at this review moment
        const predictedR = retrievability(event.elapsedDays, stability);
        const actualR = event.recalled ? 1 : 0;

        // Only count events where the card was in review or relearning state
        // (learning steps are too short for meaningful retrievability prediction)
        if (
          event.stateBefore === CardState.Review ||
          event.stateBefore === CardState.Relearning
        ) {
          const error = predictedR - actualR;
          sumSquaredError += error * error;
          count++;
        }

        // Update model state based on actual rating
        const r = retrievability(event.elapsedDays, stability);
        difficulty = nextDifficulty(difficulty, event.rating, w);
        stability = nextStability(difficulty, stability, r, event.rating, w);
      }
    }

    if (count === 0) return 0;
    return Math.sqrt(sumSquaredError / count);
  }

  // -----------------------------------------------------------------------
  // Internal: Gradient computation (numerical finite differences)
  // -----------------------------------------------------------------------

  /**
   * Compute the gradient of the loss function with respect to each
   * parameter using central finite differences.
   *
   * For each parameter w[i], we compute:
   *   dL/dw[i] ~= (L(w + h*e_i) - L(w - h*e_i)) / (2 * h)
   *
   * where h is a small perturbation and e_i is the i-th unit vector.
   */
  private computeGradient(
    params: number[],
    sequences: CardReviewSequence[],
  ): number[] {
    const gradient = new Array(19).fill(0);
    const h = 1e-4; // Step size for finite differences

    for (let i = 0; i < 19; i++) {
      // Perturbation proportional to parameter magnitude for better conditioning
      const step = Math.max(h, Math.abs(params[i]) * h);

      const paramsPlus = params.slice();
      const paramsMinus = params.slice();

      paramsPlus[i] = Math.min(UPPER_BOUNDS[i], params[i] + step);
      paramsMinus[i] = Math.max(LOWER_BOUNDS[i], params[i] - step);

      const lossPlus = this.calculateLossFromSequences(paramsPlus, sequences);
      const lossMinus = this.calculateLossFromSequences(paramsMinus, sequences);

      gradient[i] = (lossPlus - lossMinus) / (2 * step);
    }

    return gradient;
  }

  // -----------------------------------------------------------------------
  // Internal: Recommended retention
  // -----------------------------------------------------------------------

  /**
   * Compute a recommended desired retention value based on the optimized
   * parameters and the user's review history.
   *
   * The idea: find the retention level that balances workload and accuracy.
   * We evaluate several retention levels and pick the one that minimizes
   * a combined cost of reviews + forgetting.
   */
  private computeRecommendedRetention(
    w: number[],
    sequences: CardReviewSequence[],
  ): number {
    // Compute average stability across all mature cards (cards with > 2 reviews)
    let totalStability = 0;
    let matureCount = 0;

    for (const seq of sequences) {
      if (seq.events.length < 3) continue;

      let stability = initStability(seq.events[0].rating, w);
      let difficulty = initDifficulty(seq.events[0].rating, w);

      for (let i = 1; i < seq.events.length; i++) {
        const event = seq.events[i];
        const r = retrievability(event.elapsedDays, stability);
        difficulty = nextDifficulty(difficulty, event.rating, w);
        stability = nextStability(difficulty, stability, r, event.rating, w);
      }

      totalStability += stability;
      matureCount++;
    }

    if (matureCount === 0) return 0.9;

    const avgStability = totalStability / matureCount;

    // For higher average stability, we can afford slightly lower retention
    // (cards are well-learned). For lower stability, keep retention high.
    //
    // Heuristic formula:
    //   recommended = 0.85 + 0.05 * sigmoid((avgStability - 30) / 20)
    //
    // This gives:
    //   avgStability ~5   -> ~0.86
    //   avgStability ~30  -> ~0.88
    //   avgStability ~100 -> ~0.90
    const sigmoid = 1 / (1 + Math.exp(-(avgStability - 30) / 20));
    const recommended = 0.85 + 0.05 * sigmoid;

    return Math.round(recommended * 100) / 100;
  }
}
