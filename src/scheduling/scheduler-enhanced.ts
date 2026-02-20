/**
 * scheduler-enhanced.ts -- Enhanced scheduler with psychology integration.
 *
 * The {@link EnhancedScheduler} extends the base {@link Scheduler} with
 * behavioural psychology features designed to maximise engagement and
 * retention:
 *
 *   - **Bonus cards (variable ratio)**: ~7% of session cards are randomly
 *     designated as bonus cards worth 3x XP, leveraging variable ratio
 *     reinforcement (Ferster & Skinner, 1957).
 *
 *   - **Insight card injection**: Every 10-15 cards, an "insight card"
 *     is injected showing the user a learning tip, root word connection,
 *     or vocabulary pattern. This provides cognitive variety and reduces
 *     fatigue during long sessions.
 *
 *   - **Micro-feedback triggers**: Contextual micro-animations and sounds
 *     triggered by specific achievements within the session (e.g., 5 in
 *     a row correct, speed milestone).
 *
 *   - **Endowed progress tracking**: Progress bars start at a non-zero
 *     value (Nunes & Dreze, 2006) to increase task completion motivation.
 *
 *   - **XP integration**: Awards XP via the gamification subsystem for
 *     each review, with bonus multipliers for bonus cards.
 */

import {
  Rating,
  CardState,
  CardStatus,
  Card,
  ScheduledCard,
  SessionProgress,
  SessionSummary,
  FSRSParameters,
  SM2Parameters,
} from './types';

import { Scheduler, CardStore } from './scheduler';
import { StudySession, StudySessionConfig, DEFAULT_SESSION_CONFIG } from './study-session';
import { BonusCardService } from '../psychology/bonus-cards';
import { EndowedProgressService } from '../psychology/endowed-progress';
import { XPService, XP_REWARDS } from '../gamification/xp-service';

// ---------------------------------------------------------------------------
// Enhanced Session Options
// ---------------------------------------------------------------------------

/**
 * Options for creating an enhanced study session.
 */
export interface EnhancedSessionOptions {
  /** The deck to study. */
  deckId: string;

  /** Optional tag filter. */
  tagFilter?: string[];

  /** Base session configuration overrides. */
  sessionConfig?: Partial<StudySessionConfig>;

  /**
   * Probability that any card becomes a bonus card.
   * Default: 0.07 (7%).
   */
  bonusRatio?: number;

  /**
   * Interval (in number of cards reviewed) at which insight cards
   * are injected. A random value between min and max is chosen.
   * Default: { min: 10, max: 15 }.
   */
  insightInterval?: { min: number; max: number };

  /**
   * Whether to enable micro-feedback triggers.
   * Default: true.
   */
  microFeedbackEnabled?: boolean;

  /**
   * Whether to include endowed progress in the progress calculation.
   * Default: true.
   */
  endowedProgressEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// Micro-Feedback Types
// ---------------------------------------------------------------------------

/**
 * A micro-feedback event triggered during a study session.
 */
export interface MicroFeedbackEvent {
  /** Type of micro-feedback. */
  type: 'streak' | 'speed' | 'accuracy' | 'milestone' | 'bonus_card';

  /** Human-readable message to display. */
  message: string;

  /** Suggested animation to play. */
  animation: 'confetti' | 'glow' | 'shake' | 'pulse' | 'none';

  /** Optional sound to play. */
  sound?: 'celebration' | 'correct' | 'whoosh' | 'tick';
}

/**
 * An insight card injected into the study session for cognitive variety.
 */
export interface InsightCard {
  /** Unique identifier for this insight. */
  id: string;

  /** The type of insight. */
  type: 'learning_tip' | 'root_connection' | 'pattern' | 'progress_summary';

  /** Title of the insight card. */
  title: string;

  /** Body content of the insight card. */
  content: string;

  /** Whether this insight has been shown to the user. */
  shown: boolean;
}

/**
 * Extended session progress including psychology-enhanced metrics.
 */
export interface EnhancedSessionProgress extends SessionProgress {
  /** Number of bonus cards remaining in the session. */
  bonusCardsRemaining: number;

  /** Current consecutive correct streak within the session. */
  currentStreak: number;

