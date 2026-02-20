/**
 * Deck Service
 *
 * Provides complete CRUD operations, hierarchical tree management,
 * deck preset management, filtered/custom study deck lifecycle,
 * study info retrieval, and card operations for the multilingual
 * flashcard application.
 *
 * Per Section 1.4 of the spec:
 *  - Decks are groups of cards. Each card belongs to exactly one deck.
 *  - Decks support hierarchy via parent_id.
 *  - Studying a parent deck includes all subdeck cards.
 *  - Each deck can have its own options preset.
 *  - Features: per-deck new/review limits, deck options presets (shareable),
 *    filtered/custom study decks (temporary from search queries),
 *    deck override on card templates.
 *
 * All queries use parameterized statements to prevent SQL injection.
 * Hierarchical queries use recursive CTEs for efficient tree traversal.
 */

import { query, getClient, withTransaction } from '../db/connection';
import type {
  Deck,
  DeckTreeNode,
  DeckTreeRow,
  DeckPreset,
  DeckStudyInfo,
  DeckCard,
  FilteredDeckOrder,
} from './types';
import { SearchService, DatabasePool } from '../search/search-service';

// ---------------------------------------------------------------------------
// Default Preset Values
// ---------------------------------------------------------------------------

const DEFAULT_PRESET: Omit<DeckPreset, 'id' | 'userId' | 'name'> = {
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
  learningSteps: [1, 10],
  relearningSteps: [10],
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  desiredRetention: 0.9,
  fsrsParameters: null,
  leechThreshold: 8,
  leechAction: 'tag_only',
  buryNewSiblings: true,
  buryReviewSiblings: true,
};

// ---------------------------------------------------------------------------
// Filtered Deck Order SQL Mapping
// ---------------------------------------------------------------------------

const FILTER_ORDER_SQL: Record<FilteredDeckOrder, string> = {
  random: 'RANDOM()',
  due_date_asc: 'c.due ASC NULLS LAST',
  due_date_desc: 'c.due DESC NULLS LAST',
  added_asc: 'c.created_at ASC',
  added_desc: 'c.created_at DESC',
  interval_asc: 'c.interval_days ASC',
  interval_desc: 'c.interval_days DESC',
  lapses_desc: 'c.lapses DESC',
  difficulty_desc: 'c.difficulty DESC',
};

// ---------------------------------------------------------------------------
// DeckService
// ---------------------------------------------------------------------------

export class DeckService {
  // =========================================================================
  // CRUD Operations
  // =========================================================================

