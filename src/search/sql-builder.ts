/**
 * sql-builder.ts -- Converts a search AST into parameterized PostgreSQL.
 *
 * Traverses the {@link ASTNode} tree produced by the parser and generates:
 * - A `WHERE` clause string with positional `$N` parameters.
 * - An ordered array of parameter values.
 * - A list of additional `JOIN` clauses required by certain filters.
 *
 * All user input is bound via parameters to prevent SQL injection.
 *
 * @example
 * ```ts
 * import { tokenize } from './tokenizer';
 * import { parse } from './parser';
 * import { buildSQL } from './sql-builder';
 *
 * const tokens = tokenize('tag:vocab deck:arabic prop:ivl>=10');
 * const ast = parse(tokens);
 * const sql = buildSQL(ast);
 *
 * console.log(sql.where);   // parameterized WHERE clause
 * console.log(sql.params);  // bound parameter values
 * console.log(sql.joins);   // additional JOINs
 * ```
 */

import { ASTNode, SQLQuery, RATING_MAP } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a parameterized PostgreSQL query from an AST.
 *
 * @param ast - The root AST node.
 * @param paramOffset - Starting parameter index (default 1). Use this when
 *   the query already has earlier parameters (e.g., `$1` is the userId).
 * @returns A {@link SQLQuery} with `where`, `params`, and `joins`.
 */
export function buildSQL(ast: ASTNode, paramOffset: number = 1): SQLQuery {
  const ctx = new BuildContext(paramOffset);
  const where = buildNode(ast, ctx);

  return {
    where: where || 'TRUE',
    params: ctx.params,
    joins: [...new Set(ctx.joins)], // deduplicate
  };
}

// ---------------------------------------------------------------------------
// Build Context
// ---------------------------------------------------------------------------

/**
 * Mutable context threaded through the recursive SQL builder.
 *
 * Tracks parameter numbering, accumulated params, and required JOINs.
 */
class BuildContext {
  /** Next parameter index ($N). */
  paramIdx: number;

  /** Accumulated parameter values. */
  params: unknown[] = [];

  /** Required JOIN clauses (may contain duplicates; deduped at the end). */
  joins: string[] = [];

  /** Counter for unique aliases to avoid JOIN collisions. */
  private aliasCounter = 0;

  constructor(startIdx: number) {
    this.paramIdx = startIdx;
  }

  /**
   * Add a parameter value and return its `$N` placeholder.
   */
  addParam(value: unknown): string {
    this.params.push(value);
    const placeholder = `$${this.paramIdx}`;
    this.paramIdx++;
    return placeholder;
  }

  /**
   * Generate a unique table alias suffix.
   */
  nextAlias(): string {
    this.aliasCounter++;
    return `_s${this.aliasCounter}`;
  }
}

// ---------------------------------------------------------------------------
// Node Handlers
// ---------------------------------------------------------------------------

/**
 * Recursively build SQL for a single AST node.
 *
 * @param node - The AST node to convert.
 * @param ctx - The build context.
 * @returns A SQL expression string.
 */
function buildNode(node: ASTNode, ctx: BuildContext): string {
  switch (node.type) {
    case 'text':
      return buildText(node, ctx);
    case 'tag':
      return buildTag(node, ctx);
    case 'deck':
      return buildDeck(node, ctx);
    case 'state':
      return buildState(node, ctx);
    case 'flag':
      return buildFlag(node, ctx);
    case 'property':
      return buildProperty(node, ctx);
    case 'date':
      return buildDate(node, ctx);
    case 'regex':
      return buildRegex(node, ctx);
    case 'wordBoundary':
      return buildWordBoundary(node, ctx);
    case 'accentInsensitive':
      return buildAccentInsensitive(node, ctx);
    case 'and':
      return buildAnd(node, ctx);
    case 'or':
      return buildOr(node, ctx);
    case 'not':
      return buildNot(node, ctx);
    default:
      // Exhaustiveness check -- should never happen with correct AST
      throw new Error(`Unknown AST node type: ${(node as ASTNode).type}`);
  }
}

