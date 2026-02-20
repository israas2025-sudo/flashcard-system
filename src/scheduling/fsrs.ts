/**
 * fsrs.ts -- Core FSRS-5 spaced-repetition scheduling algorithm.
 *
 * Implements the Free Spaced Repetition Scheduler version 5 as described in:
 *   https://github.com/open-spaced-repetition/fsrs4anki
 *
 * The FSRS model represents memory with two variables:
 *   - **Stability (S):** the interval (in days) at which recall probability
 *     equals 90%.  Higher stability means slower forgetting.
 *   - **Difficulty (D):** a value in [1, 10] capturing how intrinsically hard
 *     a card is.  Higher difficulty means harder to remember.
 *
 * After every review the algorithm updates S and D based on the user rating
 * and the elapsed time, then converts the new stability into a scheduling
 * interval that targets the desired retention rate.
 */

import {
  Rating,
  CardState,
  FSRSParameters,
  CardSchedulingData,
  ScheduledCard,
  SchedulingResult,
} from './types';

// ---------------------------------------------------------------------------
// Default FSRS-5 parameters (optimised on a large Anki dataset)
// ---------------------------------------------------------------------------

/**
 * Default 19-element weight vector for the FSRS-5 model.
 *
 * Source: open-spaced-repetition/fsrs4anki v5 defaults.
 */
export const DEFAULT_FSRS_WEIGHTS: number[] = [
  0.4072,  // w[0]  - S0(Again) initial stability for Again
  1.1829,  // w[1]  - S0(Hard)  initial stability for Hard
  3.1262,  // w[2]  - S0(Good)  initial stability for Good
  15.4722, // w[3]  - S0(Easy)  initial stability for Easy
  7.2102,  // w[4]  - D0 offset (initial difficulty base)
  0.5316,  // w[5]  - D0 slope  (initial difficulty sensitivity)
  1.0651,  // w[6]  - Difficulty revision factor
  0.0589,  // w[7]  - Difficulty revision exponent
  1.5747,  // w[8]  - Stability success base
  0.1070,  // w[9]  - Stability success difficulty weight
  1.0070,  // w[10] - Stability success stability weight (exponent)
  1.7524,  // w[11] - Stability success retrievability weight
  0.0367,  // w[12] - Stability fail base
  0.3240,  // w[13] - Stability fail difficulty weight
  2.1799,  // w[14] - Stability fail old-stability weight (exponent)
  0.2090,  // w[15] - Stability fail retrievability weight
  2.9466,  // w[16] - Hard penalty factor
  0.5034,  // w[17] - Easy bonus factor
  0.6567,  // w[18] - Short-term stability exponent
];

/**
 * Sensible default parameters for production use.
 */
export const DEFAULT_FSRS_PARAMETERS: FSRSParameters = {
  w: DEFAULT_FSRS_WEIGHTS,
  requestRetention: 0.9,
  maximumInterval: 36500, // ~100 years
};

// ---------------------------------------------------------------------------
// Core FSRS-5 functions
// ---------------------------------------------------------------------------

/**
 * Compute the initial difficulty D0 for a card based on its first rating.
 *
 * Formula:
 *   D0(G) = w[4] - e^(w[5] * (G - 1)) + 1
 *
 * The result is clamped to [1, 10].
 *
 * @param rating - The first rating given to the card (1-4).
 * @param w      - The FSRS weight vector.
 * @returns Initial difficulty in the range [1, 10].
 */
export function initDifficulty(rating: Rating, w: number[] = DEFAULT_FSRS_WEIGHTS): number {
  const g = rating as number;
  const d0 = w[4] - Math.exp(w[5] * (g - 1)) + 1;
  return clampDifficulty(d0);
}

/**
 * Compute the initial stability S0 for a card based on its first rating.
 *
 * Formula:
 *   S0(G) = w[G - 1]
 *
 * Each rating maps directly to a learned initial stability value.
 *
 * @param rating - The first rating given to the card (1-4).
 * @param w      - The FSRS weight vector.
 * @returns Initial stability in days (always >= 0.01).
 */