  /**
   * Create a new deck for a user.
   *
   * Validates that no sibling deck with the same name exists under the same
   * parent. If a parentId is provided, verifies the parent exists and belongs
   * to the user.
   *
   * @param userId - Owner of the deck
   * @param name - Display name for the deck
   * @param parentId - Optional parent deck ID for hierarchy
   * @param presetId - Optional preset ID for scheduling configuration
   * @param description - Optional description text
   * @returns The newly created Deck
   * @throws Error if a sibling deck with the same name already exists
   */
  async createDeck(
    userId: string,
    name: string,
    parentId?: string,
    presetId?: string,
    description?: string
  ): Promise<Deck> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Deck name cannot be empty');
    }

    const deckParentId = parentId || null;
    const deckPresetId = presetId || null;
    const deckDescription = description || '';

    // Verify parent exists and belongs to the user
    if (deckParentId) {
      const parentCheck = await query(
        `SELECT id FROM decks WHERE id = $1 AND user_id = $2`,
        [deckParentId, userId]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error(`Parent deck "${deckParentId}" not found`);
      }
    }

    // Verify preset exists and belongs to the user
    if (deckPresetId) {
      const presetCheck = await query(
        `SELECT id FROM deck_presets WHERE id = $1 AND user_id = $2`,
        [deckPresetId, userId]
      );
      if (presetCheck.rows.length === 0) {
        throw new Error(`Preset "${deckPresetId}" not found`);
      }
    }

    // Check for duplicate name under the same parent
    const duplicateCheck = await query(
      `SELECT id FROM decks
       WHERE user_id = $1
         AND name = $2
         AND (parent_id = $3 OR (parent_id IS NULL AND $3 IS NULL))
       LIMIT 1`,
      [userId, trimmedName, deckParentId]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error(
        `A deck named "${trimmedName}" already exists under the same parent`
      );
    }

    // Get the next position for this parent
    const posResult = await query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
       FROM decks
       WHERE user_id = $1
         AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))`,
      [userId, deckParentId]
    );
    const nextPosition = parseInt(String(posResult.rows[0]?.next_pos ?? '0'), 10);

    const result = await query(
      `INSERT INTO decks (user_id, name, parent_id, preset_id, description, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, name, parent_id, preset_id, description,
                 is_filtered, filter_query, position, created_at`,
      [userId, trimmedName, deckParentId, deckPresetId, deckDescription, nextPosition]
    );

    return this.mapRowToDeck(result.rows[0]);
  }

  /**
   * Retrieve a single deck by its ID.
   *
   * @param deckId - The deck's unique identifier
   * @returns The Deck object
   * @throws Error if the deck is not found
   */
  async getDeck(deckId: string): Promise<Deck> {
    const result = await query(
      `SELECT id, user_id, name, parent_id, preset_id, description,
              is_filtered, filter_query, position, created_at
       FROM decks
       WHERE id = $1`,
      [deckId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Deck "${deckId}" not found`);
    }

    return this.mapRowToDeck(result.rows[0]);
  }

  /**
   * Update one or more fields of an existing deck.
   *
   * Only provided fields are modified; others remain unchanged.
   * When changing parent_id, validates that the move does not create
   * a circular reference.
   *
   * @param deckId - The deck to update
   * @param updates - Partial deck object with fields to change
   * @returns The updated Deck
   * @throws Error if the deck is not found or the update is invalid
   */
  async updateDeck(deckId: string, updates: Partial<Deck>): Promise<Deck> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Deck name cannot be empty');
      }
      setClauses.push(`name = $${paramIndex++}`);
      values.push(trimmedName);
    }

    if (updates.parentId !== undefined) {
      if (updates.parentId === deckId) {
        throw new Error('A deck cannot be its own parent');
      }
      // Circular reference check is done in moveDeck; here we just set it
      setClauses.push(`parent_id = $${paramIndex++}`);
      values.push(updates.parentId);
    }

    if (updates.presetId !== undefined) {
      setClauses.push(`preset_id = $${paramIndex++}`);
      values.push(updates.presetId);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.position !== undefined) {
      setClauses.push(`position = $${paramIndex++}`);
      values.push(updates.position);
    }

    if (setClauses.length === 0) {
      return this.getDeck(deckId);
    }

    values.push(deckId);

    const result = await query(
      `UPDATE decks
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, user_id, name, parent_id, preset_id, description,
                 is_filtered, filter_query, position, created_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Deck "${deckId}" not found`);
    }

    return this.mapRowToDeck(result.rows[0]);
  }

  /**
   * Delete a deck.
   *
   * If moveCardsTo is provided, cards in the deck are moved to the target
   * deck before deletion. Otherwise, cards are deleted along with the deck.
   * Child decks are re-parented to the deleted deck's parent.
   *
   * For filtered decks, cards are returned to their original decks before
   * deletion (see emptyFilteredDeck).
   *
   * @param deckId - The deck to delete
   * @param moveCardsTo - Optional target deck ID to move cards to
   * @throws Error if the deck is not found
   */
  async deleteDeck(deckId: string, moveCardsTo?: string): Promise<void> {
    await withTransaction(async (client) => {
      // Get the deck to check if it's filtered
      const deckResult = await client.query(
        `SELECT id, parent_id, is_filtered, user_id FROM decks WHERE id = $1`,
        [deckId]
      );

      if (deckResult.rows.length === 0) {
        throw new Error(`Deck "${deckId}" not found`);
      }

      const deck = deckResult.rows[0];

      // If it's a filtered deck, return cards to original decks first
      if (deck.is_filtered) {
        await this.emptyFilteredDeckWithClient(client, deckId);
      } else if (moveCardsTo) {
        // Verify target deck exists and belongs to the same user
        const targetCheck = await client.query(
          `SELECT id FROM decks WHERE id = $1 AND user_id = $2`,
          [moveCardsTo, deck.user_id]
        );
        if (targetCheck.rows.length === 0) {
          throw new Error(`Target deck "${moveCardsTo}" not found`);
        }

        // Move cards to the target deck
        await client.query(
          `UPDATE cards SET deck_id = $1, updated_at = NOW() WHERE deck_id = $2`,
          [moveCardsTo, deckId]
        );
      } else {
        // Delete review logs for cards in this deck
        await client.query(
          `DELETE FROM review_logs
           WHERE card_id IN (SELECT id FROM cards WHERE deck_id = $1)`,
          [deckId]
        );

        // Delete cards in this deck
        await client.query(
          `DELETE FROM cards WHERE deck_id = $1`,
          [deckId]
        );
      }

      // Re-parent child decks to the deleted deck's parent
      await client.query(
        `UPDATE decks SET parent_id = $1 WHERE parent_id = $2`,
        [deck.parent_id, deckId]
      );

      // Delete the deck
      await client.query(
        `DELETE FROM decks WHERE id = $1`,
        [deckId]
      );
    });
  }

  // =========================================================================
  // Hierarchy Operations
  // =========================================================================

  /**
   * Build the complete deck tree for a user using a recursive CTE.
   *
   * Returns all decks structured as a tree with card counts at each node.
   * The recursive CTE starts from root decks (parent_id IS NULL) and
   * traverses the full depth of the hierarchy. Card counts are aggregated
   * per-deck via LEFT JOIN, and then child counts are accumulated into
   * parent totals during tree assembly.
   *
   * The SQL uses:
   *  - WITH RECURSIVE to traverse the deck hierarchy
   *  - LEFT JOIN cards to count new/due/learning/paused per deck
   *  - COUNT with FILTER to compute category counts in a single pass
   *
   * @param userId - The user whose deck tree to retrieve
   * @returns Array of root-level DeckTreeNodes, each with nested children
   */
  async getDeckTree(userId: string): Promise<DeckTreeNode[]> {
    const result = await query(
      `WITH RECURSIVE deck_tree AS (
         -- Base case: root-level decks (no parent)
         SELECT d.id, d.user_id, d.name, d.parent_id, d.preset_id,
                d.description, d.is_filtered, d.filter_query,
                d.position, d.created_at,
                0 AS depth
         FROM decks d
         WHERE d.parent_id IS NULL AND d.user_id = $1

         UNION ALL

         -- Recursive case: children of already-selected decks
         SELECT d.id, d.user_id, d.name, d.parent_id, d.preset_id,
                d.description, d.is_filtered, d.filter_query,
                d.position, d.created_at,
                dt.depth + 1
         FROM decks d
         JOIN deck_tree dt ON d.parent_id = dt.id
       )
       SELECT
         deck_tree.id,
         deck_tree.user_id,
         deck_tree.name,
         deck_tree.parent_id,
         deck_tree.preset_id,
         deck_tree.description,
         deck_tree.is_filtered,
         deck_tree.filter_query,
         deck_tree.position,
         deck_tree.created_at,
         deck_tree.depth,
         COUNT(c.id)::int AS "totalCards",
         COUNT(c.id) FILTER (
           WHERE c.card_type = 'new'
             AND c.status = 'active'
         )::int AS "newCards",
         COUNT(c.id) FILTER (
           WHERE c.card_type = 'review'
             AND c.status = 'active'
             AND c.due IS NOT NULL
             AND c.due <= NOW()
         )::int AS "dueCards",
         COUNT(c.id) FILTER (
           WHERE c.card_type IN ('learning', 'relearning')
             AND c.status = 'active'
         )::int AS "learningCards",
         COUNT(c.id) FILTER (
           WHERE c.status = 'paused'
         )::int AS "pausedCards"
       FROM deck_tree
       LEFT JOIN cards c ON c.deck_id = deck_tree.id
       GROUP BY
         deck_tree.id, deck_tree.user_id, deck_tree.name,
         deck_tree.parent_id, deck_tree.preset_id,
         deck_tree.description, deck_tree.is_filtered,
         deck_tree.filter_query, deck_tree.position,
         deck_tree.created_at, deck_tree.depth
       ORDER BY deck_tree.depth, deck_tree.position, deck_tree.name`,
      [userId]
    );

    return this.buildTreeFromRows(result.rows as DeckTreeRow[]);
  }

  /**
   * Get all subdecks of a given deck.
   *
   * When recursive is true, uses a recursive CTE to find all descendants.
   * When false, only returns direct children.
   *
   * @param deckId - The parent deck ID
   * @param recursive - Whether to include all descendants (default: false)
   * @returns Array of Decks
   */
  async getSubdecks(deckId: string, recursive = false): Promise<Deck[]> {
    let sql: string;
    const params: string[] = [deckId];

    if (recursive) {
      sql = `
        WITH RECURSIVE deck_subtree AS (
          SELECT id, user_id, name, parent_id, preset_id,
                 description, is_filtered, filter_query,
                 position, created_at
          FROM decks
          WHERE parent_id = $1

          UNION ALL

          SELECT d.id, d.user_id, d.name, d.parent_id, d.preset_id,
                 d.description, d.is_filtered, d.filter_query,
                 d.position, d.created_at
          FROM decks d
          JOIN deck_subtree ds ON d.parent_id = ds.id
        )
        SELECT * FROM deck_subtree
        ORDER BY name`;
    } else {
      sql = `
        SELECT id, user_id, name, parent_id, preset_id,
               description, is_filtered, filter_query,
               position, created_at
        FROM decks
        WHERE parent_id = $1
        ORDER BY position, name`;
    }

    const result = await query(sql, params);
    return result.rows.map((row) => this.mapRowToDeck(row));
  }

  /**
   * Get all ancestors of a deck, from the root down to the immediate parent.
   *
   * Uses a recursive CTE that walks up the tree from the given deck to the
   * root. The result is ordered from root (depth 0) to the immediate parent.
   *
   * @param deckId - The deck whose ancestors to find
   * @returns Array of ancestor Decks, ordered root-first
   */
  async getAncestors(deckId: string): Promise<Deck[]> {
    const result = await query(
      `WITH RECURSIVE ancestors AS (
         -- Start from the given deck's parent
         SELECT d.id, d.user_id, d.name, d.parent_id, d.preset_id,
                d.description, d.is_filtered, d.filter_query,
                d.position, d.created_at,
                1 AS depth
         FROM decks d
         WHERE d.id = (SELECT parent_id FROM decks WHERE id = $1)

         UNION ALL

         -- Walk up to the next parent
         SELECT d.id, d.user_id, d.name, d.parent_id, d.preset_id,
                d.description, d.is_filtered, d.filter_query,
                d.position, d.created_at,
                a.depth + 1
         FROM decks d
         JOIN ancestors a ON d.id = a.parent_id
       )
       SELECT id, user_id, name, parent_id, preset_id,
              description, is_filtered, filter_query,
              position, created_at
       FROM ancestors
       ORDER BY depth DESC`,
      [deckId]
    );

    return result.rows.map((row) => this.mapRowToDeck(row));
  }

  /**
   * Move a deck to a new parent (or to root level if newParentId is null).
   *
   * Validates that the move does not create a circular reference by checking
   * that the new parent is not a descendant of the deck being moved.
   *
   * @param deckId - The deck to move
   * @param newParentId - The new parent deck ID, or null for root level
   * @throws Error if the move would create a circular reference
   */
  async moveDeck(deckId: string, newParentId: string | null): Promise<void> {
    if (newParentId === deckId) {
      throw new Error('A deck cannot be its own parent');
    }

    // Check for circular reference: ensure newParentId is not a descendant of deckId
    if (newParentId) {
      const circularCheck = await query(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM decks WHERE parent_id = $1
           UNION ALL
           SELECT d.id FROM decks d JOIN descendants desc_cte ON d.parent_id = desc_cte.id
         )
         SELECT id FROM descendants WHERE id = $2
         LIMIT 1`,
        [deckId, newParentId]
      );

      if (circularCheck.rows.length > 0) {
        throw new Error(
          'Cannot move deck: the target parent is a descendant of this deck, which would create a cycle'
        );
      }

      // Verify the new parent exists
      const parentCheck = await query(
        `SELECT id, user_id FROM decks WHERE id = $1`,
        [newParentId]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error(`Target parent deck "${newParentId}" not found`);
      }
    }

    // Get the next position under the new parent
    const deck = await this.getDeck(deckId);
    const posResult = await query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
       FROM decks
       WHERE user_id = $1
         AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))`,
      [deck.userId, newParentId]
    );
    const nextPosition = parseInt(String(posResult.rows[0]?.next_pos ?? '0'), 10);

    const result = await query(
      `UPDATE decks SET parent_id = $1, position = $2 WHERE id = $3 RETURNING id`,
      [newParentId, nextPosition, deckId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Deck "${deckId}" not found`);
    }
  }

  // =========================================================================
  // Deck Preset Operations
  // =========================================================================

  /**
   * Create a new deck preset for a user.
   *
   * Any fields not provided in the partial preset will use default values.
   *
   * @param userId - Owner of the preset
   * @param preset - Partial preset object with desired settings
   * @returns The newly created DeckPreset
   */
  async createPreset(
    userId: string,
    preset: Partial<DeckPreset>
  ): Promise<DeckPreset> {
    const name = preset.name?.trim();
    if (!name) {
      throw new Error('Preset name cannot be empty');
    }

    const p = { ...DEFAULT_PRESET, ...preset };

    const result = await query(
      `INSERT INTO deck_presets (
         user_id, name, new_cards_per_day, max_reviews_per_day,
         learning_steps, relearning_steps,
         graduating_interval_days, easy_interval_days,
         desired_retention, fsrs_parameters,
         leech_threshold, leech_action,
         bury_new_siblings, bury_review_siblings
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, user_id, name, new_cards_per_day, max_reviews_per_day,
                 learning_steps, relearning_steps,
                 graduating_interval_days, easy_interval_days,
                 desired_retention, fsrs_parameters,
                 leech_threshold, leech_action,
                 bury_new_siblings, bury_review_siblings`,
      [
        userId,
        name,
        p.newCardsPerDay,
        p.maxReviewsPerDay,
        JSON.stringify(p.learningSteps),
        JSON.stringify(p.relearningSteps),
        p.graduatingIntervalDays,
        p.easyIntervalDays,
        p.desiredRetention,
        p.fsrsParameters ? JSON.stringify(p.fsrsParameters) : null,
        p.leechThreshold,
        p.leechAction,
        p.buryNewSiblings,
        p.buryReviewSiblings,
      ]
    );

    return this.mapRowToPreset(result.rows[0]);
  }

  /**
   * Retrieve a single preset by its ID.
   *
   * @param presetId - The preset's unique identifier
   * @returns The DeckPreset object
   * @throws Error if the preset is not found
   */
  async getPreset(presetId: string): Promise<DeckPreset> {
    const result = await query(
      `SELECT id, user_id, name, new_cards_per_day, max_reviews_per_day,
              learning_steps, relearning_steps,
              graduating_interval_days, easy_interval_days,
              desired_retention, fsrs_parameters,
              leech_threshold, leech_action,
              bury_new_siblings, bury_review_siblings
       FROM deck_presets
       WHERE id = $1`,
      [presetId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    return this.mapRowToPreset(result.rows[0]);
  }

  /**
   * Update one or more fields of an existing preset.
   *
   * Only provided fields are modified; others remain unchanged.
   *
   * @param presetId - The preset to update
   * @param updates - Partial preset object with fields to change
   * @returns The updated DeckPreset
   * @throws Error if the preset is not found
   */
  async updatePreset(
    presetId: string,
    updates: Partial<DeckPreset>
  ): Promise<DeckPreset> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Preset name cannot be empty');
      }
      setClauses.push(`name = $${paramIndex++}`);
      values.push(trimmedName);
    }

    if (updates.newCardsPerDay !== undefined) {
      setClauses.push(`new_cards_per_day = $${paramIndex++}`);
      values.push(updates.newCardsPerDay);
    }

    if (updates.maxReviewsPerDay !== undefined) {
      setClauses.push(`max_reviews_per_day = $${paramIndex++}`);
      values.push(updates.maxReviewsPerDay);
    }

    if (updates.learningSteps !== undefined) {
      setClauses.push(`learning_steps = $${paramIndex++}`);
      values.push(JSON.stringify(updates.learningSteps));
    }

    if (updates.relearningSteps !== undefined) {
      setClauses.push(`relearning_steps = $${paramIndex++}`);
      values.push(JSON.stringify(updates.relearningSteps));
    }

    if (updates.graduatingIntervalDays !== undefined) {
      setClauses.push(`graduating_interval_days = $${paramIndex++}`);
      values.push(updates.graduatingIntervalDays);
    }

    if (updates.easyIntervalDays !== undefined) {
      setClauses.push(`easy_interval_days = $${paramIndex++}`);
      values.push(updates.easyIntervalDays);
    }

    if (updates.desiredRetention !== undefined) {
      setClauses.push(`desired_retention = $${paramIndex++}`);
      values.push(updates.desiredRetention);
    }

    if (updates.fsrsParameters !== undefined) {
      setClauses.push(`fsrs_parameters = $${paramIndex++}`);
      values.push(
        updates.fsrsParameters ? JSON.stringify(updates.fsrsParameters) : null
      );
    }

    if (updates.leechThreshold !== undefined) {
      setClauses.push(`leech_threshold = $${paramIndex++}`);
      values.push(updates.leechThreshold);
    }

    if (updates.leechAction !== undefined) {
      setClauses.push(`leech_action = $${paramIndex++}`);
      values.push(updates.leechAction);
    }

    if (updates.buryNewSiblings !== undefined) {
      setClauses.push(`bury_new_siblings = $${paramIndex++}`);
      values.push(updates.buryNewSiblings);
    }

    if (updates.buryReviewSiblings !== undefined) {
      setClauses.push(`bury_review_siblings = $${paramIndex++}`);
      values.push(updates.buryReviewSiblings);
    }

    if (setClauses.length === 0) {
      return this.getPreset(presetId);
    }

    values.push(presetId);

    const result = await query(
      `UPDATE deck_presets
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, user_id, name, new_cards_per_day, max_reviews_per_day,
                 learning_steps, relearning_steps,
                 graduating_interval_days, easy_interval_days,
                 desired_retention, fsrs_parameters,
                 leech_threshold, leech_action,
                 bury_new_siblings, bury_review_siblings`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    return this.mapRowToPreset(result.rows[0]);
  }

  /**
   * Delete a preset.
   *
   * Any decks referencing this preset will have their preset_id set to NULL.
   *
   * @param presetId - The preset to delete
   * @throws Error if the preset is not found
   */
  async deletePreset(presetId: string): Promise<void> {
    await withTransaction(async (client) => {
      // Unlink decks that reference this preset
      await client.query(
        `UPDATE decks SET preset_id = NULL WHERE preset_id = $1`,
        [presetId]
      );

      const result = await client.query(
        `DELETE FROM deck_presets WHERE id = $1 RETURNING id`,
        [presetId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Preset "${presetId}" not found`);
      }
    });
  }

  /**
   * Get all presets for a user.
   *
   * @param userId - The user whose presets to retrieve
   * @returns Array of DeckPresets
   */
  async getPresets(userId: string): Promise<DeckPreset[]> {
    const result = await query(
      `SELECT id, user_id, name, new_cards_per_day, max_reviews_per_day,
              learning_steps, relearning_steps,
              graduating_interval_days, easy_interval_days,
              desired_retention, fsrs_parameters,
              leech_threshold, leech_action,
              bury_new_siblings, bury_review_siblings
       FROM deck_presets
       WHERE user_id = $1
       ORDER BY name`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToPreset(row));
  }

  /**
   * Apply a preset to a deck.
   *
   * Sets the deck's preset_id to the given preset, which changes its
   * scheduling configuration.
   *
   * @param deckId - The deck to apply the preset to
   * @param presetId - The preset to apply
   * @throws Error if the deck or preset is not found
   */
  async applyPreset(deckId: string, presetId: string): Promise<void> {
    // Verify preset exists
    const presetCheck = await query(
      `SELECT id FROM deck_presets WHERE id = $1`,
      [presetId]
    );
    if (presetCheck.rows.length === 0) {
      throw new Error(`Preset "${presetId}" not found`);
    }

    const result = await query(
      `UPDATE decks SET preset_id = $1 WHERE id = $2 RETURNING id`,
      [presetId, deckId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Deck "${deckId}" not found`);
    }
  }

  // =========================================================================
  // Filtered Deck Operations (Section 1.4)
  // =========================================================================

  /**
   * Create a filtered (custom study) deck.
   *
   * Filtered decks are temporary decks populated by a search query.
   * On creation, the search query is executed via SearchService and matching
   * cards are temporarily moved into the filtered deck. Each moved card's
   * original deck_id and due date are stored in custom_data so they can be
   * restored when the filtered deck is emptied or deleted.
   *
   * Cards in filtered decks use odue (original due) and odeck_id (original
   * deck) stored in custom_data to preserve scheduling.
   *
   * @param userId - Owner of the filtered deck
   * @param name - Display name for the filtered deck
   * @param searchQuery - The search query to find cards
   * @param limit - Maximum number of cards to include (default: 100)
   * @param order - Sort order for card selection (default: 'due_date_asc')
   * @returns The newly created filtered Deck
   */
  async createFilteredDeck(
    userId: string,
    name: string,
    searchQuery: string,
    limit = 100,
    order: FilteredDeckOrder | string = 'due_date_asc'
  ): Promise<Deck> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Filtered deck name cannot be empty');
    }

    if (!searchQuery.trim()) {
      throw new Error('Search query cannot be empty for a filtered deck');
    }

    return await withTransaction(async (client) => {
      // Create the filtered deck
      const deckResult = await client.query(
        `INSERT INTO decks (user_id, name, is_filtered, filter_query, description, position)
         VALUES ($1, $2, TRUE, $3, 'Custom Study', 0)
         RETURNING id, user_id, name, parent_id, preset_id, description,
                   is_filtered, filter_query, position, created_at`,
        [userId, trimmedName, searchQuery]
      );

      const filteredDeck = this.mapRowToDeck(deckResult.rows[0]);

      // Use the SearchService to find matching cards
      const pool: DatabasePool = {
        query: (text: string, values?: unknown[]) => client.query(text, values),
      };
      const searchService = new SearchService(pool);
      const searchResult = await searchService.search(userId, searchQuery, {
        page: 1,
        pageSize: limit,
        sortBy: this.resolveFilterOrderSortKey(order as FilteredDeckOrder),
        sortDirection: this.resolveFilterOrderDirection(order as FilteredDeckOrder),
      });

      // Move matching cards into the filtered deck, preserving originals
      for (const cardWithNote of searchResult.cards) {
        const card = cardWithNote.card;

        // Skip cards already in a filtered deck
        if (cardWithNote.deck.isFiltered) {
          continue;
        }

        // Store original deck_id and due date in custom_data
        await client.query(
          `UPDATE cards
           SET deck_id = $1,
               custom_data = jsonb_set(
                 jsonb_set(
                   custom_data,
                   '{original_deck_id}',
                   to_jsonb($2::text)
                 ),
                 '{odue}',
                 CASE WHEN due IS NOT NULL
                   THEN to_jsonb(due::text)
                   ELSE 'null'::jsonb
                 END
               ),
               updated_at = NOW()
           WHERE id = $3
             AND deck_id != $1`,
          [filteredDeck.id, card.deckId, card.id]
        );
      }

      return filteredDeck;
    });
  }

  /**
   * Rebuild a filtered deck by re-running its search query.
   *
   * First empties the deck (returning cards to original decks), then
   * re-populates it with fresh search results.
   *
   * @param deckId - The filtered deck to rebuild
   * @returns The number of cards now in the deck
   * @throws Error if the deck is not found or is not a filtered deck
   */
  async rebuildFilteredDeck(deckId: string): Promise<number> {
    const deck = await this.getDeck(deckId);

    if (!deck.isFiltered) {
      throw new Error(`Deck "${deckId}" is not a filtered deck`);
    }

    if (!deck.filterQuery) {
      throw new Error(`Filtered deck "${deckId}" has no search query`);
    }

    // Empty the deck first
    await this.emptyFilteredDeck(deckId);

    // Re-create by running the search query again
    return await withTransaction(async (client) => {
      const pool: DatabasePool = {
        query: (text: string, values?: unknown[]) => client.query(text, values),
      };
      const searchService = new SearchService(pool);
      const searchResult = await searchService.search(
        deck.userId,
        deck.filterQuery!,
        { page: 1, pageSize: 1000 }
      );

      let movedCount = 0;

      for (const cardWithNote of searchResult.cards) {
        const card = cardWithNote.card;

        // Skip cards already in a filtered deck
        if (cardWithNote.deck.isFiltered) {
          continue;
        }

        const updateResult = await client.query(
          `UPDATE cards
           SET deck_id = $1,
               custom_data = jsonb_set(
                 jsonb_set(
                   custom_data,
                   '{original_deck_id}',
                   to_jsonb($2::text)
                 ),
                 '{odue}',
                 CASE WHEN due IS NOT NULL
                   THEN to_jsonb(due::text)
                   ELSE 'null'::jsonb
                 END
               ),
               updated_at = NOW()
           WHERE id = $3
             AND deck_id != $1`,
          [deckId, card.deckId, card.id]
        );

        movedCount += updateResult.rowCount ?? 0;
      }

      return movedCount;
    });
  }

  /**
   * Empty a filtered deck, returning all cards to their original decks.
   *
   * Reads the original_deck_id and odue from each card's custom_data and
   * restores them. Clears the filtered-deck metadata from custom_data.
   *
   * @param deckId - The filtered deck to empty
   * @throws Error if the deck is not found or is not a filtered deck
   */
  async emptyFilteredDeck(deckId: string): Promise<void> {
    const deck = await this.getDeck(deckId);

    if (!deck.isFiltered) {
      throw new Error(`Deck "${deckId}" is not a filtered deck`);
    }

    await withTransaction(async (client) => {
      await this.emptyFilteredDeckWithClient(client, deckId);
    });
  }

  // =========================================================================
  // Study Info
  // =========================================================================

  /**
   * Get study progress and limits for a specific deck.
   *
   * Calculates how many new and review cards have been studied today,
   * and what the per-deck limits are (from the deck's preset or defaults).
   * When includeSubdecks is true, aggregates across the entire subtree.
   *
   * @param deckId - The deck to get study info for
   * @param includeSubdecks - Whether to include subdeck cards (default: true)
   * @returns The DeckStudyInfo for this deck
   */
  async getDeckStudyInfo(
    deckId: string,
    includeSubdecks = true
  ): Promise<DeckStudyInfo> {
    const deck = await this.getDeck(deckId);

    // Get the effective preset for this deck
    let newCardsLimit = DEFAULT_PRESET.newCardsPerDay;
    let reviewCardsLimit = DEFAULT_PRESET.maxReviewsPerDay;

    if (deck.presetId) {
      try {
        const preset = await this.getPreset(deck.presetId);
        newCardsLimit = preset.newCardsPerDay;
        reviewCardsLimit = preset.maxReviewsPerDay;
      } catch {
        // Preset not found, use defaults
      }
    }

    // Build the deck ID filter: either just this deck or include subdecks
    let deckFilterSQL: string;
    const params: unknown[] = [];

    if (includeSubdecks) {
      deckFilterSQL = `
        c.deck_id IN (
          WITH RECURSIVE deck_subtree AS (
            SELECT id FROM decks WHERE id = $1
            UNION ALL
            SELECT d.id FROM decks d JOIN deck_subtree ds ON d.parent_id = ds.id
          )
          SELECT id FROM deck_subtree
        )`;
      params.push(deckId);
    } else {
      deckFilterSQL = `c.deck_id = $1`;
      params.push(deckId);
    }

    // Count new cards studied today (cards that were 'new' and got reviewed today)
    const todayStart = `CURRENT_DATE`;

    const studyResult = await query(
      `SELECT
         -- New cards studied today: review logs for cards from this deck
         -- where the card transitioned from 'new' state today
         (SELECT COUNT(DISTINCT rl.card_id)
          FROM review_logs rl
          JOIN cards c ON rl.card_id = c.id
          WHERE ${deckFilterSQL.replace('$1', `$${params.length}`)}
            AND rl.reviewed_at >= ${todayStart}
            AND rl.review_type = 'learning'
         ) AS new_studied_today,

         -- Review cards studied today
         (SELECT COUNT(DISTINCT rl.card_id)
          FROM review_logs rl
          JOIN cards c ON rl.card_id = c.id
          WHERE ${deckFilterSQL.replace('$1', `$${params.length}`)}
            AND rl.reviewed_at >= ${todayStart}
            AND rl.review_type = 'review'
         ) AS reviews_studied_today,

         -- Currently learning/relearning cards
         (SELECT COUNT(c.id)
          FROM cards c
          WHERE ${deckFilterSQL.replace('$1', `$${params.length}`)}
            AND c.card_type IN ('learning', 'relearning')
            AND c.status = 'active'
         ) AS learning_cards,

         -- New cards available
         (SELECT COUNT(c.id)
          FROM cards c
          WHERE ${deckFilterSQL.replace('$1', `$${params.length}`)}
            AND c.card_type = 'new'
            AND c.status = 'active'
         ) AS new_available,

         -- Review cards due
         (SELECT COUNT(c.id)
          FROM cards c
          WHERE ${deckFilterSQL.replace('$1', `$${params.length}`)}
            AND c.card_type = 'review'
            AND c.status = 'active'
            AND c.due IS NOT NULL
            AND c.due <= NOW()
         ) AS reviews_due`,
      params
    );

    const row = studyResult.rows[0] || {};
    const newStudiedToday = parseInt(String(row.new_studied_today ?? '0'), 10);
    const reviewsStudiedToday = parseInt(String(row.reviews_studied_today ?? '0'), 10);
    const learningCards = parseInt(String(row.learning_cards ?? '0'), 10);
    const newAvailable = parseInt(String(row.new_available ?? '0'), 10);
    const reviewsDue = parseInt(String(row.reviews_due ?? '0'), 10);

    // Calculate effective remaining new/review cards respecting limits
    const newRemaining = Math.max(0, Math.min(newAvailable, newCardsLimit - newStudiedToday));
    const reviewRemaining = Math.max(0, Math.min(reviewsDue, reviewCardsLimit - reviewsStudiedToday));
    const totalDue = newRemaining + reviewRemaining + learningCards;

    return {
      deckId: deck.id,
      deckName: deck.name,
      newCardsToday: newStudiedToday,
      newCardsLimit,
      reviewCardsToday: reviewsStudiedToday,
      reviewCardsLimit,
      learningCards,
      totalDue,
    };
  }

  /**
   * Get the next position for a new card in a deck.
   *
   * This is used for inserting new cards at the correct position in the
   * new-card queue. Returns the count of existing new cards in the deck.
   *
   * @param deckId - The deck to query
   * @returns The next position number
   */
  async getNextNewCardPosition(deckId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*)::int AS position
       FROM cards
       WHERE deck_id = $1
         AND card_type = 'new'
         AND status = 'active'`,
      [deckId]
    );

    return parseInt(String(result.rows[0]?.position ?? '0'), 10);
  }

  // =========================================================================
  // Card Operations
  // =========================================================================

  /**
   * Move one or more cards to a different deck.
   *
   * @param cardIds - Array of card IDs to move
   * @param targetDeckId - The destination deck ID
   * @returns The number of cards successfully moved
   * @throws Error if the target deck is not found
   */
  async moveCardsToDeck(cardIds: string[], targetDeckId: string): Promise<number> {
    if (cardIds.length === 0) {
      return 0;
    }

    // Verify target deck exists
    const deckCheck = await query(
      `SELECT id FROM decks WHERE id = $1`,
      [targetDeckId]
    );
    if (deckCheck.rows.length === 0) {
      throw new Error(`Target deck "${targetDeckId}" not found`);
    }

    const result = await query(
      `UPDATE cards
       SET deck_id = $1, updated_at = NOW()
       WHERE id = ANY($2::uuid[])`,
      [targetDeckId, cardIds]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Get all cards in a deck, optionally including subdeck cards.
   *
   * When includeSubdecks is true, uses a recursive CTE to find all
   * descendant decks and returns cards from all of them.
   *
   * @param deckId - The deck to query
   * @param includeSubdecks - Whether to include subdeck cards (default: false)
   * @returns Array of DeckCard objects
   */
  async getCardsInDeck(
    deckId: string,
    includeSubdecks = false
  ): Promise<DeckCard[]> {
    let sql: string;
    const params: string[] = [deckId];

    if (includeSubdecks) {
      sql = `
        WITH RECURSIVE deck_subtree AS (
          SELECT id FROM decks WHERE id = $1
          UNION ALL
          SELECT d.id FROM decks d JOIN deck_subtree ds ON d.parent_id = ds.id
        )
        SELECT c.id, c.note_id, c.deck_id, c.template_ordinal,
               c.status, c.card_type, c.due, c.interval_days,
               c.stability, c.difficulty, c.last_review_at,
               c.reps, c.lapses, c.flag, c.custom_data,
               c.created_at, c.updated_at
        FROM cards c
        JOIN deck_subtree ds ON c.deck_id = ds.id
        ORDER BY c.card_type, c.due NULLS LAST, c.created_at`;
    } else {
      sql = `
        SELECT id, note_id, deck_id, template_ordinal,
               status, card_type, due, interval_days,
               stability, difficulty, last_review_at,
               reps, lapses, flag, custom_data,
               created_at, updated_at
        FROM cards
        WHERE deck_id = $1
        ORDER BY card_type, due NULLS LAST, created_at`;
    }

    const result = await query(sql, params);
    return result.rows.map((row) => this.mapRowToDeckCard(row));
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Internal helper to empty a filtered deck using an existing client
   * (for use within transactions).
   *
   * Returns each card to its original deck by reading original_deck_id
   * from custom_data. Restores the original due date from odue.
   * Clears the filtered-deck metadata from custom_data.
   */
  private async emptyFilteredDeckWithClient(
    client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> },
    deckId: string
  ): Promise<void> {
    // Get all cards currently in this filtered deck
    const cardsResult = await client.query(
      `SELECT id, custom_data FROM cards WHERE deck_id = $1`,
      [deckId]
    );

    for (const row of cardsResult.rows) {
      const cardId = String(row.id);
      const customData = (row.custom_data as Record<string, unknown>) || {};
      const originalDeckId = customData.original_deck_id as string | undefined;
      const odue = customData.odue as string | undefined;

      if (originalDeckId) {
        // Verify the original deck still exists
        const origDeckCheck = await client.query(
          `SELECT id FROM decks WHERE id = $1`,
          [originalDeckId]
        );

        if (origDeckCheck.rows.length > 0) {
          // Restore the card to its original deck and due date
          await client.query(
            `UPDATE cards
             SET deck_id = $1,
                 due = CASE
                   WHEN $2::text IS NOT NULL AND $2::text != 'null'
                     THEN $2::timestamptz
                   ELSE due
                 END,
                 custom_data = custom_data - 'original_deck_id' - 'odue',
                 updated_at = NOW()
             WHERE id = $3`,
            [originalDeckId, odue || null, cardId]
          );
        } else {
          // Original deck was deleted; just clear the metadata
          // Card stays orphaned in the filtered deck -- deletion will clean it up
          await client.query(
            `UPDATE cards
             SET custom_data = custom_data - 'original_deck_id' - 'odue',
                 updated_at = NOW()
             WHERE id = $1`,
            [cardId]
          );
        }
      }
    }
  }

  /**
   * Resolve a FilteredDeckOrder to a search service sort key.
   */
  private resolveFilterOrderSortKey(order: FilteredDeckOrder): string {
    switch (order) {
      case 'due_date_asc':
      case 'due_date_desc':
        return 'due';
      case 'added_asc':
      case 'added_desc':
        return 'created';
      case 'interval_asc':
      case 'interval_desc':
        return 'interval';
      case 'lapses_desc':
        return 'lapses';
      case 'difficulty_desc':
        return 'difficulty';
      case 'random':
        return 'created'; // Fallback for random; actual randomness would need custom logic
      default:
        return 'due';
    }
  }

  /**
   * Resolve a FilteredDeckOrder to a sort direction.
   */
  private resolveFilterOrderDirection(order: FilteredDeckOrder): 'asc' | 'desc' {
    switch (order) {
      case 'due_date_asc':
      case 'added_asc':
      case 'interval_asc':
        return 'asc';
      case 'due_date_desc':
      case 'added_desc':
      case 'interval_desc':
      case 'lapses_desc':
      case 'difficulty_desc':
        return 'desc';
      case 'random':
        return 'asc';
      default:
        return 'asc';
    }
  }

  /**
   * Map a raw database row to a typed Deck object.
   */
  private mapRowToDeck(row: Record<string, unknown>): Deck {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      name: String(row.name ?? ''),
      parentId: row.parent_id ? String(row.parent_id) : null,
      presetId: row.preset_id ? String(row.preset_id) : null,
      description: String(row.description ?? ''),
      isFiltered: Boolean(row.is_filtered),
      filterQuery: row.filter_query ? String(row.filter_query) : null,
      position: parseInt(String(row.position ?? '0'), 10),
      createdAt: new Date(String(row.created_at)),
    };
  }

  /**
   * Map a raw database row to a typed DeckPreset object.
   */
  private mapRowToPreset(row: Record<string, unknown>): DeckPreset {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      name: String(row.name ?? ''),
      newCardsPerDay: parseInt(String(row.new_cards_per_day ?? '20'), 10),
      maxReviewsPerDay: parseInt(String(row.max_reviews_per_day ?? '200'), 10),
      learningSteps: this.parseJsonArray(row.learning_steps, [1, 10]),
      relearningSteps: this.parseJsonArray(row.relearning_steps, [10]),
      graduatingIntervalDays: parseInt(String(row.graduating_interval_days ?? '1'), 10),
      easyIntervalDays: parseInt(String(row.easy_interval_days ?? '4'), 10),
      desiredRetention: parseFloat(String(row.desired_retention ?? '0.9')),
      fsrsParameters: row.fsrs_parameters
        ? this.parseJsonArray(row.fsrs_parameters, null)
        : null,
      leechThreshold: parseInt(String(row.leech_threshold ?? '8'), 10),
      leechAction: String(row.leech_action ?? 'tag_only') as 'tag_only' | 'pause',
      buryNewSiblings: Boolean(row.bury_new_siblings),
      buryReviewSiblings: Boolean(row.bury_review_siblings),
    };
  }

  /**
   * Map a raw database row to a typed DeckCard object.
   */
  private mapRowToDeckCard(row: Record<string, unknown>): DeckCard {
    return {
      id: String(row.id),
      noteId: String(row.note_id),
      deckId: String(row.deck_id),
      templateOrdinal: parseInt(String(row.template_ordinal ?? '0'), 10),
      status: String(row.status ?? 'active') as DeckCard['status'],
      cardType: String(row.card_type ?? 'new') as DeckCard['cardType'],
      due: row.due ? new Date(String(row.due)) : null,
      intervalDays: parseInt(String(row.interval_days ?? '0'), 10),
      stability: parseFloat(String(row.stability ?? '0')),
      difficulty: parseFloat(String(row.difficulty ?? '0')),
      lastReviewAt: row.last_review_at ? new Date(String(row.last_review_at)) : null,
      reps: parseInt(String(row.reps ?? '0'), 10),
      lapses: parseInt(String(row.lapses ?? '0'), 10),
      flag: parseInt(String(row.flag ?? '0'), 10),
      customData: (row.custom_data as Record<string, unknown>) ?? {},
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }

  /**
   * Parse a JSON array from a database column.
   *
   * Handles both string representations (from JSONB) and already-parsed arrays.
   */
  private parseJsonArray<T>(value: unknown, fallback: T[] | null): T[] | null {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * Assemble a flat list of DeckTreeRows (from the recursive CTE) into a
   * nested tree structure with accumulated child counts.
   *
   * Two-pass algorithm:
   *  1. Create all nodes and index them by ID.
   *  2. Link children to parents; root nodes go into the roots array.
   *
   * After tree construction, a bottom-up traversal accumulates subdeck
   * card counts into parent nodes so that each parent reflects the total
   * across its entire subtree.
   *
   * @param rows - Flat array of deck rows with depth and count information
   * @returns Array of root-level DeckTreeNodes with nested children
   */
  private buildTreeFromRows(rows: DeckTreeRow[]): DeckTreeNode[] {
    const nodeMap = new Map<string, DeckTreeNode>();
    const roots: DeckTreeNode[] = [];

    // First pass: create all nodes
    for (const row of rows) {
      const node: DeckTreeNode = {
        id: String(row.id ?? (row as unknown as Record<string, unknown>).id),
        userId: String(row.userId ?? (row as unknown as Record<string, unknown>).user_id),
        name: String(row.name ?? ''),
        parentId: row.parentId !== undefined
          ? (row.parentId ? String(row.parentId) : null)
          : ((row as unknown as Record<string, unknown>).parent_id
            ? String((row as unknown as Record<string, unknown>).parent_id)
            : null),
        presetId: row.presetId !== undefined
          ? (row.presetId ? String(row.presetId) : null)
          : ((row as unknown as Record<string, unknown>).preset_id
            ? String((row as unknown as Record<string, unknown>).preset_id)
            : null),
        description: String(row.description ?? ''),
        isFiltered: Boolean(
          row.isFiltered ?? (row as unknown as Record<string, unknown>).is_filtered
        ),
        filterQuery: row.filterQuery !== undefined
          ? (row.filterQuery ? String(row.filterQuery) : null)
          : ((row as unknown as Record<string, unknown>).filter_query
            ? String((row as unknown as Record<string, unknown>).filter_query)
            : null),
        position: parseInt(
          String(row.position ?? (row as unknown as Record<string, unknown>).position ?? '0'),
          10
        ),
        createdAt: row.createdAt instanceof Date
          ? row.createdAt
          : new Date(String(
              row.createdAt ?? (row as unknown as Record<string, unknown>).created_at
            )),
        children: [],
        totalCards: parseInt(String(row.totalCards ?? (row as unknown as Record<string, unknown>).totalCards ?? '0'), 10),
        newCards: parseInt(String(row.newCards ?? (row as unknown as Record<string, unknown>).newCards ?? '0'), 10),
        dueCards: parseInt(String(row.dueCards ?? (row as unknown as Record<string, unknown>).dueCards ?? '0'), 10),
        learningCards: parseInt(String(row.learningCards ?? (row as unknown as Record<string, unknown>).learningCards ?? '0'), 10),
        pausedCards: parseInt(String(row.pausedCards ?? (row as unknown as Record<string, unknown>).pausedCards ?? '0'), 10),
        depth: parseInt(String(row.depth ?? '0'), 10),
      };
      nodeMap.set(node.id, node);
    }

    // Second pass: link parents to children
    for (const node of nodeMap.values()) {
      if (node.parentId === null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not in result set; treat as root
          roots.push(node);
        }
      }
    }

    // Third pass: accumulate child counts into parents (bottom-up DFS)
    function accumulateCounts(node: DeckTreeNode): void {
      for (const child of node.children) {
        accumulateCounts(child);
        node.totalCards += child.totalCards;
        node.newCards += child.newCards;
        node.dueCards += child.dueCards;
        node.learningCards += child.learningCards;
        node.pausedCards += child.pausedCards;
      }
    }

    for (const root of roots) {
      accumulateCounts(root);
    }

    return roots;
  }
}
