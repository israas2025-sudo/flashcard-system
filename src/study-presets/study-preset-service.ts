/**
 * Study Preset Service
 *
 * Full CRUD operations for study presets (Section 2.4 "Smart Study"),
 * plus card-matching queries and study session creation.
 *
 * The service handles:
 * - Creating, reading, updating, and deleting user presets
 * - Pinning/unpinning presets for dashboard quick-access
 * - Computing live card counts that match each preset's filters
 * - Starting study sessions from a preset (fetches due cards, applies FSRS)
 * - Providing built-in system presets that are auto-created during onboarding
 */

import { pool } from '../db/connection';
import type {
  StudyPreset,
  StudyPresetRow,
  CreatePresetInput,
  UpdatePresetInput,
  StateFilter,
  PresetStudySession,
  BuiltInPresetDefinition,
} from './types';
import type { ScheduledCard } from '../scheduling/types';

// ---------------------------------------------------------------------------
// Default State Filter
// ---------------------------------------------------------------------------

const DEFAULT_STATE_FILTER: StateFilter = {
  includeNew: true,
  includeReview: true,
  includeLearning: true,
};

// ---------------------------------------------------------------------------
// Built-in Preset Definitions
// ---------------------------------------------------------------------------

/**
 * System-provided presets offered to all users.
 * These are created during onboarding and matched to the user's actual
 * tags/decks at creation time.
 */
const BUILT_IN_PRESETS: BuiltInPresetDefinition[] = [
  {
    key: 'daily-quran-review',
    name: 'Daily Quran Review',
    tagSlugs: ['quran', 'quranic-arabic', 'quran-vocabulary'],
    deckNamePatterns: ['Quran%', 'Quranic%'],
    stateFilter: { includeNew: false, includeReview: true, includeLearning: true },
    isPinned: true,
  },
  {
    key: 'arabic-grammar-drill',
    name: 'Arabic Grammar Drill',
    tagSlugs: ['arabic-grammar', 'nahw', 'sarf', 'arabic'],
    deckNamePatterns: ['Arabic%Grammar%', 'Nahw%', 'Sarf%'],
    stateFilter: { includeNew: true, includeReview: true, includeLearning: true },
    isPinned: true,
  },
  {
    key: 'exam-prep-spanish-b2',
    name: 'Exam Prep Spanish B2',
    tagSlugs: ['spanish', 'spanish-b2', 'dele-b2'],
    deckNamePatterns: ['Spanish%B2%', 'DELE%', 'Spanish%Exam%'],
    stateFilter: { includeNew: true, includeReview: true, includeLearning: true },
    isPinned: false,
  },
];

// ---------------------------------------------------------------------------
// Row-to-Model Mapper
// ---------------------------------------------------------------------------

/**
 * Convert a database row into a StudyPreset domain object.
 */
