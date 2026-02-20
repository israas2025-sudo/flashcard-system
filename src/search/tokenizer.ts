/**
 * tokenizer.ts -- Lexical analysis for Anki-compatible search queries.
 *
 * Converts a raw search query string into an ordered array of {@link Token}
 * objects. The tokenizer handles:
 *
 * - Simple unquoted text terms (`dog`)
 * - Double-quoted exact phrases (`"big dog"`)
 * - Field-specific searches (`front:dog`)
 * - Tag filters with hierarchy and wildcards (`tag:language::arabic::*`)
 * - Deck filters with hierarchy (`deck:Languages::Arabic`)
 * - State filters (`is:due`, `is:new`, `is:learning`, `is:review`, `is:paused`, `is:buried`)
 * - Flag filters (`flag:0` through `flag:7`)
 * - Numeric property comparisons (`prop:ivl>=10`, `prop:ease<2.0`)
 * - Date-relative filters (`added:7`, `rated:1`, `rated:3:2`)
 * - Regular expressions (`re:\d{3}`, `front:re:^the`)
 * - Word-boundary searches (`w:dog`)
 * - Accent-insensitive searches (`nc:uber`)
 * - Boolean operators (AND, OR, NOT / `-` prefix)
 * - Parentheses for grouping
 *
 * Implicit AND is inserted between adjacent terms where no explicit
 * operator is present.
 *
 * @example
 * ```ts
 * import { tokenize } from './tokenizer';
 *
 * const tokens = tokenize('(tag:vocab OR tag:grammar) deck:arabic -is:paused');
 * // Produces: LeftParen, Tag, Or, Tag, RightParen, And, Deck, And, Not, State, EOF
 * ```
 */

import { Token, TokenType, SearchSyntaxError } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Valid state values for `is:` searches. */
const VALID_STATES = new Set(['due', 'new', 'learning', 'review', 'paused', 'buried', 'skipped']);

/** Property names recognised by `prop:` searches. */
const VALID_PROPERTIES = new Set(['ivl', 'lapses', 'ease', 'reps', 'stability', 'retrievability', 'difficulty']);

/** Comparison operators for property searches, ordered longest-first for greedy matching. */
const COMPARISON_OPERATORS = ['>=', '<=', '!=', '>', '<', '='];