export function initStability(rating: Rating, w: number[] = DEFAULT_FSRS_WEIGHTS): number {
  return Math.max(w[rating - 1], 0.01);
}

/**
 * Compute the current probability of recall (retrievability) given elapsed
 * time and stability.
 *
 * Formula (power forgetting curve):
 *   R(t, S) = (1 + t / (9 * S))^(-1)
 *
 * When t = 0 the result is 1 (perfect recall).
 * When t = S the result is approximately 0.9 (by design the 90% retention
 * point).
 *
 * @param elapsedDays - Days since the last review (t >= 0).
 * @param stability   - Current memory stability (S > 0).
 * @returns Probability of recall in [0, 1].
 */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Update difficulty after a review.
 *
 * Formula (with mean reversion toward D0(3)):
 *   D'(D, G) = w[7] * D0(3) + (1 - w[7]) * (D - w[6] * (G - 3))
 *
 * Mean reversion prevents difficulty from drifting too far from the
 * population mean, stabilising long-term scheduling.
 *
 * @param d      - Current difficulty.
 * @param rating - Rating given in this review.
 * @param w      - The FSRS weight vector.
 * @returns Updated difficulty clamped to [1, 10].
 */
export function nextDifficulty(
  d: number,
  rating: Rating,
  w: number[] = DEFAULT_FSRS_WEIGHTS,
): number {
  const g = rating as number;

  // Mean-reversion target: what D0 would be for a "Good" rating
  const d0Good = w[4] - Math.exp(w[5] * (3 - 1)) + 1;

  // Linear change in difficulty
  const deltaD = -w[6] * (g - 3);

  // Mean reversion blend
  const newD = w[7] * d0Good + (1 - w[7]) * (d + deltaD);

  return clampDifficulty(newD);
}

/**
 * Compute the next stability after a **successful** recall (rating >= Hard).
 *
 * Formula:
 *   S'_success(D, S, R, G) = S * (e^(w[8]) *
 *       (11 - D) * S^(-w[10]) * (e^(w[11] * (1 - R)) - 1) *
 *       hardPenalty * easyBonus + 1)
 *
 * Where:
 *   - hardPenalty = w[16] if G == Hard, else 1
 *   - easyBonus   = w[17] if G == Easy, else 1
 *
 * @param d      - Current difficulty.
 * @param s      - Current stability.
 * @param r      - Current retrievability (probability of recall).
 * @param rating - Rating (Hard, Good, or Easy).
 * @param w      - The FSRS weight vector.
 * @returns New stability in days (always >= 0.01).
 */
export function nextStabilityAfterSuccess(
  d: number,
  s: number,
  r: number,
  rating: Rating,
  w: number[] = DEFAULT_FSRS_WEIGHTS,
): number {
  const hardPenalty = rating === Rating.Hard ? w[16] : 1;
  const easyBonus = rating === Rating.Easy ? w[17] : 1;

  const newS =
    s *
    (Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[10]) *
      (Math.exp(w[11] * (1 - r)) - 1) *
      hardPenalty *
      easyBonus +
      1);

  return Math.max(newS, 0.01);
}

/**
 * Compute the next stability after a **failed** recall (Again).
 *
 * Formula:
 *   S'_fail(D, S, R) = w[12] * D^(-w[13]) * ((S + 1)^w[14] - 1) * e^(w[15] * (1 - R))
 *
 * A lapse dramatically reduces stability, but the new value is bounded below
 * by a small positive number to avoid degenerate scheduling.
 *
 * @param d - Current difficulty.
 * @param s - Current stability.
 * @param r - Current retrievability.
 * @param w - The FSRS weight vector.
 * @returns New stability in days (always >= 0.01).
 */
