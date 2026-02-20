/**
 * types.ts -- Type definitions for the flashcard search engine.
 *
 * Defines tokens, AST nodes, SQL query structures, search results, and
 * configuration types used across the tokenizer, parser, SQL builder,
 * and search service modules.
 */

// ---------------------------------------------------------------------------
// Token Types
// ---------------------------------------------------------------------------

/**
 * Enumeration of all token types produced by the search query tokenizer.
 *
 * Each variant corresponds to a distinct syntactic element in the
 * Anki-compatible search language.
 */
export enum TokenType {
  /** Unquoted text search term (e.g., `dog`). */
  Text = 'Text',

  /** Double-quoted exact phrase (e.g., `"big dog"`). */
  QuotedText = 'QuotedText',

  /** Field-specific search (e.g., `front:dog`). */
  Field = 'Field',

  /** Tag filter (e.g., `tag:vocab` or `tag:language::arabic::*`). */
  Tag = 'Tag',

  /** Deck filter (e.g., `deck:spanish` or `deck:Languages::Arabic`). */
  Deck = 'Deck',

  /** Card state filter (e.g., `is:due`, `is:new`). */
  State = 'State',

  /** Flag filter (e.g., `flag:1` through `flag:7`, `flag:0` for no flag). */
  Flag = 'Flag',

  /** Numeric property comparison (e.g., `prop:ivl>=10`). */
  Property = 'Property',

  /** Date-relative filter (e.g., `added:7`, `rated:3:2`). */
  Date = 'Date',

  /** Regular expression search (e.g., `re:\d{3}` or `front:re:^the`). */
  Regex = 'Regex',

  /** Word-boundary search (e.g., `w:dog`). */
  WordBoundary = 'WordBoundary',

  /** Accent/diacritic-insensitive search (e.g., `nc:uber` matches "uber"). */
  AccentInsensitive = 'AccentInsensitive',

  /** Implicit AND operator (space between terms) or explicit AND keyword. */
  And = 'And',

  /** Explicit OR operator. */
  Or = 'Or',

  /** Negation operator (NOT keyword or `-` prefix). */
  Not = 'Not',

  /** Left parenthesis for grouping. */
  LeftParen = 'LeftParen',

  /** Right parenthesis for grouping. */
  RightParen = 'RightParen',

  /** End-of-input sentinel. */
  EOF = 'EOF',
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/**
 * A single token produced by the search query tokenizer.
 *
 * Depending on `type`, different optional fields are populated:
 * - `field` is set for Field, Regex (field-specific), and similar tokens.
 * - `operator` is set for Property tokens (`>=`, `<=`, `>`, `<`, `=`).
 * - `numValue` is set for Property and Flag tokens.
 * - `rating` is set for Date tokens with a rating qualifier.
 */
export interface Token {
  /** Discriminator identifying the token variant. */
  type: TokenType;

  /** The raw or parsed string value carried by the token. */
  value: string;

  /** For field-specific tokens, the field name (e.g., `"front"`). */
  field?: string;

  /** For Property tokens, the comparison operator. */
  operator?: string;

  /** For numeric tokens (Property, Flag), the parsed numeric value. */
  numValue?: number;

  /** For rated Date tokens, the optional rating qualifier (1-4). */
  rating?: number;

  /** For Date tokens, the date type (`added` or `rated`). */
  dateType?: 'added' | 'rated';

