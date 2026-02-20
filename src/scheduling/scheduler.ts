/**
 * scheduler.ts -- Main scheduler that wraps both FSRS-5 and SM-2 algorithms.
 *
 * The {@link Scheduler} class provides a unified, algorithm-agnostic API for:
 *   - Scheduling individual card reviews.
 *   - Fetching the next batch of cards to study.
 *   - Processing user answers and persisting scheduling updates.
 *   - Undoing the last review.
 *   - Computing study statistics.
 *   - Burying sibling cards and daily unbury.
 *
 * Storage operations are delegated to a {@link CardStore} interface, so the
 * scheduler is decoupled from any specific database or persistence layer.
 */

import {
  Rating,
  CardState,
  CardStatus,
  FSRSParameters,
  SM2Parameters,
  CardSchedulingData,
  SM2CardData,
  ScheduledCard,
  SM2ScheduledCard,
  Card,
  ReviewLog,
  StudyStats,
} from './types';

import {
  schedule as fsrsSchedule,
  createEmptyCard as createEmptyFSRSCard,
  fuzzInterval,
  DEFAULT_FSRS_PARAMETERS,
} from './fsrs';

import {
  scheduleSM2,
  createEmptySM2Card,
  DEFAULT_SM2_PARAMETERS,
} from './sm2';

import {
  CardStateMachine,
  DEFAULT_STEP_CONFIG,
  statePriority,
} from './card-states';

// ---------------------------------------------------------------------------
// CardStore -- abstract persistence interface
// ---------------------------------------------------------------------------

/**
 * Interface that the scheduler uses for all persistence operations.
 *
 * Implementations might use SQLite, IndexedDB, a REST API, or an in-memory
 * store for testing.
 */
export interface CardStore {
  /** Fetch a single card by ID. */
  getCard(cardId: string): Promise<Card | null>;

  /** Persist updates to a card (scheduling data, status, due date). */
  updateCard(card: Card): Promise<void>;

  /**
   * Fetch the next batch of cards eligible for study in a deck.
   *
   * Cards should be returned ordered by priority:
   *   1. Relearning (due now)
   *   2. Learning   (due now)
   *   3. New        (up to the daily new-card limit)
   *   4. Review     (due now, ordered oldest-first)
   *
   * @param deckId - Deck identifier.
   * @param limit  - Maximum number of cards to return.
   * @param now    - Current date/time for due-date comparison.
   * @returns Array of eligible cards.
   */
  getNextCards(deckId: string, limit: number, now: Date): Promise<Card[]>;

  /** Append a review log entry. */
  addReviewLog(log: ReviewLog): Promise<void>;

  /** Fetch the most recent review log for a card (for undo). */
  getLastReviewLog(cardId: string): Promise<ReviewLog | null>;

  /** Delete a review log entry (used during undo). */
  deleteReviewLog(logId: string): Promise<void>;

  /**
   * Find all sibling cards of a given card (cards sharing the same noteId).
   *
   * @param cardId - The card whose siblings to find.
   * @returns Array of sibling Card objects (excluding the card itself).
   */
  getSiblingCards(cardId: string): Promise<Card[]>;

  /**
   * Fetch all buried cards across all decks.
   *
   * @returns Array of buried Card objects.
   */
  getBuriedCards(): Promise<Card[]>;

  /**
   * Fetch aggregate counts for a deck.
   *
   * @param deckId - Deck identifier.
   * @param now    - Current date/time.
   * @returns Aggregate study statistics.
   */
  getDeckStats(deckId: string, now: Date): Promise<DeckStatsRaw>;

  /**
   * Fetch review logs for a deck within a date range.
   *
   * @param deckId - Deck identifier.
   * @param since  - Start of the date range.
   * @param until  - End of the date range.
   * @returns Array of review logs.
   */
  getReviewLogs(deckId: string, since: Date, until: Date): Promise<ReviewLog[]>;
}

/**
 * Raw deck statistics returned by the store.
 */