/** Known field prefixes that trigger a `Field` token rather than plain text. */
const KNOWN_PREFIXES = new Set([
  'tag', 'deck', 'is', 'flag', 'prop', 'added', 'rated', 're', 'w', 'nc',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Tokenize a search query string into an array of tokens.
 *
 * The returned array always ends with a single {@link TokenType.EOF} token.
 * Implicit {@link TokenType.And} tokens are inserted between adjacent terms
 * that lack an explicit boolean operator.
 *
 * @param query - The raw search query string.
 * @returns An array of tokens ready for parsing.
 * @throws {SearchSyntaxError} If the query contains unrecoverable syntax errors
 *         (e.g., unclosed quotes).
 */
export function tokenize(query: string): Token[] {
  const rawTokens = lexQuery(query);
  const withImplicitAnd = insertImplicitAnd(rawTokens);
  withImplicitAnd.push({ type: TokenType.EOF, value: '' });
  return withImplicitAnd;
}

// ---------------------------------------------------------------------------
// Lexer Implementation
// ---------------------------------------------------------------------------

/**
 * Core lexer that scans the query string character by character and
 * produces raw tokens (without implicit AND insertion).
 *
 * @param query - The raw query string.
 * @returns Array of tokens (no EOF appended yet).
 */
function lexQuery(query: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < query.length) {
    // Skip whitespace (but whitespace is significant for implicit AND later)
    if (isWhitespace(query[pos])) {
      pos++;
      continue;
    }

    // Parentheses
    if (query[pos] === '(') {
      tokens.push({ type: TokenType.LeftParen, value: '(' });
      pos++;
      continue;
    }
    if (query[pos] === ')') {
      tokens.push({ type: TokenType.RightParen, value: ')' });
      pos++;
      continue;
    }

    // NOT prefix via '-'
    if (query[pos] === '-' && pos + 1 < query.length && !isWhitespace(query[pos + 1])) {
      // Peek ahead: only treat '-' as NOT if it is not part of a number
      // and is followed by a non-whitespace char.
      tokens.push({ type: TokenType.Not, value: '-' });
      pos++;
      continue;
    }

    // Quoted text
    if (query[pos] === '"') {
      const result = readQuotedString(query, pos);
      tokens.push({ type: TokenType.QuotedText, value: result.value });
      pos = result.end;
      continue;
    }

    // Read the next word (up to whitespace, parens, or end)
    const wordResult = readWord(query, pos);
    const word = wordResult.value;
    pos = wordResult.end;

    // Boolean keywords
    if (word === 'AND') {
      tokens.push({ type: TokenType.And, value: 'AND' });
      continue;
    }
    if (word === 'OR') {
      tokens.push({ type: TokenType.Or, value: 'OR' });
      continue;
    }
    if (word === 'NOT') {
      tokens.push({ type: TokenType.Not, value: 'NOT' });
      continue;
    }

    // Try to parse prefixed tokens (tag:, deck:, is:, flag:, prop:, added:, rated:, re:, w:, nc:, field:)
    const prefixToken = tryParsePrefixed(word, query, pos);
    if (prefixToken) {
      tokens.push(prefixToken);
      continue;
    }

    // Plain text term
    tokens.push({ type: TokenType.Text, value: word });
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Prefix Token Parsing
// ---------------------------------------------------------------------------

/**
 * Attempts to parse a word as a prefixed token (e.g., `tag:vocab`, `prop:ivl>=10`).
 *
 * @param word - The complete word to analyse.
 * @param query - The full query string (for error reporting).
 * @param pos - Current position after the word (for error reporting).
 * @returns A Token if the word matches a known prefix pattern, or null.
 */
function tryParsePrefixed(word: string, _query: string, _pos: number): Token | null {
  const colonIdx = word.indexOf(':');
  if (colonIdx === -1) {
    return null;
  }

  const prefix = word.substring(0, colonIdx).toLowerCase();
  const rest = word.substring(colonIdx + 1);

  switch (prefix) {
    case 'tag':
      return { type: TokenType.Tag, value: rest };

    case 'deck':
      return { type: TokenType.Deck, value: rest };

    case 'is':
      return parseStateToken(rest);

    case 'flag':
      return parseFlagToken(rest);

    case 'prop':
      return parsePropertyToken(rest);

    case 'added':
      return parseDateToken('added', rest);

    case 'rated':
      return parseDateToken('rated', rest);

    case 're':
      return { type: TokenType.Regex, value: rest };

    case 'w':
      return { type: TokenType.WordBoundary, value: rest };

    case 'nc':
      return { type: TokenType.AccentInsensitive, value: rest };

    default: {
      // Check for field-specific regex (e.g., `front:re:^the`)
      if (rest.startsWith('re:')) {
        return {
          type: TokenType.Regex,
          value: rest.substring(3),
          field: prefix,
        };
      }

      // Check for field-specific quoted text (e.g., `front:"big dog"`)
      // This is already handled because quotes break word boundaries, so
      // the field prefix would be `front:` and the quoted text is separate.
      // However, if the user writes `front:somevalue`, treat as field search.
      if (!KNOWN_PREFIXES.has(prefix)) {
        return {
          type: TokenType.Field,
          value: rest,
          field: prefix,
        };
      }

      return null;
    }
  }
}

/**
 * Parse an `is:STATE` token.
 *
 * @param stateStr - The state string after `is:`.
 * @returns A State token.
 * @throws {SearchSyntaxError} if the state is not recognised.
 */
function parseStateToken(stateStr: string): Token {
  const normalized = stateStr.toLowerCase();

  // Map 'buried' to 'skipped' (Anki compat)
  const mapped = normalized === 'buried' ? 'skipped' : normalized;

  if (!VALID_STATES.has(normalized)) {
    throw new SearchSyntaxError(
      `Unknown state "${stateStr}". Valid states: ${[...VALID_STATES].join(', ')}`,
      stateStr,
      0,
    );
  }

  return {
    type: TokenType.State,
    value: mapped,
  };
}

/**
 * Parse a `flag:N` token.
 *
 * @param flagStr - The string after `flag:`.
 * @returns A Flag token.
 * @throws {SearchSyntaxError} if the flag value is invalid.
 */
function parseFlagToken(flagStr: string): Token {
  const num = parseInt(flagStr, 10);

  if (isNaN(num) || num < 0 || num > 7) {
    throw new SearchSyntaxError(
      `Invalid flag value "${flagStr}". Must be 0-7.`,
      flagStr,
      0,
    );
  }

  return {
    type: TokenType.Flag,
    value: flagStr,
    numValue: num,
  };
}

/**
 * Parse a `prop:PROPERTY OPERATOR VALUE` token.
 *
 * Expects format like `ivl>=10`, `ease<2.0`, `lapses>3`.
 *
 * @param propStr - The string after `prop:`.
 * @returns A Property token.
 * @throws {SearchSyntaxError} if the property format is invalid.
 */
function parsePropertyToken(propStr: string): Token {
  // Find the comparison operator
  let opIdx = -1;
  let operator = '';

  for (const op of COMPARISON_OPERATORS) {
    const idx = propStr.indexOf(op);
    if (idx !== -1) {
      // Make sure this is the actual operator position (after property name)
      if (opIdx === -1 || idx < opIdx) {
        opIdx = idx;
        operator = op;
      }
    }
  }

  if (opIdx === -1) {
    throw new SearchSyntaxError(
      `Invalid property syntax "${propStr}". Expected format: prop:name>=value`,
      propStr,
      0,
    );
  }

  const propName = propStr.substring(0, opIdx).toLowerCase();
  const valueStr = propStr.substring(opIdx + operator.length);
  const numValue = parseFloat(valueStr);

  if (!VALID_PROPERTIES.has(propName)) {
    throw new SearchSyntaxError(
      `Unknown property "${propName}". Valid properties: ${[...VALID_PROPERTIES].join(', ')}`,
      propStr,
      0,
    );
  }

  if (isNaN(numValue)) {
    throw new SearchSyntaxError(
      `Invalid numeric value "${valueStr}" in property comparison.`,
      propStr,
      0,
    );
  }

  return {
    type: TokenType.Property,
    value: propName,
    operator,
    numValue,
  };
}

/**
 * Parse an `added:N` or `rated:N` or `rated:N:R` date token.
 *
 * @param dateType - Either `'added'` or `'rated'`.
 * @param dateStr - The string after the prefix (e.g., `"7"` or `"3:2"`).
 * @returns A Date token.
 * @throws {SearchSyntaxError} if the date format is invalid.
 */
function parseDateToken(dateType: 'added' | 'rated', dateStr: string): Token {
  const parts = dateStr.split(':');
  const days = parseInt(parts[0], 10);

  if (isNaN(days) || days < 0) {
    throw new SearchSyntaxError(
      `Invalid day count "${parts[0]}" in ${dateType}: search. Must be a non-negative integer.`,
      dateStr,
      0,
    );
  }

  let rating: number | undefined;

  if (parts.length > 1 && dateType === 'rated') {
    rating = parseInt(parts[1], 10);
    if (isNaN(rating) || rating < 1 || rating > 4) {
      throw new SearchSyntaxError(
        `Invalid rating "${parts[1]}" in rated: search. Must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy).`,
        dateStr,
        0,
      );
    }
  }

  return {
    type: TokenType.Date,
    value: dateStr,
    dateType,
    days,
    rating,
  };
}

// ---------------------------------------------------------------------------
// Character-Level Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a character is whitespace.
 */
function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/**
 * Check if a character is a word boundary (terminates a word).
 */
function isWordBoundary(ch: string): boolean {
  return isWhitespace(ch) || ch === '(' || ch === ')';
}

/**
 * Read a double-quoted string from the query.
 *
 * Handles escaped quotes (`\"`) within the string.
 *
 * @param query - The full query string.
 * @param start - Position of the opening double-quote.
 * @returns The unquoted string value and the position after the closing quote.
 * @throws {SearchSyntaxError} if the closing quote is missing.
 */
function readQuotedString(query: string, start: number): { value: string; end: number } {
  let pos = start + 1; // skip opening quote
  let value = '';

  while (pos < query.length) {
    if (query[pos] === '\\' && pos + 1 < query.length && query[pos + 1] === '"') {
      value += '"';
      pos += 2;
      continue;
    }

    if (query[pos] === '"') {
      return { value, end: pos + 1 };
    }

    value += query[pos];
    pos++;
  }

  // Unclosed quote -- be lenient and treat everything after the opening quote
  // as the value rather than throwing.
  throw new SearchSyntaxError(
    'Unclosed double quote. Add a closing `"` to complete the quoted phrase.',
    query,
    start,
  );
}

/**
 * Read a word (non-whitespace, non-paren sequence) from the query.
 *
 * Words may contain colons, operators, and other punctuation.
 * Quoted strings embedded in a word (e.g., `front:"big dog"`) are consumed
 * as part of the word.
 *
 * @param query - The full query string.
 * @param start - Position of the first character.
 * @returns The word value and the position after the last character.
 */
function readWord(query: string, start: number): { value: string; end: number } {
  let pos = start;
  let value = '';

  while (pos < query.length && !isWordBoundary(query[pos])) {
    // Handle embedded quoted strings within a word (e.g., front:"big dog")
    if (query[pos] === '"') {
      const quoted = readQuotedString(query, pos);
      value += quoted.value;
      pos = quoted.end;
      continue;
    }

    value += query[pos];
    pos++;
  }

  return { value, end: pos };
}

// ---------------------------------------------------------------------------
// Implicit AND Insertion
// ---------------------------------------------------------------------------

/**
 * Token types that can appear on the LEFT side of an implicit AND.
 * These are "value-like" tokens that, when followed by another value-like
 * token, need an AND between them.
 */
function isValueToken(type: TokenType): boolean {
  return (
    type === TokenType.Text ||
    type === TokenType.QuotedText ||
    type === TokenType.Field ||
    type === TokenType.Tag ||
    type === TokenType.Deck ||
    type === TokenType.State ||
    type === TokenType.Flag ||
    type === TokenType.Property ||
    type === TokenType.Date ||
    type === TokenType.Regex ||
    type === TokenType.WordBoundary ||
    type === TokenType.AccentInsensitive ||
    type === TokenType.RightParen
  );
}

/**
 * Token types that can appear on the RIGHT side of an implicit AND.
 */
function canStartExpression(type: TokenType): boolean {
  return (
    type === TokenType.Text ||
    type === TokenType.QuotedText ||
    type === TokenType.Field ||
    type === TokenType.Tag ||
    type === TokenType.Deck ||
    type === TokenType.State ||
    type === TokenType.Flag ||
    type === TokenType.Property ||
    type === TokenType.Date ||
    type === TokenType.Regex ||
    type === TokenType.WordBoundary ||
    type === TokenType.AccentInsensitive ||
    type === TokenType.LeftParen ||
    type === TokenType.Not
  );
}

/**
 * Insert implicit AND tokens between adjacent terms where no explicit
 * boolean operator separates them.
 *
 * For example: `tag:vocab deck:arabic` becomes `tag:vocab AND deck:arabic`.
 *
 * @param tokens - Raw token array from the lexer.
 * @returns New array with implicit AND tokens inserted.
 */
function insertImplicitAnd(tokens: Token[]): Token[] {
  if (tokens.length === 0) {
    return [];
  }

  const result: Token[] = [tokens[0]];

  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1];
    const curr = tokens[i];

    // Insert AND if previous token is a value/RParen and current can start an expression,
    // and neither is already a boolean operator.
    if (isValueToken(prev.type) && canStartExpression(curr.type)) {
      result.push({ type: TokenType.And, value: 'AND' });
    }

    result.push(curr);
  }

  return result;
}