  /** For Date tokens, the number of days. */
  days?: number;
}

// ---------------------------------------------------------------------------
// AST Nodes
// ---------------------------------------------------------------------------

/** Text search node -- searches all fields or a specific field. */
export interface TextNode {
  type: 'text';
  /** The search term. */
  value: string;
  /** Optional field name to restrict the search. */
  field?: string;
}

/** Tag search node with glob/wildcard pattern support. */
export interface TagNode {
  type: 'tag';
  /** Tag pattern, possibly with `::` hierarchy and `*` wildcard. */
  pattern: string;
}

/** Deck search node with hierarchical path support. */
export interface DeckNode {
  type: 'deck';
  /** Deck name or hierarchical path (e.g., `Languages::Arabic`). */
  pattern: string;
}

/** Card state filter node. */
export interface StateNode {
  type: 'state';
  /** The specific card state to filter by. */
  state: 'due' | 'new' | 'learning' | 'review' | 'paused' | 'skipped';
}

/** Flag filter node. */
export interface FlagNode {
  type: 'flag';
  /** Flag number (0 = no flag, 1-7 = colored flags). */
  value: number;
}

/** Numeric property comparison node. */
export interface PropertyNode {
  type: 'property';
  /** The property name (e.g., `ivl`, `lapses`, `ease`, `reps`, `stability`, `retrievability`, `difficulty`). */
  property: string;
  /** Comparison operator: `>=`, `<=`, `>`, `<`, or `=`. */
  operator: string;
  /** The numeric value to compare against. */
  value: number;
}

/** Date-relative filter node. */
export interface DateNode {
  type: 'date';
  /** Whether this filters by creation date or review date. */
  dateType: 'added' | 'rated';
  /** Number of days to look back. */
  days: number;
  /** Optional rating qualifier for `rated` searches (1=Again, 2=Hard, 3=Good, 4=Easy). */
  rating?: number;
}

/** Regular expression search node. */
export interface RegexNode {
  type: 'regex';
  /** The regex pattern string. */
  pattern: string;
  /** Optional field to restrict the regex search. */
  field?: string;
}

/** Word-boundary search node (matches whole words only). */
export interface WordBoundaryNode {
  type: 'wordBoundary';
  /** The word to match with boundary constraints. */
  value: string;
}

/** Accent/diacritic-insensitive search node. */
export interface AccentInsensitiveNode {
  type: 'accentInsensitive';
  /** The search term (diacritics are stripped before matching). */
  value: string;
}

/** Boolean AND conjunction node. */
export interface AndNode {
  type: 'and';
  /** Left operand. */
  left: ASTNode;
  /** Right operand. */
  right: ASTNode;
}

/** Boolean OR disjunction node. */
export interface OrNode {
  type: 'or';
  /** Left operand. */
  left: ASTNode;
  /** Right operand. */
  right: ASTNode;
}

/** Boolean NOT negation node. */
export interface NotNode {
  type: 'not';
  /** The operand to negate. */
  operand: ASTNode;
}

/**
 * Discriminated union of all AST node types.
 *
 * The parser produces a tree of these nodes from a tokenized search query.
 * The SQL builder traverses this tree to produce parameterized PostgreSQL.
 */
export type ASTNode =
  | TextNode
  | TagNode
  | DeckNode
  | StateNode
  | FlagNode
  | PropertyNode
  | DateNode
  | RegexNode
  | WordBoundaryNode
  | AccentInsensitiveNode
  | AndNode
  | OrNode
  | NotNode;

// ---------------------------------------------------------------------------
// SQL Query
// ---------------------------------------------------------------------------

/**
 * A parameterized SQL query fragment produced by the SQL builder.
 *
 * The `where` clause uses positional `$N` parameters to prevent injection.
 * The `joins` array lists any additional JOIN clauses required (e.g., for
 * tag or deck searches).
 */
export interface SQLQuery {
  /** The WHERE clause (without the leading `WHERE` keyword). */
  where: string;

  /** Ordered array of parameter values corresponding to `$1`, `$2`, ... */
  params: unknown[];

  /** Additional JOIN clauses needed by the query. */
  joins: string[];
}

// ---------------------------------------------------------------------------
// Database Entity Interfaces (aligned with schema.sql)
// ---------------------------------------------------------------------------

/**
 * A card record as represented in the database `cards` table.
 */
export interface Card {
  id: string;
  noteId: string;
  deckId: string;
  templateOrdinal: number;
  status: 'active' | 'paused' | 'skipped_today';
  cardType: 'new' | 'learning' | 'review' | 'relearning';
  due: Date | null;
  intervalDays: number;
  stability: number;
  difficulty: number;
  lastReviewAt: Date | null;
  reps: number;
  lapses: number;
  flag: number;
  pausedAt: Date | null;
  pausedBy: string | null;
  resumeDate: Date | null;
  pauseReason: string | null;
  customData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A note record as represented in the database `notes` table.
 */
export interface Note {
  id: string;
  userId: string;
  noteTypeId: string;
  fields: Record<string, string>;
  sortFieldValue: string | null;
  firstFieldChecksum: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A note type record as represented in the database `note_types` table.
 */
export interface NoteType {
  id: string;
  userId: string;
  name: string;
  fields: NoteTypeField[];
  cardTemplates: CardTemplate[];
  css: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A single field definition within a note type. */
export interface NoteTypeField {
  name: string;
  type: string;
  sortOrder: number;
  isRtl: boolean;
  fontFamily: string;
}

/** A card template definition within a note type. */
export interface CardTemplate {
  name: string;
  frontHtml: string;
  backHtml: string;
}

/**
 * A deck record as represented in the database `decks` table.
 */
export interface Deck {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  presetId: string | null;
  description: string;
  isFiltered: boolean;
  filterQuery: string | null;
  position: number;
  createdAt: Date;
}

/**
 * A tag record as represented in the database `tags` table.
 */
export interface Tag {
  id: string;
  userId: string;
  name: string;
  slug: string;
  parentId: string | null;
  color: string;
  icon: string;
  description: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Search Results
// ---------------------------------------------------------------------------

/**
 * A single result row combining a card with its related entities.
 */
export interface CardWithNote {
  /** The card record. */
  card: Card;