function rowToPreset(row: StudyPresetRow, cardCount?: number): StudyPreset {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    tagFilter: Array.isArray(row.tag_filter) ? row.tag_filter : [],
    deckFilter: Array.isArray(row.deck_filter) ? row.deck_filter : [],
    stateFilter: {
      includeNew: row.state_filter?.includeNew ?? true,
      includeReview: row.state_filter?.includeReview ?? true,
      includeLearning: row.state_filter?.includeLearning ?? true,
    },
    isPinned: row.is_pinned,
    cardCount,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// StudyPresetService
// ---------------------------------------------------------------------------

export class StudyPresetService {
  // -------------------------------------------------------------------------
  // CRUD Operations
  // -------------------------------------------------------------------------

  /**
   * Create a new study preset for a user.
   *
   * @param userId - Owner of the preset
   * @param input - Preset creation data (name, filters, pin status)
   * @returns The newly created StudyPreset with computed card count
   * @throws Error if the name is empty or a preset with the same name exists
   */
  async createPreset(userId: string, input: CreatePresetInput): Promise<StudyPreset> {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Preset name cannot be empty');
    }

    if (name.length > 200) {
      throw new Error('Preset name cannot exceed 200 characters');
    }

    // Check for duplicate name
    const duplicateCheck = await pool.query(
      `SELECT id FROM study_presets WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [userId, name]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new Error(`A preset named "${name}" already exists`);
    }

    const stateFilter: StateFilter = {
      ...DEFAULT_STATE_FILTER,
      ...input.stateFilter,
    };

    const result = await pool.query(
      `INSERT INTO study_presets (user_id, name, tag_filter, deck_filter, state_filter, is_pinned)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6)
       RETURNING *`,
      [
        userId,
        name,
        JSON.stringify(input.tagFilter),
        JSON.stringify(input.deckFilter),
        JSON.stringify(stateFilter),
        input.isPinned ?? false,
      ]
    );

    const preset = rowToPreset(result.rows[0] as StudyPresetRow);
    preset.cardCount = await this.computeCardCount(userId, preset);
    return preset;
  }

  /**
   * Get all study presets for a user, enriched with live card counts.
   *
   * Presets are ordered: pinned first, then by name alphabetically.
   *
   * @param userId - The user whose presets to retrieve
   * @returns Array of StudyPresets with card counts
   */
  async getUserPresets(userId: string): Promise<StudyPreset[]> {
    const result = await pool.query(
      `SELECT * FROM study_presets
       WHERE user_id = $1
       ORDER BY is_pinned DESC, name ASC`,
      [userId]
    );

    const presets: StudyPreset[] = [];
    for (const row of result.rows) {
      const preset = rowToPreset(row as StudyPresetRow);
      preset.cardCount = await this.computeCardCount(userId, preset);
      presets.push(preset);
    }

    return presets;
  }

  /**
   * Get a single preset by ID.
   *
   * @param presetId - The preset's unique identifier
   * @returns The StudyPreset with card count
   * @throws Error if the preset is not found
   */
  async getPreset(presetId: string): Promise<StudyPreset> {
    const result = await pool.query(
      `SELECT * FROM study_presets WHERE id = $1`,
      [presetId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    const row = result.rows[0] as StudyPresetRow;
    const preset = rowToPreset(row);
    preset.cardCount = await this.computeCardCount(row.user_id, preset);
    return preset;
  }

  /**
   * Update an existing study preset.
   *
   * Only provided fields are modified; others remain unchanged.
   *
   * @param presetId - The preset to update
   * @param updates - Partial preset data to apply
   * @returns The updated StudyPreset
   * @throws Error if the preset is not found
   */
  async updatePreset(presetId: string, updates: UpdatePresetInput): Promise<StudyPreset> {
    // Fetch current preset to merge with updates
    const currentResult = await pool.query(
      `SELECT * FROM study_presets WHERE id = $1`,
      [presetId]
    );

    if (currentResult.rows.length === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    const current = currentResult.rows[0] as StudyPresetRow;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      const name = updates.name.trim();
      if (!name) {
        throw new Error('Preset name cannot be empty');
      }
      if (name.length > 200) {
        throw new Error('Preset name cannot exceed 200 characters');
      }
      // Check for duplicate name (exclude current preset)
      const duplicateCheck = await pool.query(
        `SELECT id FROM study_presets
         WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3
         LIMIT 1`,
        [current.user_id, name, presetId]
      );
      if (duplicateCheck.rows.length > 0) {
        throw new Error(`A preset named "${name}" already exists`);
      }
      setClauses.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (updates.tagFilter !== undefined) {
      setClauses.push(`tag_filter = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updates.tagFilter));
    }

    if (updates.deckFilter !== undefined) {
      setClauses.push(`deck_filter = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updates.deckFilter));
    }

    if (updates.stateFilter !== undefined) {
      const mergedFilter: StateFilter = {
        includeNew: updates.stateFilter.includeNew ?? current.state_filter?.includeNew ?? true,
        includeReview: updates.stateFilter.includeReview ?? current.state_filter?.includeReview ?? true,
        includeLearning: updates.stateFilter.includeLearning ?? current.state_filter?.includeLearning ?? true,
      };
      setClauses.push(`state_filter = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(mergedFilter));
    }

    if (updates.isPinned !== undefined) {
      setClauses.push(`is_pinned = $${paramIndex++}`);
      values.push(updates.isPinned);
    }

    if (setClauses.length === 0) {
      return this.getPreset(presetId);
    }

    values.push(presetId);

    const result = await pool.query(
      `UPDATE study_presets
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    const row = result.rows[0] as StudyPresetRow;
    const preset = rowToPreset(row);
    preset.cardCount = await this.computeCardCount(row.user_id, preset);
    return preset;
  }

  /**
   * Delete a study preset.
   *
   * @param presetId - The preset to delete
   * @throws Error if the preset is not found
   */
  async deletePreset(presetId: string): Promise<void> {
    const result = await pool.query(
      `DELETE FROM study_presets WHERE id = $1`,
      [presetId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }
  }

  /**
   * Toggle the pinned status of a preset.
   *
   * @param presetId - The preset to pin/unpin
   * @param pinned - The desired pin state
   */
  async pinPreset(presetId: string, pinned: boolean): Promise<void> {
    const result = await pool.query(
      `UPDATE study_presets SET is_pinned = $1 WHERE id = $2`,
      [pinned, presetId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }
  }

  // -------------------------------------------------------------------------
  // Card Count & Matching
  // -------------------------------------------------------------------------

  /**
   * Get the number of active cards matching a preset's filters.
   *
   * @param presetId - The preset whose matching cards to count
   * @returns Number of active cards matching the filters
   */
  async getPresetCardCount(presetId: string): Promise<number> {
    const preset = await this.getPreset(presetId);
    return preset.cardCount ?? 0;
  }

  /**
   * Compute the live card count for a preset by executing the filter query.
   *
   * The query joins cards -> notes -> note_tags -> tags and applies:
   * - Tag filter: cards whose notes have any of the specified tags
   * - Deck filter: cards in any of the specified decks
   * - State filter: cards in the specified card_type states
   *
   * Empty tag/deck filters mean "include all" (no filtering on that axis).
   *
   * @param userId - The user owning the cards
   * @param preset - The preset with filter criteria
   * @returns The count of matching active cards
   */
  private async computeCardCount(userId: string, preset: StudyPreset): Promise<number> {
    const { sql, params } = this.buildMatchingQuery(userId, preset, true);
    const result = await pool.query(sql, params);
    return parseInt(result.rows[0]?.count ?? '0', 10);
  }

  /**
   * Build the SQL query for matching cards based on preset filters.
   *
   * @param userId - The user owning the cards
   * @param preset - The preset with filter criteria
   * @param countOnly - If true, returns a COUNT query; if false, returns full card rows
   * @returns Object with sql string and params array
   */
  private buildMatchingQuery(
    userId: string,
    preset: StudyPreset,
    countOnly: boolean
  ): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Base: only active cards owned by this user
    conditions.push(`c.status = 'active'`);
    conditions.push(`n.user_id = $${paramIndex++}`);
    params.push(userId);

    // Tag filter: if tags are specified, require at least one matching tag
    const hasTagFilter = preset.tagFilter.length > 0;
    let tagJoin = '';
    if (hasTagFilter) {
      tagJoin = `INNER JOIN note_tags nt ON n.id = nt.note_id`;
      conditions.push(`nt.tag_id = ANY($${paramIndex++}::uuid[])`);
      params.push(preset.tagFilter);
    }

    // Deck filter: if decks are specified, restrict to those decks
    if (preset.deckFilter.length > 0) {
      conditions.push(`c.deck_id = ANY($${paramIndex++}::uuid[])`);
      params.push(preset.deckFilter);
    }

    // State filter: build card_type IN (...) clause
    const stateTypes: string[] = [];
    if (preset.stateFilter.includeNew) {
      stateTypes.push('new');
    }
    if (preset.stateFilter.includeReview) {
      stateTypes.push('review');
    }
    if (preset.stateFilter.includeLearning) {
      stateTypes.push('learning');
      stateTypes.push('relearning');
    }

    if (stateTypes.length > 0 && stateTypes.length < 4) {
      conditions.push(`c.card_type = ANY($${paramIndex++}::varchar[])`);
      params.push(stateTypes);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    if (countOnly) {
      return {
        sql: `
          SELECT COUNT(DISTINCT c.id)::int AS count
          FROM cards c
          INNER JOIN notes n ON c.note_id = n.id
          ${tagJoin}
          ${whereClause}
        `,
        params,
      };
    }

    return {
      sql: `
        SELECT DISTINCT
          c.id,
          c.note_id,
          c.deck_id,
          c.template_ordinal,
          c.status,
          c.card_type,
          c.due,
          c.interval_days,
          c.stability,
          c.difficulty,
          c.last_review_at,
          c.reps,
          c.lapses,
          c.flag,
          c.created_at,
          c.updated_at
        FROM cards c
        INNER JOIN notes n ON c.note_id = n.id
        ${tagJoin}
        ${whereClause}
        ORDER BY
          CASE c.card_type
            WHEN 'relearning' THEN 0
            WHEN 'learning' THEN 1
            WHEN 'new' THEN 2
            WHEN 'review' THEN 3
          END,
          c.due ASC NULLS LAST
      `,
      params,
    };
  }

  // -------------------------------------------------------------------------
  // Study Session Creation
  // -------------------------------------------------------------------------

  /**
   * Start a study session from a preset.
   *
   * Fetches all matching due cards (cards that are due now or are new),
   * converts them to ScheduledCard format with FSRS scheduling data,
   * and returns the session along with the total matching card count.
   *
   * @param userId - The user starting the session
   * @param presetId - The preset to use as a filter
   * @returns PresetStudySession with matching due cards and total count
   * @throws Error if the preset is not found
   */
  async startPresetStudySession(
    userId: string,
    presetId: string
  ): Promise<PresetStudySession> {
    const preset = await this.getPreset(presetId);

    if (preset.userId !== userId) {
      throw new Error('Preset does not belong to this user');
    }

    // Get total matching count
    const totalMatching = await this.computeCardCount(userId, preset);

    // Fetch the actual due cards
    const { sql: baseQuery, params: baseParams } = this.buildMatchingQuery(userId, preset, false);

    // Add due-date filter: cards that are due now or have never been reviewed (new cards)
    const now = new Date();
    const dueQuery = `
      WITH matching_cards AS (
        ${baseQuery}
      )
      SELECT * FROM matching_cards mc
      WHERE mc.due <= $${baseParams.length + 1}
         OR mc.due IS NULL
         OR mc.card_type = 'new'
      LIMIT 200
    `;
    const dueParams = [...baseParams, now];

    const result = await pool.query(dueQuery, dueParams);

    // Convert database rows to ScheduledCard format
    const cards: ScheduledCard[] = result.rows.map((row: Record<string, unknown>) => ({
      card: {
        stability: (row.stability as number) || 0,
        difficulty: (row.difficulty as number) || 0,
        elapsedDays: row.last_review_at
          ? Math.max(0, Math.floor(
              (now.getTime() - new Date(row.last_review_at as string).getTime()) /
                (24 * 60 * 60 * 1000)
            ))
          : 0,
        scheduledDays: (row.interval_days as number) || 0,
        reps: (row.reps as number) || 0,
        lapses: (row.lapses as number) || 0,
        state: cardTypeToState(row.card_type as string),
        lastReview: row.last_review_at ? new Date(row.last_review_at as string) : null,
      },
      interval: (row.interval_days as number) || 0,
      due: row.due ? new Date(row.due as string) : now,
    }));

    return {
      presetId,
      cards,
      totalMatching,
    };
  }

  // -------------------------------------------------------------------------
  // Built-in Presets
  // -------------------------------------------------------------------------

  /**
   * Get the built-in system presets for a user.
   *
   * Built-in presets are resolved against the user's actual tags and decks.
   * If matching tags/decks are found, the preset is populated with their IDs.
   * If no matches are found, the preset is still returned with empty filters
   * so the user can configure it.
   *
   * @param userId - The user to resolve built-in presets for
   * @returns Array of StudyPresets representing the built-in presets
   */
  async getBuiltInPresets(userId: string): Promise<StudyPreset[]> {
    const presets: StudyPreset[] = [];

    for (const definition of BUILT_IN_PRESETS) {
      // Resolve tag slugs to tag IDs
      const tagIds = await this.resolveTagSlugs(userId, definition.tagSlugs);

      // Resolve deck name patterns to deck IDs
      const deckIds = await this.resolveDeckNamePatterns(userId, definition.deckNamePatterns);

      const preset: StudyPreset = {
        id: `builtin-${definition.key}`,
        userId,
        name: definition.name,
        tagFilter: tagIds,
        deckFilter: deckIds,
        stateFilter: definition.stateFilter,
        isPinned: definition.isPinned,
        isBuiltIn: true,
        createdAt: new Date(0), // Epoch for built-in presets
      };

      // Compute card count for this preset
      preset.cardCount = await this.computeCardCount(userId, preset);
      presets.push(preset);
    }

    return presets;
  }

  /**
   * Create the built-in presets in the database for a new user during onboarding.
   *
   * Resolves built-in preset definitions against the user's tags and decks,
   * then inserts them as real presets. Skips any that already exist (by name).
   *
   * @param userId - The new user to create built-in presets for
   * @returns Array of created StudyPresets
   */
  async createBuiltInPresetsForUser(userId: string): Promise<StudyPreset[]> {
    const createdPresets: StudyPreset[] = [];

    for (const definition of BUILT_IN_PRESETS) {
      // Check if a preset with this name already exists
      const existingCheck = await pool.query(
        `SELECT id FROM study_presets WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [userId, definition.name]
      );

      if (existingCheck.rows.length > 0) {
        continue; // Skip already existing
      }

      const tagIds = await this.resolveTagSlugs(userId, definition.tagSlugs);
      const deckIds = await this.resolveDeckNamePatterns(userId, definition.deckNamePatterns);

      try {
        const preset = await this.createPreset(userId, {
          name: definition.name,
          tagFilter: tagIds,
          deckFilter: deckIds,
          stateFilter: definition.stateFilter,
          isPinned: definition.isPinned,
        });
        createdPresets.push(preset);
      } catch {
        // Silently skip if creation fails (e.g. duplicate name race condition)
        continue;
      }
    }

    return createdPresets;
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Resolve tag slugs to tag IDs for a specific user.
   * Returns only the IDs of tags that actually exist.
   */
  private async resolveTagSlugs(userId: string, slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];

    const result = await pool.query(
      `SELECT id FROM tags WHERE user_id = $1 AND slug = ANY($2::varchar[])`,
      [userId, slugs]
    );

    return result.rows.map((r: { id: string }) => r.id);
  }

  /**
   * Resolve deck name patterns to deck IDs for a specific user.
   * Uses ILIKE for case-insensitive pattern matching.
   */
  private async resolveDeckNamePatterns(userId: string, patterns: string[]): Promise<string[]> {
    if (patterns.length === 0) return [];

    // Build OR conditions for each pattern
    const conditions = patterns.map((_: string, i: number) => `name ILIKE $${i + 2}`);
    const params: unknown[] = [userId, ...patterns];

    const result = await pool.query(
      `SELECT id FROM decks WHERE user_id = $1 AND (${conditions.join(' OR ')})`,
      params
    );

    return result.rows.map((r: { id: string }) => r.id);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Map a database card_type string to a CardState numeric enum value.
 */
function cardTypeToState(cardType: string): number {
  switch (cardType) {
    case 'new':
      return 0; // CardState.New
    case 'learning':
      return 1; // CardState.Learning
    case 'review':
      return 2; // CardState.Review
    case 'relearning':
      return 3; // CardState.Relearning
    default:
      return 0;
  }
}
