/**
 * fsrs-simulator.ts -- FSRS Workload Prediction via Monte Carlo Simulation.
 *
 * Simulates future review load based on current cards and scheduling parameters.
 * Uses the FSRS-5 forgetting curve and scheduling formulas to predict:
 *   - How many reviews per day
 *   - How many new cards can be added without overload
 *   - Time required per day
 *
 * The Monte Carlo approach runs many iterations of the simulation, each time
 * sampling random review outcomes based on FSRS retrievability probabilities,
 * then aggregating results across iterations to produce confidence intervals.
 */

import {
  CardState,
  Rating,
  CardSchedulingData,
} from './types';

import {
  retrievability,
  nextStability,
  nextDifficulty,
  nextInterval,
  initStability,
  initDifficulty,
  DEFAULT_FSRS_WEIGHTS,
} from './fsrs';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Parameters for running a workload simulation.
 */
export interface SimulationParams {
  /** Current card states in the deck. */
  existingCards: CardSchedulingData[];

  /** How many new cards to introduce per day. */
  newCardsPerDay: number;

  /** Target recall probability at review time. */
  desiredRetention: number;

  /** The 19 FSRS weight parameters. */
  fsrsParams: number[];

  /** How many days to simulate forward. */
  simulationDays: number;

  /** Monte Carlo iterations (default 100). More iterations = smoother results. */
  iterations: number;
}

/**
 * Daily statistics from a single simulation day, aggregated across iterations.
 */
export interface DailySimResult {
  /** The day number (0 = today). */
  day: number;

  /** Average number of reviews across all iterations. */
  avgReviews: number;

  /** Minimum reviews seen across all iterations. */
  minReviews: number;

  /** Maximum reviews seen across all iterations. */
  maxReviews: number;

  /** Average estimated time in minutes for that day. */
  avgTimeMinutes: number;
}

/**
 * Aggregate result of a full Monte Carlo simulation run.
 */
export interface SimulationResult {
  /** Per-day review predictions. */
  dailyReviews: DailySimResult[];

  /** Sum of average daily reviews across all simulated days. */
  totalReviews: number;

  /** Mean of daily average reviews. */
  avgDailyReviews: number;

  /** The day with the highest predicted review count. */
  peakDay: { day: number; reviews: number };

  /** Human-readable recommendation string. */
  recommendation: string;
}

/**
 * Result of simulating a change in desired retention.
 */
export interface RetentionChangeResult {
  /** Average daily reviews at current retention. */
  currentAvgDaily: number;

  /** Average daily reviews at the new retention. */
  newAvgDaily: number;

  /** Percentage change in review count (positive = more reviews). */
  reviewCountChange: number;

  /** Absolute difference in retention (newRetention - currentRetention). */
  retentionDifference: number;
}

/**
 * Prediction for a specific day.
 */
export interface DayPrediction {
  /** The target date. */
  date: Date;

  /** Total predicted reviews for that day. */
  predictedReviews: number;

  /** How many of those are new cards. */
  newCards: number;

  /** How many are review-state cards. */
  reviewCards: number;

  /** How many are learning/relearning cards. */
  learningCards: number;

  /** Estimated minutes to complete. */
  estimatedMinutes: number;
}

// ---------------------------------------------------------------------------
// Internal simulation state for a single card
// ---------------------------------------------------------------------------

interface SimCard {
  stability: number;
  difficulty: number;
  state: CardState;
  /** The absolute day number (0-based) when the card is next due. */
  dueDay: number;
  lastReviewDay: number;
  reps: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Average seconds per review for time estimation. */
const AVG_SECONDS_PER_REVIEW = 8;

/** Average seconds per new card (typically longer). */
const AVG_SECONDS_PER_NEW = 20;

/** Average seconds per learning card. */
const AVG_SECONDS_PER_LEARNING = 12;

// ---------------------------------------------------------------------------
// Seeded pseudo-random number generator (for reproducibility within runs)
// ---------------------------------------------------------------------------

/**
 * Simple xorshift32 PRNG for fast, deterministic random numbers within a
 * simulation iteration. Not cryptographically secure -- suitable for
 * Monte Carlo sampling only.
 */
class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0 || 1;
  }

  /** Return a float in [0, 1). */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 4294967296;
  }
}

// ---------------------------------------------------------------------------
// FSRSSimulator
// ---------------------------------------------------------------------------

/**
 * Monte Carlo simulator for FSRS workload prediction.
 *
 * For each iteration the simulator:
 *   1. Copies every existing card into a simulation state.
 *   2. Steps through each simulated day.
 *   3. For each card due on that day, computes retrievability, samples a
 *      pass/fail outcome, and updates stability/difficulty accordingly.
 *   4. Introduces new cards each day (up to newCardsPerDay).
 *   5. Records per-day review counts.
 *
 * After all iterations, results are aggregated (mean, min, max) per day.
 */