/**
 * Build SQL for a plain-text or field-specific text search.
 *
 * - Without field: `(n.fields::text ILIKE $N)`
 * - With field: `(n.fields->>$N ILIKE $P)`
 *
 * Uses `%value%` for substring matching.
 */
function buildText(
  node: Extract<ASTNode, { type: 'text' }>,
  ctx: BuildContext,
): string {
  const pattern = `%${escapeLike(node.value)}%`;

  if (node.field) {
    const fieldParam = ctx.addParam(node.field);
    const patternParam = ctx.addParam(pattern);
    return `(n.fields->>${fieldParam} ILIKE ${patternParam})`;
  }

  const patternParam = ctx.addParam(pattern);
  return `(n.fields::text ILIKE ${patternParam})`;
}

/**
 * Build SQL for a tag search.
 *
 * Tags use the `note_tags` and `tags` tables. Wildcard patterns
 * (ending with `*`) use `LIKE` with `%` for prefix matching on the
 * tag hierarchy path. The hierarchy separator `::` is mapped to a
 * parent-child path constructed with a recursive CTE.
 *
 * Simple tag: `EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id AND t.name ILIKE $N)`
 * Wildcard tag: same but `t.name ILIKE 'pattern%'`
 * Hierarchical: builds a tag path and matches with LIKE.
 */
function buildTag(
  node: Extract<ASTNode, { type: 'tag' }>,
  ctx: BuildContext,
): string {
  const alias = ctx.nextAlias();
  const ntAlias = `nt${alias}`;
  const tAlias = `t${alias}`;

  // Determine if this is a hierarchical tag pattern
  const pattern = node.pattern;
  const hasWildcard = pattern.endsWith('*');
  const hasHierarchy = pattern.includes('::');

  if (hasHierarchy) {
    // Hierarchical tag search: build a path-based match using recursive CTE
    // Convert :: separators to a path-like pattern for matching
    const pathSegments = pattern.split('::');
    const isWildcard = pathSegments[pathSegments.length - 1] === '*';

    if (isWildcard) {
      // Remove the wildcard segment and build a prefix match
      pathSegments.pop();
    }

    // Build a recursive CTE to find tags matching the hierarchy path
    const tagPathCte = `tag_path${alias}`;
    const pathLike = pathSegments.map(s => escapeLike(s)).join('::');
    const likePattern = isWildcard ? `${pathLike}::%` : pathLike;
    const paramVal = ctx.addParam(isWildcard ? likePattern : pathLike);

    // Use a subquery with recursive path construction
    const cteJoin = [
      `INNER JOIN LATERAL (`,
      `  SELECT 1 FROM note_tags ${ntAlias}`,
      `  INNER JOIN (`,
      `    WITH RECURSIVE ${tagPathCte} AS (`,
      `      SELECT t.id, t.name, t.parent_id, t.name::text AS full_path`,
      `      FROM tags t WHERE t.parent_id IS NULL AND t.user_id = n.user_id`,
      `      UNION ALL`,
      `      SELECT t.id, t.name, t.parent_id, (tp.full_path || '::' || t.name)::text`,
      `      FROM tags t INNER JOIN ${tagPathCte} tp ON t.parent_id = tp.id`,
      `    )`,
      `    SELECT id FROM ${tagPathCte} WHERE ${isWildcard ? `full_path ILIKE ${paramVal}` : `full_path ILIKE ${paramVal}`}`,
      `  ) AS ${tAlias} ON ${tAlias}.id = ${ntAlias}.tag_id`,
      `  WHERE ${ntAlias}.note_id = n.id`,
      `  LIMIT 1`,
      `) AS tag_match${alias} ON TRUE`,
    ].join('\n');

    ctx.joins.push(cteJoin);
    return 'TRUE'; // The JOIN itself acts as the filter (INNER JOIN)
  }

  // Simple tag search (no hierarchy)
  if (hasWildcard) {
    const cleanPattern = pattern.slice(0, -1); // remove trailing *
    const likeParam = ctx.addParam(`${escapeLike(cleanPattern)}%`);
    return [
      `EXISTS (`,
      `  SELECT 1 FROM note_tags ${ntAlias}`,
      `  INNER JOIN tags ${tAlias} ON ${tAlias}.id = ${ntAlias}.tag_id`,
      `  WHERE ${ntAlias}.note_id = n.id AND ${tAlias}.name ILIKE ${likeParam}`,
      `)`,
    ].join('\n');
  }

  // Exact tag name match (case-insensitive)
  const nameParam = ctx.addParam(node.pattern);
  return [
    `EXISTS (`,
    `  SELECT 1 FROM note_tags ${ntAlias}`,
    `  INNER JOIN tags ${tAlias} ON ${tAlias}.id = ${ntAlias}.tag_id`,
    `  WHERE ${ntAlias}.note_id = n.id AND ${tAlias}.name ILIKE ${nameParam}`,
    `)`,
  ].join('\n');
}