  /** Longest consecutive correct streak in this session. */
  longestStreak: number;

  /** Total XP earned so far in this session. */
  xpEarned: number;

  /** Endowed progress percentage (0-100). */
  endowedProgress: number;

  /** Pending micro-feedback events to display. */
  pendingFeedback: MicroFeedbackEvent[];
}

/**
 * Extended session summary with psychology-enhanced metrics.
 */
export interface EnhancedSessionSummary extends SessionSummary {
  /** Number of bonus cards reviewed. */
  bonusCardsReviewed: number;

  /** Total bonus XP earned from bonus cards. */
  bonusXP: number;

  /** Number of insight cards shown during the session. */
  insightsShown: number;

  /** Longest consecutive correct streak achieved. */
  longestStreak: number;

  /** Micro-feedback events that were triggered during the session. */
  feedbackEvents: MicroFeedbackEvent[];
}

// ---------------------------------------------------------------------------
// Default Insight Cards
// ---------------------------------------------------------------------------

const DEFAULT_INSIGHTS: InsightCard[] = [
  {
    id: 'tip-spaced-repetition',
    type: 'learning_tip',
    title: 'How Spaced Repetition Works',
    content: 'Your brain strengthens memories each time you recall them at increasing intervals. Each review makes the memory more durable.',
    shown: false,
  },
  {
    id: 'tip-sleep',
    type: 'learning_tip',
    title: 'Sleep and Memory',
    content: 'Studying before sleep helps consolidation. Your brain replays and strengthens new memories during deep sleep cycles.',
    shown: false,
  },
  {
    id: 'tip-interleaving',
    type: 'learning_tip',
    title: 'The Power of Interleaving',
    content: 'Mixing different card types in a session improves long-term retention compared to studying one topic at a time.',
    shown: false,
  },
  {
    id: 'tip-difficulty',
    type: 'learning_tip',
    title: 'Desirable Difficulty',
    content: 'Struggling to recall is actually good! Hard retrievals build stronger memories than easy ones.',
    shown: false,
  },
  {
    id: 'tip-elaboration',
    type: 'learning_tip',
    title: 'Elaborative Encoding',
    content: 'When you see a card, try to connect it to something you already know. Rich associations create stronger, more retrievable memories.',
    shown: false,
  },
  {
    id: 'root-ktb',
    type: 'root_connection',
    title: 'Arabic Root: k-t-b',
    content: 'The root k-t-b relates to writing. It connects: kitaab (book), kaatib (writer), maktaba (library), maktuub (written/destiny).',
    shown: false,
  },
  {
    id: 'root-3lm',
    type: 'root_connection',
    title: 'Arabic Root: 3-l-m',
    content: 'The root 3-l-m relates to knowledge. It connects: 3ilm (knowledge), 3aalim (scholar), ta3allum (learning), mu3allim (teacher).',
    shown: false,
  },
  {
    id: 'pattern-broken-plural',
    type: 'pattern',
    title: 'Broken Plural Patterns',
    content: 'Arabic "broken" plurals follow patterns: kitaab -> kutub, walad -> awlaad. Recognizing patterns makes memorization easier.',
    shown: false,
  },
  {
    id: 'progress-keep-going',
    type: 'progress_summary',
    title: 'Keep Going!',
    content: 'You are building stronger neural pathways with every card. Each review makes the next one easier.',
    shown: false,
  },
];

// ---------------------------------------------------------------------------
// EnhancedScheduler
// ---------------------------------------------------------------------------

/**
 * Extended scheduler that integrates behavioural psychology features
 * with the base spaced-repetition scheduling engine.
 *
 * Usage:
 * ```typescript
 * const store: CardStore = new MyDatabaseStore();
 * const enhanced = new EnhancedScheduler('fsrs', params, store);
 *
 * const session = await enhanced.getStudySession('user-123', {
 *   deckId: 'deck-456',
 *   bonusRatio: 0.07,
 * });
 *
 * while (session.getCurrentCard()) {
 *   const card = session.getCurrentCard()!;
 *   const result = await session.answerCard(Rating.Good, 5000);
 *   const feedback = session.consumeFeedback();
 *   // Display feedback animations...
 * }
 *
 * const summary = session.end();
 * ```
 */
export class EnhancedScheduler extends Scheduler {
  /** Bonus card service for variable ratio reinforcement. */
  private readonly bonusCardService: BonusCardService;

