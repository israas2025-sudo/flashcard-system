/**
 * sm2.ts -- Legacy SM-2 spaced-repetition algorithm for backwards compatibility.
 *
 * Implements the SuperMemo-2 algorithm with enhancements commonly found in
 * Anki-style SRS applications:
 *
 *   - Configurable learning and relearning steps (intra-day).
 *   - Ease factor (starting at 2.5) with an "ease hell" floor at 1.3.
 *   - Separate multipliers for Hard and Easy ratings.
 *   - Maximum interval cap.
 *
 * The original SM-2 algorithm was published by Piotr Wozniak in 1990.
 * This implementation extends it with four-button grading (Again / Hard /
 * Good / Easy) instead of the original 0-5 quality scale.
 *
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import {
  Rating,
  CardState,
  SM2Parameters,
  SM2CardData,
  SM2ScheduledCard,
  SM2SchedulingResult,
} from './types';

// ---------------------------------------------------------------------------
// Default SM-2 Parameters
// ---------------------------------------------------------------------------

/**
 * Sensible default parameters that mirror common Anki settings.
 */
export const DEFAULT_SM2_PARAMETERS: SM2Parameters = {
  initialEaseFactor: 2.5,
  minimumEaseFactor: 1.3,
  hardMultiplier: 1.2,
  easyMultiplier: 1.3,
  learningSteps: [1, 10],       // 1 minute, then 10 minutes
  relearningSteps: [10],        // 10 minutes
  graduatingInterval: 1,        // 1 day
  easyInterval: 4,              // 4 days
  maximumInterval: 36500,       // ~100 years
  newCardsPerDay: 20,
  reviewsPerDay: 200,
};

// ---------------------------------------------------------------------------
// Core SM-2 functions
// ---------------------------------------------------------------------------

/**
 * Update the ease factor based on the rating.
 *
 * Classic SM-2 formula (adapted for 4-button grading):
 *   EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
 *
 * Where q is mapped from our Rating enum:
 *   Again -> q = 0  (fail)
 *   Hard  -> q = 2
 *   Good  -> q = 3
 *   Easy  -> q = 5
 *
 * In practice the delta per button:
 *   Again: -0.20
 *   Hard:  -0.15
 *   Good:   0.00 (no change)
 *   Easy:  +0.15
 *
 * The result is clamped to [minimumEaseFactor, +inf).
 *
 * @param currentEF - Current ease factor.
 * @param rating    - User rating.
 * @param params    - SM-2 parameters.
 * @returns Updated ease factor (>= minimumEaseFactor).
 */
export function nextEaseFactor(
  currentEF: number,
  rating: Rating,
  params: SM2Parameters = DEFAULT_SM2_PARAMETERS,
): number {
  let delta: number;

  switch (rating) {
    case Rating.Again:
      delta = -0.20;
      break;
    case Rating.Hard:
      delta = -0.15;
      break;
    case Rating.Good:
      delta = 0.00;
      break;
    case Rating.Easy:
      delta = 0.15;
      break;
  }

  const newEF = currentEF + delta;
  return Math.max(newEF, params.minimumEaseFactor);
}

/**
 * Compute the next interval for a card in the Review state.
 *
 * SM-2 interval formula:
 *   - If reps == 1: interval = 1  (graduating interval)
 *   - If reps == 2: interval = 6
 *   - If reps >= 3: interval = previousInterval * EF
 *
 * Modified by rating-specific multipliers:
 *   - Hard: interval * hardMultiplier (instead of * EF)
 *   - Good: interval * EF
 *   - Easy: interval * EF * easyMultiplier
 *
 * @param currentInterval - Current interval in days.
 * @param easeFactor      - Current ease factor.
 * @param rating          - User rating.
 * @param reps            - Total number of successful reviews.
 * @param params          - SM-2 parameters.
 * @returns New interval in days (integer, clamped to [1, maximumInterval]).
 */
export function nextReviewInterval(
  currentInterval: number,
  easeFactor: number,
  rating: Rating,
  reps: number,
  params: SM2Parameters = DEFAULT_SM2_PARAMETERS,
): number {
  let interval: number;

  if (rating === Rating.Again) {
    // Lapse: reset to 0 (card enters relearning steps)
    return 0;
  }

  if (reps <= 1) {
    // First successful review
    interval = params.graduatingInterval;
  } else if (reps === 2) {
    // Second successful review
    interval = 6;
  } else {
    // Subsequent reviews
    switch (rating) {
      case Rating.Hard:
        interval = currentInterval * params.hardMultiplier;
        break;
      case Rating.Good:
        interval = currentInterval * easeFactor;
        break;
      case Rating.Easy:
        interval = currentInterval * easeFactor * params.easyMultiplier;
        break;
      default:
        interval = currentInterval * easeFactor;
    }
  }

  return Math.min(Math.max(Math.round(interval), 1), params.maximumInterval);
}