/**
 * Build SQL for a deck search.
 *
 * For simple deck names: match the deck associated with the card.
 * For hierarchical paths (containing `::`): use a recursive CTE to
 * find the deck and all its descendants.
 */
function buildDeck(
  node: Extract<ASTNode, { type: 'deck' }>,
  ctx: BuildContext,
): string {
  const alias = ctx.nextAlias();
  const pattern = node.pattern;
  const hasHierarchy = pattern.includes('::');
  const hasWildcard = pattern.endsWith('*');

  if (hasHierarchy || hasWildcard) {
    // Build a recursive CTE for hierarchical deck matching
    const deckPathCte = `deck_path${alias}`;
    const segments = pattern.split('::');
    const isWildcard = segments[segments.length - 1] === '*' || hasWildcard;

    if (isWildcard && segments[segments.length - 1] === '*') {
      segments.pop();
    }

    const pathLike = segments.map(s => escapeLike(s)).join('::');
    const likePattern = isWildcard ? `${pathLike}%` : pathLike;
    const paramVal = ctx.addParam(isWildcard ? likePattern : pathLike);

    // Find the deck and optionally all children using recursive CTE
    return [
      `c.deck_id IN (`,
      `  WITH RECURSIVE ${deckPathCte} AS (`,
      `    SELECT d.id, d.name, d.parent_id, d.name::text AS full_path`,
      `    FROM decks d WHERE d.parent_id IS NULL AND d.user_id = n.user_id`,
      `    UNION ALL`,
      `    SELECT d.id, d.name, d.parent_id, (dp.full_path || '::' || d.name)::text`,
      `    FROM decks d INNER JOIN ${deckPathCte} dp ON d.parent_id = dp.id`,
      `  )`,
      `  SELECT id FROM ${deckPathCte}`,
      `  WHERE full_path ILIKE ${paramVal}`,
      `)`,
    ].join('\n');
  }

  // Simple deck name match -- find the deck and all its descendants
  const nameParam = ctx.addParam(node.pattern);
  return [
    `c.deck_id IN (`,
    `  WITH RECURSIVE deck_tree${alias} AS (`,
    `    SELECT d.id FROM decks d WHERE d.name ILIKE ${nameParam} AND d.user_id = n.user_id`,
    `    UNION ALL`,
    `    SELECT d.id FROM decks d INNER JOIN deck_tree${alias} dt ON d.parent_id = dt.id`,
    `  )`,
    `  SELECT id FROM deck_tree${alias}`,
    `)`,
  ].join('\n');
}

/**
 * Build SQL for a card state filter.
 *
 * Maps state names to column conditions on the `cards` table.
 */
