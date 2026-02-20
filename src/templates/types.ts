/**
 * Template System Type Definitions
 *
 * Defines the core data structures for the card template rendering engine,
 * note types, card templates, and rendering options used throughout the
 * multilingual flashcard application.
 */

// ---------------------------------------------------------------------------
// Note Type & Template Definitions
// ---------------------------------------------------------------------------

/**
 * The type of note, which determines how cards are generated.
 * - Standard: each card template generates one card.
 * - Cloze: one card per cloze deletion number found in the fields.
 */
export enum NoteTypeKind {
  Standard = 'standard',
  Cloze = 'cloze',
}

/**
 * A single card template within a note type.
 * A note type can have multiple card templates (e.g., Forward and Reverse).
 */
export interface CardTemplate {
  /** Ordinal position of this template within the note type (0-based). */
  ordinal: number;

  /** Human-readable name for this template (e.g., "Forward", "Reverse"). */
  name: string;

  /**
   * The front side template string.
   * Supports Mustache-like syntax: {{FieldName}}, {{#FieldName}}, etc.
   */
  frontTemplate: string;

  /**
   * The back side template string.
   * Supports {{FrontSide}} to include the rendered front.
   */
  backTemplate: string;

  /** Optional CSS applied to cards generated from this template. */
  css: string;
}

/**
 * Defines a field in a note type.
 */
export interface NoteField {
  /** Ordinal position of this field (0-based). */
  ordinal: number;

  /** Name of the field (used in templates as {{FieldName}}). */
  name: string;

  /** Whether this field is required (non-empty) for card generation. */
  required: boolean;

  /** Default font family for this field. */
  font: string;

  /** Default font size in pixels for this field. */
  fontSize: number;

  /** Whether this field uses RTL text direction. */
  rtl: boolean;

  /** Whether this field should be used for duplicate checking. */
  isUnique: boolean;

  /** Placeholder/description text for the field editor. */
  description: string;
}

/**
 * A note type defines the schema for a group of notes.
 * It contains fields (the data columns) and card templates (the views).
 */
export interface NoteType {
  /** Unique identifier. */
  id: string;

  /** Human-readable name (e.g., "Basic", "Cloze", "Arabic Vocab"). */
  name: string;

  /** The kind of note type (standard or cloze). */
  kind: NoteTypeKind;

  /** Ordered list of fields that notes of this type contain. */
  fields: NoteField[];

  /** Ordered list of card templates for rendering. */
  templates: CardTemplate[];

  /** Shared CSS applied to all cards of this note type. */
  css: string;

  /** Timestamp of creation. */
  createdAt: Date;

  /** Timestamp of last modification. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Note
// ---------------------------------------------------------------------------

/**
 * A note is a set of field values from which cards are generated.
 */
export interface Note {
  /** Unique identifier. */
  id: string;

  /** ID of the note type this note uses. */
  noteTypeId: string;

  /** ID of the deck that new cards from this note are placed into. */
  deckId: string;

  /** The field values, keyed by field name. */
  fields: Record<string, string>;

  /** Tag IDs associated with this note. */
  tags: string[];

  /** Timestamp of creation. */
  createdAt: Date;

  /** Timestamp of last modification. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Card Creation Data
// ---------------------------------------------------------------------------

/**
 * Data needed to create a card row in the database.
 * Produced by CardGenerator from a note + note type.
 */
export interface CardCreationData {
  /** The note this card belongs to. */
  noteId: string;

  /** The deck this card belongs to. */
  deckId: string;

  /** Template ordinal within the note type. */
  templateOrdinal: number;

  /**
   * For cloze note types, the cloze ordinal (1-based).
   * For standard note types, this is 0.
   */
  clozeOrdinal: number;

  /** Pre-rendered front HTML (optional, can be rendered on demand). */
  frontHtml?: string;

  /** Pre-rendered back HTML (optional, can be rendered on demand). */
  backHtml?: string;
}

// ---------------------------------------------------------------------------
// Render Options
// ---------------------------------------------------------------------------

/**
 * Options controlling the rendering behavior of the template engine.
 */
export interface RenderOptions {
  /** If rendering the back side, the pre-rendered front HTML for {{FrontSide}}. */
  frontHtml?: string;

  /**
   * For cloze note types, the active cloze ordinal (1-based).
   * Determines which cloze deletion is "active" (hidden on front, highlighted on back).
   */
  clozeOrdinal?: number;

  /** Whether to render cloze deletions showing the answer (back side). */
  showClozeAnswer?: boolean;

  /** Whether to render type-in-answer fields as inputs or as comparison results. */
  typeAnswerMode?: 'input' | 'compare';

  /** The user's typed answer, used when typeAnswerMode is 'compare'. */
  typedAnswer?: string;

  /** Side being rendered. Affects certain template directives. */
  side?: 'front' | 'back';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Result of validating a template string.
 */
export interface ValidationResult {
  /** Whether the template is valid. */
  valid: boolean;

  /** List of errors found, if any. */
  errors: ValidationError[];

  /** List of warnings (non-fatal issues). */
  warnings: ValidationWarning[];
}

/**
 * A specific validation error.
 */
export interface ValidationError {
  /** Type of error. */
  type: 'unknown_field' | 'unclosed_tag' | 'mismatched_conditional' | 'syntax_error';

  /** Human-readable error message. */
  message: string;

  /** Character position in the template where the error was detected. */
  position?: number;
}

/**
 * A non-fatal validation warning.
 */
export interface ValidationWarning {
  /** Type of warning. */
  type: 'empty_conditional' | 'unused_field' | 'deprecated_syntax';

  /** Human-readable warning message. */
  message: string;

  /** Character position in the template where the warning was detected. */
  position?: number;
}

// ---------------------------------------------------------------------------
// Deck (minimal definition for API layer)
// ---------------------------------------------------------------------------

/**
 * A deck that contains cards. Supports hierarchical nesting via parentId.
 */
export interface Deck {
  /** Unique identifier. */
  id: string;

  /** Human-readable name. */
  name: string;

  /** Parent deck ID, or null for root decks. */
  parentId: string | null;

  /** Description of the deck. */
  description: string;

  /** Timestamp of creation. */
  createdAt: Date;

  /** Timestamp of last modification. */
  updatedAt: Date;
}
