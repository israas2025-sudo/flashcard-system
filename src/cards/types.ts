/**
 * Card Management Type Definitions
 *
 * Defines all data structures used by the card management service, timer
 * service, audio service, and undo service in the flashcard application.
 *
 * Types cover:
 * - Section 1.6:  Card operations (set due, reset, reposition, copy, mark, leech)
 * - Section 1.10: Study session helpers (card info, previous card info, undo)
 */

import type { Pool, PoolClient } from 'pg';

// ---------------------------------------------------------------------------
// Card Info (Section 1.10 - displayed during review)
// ---------------------------------------------------------------------------

/**
 * Comprehensive information about a card, used to populate the Card Info
 * panel during review (Section 1.10).
 *
 * Combines scheduling data, note fields, deck context, and review history
 * into a single view-model for the UI.
 */
export interface CardInfo {
  /** Unique card identifier. */
  cardId: string;

  /** ID of the note this card was generated from. */
  noteId: string;

  /** Display name of the deck containing this card. */
  deckName: string;

  /** Full hierarchy path from root to the card's deck (e.g. ["Languages", "Arabic", "Vocab"]). */
  deckPath: string[];

  /** Human-readable name of the note type (e.g. "Basic", "Cloze"). */
  noteTypeName: string;

  /** The note's field values keyed by field name. */
  fields: Record<string, string>;

  /** Tag names associated with this card's note. */
  tags: string[];

  /** Current card type in the FSRS lifecycle: 'new', 'learning', 'review', 'relearning'. */
  cardType: string;

  /** Current card status: 'active', 'paused', 'skipped_today'. */
  status: string;

  /** Flag number (0 = no flag, 1-7 = coloured flags). */
  flag: number;

  /** When the card is next due for review, or null if new. */
  due: Date | null;

  /** Current interval in days. */
  intervalDays: number;

  /** FSRS stability value (memory half-life in days). */
  stability: number;

  /** FSRS difficulty value (1-10). */
  difficulty: number;

  /** Current retrievability (probability of recall right now). */
  retrievability: number;

  /** Ease factor for SM-2 compatibility display (derived from difficulty). */
  easeFactor: number;

  /** Total number of reviews. */
  reps: number;

  /** Number of lapses (times Again was pressed on a Review card). */
  lapses: number;

  /** Timestamp when the card was created. */
  createdAt: Date;

  /** Timestamp of the most recent review, or null if never reviewed. */
  lastReviewAt: Date | null;

  /** Timestamp of the very first review, or null if never reviewed. */
  firstReviewAt: Date | null;

  /** Average time spent per review in milliseconds. */
  averageTimeMs: number;

  /** Total number of review log entries for this card. */
  totalReviews: number;

  /** Whether this card's note is tagged as a leech. */
  isLeech: boolean;

  /** Whether this card's note is tagged as marked. */
  isMarked: boolean;

  /** Position in the new card queue, or null if not a new card. */
  position: number | null;

  /** Template ordinal within the note type. */
  templateOrdinal: number;

  /** Human-readable template name (e.g. "Forward", "Reverse"). */
  templateName: string;
}

// ---------------------------------------------------------------------------
// Previous Card Info (Section 1.10)
// ---------------------------------------------------------------------------

/**
 * Information about the previous review of a card, used to show the user
 * what happened on the last review (Section 1.10 - "Previous Card Info").
 */
export interface PreviousCardInfo {
  /** The review log entry ID. */
  reviewLogId: string;

  /** The card that was reviewed. */
  cardId: string;

  /** Rating given: 'again', 'hard', 'good', or 'easy'. */
  rating: string;

  /** Interval before the review in days. */
  intervalBefore: number;

  /** Interval after the review in days. */
  intervalAfter: number;

  /** Stability before the review. */
  stabilityBefore: number;

  /** Stability after the review. */
  stabilityAfter: number;

  /** Difficulty before the review. */
  difficultyBefore: number;

  /** Difficulty after the review. */
  difficultyAfter: number;

  /** Time spent on the review in milliseconds. */
  timeSpentMs: number;

  /** Review type: 'learning', 'review', 'relearning', or 'filtered'. */
  reviewType: string;

  /** Timestamp when the review occurred. */
  reviewedAt: Date;
}

// ---------------------------------------------------------------------------
// Leech Result (Section 1.6)
// ---------------------------------------------------------------------------

/**
 * Result of checking whether a card is a leech.
 *
 * A leech is a card that has been lapsed (failed) too many times,
 * indicating the user is struggling and should consider editing the card
 * or using a different mnemonic strategy.
 */
export interface LeechResult {
  /** Whether the card meets or exceeds the leech threshold. */
  isLeech: boolean;