  /** Endowed progress service for progress bar seeding. */
  private readonly endowedProgressService: EndowedProgressService;

  /** XP service for gamification integration. */
  private readonly xpService: XPService;

  /**
   * Create a new EnhancedScheduler.
   *
   * @param algorithm - Which scheduling algorithm to use.
   * @param params - Algorithm-specific parameters.
   * @param store - Persistence interface.
   */
  constructor(
    algorithm: 'fsrs' | 'sm2',
    params: FSRSParameters | SM2Parameters,
    store: CardStore,
  ) {
    super(algorithm, params, store);
    this.bonusCardService = new BonusCardService();
    this.endowedProgressService = new EndowedProgressService();
    this.xpService = new XPService();
  }

  /**
   * Create an enhanced study session with psychology integrations.
   *
   * This sets up bonus cards, insight card injection, micro-feedback
   * triggers, and endowed progress tracking on top of the standard
   * study session.
   *
   * @param userId - The user starting the session.
   * @param options - Enhanced session options.
   * @returns An EnhancedStudySession instance ready to be started.
   */
  async getStudySession(
    userId: string,
    options: EnhancedSessionOptions,
  ): Promise<EnhancedStudySession> {
    const sessionConfig: StudySessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      ...options.sessionConfig,
    };

    const session = new EnhancedStudySession(
      this,
      // Access the store through a method on the base class is not possible
      // since it is private, so we pass the scheduler itself for delegation
      userId,
      options.deckId,
      {
        bonusRatio: options.bonusRatio ?? 0.07,
        insightInterval: options.insightInterval ?? { min: 10, max: 15 },
        microFeedbackEnabled: options.microFeedbackEnabled ?? true,
        endowedProgressEnabled: options.endowedProgressEnabled ?? true,
        sessionConfig,
        tagFilter: options.tagFilter,
      },
      this.bonusCardService,
      this.endowedProgressService,
      this.xpService,
    );

    return session;
  }
}

// ---------------------------------------------------------------------------
// Internal session config (resolved from options)
// ---------------------------------------------------------------------------

interface ResolvedEnhancedOptions {
  bonusRatio: number;
  insightInterval: { min: number; max: number };
  microFeedbackEnabled: boolean;
  endowedProgressEnabled: boolean;
  sessionConfig: StudySessionConfig;
  tagFilter?: string[];
}

// ---------------------------------------------------------------------------
// EnhancedStudySession
// ---------------------------------------------------------------------------

/**
 * A study session enhanced with psychology-based engagement features.
 *
 * Wraps the standard study flow with bonus card tracking, insight
 * injection, streak monitoring, and micro-feedback generation.
 */
export class EnhancedStudySession {
  /** The underlying scheduler. */
  private readonly scheduler: EnhancedScheduler;

  /** The user studying. */
  private readonly userId: string;

  /** The deck being studied. */
  private readonly deckId: string;

  /** Resolved options. */
  private readonly options: ResolvedEnhancedOptions;

  /** Bonus card service. */
  private readonly bonusCardService: BonusCardService;

  /** Endowed progress service. */
  private readonly endowedProgressService: EndowedProgressService;

  /** XP service. */
  private readonly xpService: XPService;

  /** Unique session identifier. */
  private readonly sessionId: string;

  /** Internal card queue. */
  private queue: Card[] = [];

  /** Current card index. */
  private currentIndex: number = -1;

  /** Review history for this session. */
  private reviewHistory: Array<{
    cardId: string;
    rating: Rating;
    timeSpentMs: number;
    isBonus: boolean;
    xpEarned: number;
  }> = [];

  /** Current consecutive correct streak. */
  private currentStreak: number = 0;

  /** Longest streak in the session. */
  private longestStreak: number = 0;

  /** Total XP earned in the session. */
  private totalXP: number = 0;

  /** Cards reviewed since last insight injection. */
  private cardsSinceLastInsight: number = 0;

  /** Next insight injection threshold. */
  private nextInsightAt: number;

