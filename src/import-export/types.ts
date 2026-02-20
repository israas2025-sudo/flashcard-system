/**
 * Import/Export System Type Definitions
 *
 * Types for importing Anki .apkg files, CSV/TSV files, and for exporting
 * flashcard collections in both formats.  Also includes types that
 * represent the internal structure of Anki's SQLite database (collection.anki2).
 */

// ---------------------------------------------------------------------------
// Import Options & Results
// ---------------------------------------------------------------------------

/**
 * Options controlling how an import is performed.
 */
export interface ImportOptions {
  /** Import all cards into this specific deck (overrides the deck from the file). */
  targetDeckId?: string;

  /**
   * How to handle cards whose first-field value matches an existing note.
   *   - 'skip'           : Do not import the duplicate.
   *   - 'update'         : Overwrite existing note fields with the import data.
   *   - 'import_as_new'  : Import as a brand new note regardless of duplicates.
   */
  duplicateHandling: 'skip' | 'update' | 'import_as_new';

  /** Whether to import media files from the package. */
  importMedia: boolean;

  /**
   * Whether to preserve Anki's scheduling data (intervals, due dates, etc.)
   * or reset all imported cards to the New state.
   */
  preserveScheduling: boolean;
}

/**
 * The result of an import operation.
 */
export interface ImportResult {
  /** Whether the import completed without fatal errors. */
  success: boolean;

  /** Number of notes imported. */
  notesImported: number;

  /** Number of cards imported. */
  cardsImported: number;

  /** Number of media files imported. */
  mediaImported: number;

  /** Number of duplicate notes that were skipped. */
  duplicatesSkipped: number;

  /** Non-fatal errors encountered during the import. */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Export Options & Results
// ---------------------------------------------------------------------------

/**
 * Options controlling how an export is performed.
 */
export interface ExportOptions {
  /** Include scheduling data (intervals, due dates, etc.) in the export. */
  includeScheduling: boolean;

  /** Include media files in the export package. */
  includeMedia: boolean;

  /** Include tags in the export. */
  includeTags: boolean;
}

// ---------------------------------------------------------------------------
// CSV Import Types
// ---------------------------------------------------------------------------

/**
 * Defines how CSV columns map to note fields.
 */
export interface CsvFieldMapping {
  /** The note type to use for all imported notes. */
  noteTypeId: string;

  /** The deck to place all imported cards into. */
  deckId: string;

  /**
   * Maps zero-based column indices to note field names.
   * Example: { 0: 'Front', 1: 'Back', 2: 'Extra' }
   */
  fieldMap: Record<number, string>;

  /** Optional column index containing comma/space-separated tags. */
  tagColumn?: number;

  /** The column delimiter character. */
  delimiter: string;

  /** Whether the first row is a header row (and should be skipped). */
  hasHeader: boolean;
}

/**
 * A preview of the first N rows of a CSV file, used for building
 * the field mapping in the UI.
 */
export interface CsvPreview {
  /** The detected or specified delimiter. */
  delimiter: string;

  /** The detected character encoding. */
  encoding: string;

  /** Whether a header row was detected. */
  hasHeader: boolean;

  /** Column headers (from the first row, or auto-generated Column 1, 2, ...). */
  headers: string[];

  /** The first N data rows (after the header, if present). */
  rows: string[][];

  /** Total number of rows in the file (including header). */
  totalRows: number;
}

// ---------------------------------------------------------------------------
// Anki Internal Types
// ---------------------------------------------------------------------------

/**
 * Represents an Anki model (note type) as stored in the collection.anki2 database.
 * The `models` column in the `col` table is a JSON object keyed by model ID.
 */
export interface AnkiModel {
  /** Anki's numeric model ID (as a string). */
  id: string;

  /** Model name. */
  name: string;

  /** Model type: 0 = standard, 1 = cloze. */
  type: number;

  /** Field definitions. */
  flds: AnkiField[];

  /** Card template definitions. */
  tmpls: AnkiTemplate[];

  /** CSS shared across all cards of this model. */
  css: string;

  /** Modification timestamp (epoch seconds). */
  mod: number;

  /** Tags suggested for this model. */
  tags: string[];

  /** Sort field index. */
  sortf: number;
}

/**
 * A field definition within an Anki model.
 */
export interface AnkiField {
  /** Field name. */
  name: string;