export function nextStabilityAfterFailure(
  d: number,
  s: number,
  r: number,
  w: number[] = DEFAULT_FSRS_WEIGHTS,
): number {
  const newS =
    w[12] *
    Math.pow(d, -w[13]) *
    (Math.pow(s + 1, w[14]) - 1) *
    Math.exp(w[15] * (1 - r));

  // The new stability after failure should be less than the old stability
  return Math.max(Math.min(newS, s), 0.01);
}

/**
 * Unified next-stability dispatcher that delegates to the success or
 * failure formula depending on the rating.
 *
 * @param d      - Current difficulty.
 * @param s      - Current stability.
 * @param r      - Current retrievability.
 * @param rating - User rating.
 * @param w      - The FSRS weight vector.
 * @returns Updated stability.
 */
export function nextStability(
  d: number,
  s: number,
  r: number,
  rating: Rating,
  w: number[] = DEFAULT_FSRS_WEIGHTS,
): number {
  if (rating === Rating.Again) {
    return nextStabilityAfterFailure(d, s, r, w);
  }
  return nextStabilityAfterSuccess(d, s, r, rating, w);
}

/**
 * Convert stability and desired retention into a scheduling interval.
 *
 * Formula (derived from the forgetting curve):
 *   I = 9 * S * (1/R - 1)
 *
 * Where R = requestRetention.  For R = 0.9 this simplifies to I = S.
 *
 * @param stability        - Memory stability in days.
 * @param requestRetention - Desired recall probability at review time.
 * @param maximumInterval  - Upper bound for the returned interval.
 * @returns Interval in days (integer, >= 1).
 */
export function nextInterval(
  stability: number,
  requestRetention: number = 0.9,
  maximumInterval: number = 36500,
): number {
  if (requestRetention <= 0 || requestRetention >= 1) {
    throw new RangeError('requestRetention must be in (0, 1)');
  }
  const interval = 9 * stability * (1 / requestRetention - 1);
  return Math.min(Math.max(Math.round(interval), 1), maximumInterval);
}

/**
 * Apply a random fuzz factor to an interval to prevent clustering of
 * reviews on the same day.
 *
 * The fuzz range scales with the interval length:
 * - interval <= 2:  no fuzz
 * - interval  3-6:  +/- 1 day
 * - interval  7-13: +/- up to ~15% of interval
 * - interval >= 14: +/- up to ~20% of interval
 *
 * @param interval - Base interval in days.
 * @returns Fuzzed interval in days (integer, >= 1).
 */
export function fuzzInterval(interval: number): number {
  if (interval <= 2) return interval;

  let fuzzRange: number;

  if (interval < 7) {
    // Small intervals: fuzz by +/- 1 day
    fuzzRange = 1;
  } else if (interval < 14) {
    // Medium intervals: fuzz proportionally (up to ~15%)
    fuzzRange = Math.max(1, Math.round(interval * 0.15));
  } else {
    // Large intervals: broader fuzz (up to ~20%, capped at 30)
    fuzzRange = Math.min(Math.max(1, Math.round(interval * 0.20)), 30);
  }

  // Random integer in [-fuzzRange, +fuzzRange]
  const delta = Math.floor(Math.random() * (2 * fuzzRange + 1)) - fuzzRange;
  return Math.max(1, Math.round(interval + delta));
}

// ---------------------------------------------------------------------------
// Scheduling helpers for short-term (learning / relearning) states
// ---------------------------------------------------------------------------

/**
 * Compute short-term stability for learning / relearning states.
 *
 * Formula:
 *   S'_short(S, G) = S * e^(w[18] * (G - 3 + w[17]))
 *
 * This is used for intra-day steps where the full SRS formula is not yet
 * applicable.
 *
 * @param s      - Current stability.
 * @param rating - Rating given.
 * @param w      - The FSRS weight vector.
 * @returns Updated short-term stability.
 */
export function shortTermStability(
  s: number,
  rating: Rating,
  w: number[] = DEFAULT_FSRS_WEIGHTS,
): number {
  const g = rating as number;
  return Math.max(s * Math.exp(w[18] * (g - 3 + w[17])), 0.01);
}

