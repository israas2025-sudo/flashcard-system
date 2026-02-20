/**
 * Deck System Type Definitions
 *
 * Defines the core data structures for the hierarchical deck system
 * used in the multilingual flashcard application. Decks support nesting
 * via parent_id, per-deck scheduling via presets, filtered/custom study
 * decks built from search queries, and deck override on card templates.
 *
 * Section 1.4 of the spec: Decks are groups of cards. Each card belongs
 * to exactly one deck. Decks support hierarchy via parent_id. Studying
 * a parent deck includes all subdeck cards. Each deck can have its own
 * options preset.
 */

// ---------------------------------------------------------------------------
// Core Deck
// ---------------------------------------------------------------------------

/**
 * Represents a single deck in the system.
 *
 * Decks are organized in a tree hierarchy via parentId references.
 * Each card belongs to exactly one deck. Studying a parent deck includes
 * all subdeck cards. Each deck can optionally reference a DeckPreset for
 * scheduling configuration.
 */
export interface Deck {
  /** Unique identifier (UUID v4). */
  id: string;

  /** ID of the user who owns this deck. */
  userId: string;

  /** Human-readable display name (e.g., "Classical Arabic"). */
  name: string;

  /** ID of the parent deck, or null if this is a root-level deck. */
  parentId: string | null;

  /** ID of the scheduling preset applied to this deck, or null for defaults. */
  presetId: string | null;

  /** Optional longer description of the deck's purpose. */
  description: string;

  /** Whether this deck is a filtered/custom study deck (temporary). */
  isFiltered: boolean;

  /** The search query used to populate a filtered deck, or null for normal decks. */
  filterQuery: string | null;

  /** Sort position among siblings (0-based). */
  position: number;

  /** Timestamp when the deck was created. */
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Deck Tree Node
// ---------------------------------------------------------------------------

/**
 * Extended deck node used when building the full deck tree.
 *
 * Includes recursive children, aggregated card counts across all subdecks,
 * and depth information. The getDeckTree method returns an array of these
 * root-level nodes with their full descendant trees.
 */
export interface DeckTreeNode extends Deck {
  /** Direct child decks, each also a DeckTreeNode. */
  children: DeckTreeNode[];

  /** Total number of cards in this deck and all subdecks. */
  totalCards: number;

  /** Number of new (unseen) cards in this deck and all subdecks. */
  newCards: number;

  /** Number of cards due for review in this deck and all subdecks. */
  dueCards: number;

  /** Number of cards currently in learning/relearning in this deck and all subdecks. */
  learningCards: number;

  /** Number of paused/suspended cards in this deck and all subdecks. */
  pausedCards: number;

  /** Depth in the tree (0 = root level). */
  depth: number;
}

// ---------------------------------------------------------------------------
// Deck Tree Row (internal)
// ---------------------------------------------------------------------------

/**
 * Flat row returned from the recursive CTE query before tree assembly.
 * Used internally by DeckService.getDeckTree().
 */
export interface DeckTreeRow extends Deck {
  /** Depth in the hierarchy (0 = root). */
  depth: number;

  /** Total number of cards directly in this deck. */
  totalCards: number;

  /** Number of new cards directly in this deck. */
  newCards: number;

  /** Number of due review cards directly in this deck. */
  dueCards: number;

  /** Number of learning/relearning cards directly in this deck. */
  learningCards: number;

  /** Number of paused cards directly in this deck. */
  pausedCards: number;
}

// ---------------------------------------------------------------------------
// Deck Preset (Scheduling Options)
// ---------------------------------------------------------------------------

/**
 * Reusable scheduling configuration for decks.
 *
 * Deck presets are shareable -- multiple decks can reference the same preset.
 * They control new/review card limits, learning steps, FSRS parameters,
 * leech behaviour, and sibling burying rules.
 */
export interface DeckPreset {
  /** Unique identifier (UUID v4). */
  id: string;

  /** ID of the user who owns this preset. */
  userId: string;

  /** Display name for the preset (e.g., "Standard", "Intensive"). */
  name: string;

  /** Maximum number of new cards introduced per day. */
  newCardsPerDay: number;

  /** Maximum number of review cards shown per day. */
  maxReviewsPerDay: number;