  /** Ordinal position. */
  ord: number;

  /** Whether this is a sticky field (retains value when adding new notes). */
  sticky: boolean;

  /** Whether this field uses RTL. */
  rtl: boolean;

  /** Font name. */
  font: string;

  /** Font size. */
  size: number;

  /** Description/placeholder. */
  description: string;
}

/**
 * A card template within an Anki model.
 */
export interface AnkiTemplate {
  /** Template name. */
  name: string;

  /** Ordinal position. */
  ord: number;

  /** Front template (question). */
  qfmt: string;

  /** Back template (answer). */
  afmt: string;

  /** Browser question format (optional). */
  bqfmt: string;

  /** Browser answer format (optional). */
  bafmt: string;

  /** Deck override ID (0 = use note's deck). */
  did: number | null;
}

/**
 * An Anki note as stored in the `notes` table of collection.anki2.
 */
export interface AnkiNote {
  /** Note ID (epoch milliseconds, used as primary key). */
  id: number;

  /** GUID (globally unique identifier, base91 encoded). */
  guid: string;

  /** Model (note type) ID. */
  mid: number;

  /** Modification timestamp (epoch seconds). */
  mod: number;

  /** Update sequence number. */
  usn: number;

  /** Space-separated tags. */
  tags: string;

  /** Fields separated by \\x1f (unit separator). */
  flds: string;

  /** Sort field value. */
  sfld: string;

  /** Checksum of the first field (for duplicate detection). */
  csum: number;

  /** Flags. */
  flags: number;

  /** Unused data. */
  data: string;
}

/**
 * An Anki card as stored in the `cards` table of collection.anki2.
 */
export interface AnkiCard {
  /** Card ID (epoch milliseconds). */
  id: number;

  /** Note ID this card belongs to. */
  nid: number;

  /** Deck ID. */
  did: number;

  /** Template ordinal. */
  ord: number;

  /** Modification timestamp (epoch seconds). */
  mod: number;

  /** Update sequence number. */
  usn: number;

  /**
   * Card type: 0 = new, 1 = learning, 2 = review, 3 = relearning.
   */
  type: number;

  /**
   * Queue:
   *  -3 = user buried
   *  -2 = scheduler buried
   *  -1 = suspended
   *   0 = new
   *   1 = learning
   *   2 = review
   *   3 = day-learning (relearning)
   *   4 = preview
   */
  queue: number;

  /** Due date (day number for review, timestamp for learning). */
  due: number;

  /** Current interval in days (negative = seconds for learning). */
  ivl: number;

  /** Ease factor (in permille, e.g. 2500 = 2.5). */
  factor: number;

  /** Number of reviews. */
  reps: number;

  /** Number of lapses. */
  lapses: number;

  /** Learning step index. */
  left: number;

  /** Original due date (when card is in a filtered deck). */
  odue: number;

  /** Original deck ID (when card is in a filtered deck). */
  odid: number;

  /** Flags (bitmask). */
  flags: number;

  /** Unused data. */
  data: string;
}

/**
 * An Anki deck as stored in the `decks` JSON of the `col` table.
 */
export interface AnkiDeck {
  /** Deck ID. */
  id: number;

  /** Deck name (may contain :: for hierarchy). */
  name: string;

  /** Modification timestamp (epoch seconds). */
  mod: number;

  /** Description. */
  desc: string;

  /** Whether this is a dynamic/filtered deck. */
  dyn: number;

  /** Deck configuration ID. */
  conf: number;
}

/**
 * The full parsed contents of an Anki collection.anki2 database.
 */
export interface AnkiCollection {
  /** All models (note types), keyed by model ID. */
  models: Map<string, AnkiModel>;

  /** All decks, keyed by deck ID. */
  decks: Map<string, AnkiDeck>;

  /** All notes. */
  notes: AnkiNote[];

  /** All cards. */
  cards: AnkiCard[];

  /** The creation timestamp of the collection. */
  crt: number;

  /** The modification timestamp of the collection. */
  mod: number;
}

/**
 * Represents a media file imported from an .apkg package.
 */
export interface MediaFile {
  /** The original filename as referenced in note fields. */
  filename: string;

  /** The MIME type of the media file. */
  mimeType: string;

  /** The size in bytes. */
  size: number;

  /** The local path where the file was stored after import. */
  localPath: string;
}