  /** The card's current lapse count. */
  lapses: number;

  /** The configured leech threshold. */
  threshold: number;

  /** The action that was configured for leech handling. */
  action: 'tag_only' | 'pause';

  /** Whether the "leech" tag was added to the note. */
  wasTagged: boolean;

  /** Whether the card was paused (only true when action is 'pause'). */
  wasPaused: boolean;
}

// ---------------------------------------------------------------------------
// Undo Entry (Section 1.10)
// ---------------------------------------------------------------------------

/**
 * An entry in the undo stack representing a single review action that
 * can be reversed.
 *
 * Stores the complete previous card state so the card can be restored
 * exactly as it was before the review.
 */
export interface UndoEntry {
  /** The card that was reviewed. */
  cardId: string;

  /** The review log entry ID (to be deleted on undo). */
  reviewLogId: string;

  /** Truncated front content for display in the undo description. */
  cardFrontPreview: string;

  /** Rating that was given: 'again', 'hard', 'good', or 'easy'. */
  rating: string;

  /** Complete card state before the review was applied. */
  previousState: {
    cardType: string;
    due: Date | null;
    intervalDays: number;
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    lastReviewAt: Date | null;
  };

  /** Timestamp when this undo entry was recorded. */
  timestamp: Date;
}

/**
 * Result of an undo operation.
 */
export interface UndoResult {
  /** The card ID that was restored. */
  cardId: string;

  /** The rating that was undone. */
  rating: string;

  /** A human-readable description of what was undone. */
  description: string;

  /** Whether the undo succeeded. */
  success: boolean;
}

// ---------------------------------------------------------------------------
// Note (local type for card management operations)
// ---------------------------------------------------------------------------

/**
 * Minimal note representation used by card management operations.
 * Avoids tight coupling to the full Note type from templates.
 */
export interface Note {
  /** Unique identifier. */
  id: string;

  /** ID of the note type. */
  noteTypeId: string;

  /** The note's field values keyed by field name. */
  fields: Record<string, string>;

  /** Timestamp of creation. */
  createdAt: Date;

  /** Timestamp of last modification. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Card (local type for card management operations)
// ---------------------------------------------------------------------------

/**
 * Card record as returned from card management queries.
 */
export interface Card {
  /** Unique card identifier. */
  id: string;

  /** ID of the note this card was generated from. */
  noteId: string;

  /** ID of the deck containing this card. */
  deckId: string;

  /** Template ordinal within the note type. */
  templateOrdinal: number;

  /** Current card status: 'active', 'paused', 'skipped_today'. */
  status: string;

  /** Current card type: 'new', 'learning', 'review', 'relearning'. */
  cardType: string;

  /** When this card is next due for review. */
  due: Date | null;

  /** Current interval in days. */
  intervalDays: number;

  /** FSRS stability value. */
  stability: number;

  /** FSRS difficulty value. */
  difficulty: number;

  /** Timestamp of the most recent review. */
  lastReviewAt: Date | null;

  /** Total number of reviews. */
  reps: number;

  /** Number of lapses. */
  lapses: number;

  /** Flag number (0-7). */
  flag: number;

  /** Arbitrary JSON metadata. */
  customData: Record<string, unknown>;

  /** Timestamp when the card was created. */
  createdAt: Date;

  /** Timestamp of last modification. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Copy Note Result
// ---------------------------------------------------------------------------

/**
 * Result of copying a note and its cards.
 */
export interface CopyNoteResult {
  /** The newly created note. */
  note: Note;

  /** The newly created cards (all in 'new' state). */
  cards: Card[];
}

// ---------------------------------------------------------------------------
// Audio Service Types
// ---------------------------------------------------------------------------

/**
 * Configuration for the audio service.
 */
export interface AudioConfig {
  /** Whether to auto-play audio when a card is shown. */
  autoPlay: boolean;

  /** Default playback rate (1.0 = normal speed). */
  playbackRate: number;
}

/**
 * State of an active recording session.
 */
export interface RecordingState {
  /** Whether recording is currently in progress. */
  isRecording: boolean;

  /** The MediaRecorder instance, if active. */
  recorder: MediaRecorder | null;

  /** Accumulated audio chunks during recording. */
  chunks: Blob[];
}

// ---------------------------------------------------------------------------
// Timer Display Format
// ---------------------------------------------------------------------------

/**
 * A formatted timer value for UI display.
 */
export interface TimerDisplay {
  /** Total elapsed milliseconds. */
  totalMs: number;

  /** Human-readable formatted string (e.g. "1:30" or "45s"). */
  formatted: string;

  /** Whether the timer has exceeded the configured maximum. */
  exceededMax: boolean;
}