export class FSRSSimulator {
  /**
   * Run a full Monte Carlo simulation.
   *
   * @param params - Simulation configuration including cards, parameters, and
   *                 number of days/iterations.
   * @returns Aggregated simulation results with daily predictions.
   */
  simulate(params: SimulationParams): SimulationResult {
    const {
      existingCards,
      newCardsPerDay,
      desiredRetention,
      fsrsParams,
      simulationDays,
      iterations: iterCount,
    } = params;

    const iterations = Math.max(iterCount, 1);
    const days = Math.max(simulationDays, 1);
    const w = fsrsParams.length === 19 ? fsrsParams : DEFAULT_FSRS_WEIGHTS;

    // Accumulator: for each day, store per-iteration review counts
    // dailyCounts[day][iteration] = review count
    const dailyCounts: number[][] = Array.from({ length: days }, () => []);

    for (let iter = 0; iter < iterations; iter++) {
      const rng = new PRNG(iter * 31337 + 42);

      // Initialize simulation cards from existing deck
      const simCards: SimCard[] = existingCards.map((card) => {
        const daysUntilDue = this.daysUntilDue(card);
        return {
          stability: Math.max(card.stability, 0.01),
          difficulty: card.difficulty || 5,
          state: card.state,
          dueDay: Math.max(0, Math.round(daysUntilDue)),
          lastReviewDay: -Math.max(0, Math.round(card.elapsedDays)),
          reps: card.reps,
        };
      });

      // Step through each simulated day
      for (let day = 0; day < days; day++) {
        let reviewsToday = 0;

        // Review all cards due on this day
        for (const card of simCards) {
          if (card.dueDay > day) continue;
          if (card.state === CardState.New) continue;

          // Compute elapsed days since last review
          const elapsed = day - card.lastReviewDay;

          // Compute current retrievability
          const r = retrievability(elapsed, card.stability);

          // Sample: does the user recall this card?
          const recalled = rng.next() < r;

          // Determine the simulated rating
          let rating: Rating;
          if (!recalled) {
            rating = Rating.Again;
          } else {
            // When recalled, sample a rating distribution based on retrievability
            const rand = rng.next();
            if (rand < 0.05) {
              rating = Rating.Hard;
            } else if (rand < 0.85) {
              rating = Rating.Good;
            } else {
              rating = Rating.Easy;
            }
          }

          // Update card state using FSRS formulas
          const newDifficulty = nextDifficulty(card.difficulty, rating, w);
          const newStability = nextStability(card.difficulty, card.stability, r, rating, w);
          const newInterval = nextInterval(newStability, desiredRetention);

          card.difficulty = newDifficulty;
          card.stability = newStability;
          card.lastReviewDay = day;

          if (rating === Rating.Again) {
            // Failed: card comes back tomorrow (or same day for learning)
            card.state = CardState.Relearning;
            card.dueDay = day + 1;
          } else {
            card.state = CardState.Review;
            card.dueDay = day + newInterval;
          }

          reviewsToday++;
        }

        // Introduce new cards for this day
        const newToday = Math.min(
          newCardsPerDay,
          // Don't add new cards if review load is already heavy
          Math.max(0, newCardsPerDay),
        );

        for (let n = 0; n < newToday; n++) {
          // Simulate first rating of a new card (usually Good)
          const rating = rng.next() < 0.7 ? Rating.Good : Rating.Again;
          const s0 = initStability(rating, w);
          const d0 = initDifficulty(rating, w);

          const interval = rating === Rating.Again ? 1 : nextInterval(s0, desiredRetention);

          simCards.push({
            stability: s0,
            difficulty: d0,
            state: rating === Rating.Again ? CardState.Learning : CardState.Review,
            dueDay: day + interval,
            lastReviewDay: day,
            reps: 1,
          });

          reviewsToday++;
        }

        dailyCounts[day].push(reviewsToday);
      }
    }

    // Aggregate results across iterations
    const dailyReviews: DailySimResult[] = dailyCounts.map((counts, day) => {
      const sorted = counts.slice().sort((a, b) => a - b);
      const sum = counts.reduce((s, v) => s + v, 0);
      const avg = sum / counts.length;
      return {
        day,
        avgReviews: Math.round(avg * 10) / 10,
        minReviews: sorted[0] ?? 0,
        maxReviews: sorted[sorted.length - 1] ?? 0,
        avgTimeMinutes: Math.round((avg * AVG_SECONDS_PER_REVIEW) / 60 * 10) / 10,
      };
    });

    const totalReviews = dailyReviews.reduce((s, d) => s + d.avgReviews, 0);
    const avgDailyReviews = days > 0 ? Math.round(totalReviews / days * 10) / 10 : 0;

    // Find peak day
    let peakDay = { day: 0, reviews: 0 };
    for (const dr of dailyReviews) {
      if (dr.avgReviews > peakDay.reviews) {
        peakDay = { day: dr.day, reviews: dr.avgReviews };
      }
    }

    // Generate recommendation
    let recommendation: string;
    if (avgDailyReviews < 20) {
      recommendation = `Your current settings will result in ~${Math.round(avgDailyReviews)} reviews/day on average. This is a light workload.`;
    } else if (avgDailyReviews < 50) {
      recommendation = `Your current settings will result in ~${Math.round(avgDailyReviews)} reviews/day on average. This is a moderate workload.`;
    } else if (avgDailyReviews < 100) {
      recommendation = `Your current settings will result in ~${Math.round(avgDailyReviews)} reviews/day on average. Consider reducing new cards/day or lowering retention to avoid burnout.`;
    } else {
      recommendation = `Your current settings will result in ~${Math.round(avgDailyReviews)} reviews/day on average. This is a heavy workload. Strongly consider reducing new cards/day from ${newCardsPerDay} to ${Math.round(newCardsPerDay * 0.5)} or lowering desired retention.`;
    }

    return {
      dailyReviews,
      totalReviews: Math.round(totalReviews),
      avgDailyReviews,
      peakDay,
      recommendation,
    };
  }