// ---------------------------------------------------------------------------
// Main scheduling function
// ---------------------------------------------------------------------------

/**
 * Schedule a card for all four possible ratings.
 *
 * This is the primary entry point for the FSRS-5 algorithm.  Given a card's
 * current scheduling state and the current time, it returns four
 * {@link ScheduledCard} objects -- one for each possible user rating (Again,
 * Hard, Good, Easy).
 *
 * The caller can then apply the chosen rating's result to update the card.
 *
 * @param card   - Current scheduling data for the card.
 * @param now    - The current date/time (defaults to `new Date()`).
 * @param params - FSRS parameters (defaults to {@link DEFAULT_FSRS_PARAMETERS}).
 * @returns A {@link SchedulingResult} with outcomes for all four ratings.
 */
export function schedule(
  card: CardSchedulingData,
  now: Date = new Date(),
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS,
): SchedulingResult {
  const { w, requestRetention, maximumInterval } = params;

  // Compute elapsed days since last review
  const elapsedDays =
    card.lastReview !== null
      ? Math.max(0, (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  // -----------------------------------
  // NEW cards: first review ever
  // -----------------------------------
  if (card.state === CardState.New) {
    return scheduleNewCard(card, now, w, requestRetention, maximumInterval);
  }

  // -----------------------------------
  // LEARNING / RELEARNING cards
  // -----------------------------------
  if (card.state === CardState.Learning || card.state === CardState.Relearning) {
    return scheduleLearningCard(card, now, elapsedDays, w, requestRetention, maximumInterval);
  }

  // -----------------------------------
  // REVIEW cards
  // -----------------------------------
  return scheduleReviewCard(card, now, elapsedDays, w, requestRetention, maximumInterval);
}

// ---------------------------------------------------------------------------
// Internal scheduling by state
// ---------------------------------------------------------------------------

/**
 * Schedule a brand-new card that has never been reviewed.
 */
function scheduleNewCard(
  card: CardSchedulingData,
  now: Date,
  w: number[],
  requestRetention: number,
  maximumInterval: number,
): SchedulingResult {
  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
  const results: Partial<SchedulingResult> = {};

  for (const rating of ratings) {
    const stability = initStability(rating, w);
    const difficulty = initDifficulty(rating, w);

    let state: CardState;
    let interval: number;

    if (rating === Rating.Again) {
      // Again -> Learning (stays in learning, short step)
      state = CardState.Learning;
      interval = 0; // Due again shortly (1-minute step handled by session)
    } else if (rating === Rating.Hard) {
      // Hard -> Learning
      state = CardState.Learning;
      interval = 0;
    } else if (rating === Rating.Good) {
      // Good -> Review (graduate immediately)
      state = CardState.Review;
      interval = nextInterval(stability, requestRetention, maximumInterval);
    } else {
      // Easy -> Review (graduate immediately with longer interval)
      state = CardState.Review;
      interval = Math.max(
        nextInterval(stability, requestRetention, maximumInterval),
        1,
      );
    }

    const due = addDays(now, interval);

    const newCard: CardSchedulingData = {
      stability,
      difficulty,
      elapsedDays: 0,
      scheduledDays: interval,
      reps: card.reps + 1,
      lapses: card.lapses,
      state,
      lastReview: now,
    };

    const key = ratingKey(rating);
    results[key] = { card: newCard, interval, due };
  }

  return results as SchedulingResult;
}

/**
 * Schedule a card currently in Learning or Relearning state.
 */
function scheduleLearningCard(
  card: CardSchedulingData,
  now: Date,
  elapsedDays: number,
  w: number[],
  requestRetention: number,
  maximumInterval: number,
): SchedulingResult {
  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
  const results: Partial<SchedulingResult> = {};

  for (const rating of ratings) {
    const stability = shortTermStability(card.stability, rating, w);
    const difficulty = nextDifficulty(card.difficulty, rating, w);

    let state: CardState;
    let interval: number;

    if (rating === Rating.Again) {
      // Fail -> stay in learning / relearning, reset step
      state = card.state; // stay in Learning or Relearning
      interval = 0;
    } else if (rating === Rating.Hard) {
      // Hard -> remain in same state but advance slightly
      state = card.state;
      interval = 0;
    } else if (rating === Rating.Good) {
      // Good -> graduate to Review
      state = CardState.Review;
      interval = nextInterval(stability, requestRetention, maximumInterval);
    } else {
      // Easy -> graduate to Review with bonus
      state = CardState.Review;
      interval = Math.max(
        nextInterval(stability, requestRetention, maximumInterval),
        1,
      );
    }

    const due = addDays(now, interval);

    const newCard: CardSchedulingData = {
      stability,
      difficulty,
      elapsedDays: Math.round(elapsedDays),
      scheduledDays: interval,
      reps: card.reps + 1,
      lapses: card.lapses,
      state,
      lastReview: now,
    };

    const key = ratingKey(rating);
    results[key] = { card: newCard, interval, due };
  }

  return results as SchedulingResult;
}

/**
 * Schedule a card currently in Review state (the typical SRS case).
 */
function scheduleReviewCard(
  card: CardSchedulingData,
  now: Date,
  elapsedDays: number,
  w: number[],
  requestRetention: number,
  maximumInterval: number,
): SchedulingResult {
  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
  const results: Partial<SchedulingResult> = {};

  // Current retrievability
  const r = retrievability(elapsedDays, card.stability);

  for (const rating of ratings) {
    const difficulty = nextDifficulty(card.difficulty, rating, w);
    const stability = nextStability(card.difficulty, card.stability, r, rating, w);

    let state: CardState;
    let interval: number;
    let lapses = card.lapses;

    if (rating === Rating.Again) {
      // Lapse -> Relearning
      state = CardState.Relearning;
      interval = 0;
      lapses += 1;
    } else {
      // Hard / Good / Easy -> stay in Review
      state = CardState.Review;
      interval = nextInterval(stability, requestRetention, maximumInterval);
    }

    // For Hard, ensure interval is at least the previous scheduled days
    // (don't go backwards more than necessary)
    if (rating === Rating.Hard) {
      interval = Math.max(interval, card.scheduledDays);
    }

    // For Good, ensure interval is strictly more than Hard
    if (rating === Rating.Good && results.hard) {
      interval = Math.max(interval, results.hard.interval + 1);
    }

    // For Easy, ensure interval is strictly more than Good
    if (rating === Rating.Easy && results.good) {
      interval = Math.max(interval, results.good.interval + 1);
    }

    // Cap to maximum
    interval = Math.min(interval, maximumInterval);

    const due = addDays(now, interval);

    const newCard: CardSchedulingData = {
      stability,
      difficulty,
      elapsedDays: Math.round(elapsedDays),
      scheduledDays: interval,
      reps: card.reps + 1,
      lapses,
      state,
      lastReview: now,
    };

    const key = ratingKey(rating);
    results[key] = { card: newCard, interval, due };
  }

  return results as SchedulingResult;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Create a blank {@link CardSchedulingData} for a brand-new card.
 */
export function createEmptyCard(): CardSchedulingData {
  return {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
    lastReview: null,
  };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Clamp difficulty to the valid range [1, 10]. */
function clampDifficulty(d: number): number {
  return Math.min(Math.max(d, 1), 10);
}

/** Map a {@link Rating} to the corresponding key name in SchedulingResult. */
function ratingKey(rating: Rating): keyof SchedulingResult {
  switch (rating) {
    case Rating.Again:
      return 'again';
    case Rating.Hard:
      return 'hard';
    case Rating.Good:
      return 'good';
    case Rating.Easy:
      return 'easy';
  }
}

/** Add a number of days (possibly fractional) to a date. */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setTime(result.getTime() + days * 24 * 60 * 60 * 1000);
  return result;
}