  /**
   * Learning steps in minutes before a card graduates.
   * Example: [1, 10] means 1 minute, then 10 minutes.
   */
  learningSteps: number[];

  /**
   * Re-learning steps in minutes after a lapse.
   * Example: [10] means a single 10-minute step.
   */
  relearningSteps: number[];

  /** Graduating interval in days (from Learning to Review state). */
  graduatingIntervalDays: number;

  /** Easy graduating interval in days (shortcut past remaining steps). */
  easyIntervalDays: number;

  /**
   * Desired probability of recall at the moment a review is due.
   * Typical range: 0.7 - 0.97. Default: 0.9.
   */
  desiredRetention: number;

  /**
   * FSRS-5 model weights (array of 19 floats), or null to use global defaults.
   * These can be optimised per-deck from review history.
   */
  fsrsParameters: number[] | null;

  /** Number of lapses before a card is flagged as a leech. */
  leechThreshold: number;

  /** Action to take when a card becomes a leech. */
  leechAction: 'tag_only' | 'pause';

  /** Whether to bury (skip until tomorrow) new sibling cards after a review. */
  buryNewSiblings: boolean;

  /** Whether to bury review sibling cards after a review. */
  buryReviewSiblings: boolean;
}

// ---------------------------------------------------------------------------
// Deck Study Info
// ---------------------------------------------------------------------------

/**
 * Study progress and limits for a specific deck.
 *
 * Used by the study session to determine how many new and review cards
 * to show from this deck today, respecting per-deck limits.
 */
export interface DeckStudyInfo {
  /** The deck's unique identifier. */
  deckId: string;

  /** The deck's display name. */
  deckName: string;

  /** Number of new cards already studied today from this deck. */
  newCardsToday: number;

  /** Maximum new cards allowed today (from the deck preset). */
  newCardsLimit: number;

  /** Number of review cards already studied today from this deck. */
  reviewCardsToday: number;

  /** Maximum review cards allowed today (from the deck preset). */
  reviewCardsLimit: number;

  /** Number of cards currently in learning/relearning state. */
  learningCards: number;

  /** Total number of cards due (new within limit + due reviews + learning). */
  totalDue: number;
}

// ---------------------------------------------------------------------------
// Card Reference (minimal card for deck operations)
// ---------------------------------------------------------------------------

/**
 * Minimal card representation returned from deck-based queries.
 * Avoids importing the full Card type from other modules.
 */
export interface DeckCard {
  /** Unique card identifier. */
  id: string;

  /** ID of the note this card was generated from. */
  noteId: string;

  /** ID of the deck containing this card. */
  deckId: string;

  /** Template ordinal within the note type. */
  templateOrdinal: number;

  /** Current scheduling status: active, paused, or skipped_today. */
  status: 'active' | 'paused' | 'skipped_today';

  /** Current card type in the FSRS lifecycle. */
  cardType: 'new' | 'learning' | 'review' | 'relearning';

  /** When this card is next due for review, or null if new. */
  due: Date | null;

  /** Current interval in days. */
  intervalDays: number;

  /** FSRS stability value. */
  stability: number;

  /** FSRS difficulty value. */
  difficulty: number;

  /** Timestamp of the most recent review, or null if never reviewed. */
  lastReviewAt: Date | null;

  /** Total number of reviews so far. */
  reps: number;

  /** Number of lapses (times Again was pressed on a Review card). */
  lapses: number;

  /** Flag number (0 = no flag, 1-7 = coloured flags). */
  flag: number;

  /** Arbitrary JSON metadata (used for filtered deck original_deck_id, odue, etc.). */
  customData: Record<string, unknown>;

  /** Timestamp when the card was created. */
  createdAt: Date;

  /** Timestamp of last modification. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Filtered Deck Order
// ---------------------------------------------------------------------------

/**
 * Sort orders available for filtered deck card selection.
 */
export type FilteredDeckOrder =
  | 'random'
  | 'due_date_asc'
  | 'due_date_desc'
  | 'added_asc'
  | 'added_desc'
  | 'interval_asc'
  | 'interval_desc'
  | 'lapses_desc'
  | 'difficulty_desc';