/**
 * Determine the next step index within learning or relearning steps.
 *
 * - Again: reset to step 0.
 * - Hard:  stay at current step (repeat).
 * - Good:  advance to next step.
 * - Easy:  skip to graduation (return steps.length).
 *
 * @param currentStep - Current step index (0-based).
 * @param steps       - Array of step durations (e.g. [1, 10]).
 * @param rating      - User rating.
 * @returns New step index.  If >= steps.length the card should graduate.
 */
export function nextStepIndex(
  currentStep: number,
  steps: number[],
  rating: Rating,
): number {
  switch (rating) {
    case Rating.Again:
      return 0;
    case Rating.Hard:
      return currentStep; // repeat current step
    case Rating.Good:
      return currentStep + 1;
    case Rating.Easy:
      return steps.length; // graduate immediately
  }
}

/**
 * Check whether a step index indicates graduation (past the last step).
 *
 * @param stepIndex - Current step index.
 * @param steps     - Array of step durations.
 * @returns True if the card should graduate.
 */
export function shouldGraduate(stepIndex: number, steps: number[]): boolean {
  return stepIndex >= steps.length;
}

/**
 * Get the delay in minutes for a given step index.
 *
 * If the index is past the end of the steps array, returns 0 (the card should
 * be graduating, not waiting for another step).
 *
 * @param stepIndex - Step index.
 * @param steps     - Array of step durations in minutes.
 * @returns Delay in minutes.
 */
export function stepDelayMinutes(stepIndex: number, steps: number[]): number {
  if (stepIndex < 0 || stepIndex >= steps.length) return 0;
  return steps[stepIndex];
}

// ---------------------------------------------------------------------------
// Main scheduling function
// ---------------------------------------------------------------------------

/**
 * Schedule a card using the SM-2 algorithm for all four possible ratings.
 *
 * This is the primary entry point for SM-2 scheduling.  It returns four
 * {@link SM2ScheduledCard} objects, one per rating, so the caller (or UI)
 * can show the user what each button will do.
 *
 * @param card   - Current SM-2 scheduling data.
 * @param now    - Current date/time (defaults to `new Date()`).
 * @param params - SM-2 parameters (defaults to {@link DEFAULT_SM2_PARAMETERS}).
 * @returns An {@link SM2SchedulingResult} with outcomes for all four ratings.
 */
export function scheduleSM2(
  card: SM2CardData,
  now: Date = new Date(),
  params: SM2Parameters = DEFAULT_SM2_PARAMETERS,
): SM2SchedulingResult {
  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
  const results: Partial<SM2SchedulingResult> = {};

  for (const rating of ratings) {
    const result = scheduleSingleRating(card, rating, now, params);
    const key = ratingKey(rating);
    results[key] = result;
  }

  return results as SM2SchedulingResult;
}

/**
 * Schedule a card for a single rating.
 */
function scheduleSingleRating(
  card: SM2CardData,
  rating: Rating,
  now: Date,
  params: SM2Parameters,
): SM2ScheduledCard {
  // -------------------------------------------------------------------
  // NEW card: first review
  // -------------------------------------------------------------------
  if (card.state === CardState.New) {
    return scheduleNewCard(card, rating, now, params);
  }

  // -------------------------------------------------------------------
  // LEARNING card
  // -------------------------------------------------------------------
  if (card.state === CardState.Learning) {
    return scheduleLearningCard(card, rating, now, params);
  }

  // -------------------------------------------------------------------
  // REVIEW card
  // -------------------------------------------------------------------
  if (card.state === CardState.Review) {
    return scheduleReviewCard(card, rating, now, params);
  }

  // -------------------------------------------------------------------
  // RELEARNING card
  // -------------------------------------------------------------------
  return scheduleRelearningCard(card, rating, now, params);
}

// ---------------------------------------------------------------------------
// Per-state scheduling
// ---------------------------------------------------------------------------

/** Schedule a new (unseen) card. Enters the learning pipeline. */
function scheduleNewCard(
  card: SM2CardData,
  rating: Rating,
  now: Date,
  params: SM2Parameters,
): SM2ScheduledCard {
  const easeFactor = params.initialEaseFactor;
  const steps = params.learningSteps;

  if (rating === Rating.Easy) {
    // Easy on first sight -> graduate immediately
    const interval = params.easyInterval;
    return makeResult(
      {
        easeFactor,
        interval,
        stepIndex: steps.length,
        reps: 1,
        lapses: 0,
        state: CardState.Review,
        lastReview: now,
      },
      interval,
      now,
    );
  }

  if (rating === Rating.Good) {
    // Good -> enter learning at step 1 (skip first step)
    const stepIdx = Math.min(1, steps.length);
    if (shouldGraduate(stepIdx, steps)) {
      // Only one step configured -> graduate
      const interval = params.graduatingInterval;
      return makeResult(
        {
          easeFactor,
          interval,
          stepIndex: steps.length,
          reps: 1,
          lapses: 0,
          state: CardState.Review,
          lastReview: now,
        },
        interval,
        now,
      );
    }
    const delayMin = stepDelayMinutes(stepIdx, steps);
    return makeResult(
      {
        easeFactor,
        interval: 0,
        stepIndex: stepIdx,
        reps: 1,
        lapses: 0,
        state: CardState.Learning,
        lastReview: now,
      },
      minutesToFractionalDays(delayMin),
      now,
    );
  }

  // Again or Hard -> start at step 0
  const stepIdx = 0;
  const delayMin = stepDelayMinutes(stepIdx, steps);
  return makeResult(
    {
      easeFactor,
      interval: 0,
      stepIndex: stepIdx,
      reps: 1,
      lapses: 0,
      state: CardState.Learning,
      lastReview: now,
    },
    minutesToFractionalDays(delayMin),
    now,
  );
}