function buildState(
  node: Extract<ASTNode, { type: 'state' }>,
  _ctx: BuildContext,
): string {
  switch (node.state) {
    case 'due':
      return `(c.status = 'active' AND c.card_type = 'review' AND c.due <= NOW())`;
    case 'new':
      return `(c.card_type = 'new')`;
    case 'learning':
      return `(c.card_type IN ('learning', 'relearning'))`;
    case 'review':
      return `(c.card_type = 'review')`;
    case 'paused':
      return `(c.status = 'paused')`;
    case 'skipped':
      return `(c.status = 'skipped_today')`;
    default:
      // Exhaustiveness guard
      throw new Error(`Unknown state: ${node.state}`);
  }
}

/**
 * Build SQL for a flag filter.
 */
function buildFlag(
  node: Extract<ASTNode, { type: 'flag' }>,
  ctx: BuildContext,
): string {
  const param = ctx.addParam(node.value);
  return `(c.flag = ${param})`;
}

/**
 * Build SQL for a numeric property comparison.
 *
 * Maps property names to actual column expressions:
 * - `ivl` -> `c.interval_days`
 * - `lapses` -> `c.lapses`
 * - `ease` -> Legacy compatibility; maps to difficulty inverse.
 * - `reps` -> `c.reps`
 * - `stability` -> `c.stability`
 * - `difficulty` -> `c.difficulty`
 * - `retrievability` -> Calculated from stability + elapsed time.
 */
function buildProperty(
  node: Extract<ASTNode, { type: 'property' }>,
  ctx: BuildContext,
): string {
  const op = validateOperator(node.operator);
  const valueParam = ctx.addParam(node.value);

  switch (node.property) {
    case 'ivl':
      return `(c.interval_days ${op} ${valueParam})`;

    case 'lapses':
      return `(c.lapses ${op} ${valueParam})`;

    case 'ease':
      // In FSRS, there is no ease factor. Map to difficulty for compat.
      // Anki ease is roughly (1 / difficulty) * 2.5, but we compare directly.
      return `(c.difficulty ${op} ${valueParam})`;

    case 'reps':
      return `(c.reps ${op} ${valueParam})`;

    case 'stability':
      return `(c.stability ${op} ${valueParam})`;

    case 'difficulty':
      return `(c.difficulty ${op} ${valueParam})`;

    case 'retrievability': {
      // Retrievability R = (1 + elapsed_days / (9 * stability))^(-1)
      // Using the FSRS power-forgetting-curve formula.
      // elapsed_days = EXTRACT(EPOCH FROM (NOW() - c.last_review_at)) / 86400
      const retrievabilityExpr = [
        `POWER(1 + EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_review_at, c.created_at))) / 86400.0`,
        `/ (9.0 * GREATEST(c.stability, 0.01)), -1)`,
      ].join(' ');
      return `(${retrievabilityExpr} ${op} ${valueParam})`;
    }

    default:
      throw new Error(`Unknown property: ${node.property}`);
  }
}

/**
 * Build SQL for a date-relative filter.
 *
 * - `added:N` -> cards created within the last N days.
 * - `rated:N` -> cards reviewed within the last N days.
 * - `rated:N:R` -> cards reviewed with a specific rating within the last N days.
 */
function buildDate(
  node: Extract<ASTNode, { type: 'date' }>,
  ctx: BuildContext,
): string {
  const daysParam = ctx.addParam(node.days);

  if (node.dateType === 'added') {
    return `(c.created_at >= NOW() - MAKE_INTERVAL(days => ${daysParam}::int))`;
  }

  // rated: search
  const alias = ctx.nextAlias();
  const rlAlias = `rl${alias}`;

  if (node.rating !== undefined) {
    const ratingStr = RATING_MAP[node.rating];
    if (!ratingStr) {
      throw new Error(`Invalid rating number: ${node.rating}`);
    }
    const ratingParam = ctx.addParam(ratingStr);
    return [
      `EXISTS (`,
      `  SELECT 1 FROM review_logs ${rlAlias}`,
      `  WHERE ${rlAlias}.card_id = c.id`,
      `  AND ${rlAlias}.reviewed_at >= NOW() - MAKE_INTERVAL(days => ${daysParam}::int)`,
      `  AND ${rlAlias}.rating = ${ratingParam}`,
      `)`,
    ].join('\n');
  }

  return [
    `EXISTS (`,
    `  SELECT 1 FROM review_logs ${rlAlias}`,
    `  WHERE ${rlAlias}.card_id = c.id`,
    `  AND ${rlAlias}.reviewed_at >= NOW() - MAKE_INTERVAL(days => ${daysParam}::int)`,
    `)`,
  ].join('\n');
}

