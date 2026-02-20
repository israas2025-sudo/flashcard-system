/**
 * search-service.ts -- Main search service for the flashcard Browser.
 *
 * Orchestrates tokenization, parsing, SQL generation, and query execution
 * to provide the Browser's full-text search, filtering, sorting, batch
 * operations, duplicate detection, and find-and-replace capabilities.
 *
 * All methods accept a `userId` to enforce row-level security --
 * users can only search their own cards.
 *
 * @example
 * ```ts
 * import { SearchService } from './search-service';
 * import { Pool } from 'pg';
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const service = new SearchService(pool);
 *
 * const results = await service.search(userId, '(tag:vocab OR tag:grammar) deck:arabic is:due', {
 *   page: 1,
 *   pageSize: 50,
 *   sortBy: 'due',
 *   sortDirection: 'asc',
 * });
 * ```
 */

import { tokenize } from './tokenizer';
import { parse } from './parser';
import { buildSQL } from './sql-builder';
import {
  SearchResult,
  SearchOptions,
  CardWithNote,
  Card,
  Note,
  NoteType,
  NoteTypeField,
  CardTemplate,
  Deck,
  Tag,
  SQLQuery,
  SortColumn,
  DuplicateGroup,
  FLAG_COLORS,
  SORTABLE_COLUMNS,
  SearchSyntaxError,
  ASTNode,
} from './types';

// ---------------------------------------------------------------------------
// Database Pool Interface
// ---------------------------------------------------------------------------

/**
 * Minimal database pool interface compatible with `pg.Pool`.
 *
 * Only the `query` method is required, making the service testable
 * with any pool-like object.
 */
export interface DatabasePool {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

/** Default number of results per page. */
const DEFAULT_PAGE_SIZE = 50;

/** Maximum allowed page size to prevent accidental huge queries. */
const MAX_PAGE_SIZE = 1000;

/** Default sort column. */
const DEFAULT_SORT_BY = 'c.created_at';

/** Default sort direction. */
const DEFAULT_SORT_DIR = 'desc';

// ---------------------------------------------------------------------------
// SearchService
// ---------------------------------------------------------------------------

/**
 * Primary search service for the flashcard Browser.
 *
 * Provides search, count, batch operations, duplicate detection, and
 * find-and-replace functionality over the user's card collection.
 */
export class SearchService {
  private readonly pool: DatabasePool;

  /**
   * Create a new SearchService.
   *
   * @param pool - A database connection pool (must support parameterized queries).
   */
  constructor(pool: DatabasePool) {
    this.pool = pool;
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /**
   * Execute a full search query and return paginated results.
   *
   * Handles the entire pipeline: tokenize -> parse -> build SQL -> execute.
   * Empty or whitespace-only queries return all cards for the user.
   *
   * @param userId - The ID of the user performing the search.
   * @param query - The search query string (Anki-compatible syntax).
   * @param options - Pagination, sorting, and mode options.
   * @returns A paginated {@link SearchResult}.
   * @throws {SearchSyntaxError} If the query has syntax errors.
   */
  async search(
    userId: string,
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult> {
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE));
    const sortBy = this.resolveSortColumn(options?.sortBy);
    const sortDir = options?.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const mode = options?.mode ?? 'cards';

    // Build the WHERE clause
    const { where, params, joins } = this.buildWhereClause(userId, query);

    // Count total results
    const countSQL = this.buildCountSQL(where, joins, mode);
    const countResult = await this.pool.query(countSQL, params);
    const totalCount = parseInt(String(countResult.rows[0]?.count ?? '0'), 10);

    // Fetch the page of results
    const offset = (page - 1) * pageSize;
    const dataParams = [...params, pageSize, offset];
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;

    const dataSQL = this.buildDataSQL(where, joins, sortBy, sortDir, limitParam, offsetParam, mode);
    const dataResult = await this.pool.query(dataSQL, dataParams);

    // Map rows to CardWithNote objects
    const cards = dataResult.rows.map(row => this.mapRowToCardWithNote(row));

    return {
      cards,
      totalCount,
      page,
      pageSize,
    };
  }

