/**
 * study-session.ts -- Study session manager for the flashcard system.
 *
 * A {@link StudySession} represents a single sitting where a user reviews
 * cards from one deck.  It manages:
 *   - Loading and ordering the next cards to study.
 *   - Tracking per-session progress and accuracy.
 *   - Processing answers and delegating scheduling to the {@link Scheduler}.
 *   - Burying sibling cards after each review.
 *   - Skip (bury for today) and pause (suspend indefinitely) actions.
 *   - Undo support for the most recent answer.
 *   - Session summary with XP and streak calculations.
 *
 * The session operates on an internal queue of cards and refills from the
 * store when the queue runs low.
 */

import {
  Rating,
  CardState,
  CardStatus,
  Card,
  ScheduledCard,
  SessionProgress,
  SessionSummary,
} from './types';

import { Scheduler, CardStore } from './scheduler';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration options for a study session. */
export interface StudySessionConfig {
  /** Maximum number of cards to pre-fetch into the queue at once. */
  prefetchSize: number;

  /** Maximum number of new cards to introduce in this session. */
  newCardLimit: number;

  /** Maximum number of review cards in this session. */
  reviewCardLimit: number;

  /** Whether to automatically bury sibling cards after each review. */
  autoburySiblings: boolean;

  /** XP awarded per card reviewed. */
  xpPerCard: number;

  /** Bonus XP multiplier for accuracy above 80%. */
  accuracyBonusMultiplier: number;
}

/** Default session configuration. */
export const DEFAULT_SESSION_CONFIG: StudySessionConfig = {
  prefetchSize: 50,
  newCardLimit: 20,
  reviewCardLimit: 200,
  autoburySiblings: true,
  xpPerCard: 10,
  accuracyBonusMultiplier: 1.5,
};

// ---------------------------------------------------------------------------
// Internal review record (for undo and statistics)
// ---------------------------------------------------------------------------

/** A record of one answer within the session. */
interface SessionReviewRecord {
  /** The card that was reviewed. */
  cardId: string;

  /** The rating given. */
  rating: Rating;

  /** Time spent in milliseconds. */
  timeSpentMs: number;

  /** The scheduling result returned by the scheduler. */
  result: ScheduledCard;

  /** Timestamp of the review. */
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// StudySession
// ---------------------------------------------------------------------------

/**
 * Manages a single study session for a deck.
 *
 * Typical lifecycle:
 * ```typescript
 * const session = new StudySession(scheduler, store, 'deck-123');
 * await session.start();
 *
 * while (session.getCurrentCard()) {
 *   const card = session.getCurrentCard()!;
 *   // Show card to user, get rating...
 *   const result = await session.answerCard(Rating.Good, 5000);
 *   // Show result interval to user...
 * }
 *
 * const summary = session.end();
 * console.log(`Reviewed ${summary.totalCards} cards.`);
 * ```
 */
export class StudySession {
  /** The underlying scheduler instance. */
  private readonly scheduler: Scheduler;

  /** Persistence layer. */
  private readonly store: CardStore;

  /** Deck being studied. */
  private readonly deckId: string;

  /** Optional tag filter -- only study cards with these tags. */
  private readonly tagFilter: string[] | undefined;

  /** Session configuration. */
  private readonly config: StudySessionConfig;

  /** Internal queue of cards to show. */
  private queue: Card[] = [];

  /** Index of the current card in the queue. */
  private currentIndex: number = -1;

  /** History of reviews in this session (for undo and summary). */
  private reviewHistory: SessionReviewRecord[] = [];

  /** Count of new cards introduced so far this session. */
  private newCardsIntroduced: number = 0;

  /** Count of review cards studied so far this session. */
  private reviewCardsStudied: number = 0;

  /** Whether the session has been started. */
  private started: boolean = false;

  /** Whether the session has been ended. */
  private ended: boolean = false;

  /** Timestamp when the session started. */
  private startTime: Date | null = null;

