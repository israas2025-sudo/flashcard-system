/**
 * types.ts -- All TypeScript interfaces and types for the FSRS-5 scheduling system.
 *
 * This module defines the shared type contracts used across the core FSRS-5
 * algorithm, the legacy SM-2 fallback, the card state machine, the scheduler
 * wrapper, and the study-session manager.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/**
 * User rating given to a flashcard after a review.
 *
 * - Again (1): Complete failure to recall.
 * - Hard  (2): Recalled with significant difficulty.
 * - Good  (3): Recalled with some effort (default expectation).
 * - Easy  (4): Recalled effortlessly.
 */
export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

/**
 * Lifecycle state of a flashcard within the spaced-repetition pipeline.
 *
 * State transitions are governed by {@link CardStateMachine} in card-states.ts.
 */
export enum CardState {
  /** Card has never been studied. */
  New = 0,
  /** Card is being learned for the first time (intra-day steps). */
  Learning = 1,
  /** Card has graduated and follows inter-day scheduling. */
  Review = 2,
  /** Card lapsed (Again pressed on a Review card) and is being re-learned. */
  Relearning = 3,
}

/**
 * Extended card status that includes user-driven overrides beyond the
 * scheduling lifecycle.
 */
export enum CardStatus {
  /** Card is active and follows its scheduling state. */
  Active = 'active',
  /** Card is buried (skipped today, will unbury tomorrow). */
  Buried = 'buried',
  /** Card is suspended (paused indefinitely by the user). */
  Suspended = 'suspended',
}

// ---------------------------------------------------------------------------
// FSRS-5 Parameters
// ---------------------------------------------------------------------------

/**
 * The 19 optimised weights of the FSRS-5 model plus global settings.
 *
 * Default values originate from the open-spaced-repetition project:
 * https://github.com/open-spaced-repetition/fsrs4anki
 */
export interface FSRSParameters {
  /**
   * 19-element weight vector `w[0]`..`w[18]`.
   *
   * | Index | Role                                                |
   * |-------|-----------------------------------------------------|
   * | 0-3   | Initial stability for ratings Again, Hard, Good, Easy |
   * | 4     | Initial difficulty offset                           |
   * | 5     | Initial difficulty slope                            |
   * | 6     | Difficulty revision factor                          |
   * | 7     | Difficulty revision exponent                        |
   * | 8     | Stability success base                              |
   * | 9     | Stability success difficulty weight                 |
   * | 10    | Stability success stability weight                  |
   * | 11    | Stability success retrievability weight              |
   * | 12    | Stability fail base                                 |
   * | 13    | Stability fail difficulty weight                    |
   * | 14    | Stability fail stability weight                     |
   * | 15    | Stability fail retrievability weight                |
   * | 16    | Hard penalty                                        |
   * | 17    | Easy bonus                                          |
   * | 18    | Short-term stability exponent                       |
   */
  w: number[];

  /**
   * Desired probability of recall at the moment a review is due.
   * Typical range: 0.7 - 0.97.  Default: 0.9.
   */
  requestRetention: number;

  /**
   * Maximum scheduling interval in days.
   * Default: 36500 (approximately 100 years).
   */
  maximumInterval: number;
}

// ---------------------------------------------------------------------------
// SM-2 Parameters
// ---------------------------------------------------------------------------

/**
 * Configuration for the legacy SM-2 algorithm.
 */
export interface SM2Parameters {
  /** Starting ease factor for new cards.  Default: 2.5. */
  initialEaseFactor: number;

  /** Minimum ease factor (ease-hell floor).  Default: 1.3. */
  minimumEaseFactor: number;

  /** Interval multiplier when pressing Hard.  Default: 1.2. */
  hardMultiplier: number;

  /** Interval multiplier when pressing Easy (on top of ease factor).  Default: 1.3. */
  easyMultiplier: number;

  /**
   * Learning steps in minutes before a card graduates.
   * Default: [1, 10].
   */
  learningSteps: number[];

  /**
   * Re-learning steps in minutes after a lapse.
   * Default: [10].
   */
  relearningSteps: number[];

  /** Graduating interval in days (from Learning -> Review).  Default: 1. */
  graduatingInterval: number;