/** Schedule a card currently in Learning state. */
function scheduleLearningCard(
  card: SM2CardData,
  rating: Rating,
  now: Date,
  params: SM2Parameters,
): SM2ScheduledCard {
  const steps = params.learningSteps;
  const newStep = nextStepIndex(card.stepIndex, steps, rating);
  const newEF = card.easeFactor; // Don't modify EF during learning

  if (shouldGraduate(newStep, steps)) {
    // Graduate to Review
    const interval =
      rating === Rating.Easy ? params.easyInterval : params.graduatingInterval;
    return makeResult(
      {
        easeFactor: newEF,
        interval,
        stepIndex: newStep,
        reps: card.reps + 1,
        lapses: card.lapses,
        state: CardState.Review,
        lastReview: now,
      },
      interval,
      now,
    );
  }

  // Stay in Learning
  const delayMin = stepDelayMinutes(newStep, steps);
  return makeResult(
    {
      easeFactor: newEF,
      interval: 0,
      stepIndex: newStep,
      reps: card.reps + 1,
      lapses: card.lapses,
      state: CardState.Learning,
      lastReview: now,
    },
    minutesToFractionalDays(delayMin),
    now,
  );
}

/** Schedule a card in Review state (the normal SRS case). */
function scheduleReviewCard(
  card: SM2CardData,
  rating: Rating,
  now: Date,
  params: SM2Parameters,
): SM2ScheduledCard {
  const newEF = nextEaseFactor(card.easeFactor, rating, params);

  if (rating === Rating.Again) {
    // Lapse -> enter relearning steps
    const steps = params.relearningSteps;
    const delayMin = stepDelayMinutes(0, steps);
    return makeResult(
      {
        easeFactor: newEF,
        interval: 0,
        stepIndex: 0,
        reps: card.reps + 1,
        lapses: card.lapses + 1,
        state: CardState.Relearning,
        lastReview: now,
      },
      minutesToFractionalDays(delayMin),
      now,
    );
  }

  // Success -> compute new interval
  const interval = nextReviewInterval(
    card.interval,
    newEF,
    rating,
    card.reps,
    params,
  );

  return makeResult(
    {
      easeFactor: newEF,
      interval,
      stepIndex: 0,
      reps: card.reps + 1,
      lapses: card.lapses,
      state: CardState.Review,
      lastReview: now,
    },
    interval,
    now,
  );
}

/** Schedule a card in Relearning state. */
function scheduleRelearningCard(
  card: SM2CardData,
  rating: Rating,
  now: Date,
  params: SM2Parameters,
): SM2ScheduledCard {
  const steps = params.relearningSteps;
  const newStep = nextStepIndex(card.stepIndex, steps, rating);
  const newEF = card.easeFactor; // Don't modify EF during relearning

  if (shouldGraduate(newStep, steps)) {
    // Re-graduate to Review
    // Use a minimum interval of 1 day
    const interval = Math.max(1, Math.round(card.interval * 0.5));
    return makeResult(
      {
        easeFactor: newEF,
        interval,
        stepIndex: 0,
        reps: card.reps + 1,
        lapses: card.lapses,
        state: CardState.Review,
        lastReview: now,
      },
      interval,
      now,
    );
  }

  // Stay in Relearning
  const delayMin = stepDelayMinutes(newStep, steps);
  return makeResult(
    {
      easeFactor: newEF,
      interval: 0,
      stepIndex: newStep,
      reps: card.reps + 1,
      lapses: card.lapses,
      state: CardState.Relearning,
      lastReview: now,
    },
    minutesToFractionalDays(delayMin),
    now,
  );
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Create a blank {@link SM2CardData} for a new card.
 *
 * @param params - SM-2 parameters for initial ease factor.
 * @returns Empty SM-2 card data in the New state.
 */
export function createEmptySM2Card(
  params: SM2Parameters = DEFAULT_SM2_PARAMETERS,
): SM2CardData {
  return {
    easeFactor: params.initialEaseFactor,
    interval: 0,
    stepIndex: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
    lastReview: null,
  };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Convert minutes to fractional days. */
function minutesToFractionalDays(minutes: number): number {
  return minutes / (60 * 24);
}

/** Map a Rating to its SM2SchedulingResult key. */
function ratingKey(rating: Rating): keyof SM2SchedulingResult {
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

/** Add fractional days to a date. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Construct an SM2ScheduledCard from the pieces. */
function makeResult(
  card: SM2CardData,
  intervalDays: number,
  now: Date,
): SM2ScheduledCard {
  return {
    card,
    interval: intervalDays,
    due: addDays(now, intervalDays),
  };
}