  /**
   * Count the number of results matching a query without fetching them.
   *
   * @param userId - The user's ID.
   * @param query - The search query string.
   * @returns The total number of matching cards.
   */
  async countResults(userId: string, query: string): Promise<number> {
    const { where, params, joins } = this.buildWhereClause(userId, query);
    const sql = this.buildCountSQL(where, joins, 'cards');
    const result = await this.pool.query(sql, params);
    return parseInt(String(result.rows[0]?.count ?? '0'), 10);
  }

  /**
   * Return the list of columns available for sorting.
   */
  getSortableColumns(): SortColumn[] {
    return [...SORTABLE_COLUMNS];
  }

  // -----------------------------------------------------------------------
  // Batch Operations
  // -----------------------------------------------------------------------

  /**
   * Change the flag on all cards matching a search query.
   *
   * @param userId - The user's ID.
   * @param query - The search query string.
   * @param flag - The new flag value (0-7).
   * @returns The number of cards updated.
   */
  async batchChangeFlag(userId: string, query: string, flag: number): Promise<number> {
    if (flag < 0 || flag > 7) {
      throw new Error('Flag must be between 0 and 7.');
    }

    const { where, params, joins } = this.buildWhereClause(userId, query);
    const flagParam = `$${params.length + 1}`;
    const allParams = [...params, flag];

    const sql = [
      `UPDATE cards c SET flag = ${flagParam}, updated_at = NOW()`,
      `FROM notes n`,
      ...joins,
      `WHERE c.note_id = n.id AND n.user_id = $1`,
      `AND (${where})`,
    ].join('\n');

    const result = await this.pool.query(sql, allParams);
    return result.rowCount;
  }

  /**
   * Pause (suspend) all cards matching a search query.
   *
   * @param userId - The user's ID.
   * @param query - The search query string.
   * @returns The number of cards paused.
   */
  async batchPause(userId: string, query: string): Promise<number> {
    const { where, params, joins } = this.buildWhereClause(userId, query);

    const sql = [
      `UPDATE cards c SET`,
      `  status = 'paused',`,
      `  paused_at = NOW(),`,
      `  paused_by = 'manual',`,
      `  updated_at = NOW()`,
      `FROM notes n`,
      ...joins,
      `WHERE c.note_id = n.id AND n.user_id = $1`,
      `AND c.status != 'paused'`,
      `AND (${where})`,
    ].join('\n');

    const result = await this.pool.query(sql, params);
    return result.rowCount;
  }

  /**
   * Resume (unsuspend) all cards matching a search query.
   *
   * @param userId - The user's ID.
   * @param query - The search query string.
   * @returns The number of cards resumed.
   */
  async batchResume(userId: string, query: string): Promise<number> {
    const { where, params, joins } = this.buildWhereClause(userId, query);

    const sql = [
      `UPDATE cards c SET`,
      `  status = 'active',`,
      `  paused_at = NULL,`,
      `  paused_by = NULL,`,
      `  pause_reason = NULL,`,
      `  resume_date = NULL,`,
      `  updated_at = NOW()`,
      `FROM notes n`,
      ...joins,
      `WHERE c.note_id = n.id AND n.user_id = $1`,
      `AND c.status = 'paused'`,
      `AND (${where})`,
    ].join('\n');

    const result = await this.pool.query(sql, params);
    return result.rowCount;
  }

  /**
   * Move all cards matching a search query to a different deck.
   *
   * @param userId - The user's ID.
   * @param query - The search query string.
   * @param deckId - The target deck's ID.
   * @returns The number of cards moved.
   */
  async batchChangeDeck(userId: string, query: string, deckId: string): Promise<number> {
    const { where, params, joins } = this.buildWhereClause(userId, query);
    const deckParam = `$${params.length + 1}`;
    const allParams = [...params, deckId];

    const sql = [
      `UPDATE cards c SET deck_id = ${deckParam}, updated_at = NOW()`,
      `FROM notes n`,
      ...joins,
      `WHERE c.note_id = n.id AND n.user_id = $1`,
      `AND (${where})`,
    ].join('\n');

    const result = await this.pool.query(sql, allParams);
    return result.rowCount;
  }