  /** Easy graduating interval in days.  Default: 4. */
  easyInterval: number;

  /** Maximum scheduling interval in days.  Default: 36500. */
  maximumInterval: number;

  /** Number of new cards per day.  Default: 20. */
  newCardsPerDay: number;

  /** Number of review cards per day.  Default: 200. */
  reviewsPerDay: number;
}

// ---------------------------------------------------------------------------
// Card Scheduling Data
// ---------------------------------------------------------------------------

/**
 * Internal scheduling state of a single flashcard.
 *
 * This is the minimal data the algorithms need to compute the next interval;
 * it does not include card content (front/back text, media, tags, etc.).
 */
export interface CardSchedulingData {
  /** Memory stability (S) -- expected half-life of recall in days. */
  stability: number;

  /** Difficulty (D) -- value in [1, 10]. Higher is harder. */
  difficulty: number;

  /** Days elapsed since the last review (0 for new cards). */
  elapsedDays: number;

  /** Scheduled inter-review interval in days (0 during learning). */
  scheduledDays: number;

  /** Total number of reviews so far. */
  reps: number;

  /** Number of lapses (times Again was pressed on a Review card). */
  lapses: number;

  /** Current scheduling state. */
  state: CardState;

  /** Timestamp of the most recent review, or null if never reviewed. */
  lastReview: Date | null;
}

/**
 * SM-2 specific scheduling data layered onto a card.
 */
export interface SM2CardData {
  /** Current ease factor. */
  easeFactor: number;

  /** Current interval in days. */
  interval: number;

  /** Current step index within learning or relearning steps. */
  stepIndex: number;

  /** Total number of reviews so far. */
  reps: number;

  /** Number of lapses. */
  lapses: number;

  /** Current scheduling state. */
  state: CardState;

  /** Timestamp of the most recent review, or null if never reviewed. */
  lastReview: Date | null;
}

// ---------------------------------------------------------------------------
// Scheduling Results
// ---------------------------------------------------------------------------

/**
 * The outcome of scheduling a card for a single rating choice.
 */
export interface ScheduledCard {
  /** Updated scheduling data after the review. */
  card: CardSchedulingData;

  /** Computed interval in days until the next review. */
  interval: number;

  /** Absolute date/time when the card is next due. */
  due: Date;
}

/**
 * SM-2 counterpart of {@link ScheduledCard}.
 */
export interface SM2ScheduledCard {
  /** Updated SM-2 scheduling data after the review. */
  card: SM2CardData;

  /** Computed interval in days. */
  interval: number;

  /** Absolute due date/time. */
  due: Date;
}

/**
 * A complete set of scheduling outcomes -- one per possible rating.
 *
 * The UI can use this to preview what will happen for each button press.
 */
export interface SchedulingResult {
  again: ScheduledCard;
  hard: ScheduledCard;
  good: ScheduledCard;
  easy: ScheduledCard;
}

/**
 * SM-2 counterpart of {@link SchedulingResult}.
 */
export interface SM2SchedulingResult {
  again: SM2ScheduledCard;
  hard: SM2ScheduledCard;
  good: SM2ScheduledCard;
  easy: SM2ScheduledCard;
}

// ---------------------------------------------------------------------------
// Full Card Model (content + scheduling + metadata)
// ---------------------------------------------------------------------------

/**
 * Complete card record as stored in the database.
 */
export interface Card {
  /** Unique identifier. */
  id: string;

  /** Identifier of the deck this card belongs to. */
  deckId: string;

  /** Front side content (question / prompt). */
  front: string;

  /** Back side content (answer). */
  back: string;

  /** Optional tags for filtering / organisation. */
  tags: string[];

  /** FSRS scheduling data. */
  scheduling: CardSchedulingData;

  /** Current card status (active, buried, suspended). */
  status: CardStatus;

  /** Date when the next review is due. */
  due: Date;

  /** ISO timestamp of card creation. */
  createdAt: Date;

  /** ISO timestamp of last modification (content or scheduling). */
  updatedAt: Date;

  /**
   * Optional identifier linking this card to sibling cards generated from
   * the same note (e.g. reverse cards).  Used for sibling burying.
   */
  noteId?: string;
}

// ---------------------------------------------------------------------------
// Review Log
// ---------------------------------------------------------------------------