  /** Available insight cards (shuffled). */
  private insightPool: InsightCard[];

  /** Number of insights shown so far. */
  private insightsShown: number = 0;

  /** Pending micro-feedback events. */
  private pendingFeedback: MicroFeedbackEvent[] = [];

  /** All feedback events triggered during the session. */
  private allFeedbackEvents: MicroFeedbackEvent[] = [];

  /** Whether the session has been started. */
  private started: boolean = false;

  /** Whether the session has been ended. */
  private ended: boolean = false;

  /** Session start time. */
  private startTime: Date | null = null;

  /** Endowed progress card count. */
  private endowedCardCount: number = 0;

  constructor(
    scheduler: EnhancedScheduler,
    userId: string,
    deckId: string,
    options: ResolvedEnhancedOptions,
    bonusCardService: BonusCardService,
    endowedProgressService: EndowedProgressService,
    xpService: XPService,
  ) {
    this.scheduler = scheduler;
    this.userId = userId;
    this.deckId = deckId;
    this.options = options;
    this.bonusCardService = bonusCardService;
    this.endowedProgressService = endowedProgressService;
    this.xpService = xpService;
    this.sessionId = generateId();

    // Randomize the first insight injection point
    this.nextInsightAt = randomBetween(
      options.insightInterval.min,
      options.insightInterval.max,
    );

    // Shuffle and prepare insight pool
    this.insightPool = [...DEFAULT_INSIGHTS].sort(() => Math.random() - 0.5);
  }

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  /**
   * Initialize the enhanced study session.
   *
   * Loads the first batch of cards, designates bonus cards, and
   * fetches endowed progress data.
   */
  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Session has already been started.');
    }

    this.started = true;
    this.startTime = new Date();

    // Load cards from the scheduler
    this.queue = await this.scheduler.getNextCards(
      this.deckId,
      this.options.sessionConfig.prefetchSize,
    );

    // Designate bonus cards using variable ratio reinforcement
    this.bonusCardService.selectBonusCards(
      this.sessionId,
      this.queue.map((c) => ({ id: c.id })),
      this.options.bonusRatio,
    );

    // Fetch endowed progress if enabled
    if (this.options.endowedProgressEnabled) {
      try {
        this.endowedCardCount = await this.endowedProgressService.getEndowedCardCount(
          this.userId,
          this.deckId,
        );
      } catch {
        // Non-critical; default to 0
        this.endowedCardCount = 0;
      }
    }

    // Position at first active card
    this.currentIndex = 0;
    this.skipInactiveCards();
  }

  /**
   * Get the current card to show, or null if the session is complete.
   */
  getCurrentCard(): Card | null {
    this.ensureStarted();
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) {
      return null;
    }
    return this.queue[this.currentIndex];
  }

  /**
   * Check whether the current card is a bonus card.
   */
  isCurrentCardBonus(): boolean {
    const card = this.getCurrentCard();
    if (!card) return false;
    return this.bonusCardService.isBonusCardInSession(this.sessionId, card.id);
  }

  /**
   * Submit an answer for the current card.
   *
   * Processes the review, awards XP (with bonus multiplier if applicable),
   * updates streak tracking, checks for micro-feedback triggers, and
   * injects insight cards at the configured interval.
   *
   * @param rating - The user's rating.
   * @param timeSpentMs - Time spent on the card in milliseconds.
   * @returns The scheduling result.
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

    // Compute scheduling result
    const result = this.scheduler.scheduleReview(
      card.scheduling,
      rating,
      new Date(),
    );

    // Process through the base scheduler (persists to store)
    await this.scheduler.processAnswer(card.id, rating, timeSpentMs);

    // Award XP with bonus multiplier
    const isBonus = this.bonusCardService.isBonusCardInSession(
      this.sessionId,
      card.id,
    );

    const ratingKey = this.ratingToKey(rating);
    const baseXP = XP_REWARDS[ratingKey];
    let cardXP = baseXP;

    if (isBonus) {
      const bonusResult = await this.bonusCardService.calculateCardXP(
        this.sessionId,
        card.id,
        baseXP,
      );
      cardXP = bonusResult.totalXP;

      // Trigger bonus card micro-feedback
      if (this.options.microFeedbackEnabled) {
        this.addFeedback({
          type: 'bonus_card',
          message: `Bonus Card! ${bonusResult.multiplier}x XP!`,
          animation: 'confetti',
          sound: 'celebration',
        });
      }
    }

    // Award XP via gamification system
    try {
      await this.xpService.awardReviewXP(this.userId, ratingKey);
    } catch {
      // XP tracking is non-critical
    }

    this.totalXP += cardXP;

    // Update streak tracking
    if (rating !== Rating.Again) {
      this.currentStreak++;
      if (this.currentStreak > this.longestStreak) {
        this.longestStreak = this.currentStreak;
      }
      this.checkStreakFeedback();
    } else {
      this.currentStreak = 0;
    }

    // Check speed feedback
    if (this.options.microFeedbackEnabled) {
      this.checkSpeedFeedback(timeSpentMs, rating);
    }

    // Record in review history
    this.reviewHistory.push({
      cardId: card.id,
      rating,
      timeSpentMs,
      isBonus,
      xpEarned: cardXP,
    });

    // Insight card injection check
    this.cardsSinceLastInsight++;
    if (this.cardsSinceLastInsight >= this.nextInsightAt) {
      this.injectInsightCard();
    }

    // Advance to next card
    this.currentIndex++;
    this.skipInactiveCards();

    return result;
  }

  /**
   * Consume and clear pending micro-feedback events.
   *
   * The UI should call this after each answerCard() to retrieve
   * and display any triggered feedback.
   *
   * @returns Array of pending feedback events, now cleared.
   */
  consumeFeedback(): MicroFeedbackEvent[] {
    const feedback = [...this.pendingFeedback];
    this.pendingFeedback = [];
    return feedback;
  }

  /**
   * Get the next insight card to show, if one is due.
   *
   * Returns null if no insight is currently scheduled. Insights are
   * automatically scheduled by the answerCard() method.
   *
   * @returns The next insight card, or null.
   */
  getNextInsight(): InsightCard | null {
    const next = this.insightPool.find((i) => !i.shown);
    return next ?? null;
  }

  /**
   * Mark an insight card as shown.
   *
   * @param insightId - The insight card ID to mark.
   */
  markInsightShown(insightId: string): void {
    const insight = this.insightPool.find((i) => i.id === insightId);
    if (insight) {
      insight.shown = true;
      this.insightsShown++;
    }
  }

  /**
   * Get enhanced session progress.
   */
  getProgress(): EnhancedSessionProgress {
    this.ensureStarted();

    const completed = this.reviewHistory.length;
    const remaining = Math.max(0, this.queue.length - Math.max(0, this.currentIndex));
    const totalAnswered = this.reviewHistory.length;
    const successCount = this.reviewHistory.filter(
      (r) => r.rating !== Rating.Again,
    ).length;
    const accuracy = totalAnswered > 0 ? successCount / totalAnswered : 0;
    const timeElapsedMs = this.startTime
      ? new Date().getTime() - this.startTime.getTime()
      : 0;

    // Count card types remaining
    let newCards = 0;
    let reviewCards = 0;
    let learningCards = 0;

    for (let i = Math.max(0, this.currentIndex); i < this.queue.length; i++) {
      const card = this.queue[i];
      if (!card || card.status !== CardStatus.Active) continue;
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

    // Count remaining bonus cards
    const bonusCardsRemaining = this.queue
      .slice(Math.max(0, this.currentIndex))
      .filter((c) =>
        this.bonusCardService.isBonusCardInSession(this.sessionId, c.id),
      ).length;

    // Calculate endowed progress
    const totalCards = this.queue.length + completed;
    const endowedProgress = this.options.endowedProgressEnabled
      ? this.endowedProgressService.calculateProgress(
          totalCards,
          completed,
          this.endowedCardCount,
        )
      : 0;

    return {
      completed,
      remaining,
      newCards,
      reviewCards,
      learningCards,
      accuracy,
      timeElapsedMs,
      bonusCardsRemaining,
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      xpEarned: this.totalXP,
      endowedProgress,
      pendingFeedback: [...this.pendingFeedback],
    };
  }

  /**
   * End the session and return an enhanced summary.
   */
  end(): EnhancedSessionSummary {
    this.ensureStarted();
    if (this.ended) {
      throw new Error('Session has already been ended.');
    }
    this.ended = true;

    // Clean up bonus card tracking
    this.bonusCardService.clearSession(this.sessionId);

    const totalCards = this.reviewHistory.length;
    let againCount = 0;
    let hardCount = 0;
    let goodCount = 0;
    let easyCount = 0;
    let totalTimeMs = 0;
    let bonusCardsReviewed = 0;
    let bonusXP = 0;

    for (const record of this.reviewHistory) {
      totalTimeMs += record.timeSpentMs;

      if (record.isBonus) {
        bonusCardsReviewed++;
        bonusXP += record.xpEarned - (XP_REWARDS[this.ratingToKey(record.rating)] || 0);
      }

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

    return {
      totalCards,
      accuracy,
      againCount,
      hardCount,
      goodCount,
      easyCount,
      totalTimeMs,
      xpEarned: this.totalXP,
      streakUpdated: totalCards > 0,
      bonusCardsReviewed,
      bonusXP,
      insightsShown: this.insightsShown,
      longestStreak: this.longestStreak,
      feedbackEvents: this.allFeedbackEvents,
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Skip past any inactive (buried/suspended) cards.
   */
  private skipInactiveCards(): void {
    while (this.currentIndex < this.queue.length) {
      const card = this.queue[this.currentIndex];
      if (card.status === CardStatus.Active) break;
      this.currentIndex++;
    }
  }

  /**
   * Convert a numeric Rating enum to the string key used by gamification types.
   */
  private ratingToKey(rating: Rating): 'again' | 'hard' | 'good' | 'easy' {
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

  /**
   * Add a micro-feedback event to the pending queue.
   */
  private addFeedback(event: MicroFeedbackEvent): void {
    this.pendingFeedback.push(event);
    this.allFeedbackEvents.push(event);
  }

  /**
   * Check if a streak milestone was reached and trigger feedback.
   */
  private checkStreakFeedback(): void {
    if (!this.options.microFeedbackEnabled) return;

    if (this.currentStreak === 5) {
      this.addFeedback({
        type: 'streak',
        message: '5 in a row! Keep it up!',
        animation: 'glow',
        sound: 'correct',
      });
    } else if (this.currentStreak === 10) {
      this.addFeedback({
        type: 'streak',
        message: '10 in a row! You are on fire!',
        animation: 'confetti',
        sound: 'celebration',
      });
    } else if (this.currentStreak === 20) {
      this.addFeedback({
        type: 'streak',
        message: '20 in a row! Incredible!',
        animation: 'confetti',
        sound: 'celebration',
      });
    } else if (this.currentStreak > 0 && this.currentStreak % 25 === 0) {
      this.addFeedback({
        type: 'streak',
        message: `${this.currentStreak} in a row! Legendary!`,
        animation: 'confetti',
        sound: 'celebration',
      });
    }
  }

  /**
   * Check for speed-based micro-feedback triggers.
   */
  private checkSpeedFeedback(timeSpentMs: number, rating: Rating): void {
    // Speed feedback only for correct answers under 3 seconds
    if (rating !== Rating.Again && timeSpentMs < 3000 && timeSpentMs > 500) {
      // Only trigger occasionally to avoid feedback fatigue
      if (Math.random() < 0.15) {
        this.addFeedback({
          type: 'speed',
          message: 'Lightning fast recall!',
          animation: 'pulse',
          sound: 'whoosh',
        });
      }
    }
  }

  /**
   * Inject an insight card into the session flow.
   */
  private injectInsightCard(): void {
    const nextInsight = this.insightPool.find((i) => !i.shown);
    if (nextInsight) {
      // Trigger feedback to show insight card
      this.addFeedback({
        type: 'milestone',
        message: nextInsight.title,
        animation: 'glow',
      });
    }

    // Reset the counter and pick a new random interval
    this.cardsSinceLastInsight = 0;
    this.nextInsightAt = randomBetween(
      this.options.insightInterval.min,
      this.options.insightInterval.max,
    );
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

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Generate a random integer between min and max (inclusive). */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a UUID v4 identifier. */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
