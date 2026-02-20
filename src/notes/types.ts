/**
 * Note/Card CRUD System — Type Definitions
 *
 * Defines the data structures used by the NoteService for creating,
 * reading, updating, and deleting notes and their associated cards.
 * These types complement the core Note, NoteType, and CardCreationData
 * types defined in the templates module.
 */

import type { Note, NoteType, CardCreationData } from '../templates/types';
import type { Tag } from '../tags/types';

// ---------------------------------------------------------------------------
// Note with related data
// ---------------------------------------------------------------------------

/**
 * A note bundled with its note type, generated cards, and tags.
 * Returned by NoteService.getNote() for complete context.
 */
export interface NoteWithCards {
  /** The note record. */
  note: Note;

  /** The note type that defines this note's fields and templates. */
  noteType: NoteType;

  /** All cards generated from this note. */
  cards: NoteCard[];

  /** Tags applied to this note. */
  tags: Tag[];
}

/**
 * Card representation used in note-level queries.
 * Includes scheduling state alongside content.
 */
export interface NoteCard {
  /** Unique card identifier. */
  id: string;

  /** ID of the note this card belongs to. */
  noteId: string;

  /** ID of the deck containing this card. */
  deckId: string;

  /** Template ordinal (0-based) within the note type. */
  templateOrdinal: number;

  /**
   * For cloze note types: the cloze ordinal (1-based).
   * For standard note types: 0.
   */
  clozeOrdinal: number;

  /** Pre-rendered front HTML. */
  frontHtml: string;

  /** Pre-rendered back HTML. */
  backHtml: string;

  /** Current scheduling queue: 0 = new, 1 = learning, 2 = review. */
  queue: number;

  /** Whether this card is suspended. */
  suspended: boolean;

  /** Next due date, or null if new. */
  due: Date | null;

  /** Timestamp when the card was created. */
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Note creation
// ---------------------------------------------------------------------------

/**
 * Data required to create a single note.
 * Used for both individual and batch creation.
 */
export interface NoteCreationData {
  /** The note type ID defining the schema. */
  noteTypeId: string;

  /** The target deck ID. */
  deckId: string;

  /** Field values keyed by field name. */
  fields: Record<string, string>;

  /** Optional tag IDs to associate with the note. */
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

/**
 * A group of notes that share the same first-field checksum.
 * Indicates potential duplicates.
 */
export interface DuplicateGroup {
  /** CRC32 checksum of the first field's normalized value. */
  checksum: number;

  /** Notes sharing this checksum (potential duplicates). */
  notes: Note[];
}

// ---------------------------------------------------------------------------
// Batch operation results
// ---------------------------------------------------------------------------

/**
 * Result of a batch note creation operation.
 */
export interface BatchCreateResult {
  /** Number of notes successfully created. */
  created: number;

  /** Number of notes skipped due to duplicate first-field values. */
  duplicatesSkipped: number;

  /** IDs of the created notes. */
  noteIds: string[];
}

/**
 * Result of a find-and-replace operation across notes.
 */
export interface FindReplaceResult {
  /** Number of notes that were modified. */
  notesModified: number;

  /** Total number of replacements made across all notes. */
  totalReplacements: number;
}

// ---------------------------------------------------------------------------
// Note update tracking
// ---------------------------------------------------------------------------

/**
 * Result of updating a note's fields.
 * Includes information about card changes caused by the update.
 */
export interface NoteUpdateResult {
  /** The updated note. */
  note: Note;

  /** Number of new cards added (e.g., new cloze numbers were introduced). */
  cardsAdded: number;

  /** Number of cards removed (e.g., cloze numbers or template refs were removed). */
  cardsRemoved: number;
}
