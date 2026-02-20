/**
 * Pause/Resume System Type Definitions
 *
 * Defines the data structures for card suspension, timed pauses,
 * skip-until-tomorrow ("bury"), and leech detection in the
 * multilingual flashcard application.
 */

/**
 * Describes how a card was paused.
 *
 * - `manual`: User explicitly paused this individual card
 * - `tag_batch`: Card was paused as part of a tag-based batch operation
 * - `deck_batch`: Card was paused as part of a deck-based batch operation
 * - `leech_auto`: Card was automatically paused by leech detection
 */
export type PausedBySource = 'manual' | 'tag_batch' | 'deck_batch' | 'leech_auto';

/**
 * Information about a single paused card.
 *
 * Used in the paused cards management UI to show the user what is
 * currently suspended and why.
 */
export interface PausedCardInfo {
  /** Unique card identifier */
  cardId: string;

  /** ID of the note this card belongs to */
  noteId: string;

  /** Display name of the deck containing this card */
  deckName: string;

  /** Truncated front content for preview (first ~100 chars) */
  frontPreview: string;

  /** Timestamp when the card was paused */
  pausedAt: Date;

  /** How the card was paused (manual, batch, auto) */
  pausedBy: PausedBySource;

  /**
   * Date when the card should automatically resume, or null for
   * indefinite pause. Used for timed pauses and skip-until-tomorrow.
   */
  resumeDate: Date | null;

  /** Optional human-readable reason for the pause */
  pauseReason: string | null;
}

/**
 * A group of paused cards, organized by tag name, deck name, or pause reason.
 *
 * Used in the paused cards management UI for grouped display.
 */
export interface PausedCardGroup {
  /** Display name for the group (tag name, deck name, or reason text) */
  groupName: string;

  /** What dimension the cards are grouped by */
  groupType: 'tag' | 'deck' | 'reason';

  /** Number of cards in this group */
  count: number;

  /** The paused cards in this group */
  cards: PausedCardInfo[];
}

/**
 * Configuration for leech detection thresholds and actions.
 */
export interface LeechConfig {
  /** Number of lapses (failed reviews) before a card is considered a leech */
  threshold: number;

  /**
   * Action to take when a leech is detected:
   * - `tag_only`: Tag the card as a leech but do not pause it
   * - `pause`: Tag the card and automatically pause it
   */
  action: 'tag_only' | 'pause';
}

/**
 * Result of a batch pause/resume operation.
 */
export interface BatchPauseResult {
  /** Number of cards affected by the operation */
  affectedCount: number;

  /** IDs of the cards that were paused or resumed */
  cardIds: string[];
}
