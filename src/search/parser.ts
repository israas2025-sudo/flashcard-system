/**
 * parser.ts -- Recursive descent parser for search query ASTs.
 *
 * Converts a flat array of {@link Token} objects (produced by the tokenizer)
 * into a tree of {@link ASTNode} objects suitable for SQL generation.
 *
 * **Operator precedence** (highest to lowest):
 * 1. NOT  (prefix unary)
 * 2. AND  (implicit space or explicit AND)
 * 3. OR   (explicit OR keyword)
 *
 * Parentheses override precedence.
 *
 * @example
 * ```ts
 * import { tokenize } from './tokenizer';
 * import { parse } from './parser';
 *
 * const tokens = tokenize('(tag:vocab OR tag:grammar) deck:arabic');
 * const ast = parse(tokens);
 * // Produces:
 * // {
 * //   type: 'and',
 * //   left: {
 * //     type: 'or',
 * //     left:  { type: 'tag', pattern: 'vocab' },
 * //     right: { type: 'tag', pattern: 'grammar' },
 * //   },
 * //   right: { type: 'deck', pattern: 'arabic' },
 * // }
 * ```
 */

import {
  Token,
  TokenType,
  ASTNode,
  SearchSyntaxError,
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a token array into an AST.
 *
 * The token array must end with a {@link TokenType.EOF} sentinel.
 *
 * @param tokens - Tokens produced by {@link tokenize}.
 * @returns The root AST node representing the entire query.
 * @throws {SearchSyntaxError} On syntax errors (mismatched parens, unexpected tokens).
 */
export function parse(tokens: Token[]): ASTNode {
  const parser = new Parser(tokens);
  const ast = parser.parseExpression();

  // Ensure we consumed all tokens (except EOF)
  if (parser.peek().type !== TokenType.EOF) {
    const unexpected = parser.peek();
    throw new SearchSyntaxError(
      `Unexpected token "${unexpected.value}" after complete expression.`,
      unexpected.value,
      0,
    );
  }

  return ast;
}

// ---------------------------------------------------------------------------
// Parser Implementation
// ---------------------------------------------------------------------------

/**
 * Recursive descent parser with three precedence levels:
 *
 * ```
 * expression  = orExpr
 * orExpr      = andExpr ( OR andExpr )*
 * andExpr     = notExpr ( AND notExpr )*
 * notExpr     = NOT notExpr | primary
 * primary     = '(' expression ')' | atom
 * atom        = text | quotedText | field | tag | deck | state | flag
 *             | property | date | regex | wordBoundary | accentInsensitive
 * ```
 */
class Parser {
  /** Token stream. */
  private readonly tokens: Token[];

  /** Current position in the token stream. */
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // -------------------------------------------------------------------------
  // Token Stream Helpers
  // -------------------------------------------------------------------------

  /**
   * Return the current token without advancing.
   */
  peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '' };
  }

  /**
   * Return the current token and advance to the next.
   */
  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token ?? { type: TokenType.EOF, value: '' };
  }

  /**
   * If the current token matches the given type, consume and return it.
   * Otherwise, return null without advancing.
   */
  private match(type: TokenType): Token | null {
    if (this.peek().type === type) {
      return this.advance();
    }
    return null;
  }

  /**
   * Consume a token of the expected type, or throw a syntax error.
   */
  private expect(type: TokenType, context: string): Token {
    const token = this.match(type);
    if (!token) {
      const actual = this.peek();
      throw new SearchSyntaxError(
        `Expected ${type} ${context}, but found ${actual.type} ("${actual.value}").`,
        actual.value,
        0,
      );
    }
    return token;
  }

  // -------------------------------------------------------------------------
  // Grammar Rules
  // -------------------------------------------------------------------------

  /**
   * Top-level expression: OR precedence.
   *
   * ```
   * expression = orExpr
   * ```
   */
  parseExpression(): ASTNode {
    return this.parseOrExpression();
  }

  /**
   * OR expression (lowest precedence).
   *
   * ```
   * orExpr = andExpr ( OR andExpr )*
   * ```
   */
  private parseOrExpression(): ASTNode {
    let left = this.parseAndExpression();

    while (this.peek().type === TokenType.Or) {
      this.advance(); // consume OR
      const right = this.parseAndExpression();
      left = { type: 'or', left, right };
    }

    return left;
  }

  /**
   * AND expression (middle precedence).
   *
   * ```
   * andExpr = notExpr ( AND notExpr )*
   * ```
   */
  private parseAndExpression(): ASTNode {
    let left = this.parseNotExpression();

    while (this.peek().type === TokenType.And) {
      this.advance(); // consume AND
      const right = this.parseNotExpression();
      left = { type: 'and', left, right };
    }

    return left;
  }

  /**
   * NOT expression (highest precedence, prefix unary).
   *
   * ```
   * notExpr = NOT notExpr | primary
   * ```
   */
  private parseNotExpression(): ASTNode {
    if (this.peek().type === TokenType.Not) {
      this.advance(); // consume NOT / '-'

      // Handle implicit AND after NOT if present
      // (NOT is tightly bound, so we recurse into notExpr, not andExpr)
      const operand = this.parseNotExpression();
      return { type: 'not', operand };
    }

    return this.parsePrimary();
  }

  /**
   * Primary expression: parenthesised group or atomic leaf.
   *
   * ```
   * primary = '(' expression ')' | atom
   * ```
   */
  private parsePrimary(): ASTNode {
    if (this.peek().type === TokenType.LeftParen) {
      this.advance(); // consume '('
      const expr = this.parseExpression();
      this.expect(TokenType.RightParen, 'to close grouping parenthesis');
      return expr;
    }

    return this.parseAtom();
  }

  /**
   * Atomic leaf: a single search term or filter.
   *
   * ```
   * atom = text | quotedText | field | tag | deck | state | flag
   *      | property | date | regex | wordBoundary | accentInsensitive
   * ```
   */
  private parseAtom(): ASTNode {
    const token = this.advance();

    switch (token.type) {
      case TokenType.Text:
        return { type: 'text', value: token.value };

      case TokenType.QuotedText:
        return { type: 'text', value: token.value };

      case TokenType.Field:
        return { type: 'text', value: token.value, field: token.field };

      case TokenType.Tag:
        return { type: 'tag', pattern: token.value };

      case TokenType.Deck:
        return { type: 'deck', pattern: token.value };

      case TokenType.State:
        return this.parseStateNode(token);

      case TokenType.Flag:
        return { type: 'flag', value: token.numValue ?? 0 };

      case TokenType.Property:
        return {
          type: 'property',
          property: token.value,
          operator: token.operator ?? '=',
          value: token.numValue ?? 0,
        };

      case TokenType.Date:
        return {
          type: 'date',
          dateType: token.dateType ?? 'added',
          days: token.days ?? 0,
          rating: token.rating,
        };

      case TokenType.Regex:
        return {
          type: 'regex',
          pattern: token.value,
          field: token.field,
        };

      case TokenType.WordBoundary:
        return { type: 'wordBoundary', value: token.value };

      case TokenType.AccentInsensitive:
        return { type: 'accentInsensitive', value: token.value };

      case TokenType.EOF:
        throw new SearchSyntaxError(
          'Unexpected end of query. Expected a search term.',
          '',
          0,
        );

      default:
        throw new SearchSyntaxError(
          `Unexpected token type "${token.type}" ("${token.value}").`,
          token.value,
          0,
        );
    }
  }

  /**
   * Parse a State token into its AST node, validating the state value.
   */
  private parseStateNode(token: Token): ASTNode {
    const validStates = ['due', 'new', 'learning', 'review', 'paused', 'skipped'] as const;
    type ValidState = typeof validStates[number];

    const state = token.value as ValidState;
    if (!validStates.includes(state)) {
      throw new SearchSyntaxError(
        `Invalid state "${token.value}". Valid states: ${validStates.join(', ')}`,
        token.value,
        0,
      );
    }

    return { type: 'state', state };
  }
}