/**
 * Build SQL for a regex search.
 *
 * Uses PostgreSQL `~` operator for case-sensitive regex matching.
 * With a field, restricts to that specific JSON field.
 */
function buildRegex(
  node: Extract<ASTNode, { type: 'regex' }>,
  ctx: BuildContext,
): string {
  const patternParam = ctx.addParam(node.pattern);

  if (node.field) {
    const fieldParam = ctx.addParam(node.field);
    return `(n.fields->>${fieldParam} ~ ${patternParam})`;
  }

  return `(n.fields::text ~ ${patternParam})`;
}

/**
 * Build SQL for a word-boundary search.
 *
 * Uses PostgreSQL regex with `\y` (word boundary) assertions.
 * `\y` is the PostgreSQL equivalent of `\b` in PCRE.
 */
function buildWordBoundary(
  node: Extract<ASTNode, { type: 'wordBoundary' }>,
  ctx: BuildContext,
): string {
  // Escape regex special chars in the user's value, then wrap with \y
  const escaped = escapeRegex(node.value);
  const regexPattern = `\\y${escaped}\\y`;
  const param = ctx.addParam(regexPattern);
  return `(n.fields::text ~* ${param})`;
}

/**
 * Build SQL for an accent/diacritic-insensitive search.
 *
 * Uses PostgreSQL's `unaccent()` extension (must be installed) to strip
 * diacritics from both the search term and the stored field values.
 *
 * Falls back to ILIKE if `unaccent` is not available, noting that
 * accent-insensitivity requires the extension.
 */
function buildAccentInsensitive(
  node: Extract<ASTNode, { type: 'accentInsensitive' }>,
  ctx: BuildContext,
): string {
  const pattern = `%${escapeLike(node.value)}%`;
  const param = ctx.addParam(pattern);
  return `(unaccent(n.fields::text) ILIKE unaccent(${param}))`;
}

/**
 * Build SQL for an AND conjunction.
 */
function buildAnd(
  node: Extract<ASTNode, { type: 'and' }>,
  ctx: BuildContext,
): string {
  const left = buildNode(node.left, ctx);
  const right = buildNode(node.right, ctx);
  return `(${left} AND ${right})`;
}

/**
 * Build SQL for an OR disjunction.
 */
function buildOr(
  node: Extract<ASTNode, { type: 'or' }>,
  ctx: BuildContext,
): string {
  const left = buildNode(node.left, ctx);
  const right = buildNode(node.right, ctx);
  return `(${left} OR ${right})`;
}

/**
 * Build SQL for a NOT negation.
 */
function buildNot(
  node: Extract<ASTNode, { type: 'not' }>,
  ctx: BuildContext,
): string {
  const operand = buildNode(node.operand, ctx);
  return `NOT (${operand})`;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Escape special characters in a LIKE pattern.
 *
 * Backslash-escapes `%`, `_`, and `\` so they are treated as literals.
 */
function escapeLike(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Escape special characters in a regex pattern so they are treated as literals.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate and return a safe SQL comparison operator.
 *
 * Only allows `>=`, `<=`, `>`, `<`, `=`, `!=`.
 *
 * @param op - The operator string.
 * @returns The validated operator.
 * @throws {Error} If the operator is not recognised.
 */
function validateOperator(op: string): string {
  const allowed = new Set(['>=', '<=', '>', '<', '=', '!=']);
  if (!allowed.has(op)) {
    throw new Error(`Invalid comparison operator: ${op}`);
  }
  return op;
}