  /**
   * Create a new study session.
   *
   * @param scheduler  - The scheduling engine to use.
   * @param store      - Persistence layer for loading and updating cards.
   * @param deckId     - The deck to study.
   * @param tagFilter  - Optional: only study cards matching these tags.
   * @param config     - Session configuration options.
   */
  constructor(
    scheduler: Scheduler,
    store: CardStore,
    deckId: string,
    tagFilter?: string[],
    config: StudySessionConfig = DEFAULT_SESSION_CONFIG,
  ) {
    this.scheduler = scheduler;
    this.store = store;
    this.deckId = deckId;
    this.tagFilter = tagFilter;
    this.config = config;
  }

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  /**
   * Initialise the session by loading the first batch of cards.
   *
   * Must be called before {@link getCurrentCard} or {@link answerCard}.
   *
   * @throws Error if the session has already been started.
   */
  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Session has already been started.');
    }

    this.started = true;
    this.startTime = new Date();

    await this.refillQueue();
    this.advanceToNextCard();
  }

  /**
   * Get the current card to show to the user, or null if the session
   * is complete (no more cards).
   *
   * @returns The current card, or null.
   */
  getCurrentCard(): Card | null {
    this.ensureStarted();
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) {
      return null;
    }
    return this.queue[this.currentIndex];
  }

  /**
   * Submit an answer for the current card and advance to the next one.
   *
   * @param rating      - The user's rating (Again, Hard, Good, Easy).
   * @param timeSpentMs - Milliseconds the user spent on this card.
   * @returns The scheduling result showing the new interval and due date.
   * @throws Error if there is no current card.
   */
  async answerCard(
    rating: Rating,
    timeSpentMs: number,
  ): Promise<ScheduledCard> {
    this.ensureStarted();

    const card = this.getCurrentCard();
    if (!card) {
      throw new Error('No current card to answer.');
    }

    // Track new vs review card counts
    if (card.scheduling.state === CardState.New) {
      this.newCardsIntroduced++;
    } else if (card.scheduling.state === CardState.Review) {
      this.reviewCardsStudied++;
    }

    // Compute scheduling result
    const result = this.scheduler.scheduleReview(
      card.scheduling,
      rating,
      new Date(),
    );

    // Persist the answer through the scheduler
    await this.scheduler.processAnswer(card.id, rating, timeSpentMs);

    // Auto-bury siblings if configured
    if (this.config.autoburySiblings && card.noteId) {
      await this.scheduler.buryDailySiblings(card.id);
      // Remove buried siblings from the queue
      this.removeBuriedSiblingsFromQueue(card.id, card.noteId);
    }

    // If the card is still in learning/relearning and due soon, re-insert it
    // into the queue so it appears again in this session
    if (
      (result.card.state === CardState.Learning ||
        result.card.state === CardState.Relearning) &&
      result.interval === 0
    ) {
      // Re-insert the card a few positions ahead in the queue
      this.reinsertLearningCard(card, result);
    }

    // Record the review in session history
    this.reviewHistory.push({
      cardId: card.id,
      rating,
      timeSpentMs,
      result,
      timestamp: new Date(),
    });

    // Move to the next card
    this.advanceToNextCard();

    // Refill the queue if it's running low
    if (this.remainingInQueue() < this.config.prefetchSize / 2) {
      await this.refillQueue();
    }

    return result;
  }

  /**
   * Skip the current card (bury it until tomorrow).
   *
   * The card will be automatically unburied the next day.
   */
  async skipCard(): Promise<void> {
    this.ensureStarted();

    const card = this.getCurrentCard();
    if (!card) {
      throw new Error('No current card to skip.');
    }

    // Bury the card
    card.status = CardStatus.Buried;
    card.updatedAt = new Date();
    await this.store.updateCard(card);

    // Remove from queue and advance
    this.queue.splice(this.currentIndex, 1);
    // currentIndex now points to the next card (or past the end)
    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = this.queue.length - 1;
    }
  }

  /**
   * Pause (suspend) the current card indefinitely.
   *
   * Suspended cards do not appear in any study session until manually
   * resumed by the user.
   */
  async pauseCard(): Promise<void> {
    this.ensureStarted();

    const card = this.getCurrentCard();
    if (!card) {
      throw new Error('No current card to pause.');
    }

    // Suspend the card
    card.status = CardStatus.Suspended;
    card.updatedAt = new Date();
    await this.store.updateCard(card);

    // Remove from queue and advance
    this.queue.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = this.queue.length - 1;
    }
  }

  /**
   * Get a snapshot of the current session progress.
   *
   * @returns A {@link SessionProgress} object.
   */
  getProgress(): SessionProgress {
    this.ensureStarted();

    const completed = this.reviewHistory.length;
    const remaining = this.remainingInQueue();

    // Count card types remaining
    let newCards = 0;
    let reviewCards = 0;
    let learningCards = 0;

    for (let i = this.currentIndex; i < this.queue.length; i++) {
      const card = this.queue[i];
      if (!card) continue;
      switch (card.scheduling.state) {
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

    // Compute accuracy
    const totalAnswered = this.reviewHistory.length;
    const successCount = this.reviewHistory.filter(
      (r) => r.rating !== Rating.Again,
    ).length;
    const accuracy = totalAnswered > 0 ? successCount / totalAnswered : 0;

    // Time elapsed
    const timeElapsedMs = this.startTime
      ? new Date().getTime() - this.startTime.getTime()
      : 0;

    return {
      completed,
      remaining,
      newCards,
      reviewCards,
      learningCards,
      accuracy,
      timeElapsedMs,
    };
  }

  /**
   * End the session and return a summary of what was accomplished.
   *
   * After calling this method the session cannot be used further.
   *
   * @returns A {@link SessionSummary} with totals, accuracy, and XP.
   */
  end(): SessionSummary {
    this.ensureStarted();

    if (this.ended) {
      throw new Error('Session has already been ended.');
    }
    this.ended = true;

    const totalCards = this.reviewHistory.length;

    // Count ratings
    let againCount = 0;
    let hardCount = 0;
    let goodCount = 0;
    let easyCount = 0;
    let totalTimeMs = 0;

    for (const record of this.reviewHistory) {
      totalTimeMs += record.timeSpentMs;
      switch (record.rating) {
        case Rating.Again:
          againCount++;
          break;
        case Rating.Hard:
          hardCount++;
          break;
        case Rating.Good:
          goodCount++;
          break;
        case Rating.Easy:
          easyCount++;
          break;
      }
    }

    const accuracy =
      totalCards > 0 ? (totalCards - againCount) / totalCards : 0;

    // XP calculation
    let xpEarned = totalCards * this.config.xpPerCard;
    if (accuracy >= 0.8) {
      xpEarned = Math.round(xpEarned * this.config.accuracyBonusMultiplier);
    }

    // Streak: updated if the user reviewed at least one card
    const streakUpdated = totalCards > 0;

    return {
      totalCards,
      accuracy,
      againCount,
      hardCount,
      goodCount,
      easyCount,
      totalTimeMs,
      xpEarned,
      streakUpdated,
    };
  }

  /**
   * Undo the most recent answer in this session.
   *
   * The card is restored to its previous state and placed back as the
   * current card.
   *
   * @throws Error if there is nothing to undo.
   */
  async undo(): Promise<void> {
    this.ensureStarted();

    if (this.reviewHistory.length === 0) {
      throw new Error('Nothing to undo.');
    }

    const lastReview = this.reviewHistory.pop()!;

    // Undo in the scheduler (restores card in the store)
    await this.scheduler.undoLastReview(lastReview.cardId);

    // Reload the card from the store
    const restoredCard = await this.store.getCard(lastReview.cardId);
    if (restoredCard) {
      // Insert the restored card at the current position
      if (this.currentIndex < 0) {
        this.currentIndex = 0;
      }
      this.queue.splice(this.currentIndex, 0, restoredCard);
    }

    // Adjust counts
    if (lastReview.result.card.state === CardState.New) {
      this.newCardsIntroduced = Math.max(0, this.newCardsIntroduced - 1);
    } else if (lastReview.result.card.state === CardState.Review) {
      this.reviewCardsStudied = Math.max(0, this.reviewCardsStudied - 1);
    }
  }

  // -----------------------------------------------------------------------
  // Internal queue management
  // -----------------------------------------------------------------------

  /**
   * Refill the internal queue from the store.
   *
   * Applies the new-card and review-card limits, and optionally filters
   * by tags.
   */
  private async refillQueue(): Promise<void> {
    const needed = this.config.prefetchSize - this.remainingInQueue();
    if (needed <= 0) return;

    let cards = await this.scheduler.getNextCards(this.deckId, needed);

    // Apply tag filter if set
    if (this.tagFilter && this.tagFilter.length > 0) {
      cards = cards.filter((card) =>
        card.tags.some((tag) => this.tagFilter!.includes(tag)),
      );
    }

    // Enforce session limits
    const newCardsRemaining = Math.max(
      0,
      this.config.newCardLimit - this.newCardsIntroduced,
    );
    const reviewCardsRemaining = Math.max(
      0,
      this.config.reviewCardLimit - this.reviewCardsStudied,
    );

    const filteredCards: Card[] = [];
    let newAdded = 0;
    let reviewAdded = 0;

    for (const card of cards) {
      // Skip cards already in the queue
      if (this.queue.some((q) => q.id === card.id)) continue;

      if (card.scheduling.state === CardState.New) {
        if (newAdded >= newCardsRemaining) continue;
        newAdded++;
      } else if (card.scheduling.state === CardState.Review) {
        if (reviewAdded >= reviewCardsRemaining) continue;
        reviewAdded++;
      }

      filteredCards.push(card);
    }

    this.queue.push(...filteredCards);
  }

  /**
   * Advance the current index to the next card in the queue.
   * If the queue is empty, currentIndex will be set past the end.
   */
  private advanceToNextCard(): void {
    if (this.currentIndex < 0) {
      // First card
      this.currentIndex = 0;
    } else {
      // Remove the card we just answered (it's been scheduled)
      // Actually, keep it out -- the card has been processed
      this.currentIndex++;
    }

    // Skip past any cards that have been buried or suspended during the session
    while (this.currentIndex < this.queue.length) {
      const card = this.queue[this.currentIndex];
      if (card.status === CardStatus.Active) break;
      this.currentIndex++;
    }
  }

  /**
   * Calculate how many cards remain in the queue from the current position.
   */
  private remainingInQueue(): number {
    if (this.currentIndex < 0) return this.queue.length;
    return Math.max(0, this.queue.length - this.currentIndex);
  }

  /**
   * Re-insert a learning/relearning card back into the queue so it appears
   * again during this session.
   *
   * The card is inserted a few positions ahead to interleave with other cards.
   */
  private reinsertLearningCard(card: Card, result: ScheduledCard): void {
    // Update the card's scheduling data in-place for the queue copy
    const updatedCard: Card = {
      ...card,
      scheduling: result.card,
      due: result.due,
      updatedAt: new Date(),
    };

    // Insert 3-5 positions ahead (or at the end if the queue is short)
    const insertOffset = Math.min(
      3 + Math.floor(Math.random() * 3),
      this.queue.length - this.currentIndex,
    );
    const insertIndex = this.currentIndex + insertOffset;
    this.queue.splice(insertIndex, 0, updatedCard);
  }

  /**
   * Remove sibling cards from the queue after one sibling has been reviewed
   * and the others should be buried.
   */
  private removeBuriedSiblingsFromQueue(
    reviewedCardId: string,
    noteId: string,
  ): void {
    this.queue = this.queue.filter((card) => {
      // Keep the reviewed card and any non-siblings
      if (card.id === reviewedCardId) return true;
      if (card.noteId !== noteId) return true;
      // This is a sibling -> remove from queue (it's been buried)
      return false;
    });

    // Adjust currentIndex if siblings before it were removed
    // (the filter preserves order but may shift positions)
    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = Math.max(0, this.queue.length - 1);
    }
  }

  /**
   * Assert that the session has been started and not yet ended.
   */
  private ensureStarted(): void {
    if (!this.started) {
      throw new Error('Session has not been started. Call start() first.');
    }
    if (this.ended) {
      throw new Error('Session has already ended.');
    }
  }
}