  /**
   * Simulate the effect of changing desired retention on workload.
   *
   * Runs two simulations (current and new retention) over the specified
   * number of days and compares the average daily review counts.
   *
   * @param cards            - Current card states.
   * @param currentRetention - The current desired retention (e.g. 0.9).
   * @param newRetention     - The new desired retention to compare.
   * @param days             - Number of days to simulate.
   * @returns Comparison of workload at both retention levels.
   */
  simulateRetentionChange(
    cards: CardSchedulingData[],
    currentRetention: number,
    newRetention: number,
    days: number,
  ): RetentionChangeResult {
    const baseParams: SimulationParams = {
      existingCards: cards,
      newCardsPerDay: 0, // Only measure review load from existing cards
      desiredRetention: currentRetention,
      fsrsParams: DEFAULT_FSRS_WEIGHTS,
      simulationDays: days,
      iterations: 50,
    };

    const currentResult = this.simulate(baseParams);

    const newResult = this.simulate({
      ...baseParams,
      desiredRetention: newRetention,
    });

    const currentAvgDaily = currentResult.avgDailyReviews;
    const newAvgDaily = newResult.avgDailyReviews;

    const reviewCountChange =
      currentAvgDaily > 0
        ? Math.round(((newAvgDaily - currentAvgDaily) / currentAvgDaily) * 100 * 10) / 10
        : 0;

    return {
      currentAvgDaily,
      newAvgDaily,
      reviewCountChange,
      retentionDifference: Math.round((newRetention - currentRetention) * 1000) / 1000,
    };
  }

  /**
   * Predict the review count for a specific day in the future.
   *
   * Uses a lightweight single-pass simulation (no Monte Carlo) for speed.
   *
   * @param cards      - Current card states in the deck.
   * @param targetDate - The date to predict for.
   * @returns Breakdown of predicted reviews by card type.
   */
  predictDayLoad(cards: CardSchedulingData[], targetDate: Date): DayPrediction {
    const now = new Date();
    const dayOffset = Math.max(
      0,
      Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    let newCards = 0;
    let reviewCards = 0;
    let learningCards = 0;

    for (const card of cards) {
      const daysUntilDue = this.daysUntilDue(card);
      const dueDayRounded = Math.max(0, Math.round(daysUntilDue));

      if (dueDayRounded > dayOffset) continue;

      switch (card.state) {
        case CardState.New:
          newCards++;
          break;
        case CardState.Review:
          reviewCards++;
          break;
        case CardState.Learning:
        case CardState.Relearning:
          learningCards++;
          break;
      }
    }

    const predictedReviews = newCards + reviewCards + learningCards;

    const estimatedMinutes = Math.round(
      (newCards * AVG_SECONDS_PER_NEW +
        reviewCards * AVG_SECONDS_PER_REVIEW +
        learningCards * AVG_SECONDS_PER_LEARNING) / 60 * 10,
    ) / 10;

    return {
      date: targetDate,
      predictedReviews,
      newCards,
      reviewCards,
      learningCards,
      estimatedMinutes,
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Compute how many days until a card is due (can be negative if overdue).
   */
  private daysUntilDue(card: CardSchedulingData): number {
    if (card.state === CardState.New) {
      return 0;
    }

    if (!card.lastReview) {
      return 0;
    }

    const now = Date.now();
    const lastReviewTime = card.lastReview.getTime();
    const dueTime = lastReviewTime + card.scheduledDays * 24 * 60 * 60 * 1000;
    return (dueTime - now) / (24 * 60 * 60 * 1000);
  }
}