  /**
   * Add a tag to all notes whose cards match a search query.
   *
   * Inserts into `note_tags` using `ON CONFLICT DO NOTHING` to avoid
   * duplicating existing tag associations.
   *
   * @param userId - The user's ID.
   * @param query - The search query string.
   * @param tagId - The tag's ID to add.
   * @returns The number of new tag associations created.
   */
  async batchAddTag(userId: string, query: string, tagId: string): Promise<number> {
    const { where, params, joins } = this.buildWhereClause(userId, query);
    const tagParam = `$${params.length + 1}`;
    const allParams = [...params, tagId];

    const sql = [
      `INSERT INTO note_tags (note_id, tag_id)`,
      `SELECT DISTINCT n.id, ${tagParam}`,
      `FROM cards c`,
      `INNER JOIN notes n ON c.note_id = n.id`,
      ...joins,
      `WHERE n.user_id = $1`,
      `AND (${where})`,
      `ON CONFLICT (note_id, tag_id) DO NOTHING`,
    ].join('\n');

    const result = await this.pool.query(sql, allParams);
    return result.rowCount;
  }

  /**
   * Delete all cards (and their parent notes if orphaned) matching a search query.
   *
   * This is a destructive operation. Deletes cards first, then removes any
   * notes that no longer have associated cards.
   *
   * @param userId - The user's ID.
   * @param query - The search query string.
   * @returns The number of cards deleted.
   */
  async batchDelete(userId: string, query: string): Promise<number> {
    const { where, params, joins } = this.buildWhereClause(userId, query);

    // Step 1: Identify card IDs to delete
    const selectSQL = [
      `SELECT c.id, c.note_id`,
      `FROM cards c`,
      `INNER JOIN notes n ON c.note_id = n.id`,
      ...joins,
      `WHERE n.user_id = $1`,
      `AND (${where})`,
    ].join('\n');

    const selectResult = await this.pool.query(selectSQL, params);
    if (selectResult.rows.length === 0) {
      return 0;
    }

    const cardIds = selectResult.rows.map(r => String(r.id));
    const noteIds = [...new Set(selectResult.rows.map(r => String(r.note_id)))];

    // Step 2: Delete the cards
    const cardPlaceholders = cardIds.map((_, i) => `$${i + 1}`).join(', ');
    await this.pool.query(
      `DELETE FROM cards WHERE id IN (${cardPlaceholders})`,
      cardIds,
    );

    // Step 3: Delete orphaned notes (notes with no remaining cards)
    if (noteIds.length > 0) {
      const notePlaceholders = noteIds.map((_, i) => `$${i + 1}`).join(', ');
      await this.pool.query(
        [
          `DELETE FROM notes WHERE id IN (${notePlaceholders})`,
          `AND NOT EXISTS (SELECT 1 FROM cards WHERE note_id = notes.id)`,
        ].join('\n'),
        noteIds,
      );
    }

    return cardIds.length;
  }

  // -----------------------------------------------------------------------
  // Duplicate Detection
  // -----------------------------------------------------------------------

  /**
   * Find groups of duplicate notes based on a specific field value.
   *
   * Duplicates are defined as notes of the same type sharing the same
   * value in the specified field.
   *
   * @param userId - The user's ID.
   * @param noteTypeId - The note type to search within.
   * @param fieldName - The field name to compare for duplicates.
   * @returns An array of duplicate groups, each with the shared value and note IDs.
   */
  async findDuplicates(
    userId: string,
    noteTypeId: string,
    fieldName: string,
  ): Promise<DuplicateGroup[]> {
    const sql = [
      `SELECT n.fields->>$3 AS field_value, ARRAY_AGG(n.id ORDER BY n.created_at) AS note_ids, COUNT(*) AS cnt`,
      `FROM notes n`,
      `WHERE n.user_id = $1`,
      `AND n.note_type_id = $2`,
      `AND n.fields->>$3 IS NOT NULL`,
      `AND n.fields->>$3 != ''`,
      `GROUP BY n.fields->>$3`,
      `HAVING COUNT(*) > 1`,
      `ORDER BY COUNT(*) DESC, n.fields->>$3`,
    ].join('\n');

    const result = await this.pool.query(sql, [userId, noteTypeId, fieldName]);

    return result.rows.map(row => ({
      fieldValue: String(row.field_value ?? ''),
      noteIds: (row.note_ids as string[]) ?? [],
      count: parseInt(String(row.cnt ?? '0'), 10),
    }));
  }

