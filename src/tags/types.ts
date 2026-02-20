/**
 * Tag System Type Definitions
 *
 * Defines the core data structures for the hierarchical tagging system
 * used in the multilingual flashcard application. Tags support nesting,
 * color-coding, and association with notes/cards.
 */

/**
 * Represents a single tag in the system.
 * Tags are organized in a tree hierarchy via parentId references.
 */
export interface Tag {
  /** Unique identifier (UUID v4) */
  id: string;

  /** ID of the user who owns this tag */
  userId: string;

  /** Human-readable display name (e.g., "Classical Arabic") */
  name: string;

  /**
   * URL-safe slug derived from the name (e.g., "classical-arabic").
   * Unique per user within the same parent scope.
   */
  slug: string;

  /** ID of the parent tag, or null if this is a root-level tag */
  parentId: string | null;

  /** Hex color code for visual identification (e.g., "#3B82F6") */
  color: string;

  /** Icon identifier or emoji for visual display */
  icon: string;

  /** Optional longer description of the tag's purpose */
  description: string;

  /** Timestamp when the tag was created */
  createdAt: Date;
}

/**
 * Extended tag node used when building the full tag tree.
 * Includes recursive children, aggregated card counts, and depth info.
 */
export interface TagTreeNode extends Tag {
  /** Direct child tags, each also a TagTreeNode */
  children: TagTreeNode[];

  /** Number of cards (notes) associated with this tag */
  cardCount: number;

  /** Depth in the tree (0 = root level) */
  depth: number;
}

/**
 * A saved preset combining tags and decks for quick filtering.
 * Users can save frequently used tag+deck combinations for one-click access.
 */
export interface TagPreset {
  /** Unique identifier for the preset */
  id: string;

  /** Display name for the preset (e.g., "Arabic Grammar Review") */
  name: string;

  /** Array of tag IDs included in this preset */
  tagIds: string[];

  /** Array of deck IDs included in this preset */
  deckIds: string[];

  /** Optional description of what this preset is for */
  description: string;
}

/**
 * Flat row returned from the recursive CTE query before tree assembly.
 * Used internally by TagService.getTagTree().
 */
export interface TagTreeRow extends Tag {
  /** Depth in the hierarchy (0 = root) */
  depth: number;

  /** Number of cards associated with this specific tag */
  cardCount: number;
}

/**
 * Represents a row in the note_tags junction table.
 */
export interface NoteTag {
  /** ID of the note being tagged */
  noteId: string;

  /** ID of the tag applied to the note */
  tagId: string;

  /** Timestamp when the association was created */
  createdAt: Date;
}

/**
 * Minimal card representation returned from tag-based queries.
 * Avoids importing the full Card type from other modules.
 */
export interface Card {
  /** Unique card identifier */
  id: string;

  /** ID of the note this card belongs to */
  noteId: string;

  /** ID of the deck containing this card */
  deckId: string;

  /** Front content of the card (for display/preview) */
  front: string;

  /** Back content of the card */
  back: string;

  /** Current scheduling queue: 0=new, 1=learning, 2=review */
  queue: number;

  /** Whether the card is currently paused/suspended */
  suspended: boolean;
}