/**
 * An immutable log entry produced by every review.
 *
 * Enables analytics, undo, and parameter optimisation.
 */
export interface ReviewLog {
  /** Unique identifier for this log entry. */
  id: string;

  /** The card that was reviewed. */
  cardId: string;

  /** Rating given by the user. */
  rating: Rating;

  /** Card state *before* the review. */
  stateBefore: CardState;

  /** Card state *after* the review. */
  stateAfter: CardState;

  /** Timestamp when the review occurred. */
  reviewedAt: Date;

  /** Time the user spent on this card in milliseconds. */
  timeSpentMs: number;

  /** Scheduling data snapshot *before* the review (for undo). */
  schedulingBefore: CardSchedulingData;

  /** Scheduling data snapshot *after* the review. */
  schedulingAfter: CardSchedulingData;

  /** Due date *before* the review (for undo). */
  dueBefore: Date;

  /** Due date *after* the review. */
  dueAfter: Date;
}

// ---------------------------------------------------------------------------
// Study Session
// ---------------------------------------------------------------------------

/**
 * Live progress snapshot during a study session.
 */
export interface SessionProgress {
  /** Number of cards answered so far. */
  completed: number;

  /** Number of cards still to be shown. */
  remaining: number;

  /** How many of the remaining cards are new. */
  newCards: number;

  /** How many of the remaining cards are in the review state. */
  reviewCards: number;

  /** How many of the remaining cards are in learning / relearning. */
  learningCards: number;

  /** Running accuracy (fraction of non-Again answers). */
  accuracy: number;

  /** Wall-clock time elapsed since session start in milliseconds. */
  timeElapsedMs: number;
}

/**
 * Summary returned when a study session ends.
 */
export interface SessionSummary {
  /** Total cards reviewed in the session. */
  totalCards: number;

  /** Overall accuracy (fraction of non-Again answers). */
  accuracy: number;

  /** Number of Again ratings given. */
  againCount: number;

  /** Number of Hard ratings given. */
  hardCount: number;

  /** Number of Good ratings given. */
  goodCount: number;

  /** Number of Easy ratings given. */
  easyCount: number;

  /** Total time spent reviewing in milliseconds. */
  totalTimeMs: number;

  /** Experience points earned for gamification. */
  xpEarned: number;

  /** Whether the daily streak was maintained/updated. */
  streakUpdated: boolean;
}

// ---------------------------------------------------------------------------
// Study Statistics
// ---------------------------------------------------------------------------

/**
 * Aggregated study statistics for a deck.
 */
export interface StudyStats {
  /** Number of new (unseen) cards in the deck. */
  newCount: number;

  /** Number of cards currently in learning / relearning. */
  learningCount: number;

  /** Number of review cards due today or overdue. */
  reviewCount: number;

  /** Total number of cards in the deck. */
  totalCount: number;

  /** Number of cards that are buried for the day. */
  buriedCount: number;

  /** Number of cards that are suspended. */
  suspendedCount: number;

  /** Predicted minutes to finish today's reviews. */
  estimatedMinutes: number;

  /** Average accuracy over the last 30 days. */
  recentAccuracy: number;

  /** Average interval of mature cards (>= 21 days). */
  averageMatureInterval: number;
}

// ---------------------------------------------------------------------------
// Card State Transition
// ---------------------------------------------------------------------------

/**
 * Describes a valid state transition in the card state machine.
 */
export interface StateTransition {
  /** State the card is transitioning from. */
  from: CardState;

  /** State the card is transitioning to. */
  to: CardState;

  /** The rating that triggers this transition (null for non-rating events). */
  trigger: Rating | 'graduate' | 'lapse' | 'pause' | 'skip' | 'unbury' | 'resume';
}

/**
 * Configuration for learning / relearning step progressions.
 */
export interface StepConfig {
  /** Learning steps in minutes.  Default: [1, 10]. */
  learningSteps: number[];

  /** Re-learning steps in minutes.  Default: [10]. */
  relearningSteps: number[];

  /** Graduating interval in days after completing all learning steps. */
  graduatingInterval: number;

  /** Easy graduating interval in days (shortcut past remaining steps). */
  easyGraduatingInterval: number;
}
