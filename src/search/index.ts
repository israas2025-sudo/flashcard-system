/**
 * index.ts -- Barrel export for the search engine module.
 *
 * Re-exports all public types, functions, and classes from the search
 * subsystem for convenient single-path imports.
 *
 * @example
 * ```ts
 * import {
 *   SearchService,
 *   tokenize,
 *   parse,
 *   buildSQL,
 *   TokenType,
 *   SearchSyntaxError,
 * } from '../search';
 * ```
 */

// -- Types ------------------------------------------------------------------
export {
  // Token system
  TokenType,
  type Token,

  // AST nodes
  type ASTNode,
  type TextNode,
  type TagNode,
  type DeckNode,
  type StateNode,
  type FlagNode,
  type PropertyNode,
  type DateNode,
  type RegexNode,
  type WordBoundaryNode,
  type AccentInsensitiveNode,
  type AndNode,
  type OrNode,
  type NotNode,

  // SQL
  type SQLQuery,

  // Database entities
  type Card,
  type Note,
  type NoteType,
  type NoteTypeField,
  type CardTemplate,
  type Deck,
  type Tag,

  // Search results
  type CardWithNote,
  type SearchResult,
  type SearchOptions,
  type SortColumn,
  type DuplicateGroup,

  // Constants
  FLAG_COLORS,
  SORTABLE_COLUMNS,
  RATING_MAP,

  // Errors
  SearchSyntaxError,
} from './types';

// -- Tokenizer --------------------------------------------------------------
export { tokenize } from './tokenizer';

// -- Parser -----------------------------------------------------------------
export { parse } from './parser';

// -- SQL Builder ------------------------------------------------------------
export { buildSQL } from './sql-builder';

// -- Search Service ---------------------------------------------------------
export { SearchService, type DatabasePool } from './search-service';