  // -----------------------------------------------------------------------
  // Find and Replace
  // -----------------------------------------------------------------------

  /**
   * Find and replace text within a specific field of notes matching a search query.
   *
   * Supports both literal string replacement and regex replacement.
   *
   * @param userId - The user's ID.
   * @param query - The search query to filter which notes are affected.
   * @param fieldName - The note field to perform replacement in.
   * @param find - The text or regex pattern to find.
   * @param replace - The replacement text.
   * @param useRegex - Whether `find` should be interpreted as a regex.
   * @returns The number of notes updated.
   */
  async findAndReplace(
    userId: string,
    query: string,
    fieldName: string,
    find: string,
    replace: string,
    useRegex: boolean,
  ): Promise<number> {
    const { where, params, joins } = this.buildWhereClause(userId, query);

    const fieldParam = `$${params.length + 1}`;
    const findParam = `$${params.length + 2}`;
    const replaceParam = `$${params.length + 3}`;
    const allParams = [...params, fieldName, find, replace];

    // Use regexp_replace for regex mode, overlay/replace for literal mode
    let updateExpr: string;
    if (useRegex) {
      updateExpr = `regexp_replace(n.fields->>${fieldParam}, ${findParam}, ${replaceParam}, 'g')`;
    } else {
      updateExpr = `replace(n.fields->>${fieldParam}, ${findParam}, ${replaceParam})`;
    }

    const sql = [
      `UPDATE notes n SET`,
      `  fields = jsonb_set(n.fields, ARRAY[${fieldParam}], to_jsonb(${updateExpr})),`,
      `  updated_at = NOW()`,
      `FROM cards c`,
      ...joins,
      `WHERE c.note_id = n.id AND n.user_id = $1`,
      `AND n.fields->>${fieldParam} IS NOT NULL`,
      `AND (${where})`,
    ].join('\n');

    const result = await this.pool.query(sql, allParams);
    return result.rowCount;
  }

  // -----------------------------------------------------------------------
  // Internal: Query Building
  // -----------------------------------------------------------------------

  /**
   * Parse a search query and build the WHERE clause with user scoping.
   *
   * The userId is always `$1`. The AST's parameters start from `$2`.
   *
   * @param userId - The user's ID (becomes `$1`).
   * @param query - The raw search query string.
   * @returns The WHERE clause, params, and joins.
   */
  private buildWhereClause(userId: string, query: string): SQLQuery & { params: unknown[] } {
    const trimmed = query.trim();

    // Empty query matches everything for this user
    if (!trimmed) {
      return {
        where: 'TRUE',
        params: [userId],
        joins: [],
      };
    }

    let ast: ASTNode;
    try {
      const tokens = tokenize(trimmed);
      ast = parse(tokens);
    } catch (err) {
      if (err instanceof SearchSyntaxError) {
        throw err;
      }
      throw new SearchSyntaxError(
        `Failed to parse search query: ${err instanceof Error ? err.message : String(err)}`,
        trimmed,
        0,
      );
    }

    // Build SQL with paramOffset=2 (since $1 is userId)
    const sql = buildSQL(ast, 2);

    return {
      where: sql.where,
      params: [userId, ...sql.params],
      joins: sql.joins,
    };
  }

  /**
   * Build the COUNT query SQL.
   */
  private buildCountSQL(where: string, joins: string[], mode: 'cards' | 'notes'): string {
    const countExpr = mode === 'notes' ? 'COUNT(DISTINCT n.id)' : 'COUNT(*)';

    return [
      `SELECT ${countExpr} AS count`,
      `FROM cards c`,
      `INNER JOIN notes n ON c.note_id = n.id`,
      `INNER JOIN decks d ON c.deck_id = d.id`,
      ...joins,
      `WHERE n.user_id = $1`,
      `AND (${where})`,
    ].join('\n');
  }