export interface DeckStatsRaw {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  totalCount: number;
  buriedCount: number;
  suspendedCount: number;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Unified scheduler wrapping both FSRS-5 and legacy SM-2 algorithms.
 *
 * Usage:
 * ```typescript
 * const store: CardStore = new MyDatabaseStore();
 * const scheduler = new Scheduler('fsrs', DEFAULT_FSRS_PARAMETERS, store);
 *
 * const result = scheduler.scheduleReview(card.scheduling, Rating.Good);
 * // result.card contains the new scheduling data
 * // result.interval is the number of days until next review
 * // result.due is the absolute due date
 * ```
 */
export class Scheduler {
  /** The active scheduling algorithm. */
  public readonly algorithm: 'fsrs' | 'sm2';

  /** FSRS parameters (used when algorithm === 'fsrs'). */
  private readonly fsrsParams: FSRSParameters;

  /** SM-2 parameters (used when algorithm === 'sm2'). */
  private readonly sm2Params: SM2Parameters;

  /** Persistence layer. */
  private readonly store: CardStore;

  /** Card state machine for transition logic. */
  private readonly stateMachine: CardStateMachine;

  /**
   * Create a new Scheduler.
   *
   * @param algorithm - Which algorithm to use: 'fsrs' or 'sm2'.
   * @param params    - Algorithm-specific parameters.
   * @param store     - Persistence interface for card and log storage.
   */
  constructor(
    algorithm: 'fsrs' | 'sm2',
    params: FSRSParameters | SM2Parameters,
    store: CardStore,
  ) {
    this.algorithm = algorithm;
    this.store = store;

    if (algorithm === 'fsrs') {
      this.fsrsParams = params as FSRSParameters;
      this.sm2Params = DEFAULT_SM2_PARAMETERS;
    } else {
      this.fsrsParams = DEFAULT_FSRS_PARAMETERS;
      this.sm2Params = params as SM2Parameters;
    }

    this.stateMachine = new CardStateMachine({
      learningSteps: this.sm2Params.learningSteps,
      relearningSteps: this.sm2Params.relearningSteps,
      graduatingInterval: this.sm2Params.graduatingInterval,
      easyGraduatingInterval: this.sm2Params.easyInterval,
    });
  }

  // -----------------------------------------------------------------------
  // Core scheduling
  // -----------------------------------------------------------------------

  /**
   * Compute the scheduling outcome for a single rating using FSRS-5.
   *
   * This is a pure function that does not modify any state or hit the store.
   * It is useful for previewing what a button press will do.
   *
   * @param card   - Current FSRS scheduling data.
   * @param rating - The user's rating.
   * @param now    - Current date/time.
   * @returns The scheduled card result for the given rating.
   */
  scheduleReview(
    card: CardSchedulingData,
    rating: Rating,
    now: Date = new Date(),
  ): ScheduledCard {
    if (this.algorithm === 'fsrs') {
      const result = fsrsSchedule(card, now, this.fsrsParams);
      return this.pickRating(result, rating);
    }

    // SM-2 path: convert CardSchedulingData -> SM2CardData, schedule, convert back
    const sm2Card = this.toSM2CardData(card);
    const sm2Result = scheduleSM2(sm2Card, now, this.sm2Params);
    const sm2Scheduled = this.pickSM2Rating(sm2Result, rating);
    return this.fromSM2ScheduledCard(sm2Scheduled);
  }

  /**
   * Get the next batch of cards to study from a deck.
   *
   * Cards are returned in priority order:
   *   1. Relearning cards due now
   *   2. Learning cards due now
   *   3. New cards (up to daily limit)
   *   4. Review cards due now
   *
   * @param deckId - Deck identifier.
   * @param limit  - Maximum cards to return.
   * @returns Array of cards ordered by study priority.
   */
  async getNextCards(deckId: string, limit: number): Promise<Card[]> {
    const now = new Date();
    const cards = await this.store.getNextCards(deckId, limit, now);

    // Sort by state priority, then by due date
    return cards.sort((a, b) => {
      const priorityDiff =
        statePriority(a.scheduling.state) - statePriority(b.scheduling.state);
      if (priorityDiff !== 0) return priorityDiff;
      return a.due.getTime() - b.due.getTime();
    });
  }