  /** The note that generated this card. */
  note: Note;

  /** The note type (field definitions + templates). */
  noteType: NoteType;

  /** The deck this card belongs to. */
  deck: Deck;

  /** Tags associated with the parent note. */
  tags: Tag[];

  /** Human-readable flag color, or null if flag is 0. */
  flagColor: string | null;
}

/**
 * Paginated search result returned by {@link SearchService.search}.
 */
export interface SearchResult {
  /** The matching cards (with related note, deck, tags). */
  cards: CardWithNote[];

  /** Total number of results matching the query (ignoring pagination). */
  totalCount: number;

  /** Current page number (1-based). */
  page: number;

  /** Number of results per page. */
  pageSize: number;
}

/**
 * Options controlling how search results are retrieved and ordered.
 */
export interface SearchOptions {
  /** Page number (1-based). Defaults to 1. */
  page?: number;

  /** Results per page. Defaults to 50. */
  pageSize?: number;

  /** Column to sort by. Defaults to `'c.created_at'`. */
  sortBy?: string;

  /** Sort direction. Defaults to `'desc'`. */
  sortDirection?: 'asc' | 'desc';

  /** Whether to return individual cards or group by note. Defaults to `'cards'`. */
  mode?: 'cards' | 'notes';
}

/**
 * Descriptor for a column that can be used for sorting search results.
 */
export interface SortColumn {
  /** Internal column identifier. */
  key: string;

  /** Human-readable label for the UI. */
  label: string;

  /** The SQL expression used in the ORDER BY clause. */
  sqlExpression: string;
}

/**
 * A group of duplicate notes sharing the same field value.
 */
export interface DuplicateGroup {
  /** The shared field value. */
  fieldValue: string;

  /** Note IDs in this duplicate group. */
  noteIds: string[];

  /** Number of duplicates. */
  count: number;
}

// ---------------------------------------------------------------------------
// Search Errors
// ---------------------------------------------------------------------------

/**
 * Custom error class for search query syntax errors.
 *
 * Provides a human-readable message describing what went wrong and where.
 */
export class SearchSyntaxError extends Error {
  /** Character position in the query where the error was detected. */
  public readonly position: number;

  /** The original query string. */
  public readonly query: string;

  constructor(message: string, query: string, position: number) {
    super(message);
    this.name = 'SearchSyntaxError';
    this.query = query;
    this.position = position;
  }
}

// ---------------------------------------------------------------------------
// Flag Color Mapping
// ---------------------------------------------------------------------------

/**
 * Maps flag numbers (1-7) to human-readable color names.
 *
 * Flag 0 means "no flag" and maps to null.
 */
export const FLAG_COLORS: Record<number, string | null> = {
  0: null,
  1: 'red',
  2: 'orange',
  3: 'green',
  4: 'blue',
  5: 'pink',
  6: 'turquoise',
  7: 'purple',
};

// ---------------------------------------------------------------------------
// Sortable Columns
// ---------------------------------------------------------------------------

/**
 * All columns available for sorting search results.
 */
export const SORTABLE_COLUMNS: SortColumn[] = [
  { key: 'created', label: 'Date Created', sqlExpression: 'c.created_at' },
  { key: 'updated', label: 'Date Updated', sqlExpression: 'c.updated_at' },
  { key: 'due', label: 'Due Date', sqlExpression: 'c.due' },
  { key: 'interval', label: 'Interval', sqlExpression: 'c.interval_days' },
  { key: 'stability', label: 'Stability', sqlExpression: 'c.stability' },
  { key: 'difficulty', label: 'Difficulty', sqlExpression: 'c.difficulty' },
  { key: 'reps', label: 'Reviews', sqlExpression: 'c.reps' },
  { key: 'lapses', label: 'Lapses', sqlExpression: 'c.lapses' },
  { key: 'flag', label: 'Flag', sqlExpression: 'c.flag' },
  { key: 'cardType', label: 'Card Type', sqlExpression: 'c.card_type' },
  { key: 'deck', label: 'Deck', sqlExpression: 'd.name' },
  { key: 'sortField', label: 'Sort Field', sqlExpression: 'n.sort_field_value' },
];

// ---------------------------------------------------------------------------
// Rating Mapping for Date Searches
// ---------------------------------------------------------------------------

/**
 * Maps numeric rating qualifiers in `rated:N:R` syntax to database values.
 */
export const RATING_MAP: Record<number, string> = {
  1: 'again',
  2: 'hard',
  3: 'good',
  4: 'easy',
};