  /**
   * Build the data-fetching SELECT query SQL.
   */
  private buildDataSQL(
    where: string,
    joins: string[],
    sortBy: string,
    sortDir: string,
    limitParam: string,
    offsetParam: string,
    mode: 'cards' | 'notes',
  ): string {
    const distinctClause = mode === 'notes' ? 'DISTINCT ON (n.id)' : '';

    return [
      `SELECT ${distinctClause}`,
      `  c.id AS card_id,`,
      `  c.note_id,`,
      `  c.deck_id,`,
      `  c.template_ordinal,`,
      `  c.status AS card_status,`,
      `  c.card_type,`,
      `  c.due,`,
      `  c.interval_days,`,
      `  c.stability,`,
      `  c.difficulty,`,
      `  c.last_review_at,`,
      `  c.reps,`,
      `  c.lapses,`,
      `  c.flag,`,
      `  c.paused_at,`,
      `  c.paused_by,`,
      `  c.resume_date,`,
      `  c.pause_reason,`,
      `  c.custom_data,`,
      `  c.created_at AS card_created_at,`,
      `  c.updated_at AS card_updated_at,`,
      `  n.id AS note_id_2,`,
      `  n.user_id,`,
      `  n.note_type_id,`,
      `  n.fields AS note_fields,`,
      `  n.sort_field_value,`,
      `  n.first_field_checksum,`,
      `  n.created_at AS note_created_at,`,
      `  n.updated_at AS note_updated_at,`,
      `  nt.id AS note_type_id_2,`,
      `  nt.name AS note_type_name,`,
      `  nt.fields AS note_type_fields,`,
      `  nt.card_templates,`,
      `  nt.css AS note_type_css,`,
      `  d.id AS deck_id_2,`,
      `  d.name AS deck_name,`,
      `  d.parent_id AS deck_parent_id,`,
      `  d.description AS deck_description,`,
      `  d.is_filtered AS deck_is_filtered,`,
      `  d.position AS deck_position,`,
      `  d.created_at AS deck_created_at,`,
      `  (`,
      `    SELECT COALESCE(json_agg(json_build_object(`,
      `      'id', t.id, 'name', t.name, 'slug', t.slug,`,
      `      'parentId', t.parent_id, 'color', t.color,`,
      `      'icon', t.icon, 'description', t.description,`,
      `      'createdAt', t.created_at`,
      `    )), '[]'::json)`,
      `    FROM note_tags ntg`,
      `    INNER JOIN tags t ON t.id = ntg.tag_id`,
      `    WHERE ntg.note_id = n.id`,
      `  ) AS tags_json`,
      `FROM cards c`,
      `INNER JOIN notes n ON c.note_id = n.id`,
      `INNER JOIN note_types nt ON n.note_type_id = nt.id`,
      `INNER JOIN decks d ON c.deck_id = d.id`,
      ...joins,
      `WHERE n.user_id = $1`,
      `AND (${where})`,
      `ORDER BY ${sortBy} ${sortDir}`,
      `LIMIT ${limitParam} OFFSET ${offsetParam}`,
    ].join('\n');
  }

  /**
   * Resolve a user-friendly sort key to a SQL expression.
   *
   * If the key matches a known sortable column, returns its SQL expression.
   * Otherwise falls back to the default sort.
   */
  private resolveSortColumn(sortBy?: string): string {
    if (!sortBy) {
      return DEFAULT_SORT_BY;
    }

    const col = SORTABLE_COLUMNS.find(c => c.key === sortBy);
    if (col) {
      return col.sqlExpression;
    }

    // Whitelist specific SQL expressions to prevent injection
    const allowedExpressions = new Set(SORTABLE_COLUMNS.map(c => c.sqlExpression));
    if (allowedExpressions.has(sortBy)) {
      return sortBy;
    }

    return DEFAULT_SORT_BY;
  }

  // -----------------------------------------------------------------------
  // Internal: Row Mapping
  // -----------------------------------------------------------------------