  /**
   * Process a user's answer to a card review.
   *
   * This method:
   *   1. Loads the card from the store.
   *   2. Creates a ReviewLog snapshot for undo.
   *   3. Computes the new scheduling data using the active algorithm.
   *   4. Applies fuzz to the interval (for FSRS Review-state cards).
   *   5. Persists the updated card and the review log.
   *
   * @param cardId      - The card being reviewed.
   * @param rating      - The user's rating.
   * @param timeSpentMs - Milliseconds spent on the card.
   * @throws Error if the card is not found.
   */
  async processAnswer(
    cardId: string,
    rating: Rating,
    timeSpentMs: number,
  ): Promise<void> {
    const now = new Date();
    const card = await this.store.getCard(cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    // Snapshot before state for undo
    const schedulingBefore = { ...card.scheduling };
    const dueBefore = new Date(card.due.getTime());
    const stateBefore = card.scheduling.state;

    // Compute new scheduling
    const scheduled = this.scheduleReview(card.scheduling, rating, now);

    // Apply fuzz for inter-day review intervals (FSRS only)
    let finalInterval = scheduled.interval;
    if (
      this.algorithm === 'fsrs' &&
      scheduled.card.state === CardState.Review &&
      finalInterval > 2
    ) {
      finalInterval = fuzzInterval(finalInterval);
    }

    const due = addDays(now, finalInterval);

    // Update card
    card.scheduling = { ...scheduled.card, scheduledDays: finalInterval };
    card.due = due;
    card.status = CardStatus.Active;
    card.updatedAt = now;

    // Create review log
    const reviewLog: ReviewLog = {
      id: generateId(),
      cardId,
      rating,
      stateBefore,
      stateAfter: scheduled.card.state,
      reviewedAt: now,
      timeSpentMs,
      schedulingBefore,
      schedulingAfter: card.scheduling,
      dueBefore,
      dueAfter: due,
    };

    await this.store.updateCard(card);
    await this.store.addReviewLog(reviewLog);
  }

  /**
   * Undo the most recent review of a card.
   *
   * Restores the card's scheduling data and due date from the review log
   * snapshot, then deletes the log entry.
   *
   * @param cardId - The card to undo.
   * @throws Error if the card or review log is not found.
   */
  async undoLastReview(cardId: string): Promise<void> {
    const card = await this.store.getCard(cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const log = await this.store.getLastReviewLog(cardId);
    if (!log) {
      throw new Error(`No review log found for card: ${cardId}`);
    }

    // Restore previous state
    card.scheduling = { ...log.schedulingBefore };
    card.due = new Date(log.dueBefore.getTime());
    card.updatedAt = new Date();

    await this.store.updateCard(card);
    await this.store.deleteReviewLog(log.id);
  }

  /**
   * Compute study statistics for a deck.
   *
   * @param deckId - Deck identifier.
   * @returns Aggregated study stats including due counts and accuracy.
   */
  async getStudyStats(deckId: string): Promise<StudyStats> {
    const now = new Date();
    const rawStats = await this.store.getDeckStats(deckId, now);

    // Compute recent accuracy from the last 30 days of review logs
    const thirtyDaysAgo = addDays(now, -30);
    const recentLogs = await this.store.getReviewLogs(deckId, thirtyDaysAgo, now);

    let recentAccuracy = 0;
    if (recentLogs.length > 0) {
      const successCount = recentLogs.filter(
        (log) => log.rating !== Rating.Again,
      ).length;
      recentAccuracy = successCount / recentLogs.length;
    }

    // Estimate minutes to finish: ~8 seconds per review card, ~20 seconds per new card
    const estimatedSeconds =
      rawStats.reviewCount * 8 +
      rawStats.learningCount * 12 +
      Math.min(rawStats.newCount, this.sm2Params.newCardsPerDay) * 20;

    return {
      newCount: rawStats.newCount,
      learningCount: rawStats.learningCount,
      reviewCount: rawStats.reviewCount,
      totalCount: rawStats.totalCount,
      buriedCount: rawStats.buriedCount,
      suspendedCount: rawStats.suspendedCount,
      estimatedMinutes: Math.ceil(estimatedSeconds / 60),
      recentAccuracy,
      averageMatureInterval: 0, // Would need a specific query -- left as placeholder
    };
  }

  /**
   * Bury all sibling cards of a given card (cards from the same note).
   *
   * This prevents the user from seeing related cards (e.g. front->back and
   * back->front) in the same study session.  Buried cards are automatically
   * unburied the next day.
   *
   * @param cardId - The card whose siblings should be buried.
   */
  async buryDailySiblings(cardId: string): Promise<void> {
    const siblings = await this.store.getSiblingCards(cardId);

    for (const sibling of siblings) {
      if (sibling.status === CardStatus.Active) {
        sibling.status = CardStatus.Buried;
        sibling.updatedAt = new Date();
        await this.store.updateCard(sibling);
      }
    }
  }

  /**
   * Unbury all buried cards across all decks.
   *
   * This should be called once per day (typically at the start of the day
   * or when the user opens the application).
   */
  async unburyAll(): Promise<void> {
    const buriedCards = await this.store.getBuriedCards();

    for (const card of buriedCards) {
      card.status = CardStatus.Active;
      card.updatedAt = new Date();
      await this.store.updateCard(card);
    }
  }

  // -----------------------------------------------------------------------
  // Algorithm bridge helpers
  // -----------------------------------------------------------------------

  /**
   * Pick the result for a specific rating from a full FSRS SchedulingResult.
   */
  private pickRating(
    result: ReturnType<typeof fsrsSchedule>,
    rating: Rating,
  ): ScheduledCard {
    switch (rating) {
      case Rating.Again:
        return result.again;
      case Rating.Hard:
        return result.hard;
      case Rating.Good:
        return result.good;
      case Rating.Easy:
        return result.easy;
    }
  }

  /**
   * Pick the result for a specific rating from a full SM-2 SchedulingResult.
   */
  private pickSM2Rating(
    result: ReturnType<typeof scheduleSM2>,
    rating: Rating,
  ): SM2ScheduledCard {
    switch (rating) {
      case Rating.Again:
        return result.again;
      case Rating.Hard:
        return result.hard;
      case Rating.Good:
        return result.good;
      case Rating.Easy:
        return result.easy;
    }
  }

  /**
   * Convert generic CardSchedulingData to SM2CardData.
   *
   * Maps FSRS difficulty (1-10) to SM-2 ease factor (1.3 - 3.5+).
   */
  private toSM2CardData(card: CardSchedulingData): SM2CardData {
    // Rough mapping: difficulty 1 -> EF 3.0, difficulty 10 -> EF 1.3
    const easeFactor =
      card.difficulty > 0
        ? Math.max(
            this.sm2Params.minimumEaseFactor,
            3.0 - ((card.difficulty - 1) / 9) * (3.0 - this.sm2Params.minimumEaseFactor),
          )
        : this.sm2Params.initialEaseFactor;

    return {
      easeFactor,
      interval: card.scheduledDays,
      stepIndex: 0,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      lastReview: card.lastReview,
    };
  }

  /**
   * Convert an SM2ScheduledCard back to the generic ScheduledCard format.
   */
  private fromSM2ScheduledCard(sm2: SM2ScheduledCard): ScheduledCard {
    // Reverse mapping: EF -> difficulty
    const difficulty = Math.max(
      1,
      Math.min(
        10,
        1 +
          ((3.0 - sm2.card.easeFactor) / (3.0 - this.sm2Params.minimumEaseFactor)) * 9,
      ),
    );

    const card: CardSchedulingData = {
      stability: sm2.card.interval > 0 ? sm2.card.interval : 0,
      difficulty,
      elapsedDays: 0,
      scheduledDays: Math.max(0, Math.round(sm2.interval)),
      reps: sm2.card.reps,
      lapses: sm2.card.lapses,
      state: sm2.card.state,
      lastReview: sm2.card.lastReview,
    };

    return {
      card,
      interval: sm2.interval,
      due: sm2.due,
    };
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Add fractional days to a date. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Generate a simple unique identifier (UUID v4 style). */
function generateId(): string {
  // Use crypto if available, otherwise fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: pseudo-random hex string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