  /**
   * Map a raw database row to a typed {@link CardWithNote} object.
   */
  private mapRowToCardWithNote(row: Record<string, unknown>): CardWithNote {
    const card: Card = {
      id: String(row.card_id),
      noteId: String(row.note_id),
      deckId: String(row.deck_id),
      templateOrdinal: Number(row.template_ordinal ?? 0),
      status: String(row.card_status) as Card['status'],
      cardType: String(row.card_type) as Card['cardType'],
      due: row.due ? new Date(String(row.due)) : null,
      intervalDays: Number(row.interval_days ?? 0),
      stability: Number(row.stability ?? 0),
      difficulty: Number(row.difficulty ?? 0),
      lastReviewAt: row.last_review_at ? new Date(String(row.last_review_at)) : null,
      reps: Number(row.reps ?? 0),
      lapses: Number(row.lapses ?? 0),
      flag: Number(row.flag ?? 0),
      pausedAt: row.paused_at ? new Date(String(row.paused_at)) : null,
      pausedBy: row.paused_by ? String(row.paused_by) : null,
      resumeDate: row.resume_date ? new Date(String(row.resume_date)) : null,
      pauseReason: row.pause_reason ? String(row.pause_reason) : null,
      customData: (row.custom_data as Record<string, unknown>) ?? {},
      createdAt: new Date(String(row.card_created_at)),
      updatedAt: new Date(String(row.card_updated_at)),
    };

    const note: Note = {
      id: String(row.note_id),
      userId: String(row.user_id),
      noteTypeId: String(row.note_type_id),
      fields: (row.note_fields as Record<string, string>) ?? {},
      sortFieldValue: row.sort_field_value ? String(row.sort_field_value) : null,
      firstFieldChecksum: row.first_field_checksum ? Number(row.first_field_checksum) : null,
      createdAt: new Date(String(row.note_created_at)),
      updatedAt: new Date(String(row.note_updated_at)),
    };

    const noteType: NoteType = {
      id: String(row.note_type_id_2),
      userId: String(row.user_id),
      name: String(row.note_type_name ?? ''),
      fields: (row.note_type_fields as NoteTypeField[]) ?? [],
      cardTemplates: (row.card_templates as CardTemplate[]) ?? [],
      css: String(row.note_type_css ?? ''),
      createdAt: new Date(String(row.note_created_at)),
      updatedAt: new Date(String(row.note_updated_at)),
    };

    const deck: Deck = {
      id: String(row.deck_id_2),
      userId: String(row.user_id),
      name: String(row.deck_name ?? ''),
      parentId: row.deck_parent_id ? String(row.deck_parent_id) : null,
      presetId: null,
      description: String(row.deck_description ?? ''),
      isFiltered: Boolean(row.deck_is_filtered),
      filterQuery: null,
      position: Number(row.deck_position ?? 0),
      createdAt: new Date(String(row.deck_created_at)),
    };

    // Parse tags from the aggregated JSON
    let tags: Tag[] = [];
    try {
      const tagsRaw = row.tags_json;
      if (typeof tagsRaw === 'string') {
        tags = JSON.parse(tagsRaw).map(mapRawTag);
      } else if (Array.isArray(tagsRaw)) {
        tags = tagsRaw.map(mapRawTag);
      }
    } catch {
      tags = [];
    }

    const flagColor = FLAG_COLORS[card.flag] ?? null;

    return { card, note, noteType, deck, tags, flagColor };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a raw tag JSON object to a typed {@link Tag}.
 */
function mapRawTag(raw: Record<string, unknown>): Tag {
  return {
    id: String(raw.id ?? ''),
    userId: String(raw.userId ?? raw.user_id ?? ''),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    parentId: raw.parentId != null || raw.parent_id != null
      ? String(raw.parentId ?? raw.parent_id)
      : null,
    color: String(raw.color ?? '#6366F1'),
    icon: String(raw.icon ?? ''),
    description: String(raw.description ?? ''),
    createdAt: raw.createdAt
      ? new Date(String(raw.createdAt))
      : raw.created_at
        ? new Date(String(raw.created_at))
        : new Date(),
  };
}
