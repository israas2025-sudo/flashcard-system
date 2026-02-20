/**
 * Card Management Service
 *
 * Implements all card management operations from Sections 1.6 and 1.10 of
 * the flashcard system specification:
 *
 * Section 1.6 - Card Operations:
 *   - Set due date (single and batch)
 *   - Reset card to New state (single and batch)
 *   - Reposition new cards in the queue
 *   - Copy a note and all its cards
 *   - Toggle marked tag on a note
 *   - Check leech status and handle
 *
 * Section 1.10 - Study Session Helpers:
 *   - Get comprehensive card info for review display
 *   - Get previous card review info
 *   - Edit card fields during review
 *
 * All queries use parameterized statements. Transactional operations use
 * explicit BEGIN/COMMIT/ROLLBACK with client-level connections from the pool.
 */

import { Pool, PoolClient } from 'pg';
import type {
  CardInfo,
  PreviousCardInfo,
  LeechResult,
  Note,
  Card,
  CopyNoteResult,
} from './types';

// ---------------------------------------------------------------------------
// Helper: compute FSRS retrievability
// ---------------------------------------------------------------------------

/**
 * Compute the current probability of recall (retrievability) using the
 * FSRS-5 power forgetting curve.
 *
 * R(t, S) = (1 + t / (9 * S))^(-1)
 *
 * @param elapsedDays - Days since the last review.
 * @param stability   - Current memory stability in days.
 * @returns Probability of recall in [0, 1].
 */
function computeRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Convert FSRS difficulty (1-10 scale) to a legacy SM-2 ease factor
 * for display compatibility. Maps D=1 -> EF=3.0, D=10 -> EF=1.3.
 */
function difficultyToEaseFactor(difficulty: number): number {
  if (difficulty <= 0) return 2.5; // Default for new cards
  // Linear mapping: D=1 -> 3.0, D=10 -> 1.3
  const ef = 3.0 - ((difficulty - 1) / 9) * (3.0 - 1.3);
  return Math.round(ef * 100) / 100;
}

// ---------------------------------------------------------------------------
// CardManagementService
// ---------------------------------------------------------------------------

export class CardManagementService {
  constructor(private pool: Pool) {}

  // =========================================================================
  // Section 1.6: Set Due Date
  // =========================================================================

  /**
   * Set a specific due date for a card.
   *
   * If the card is in the 'new' state, it is transitioned to 'review' with
   * an initial interval computed from the difference between now and the
   * due date. This ensures the card enters the review pipeline correctly.
   *
   * @param cardId  - The card to reschedule.
   * @param dueDate - The new due date.
   * @throws Error if the card is not found.
   */
  async setDueDate(cardId: string, dueDate: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch current card state
      const cardResult = await client.query(
        `SELECT id, card_type, interval_days
         FROM cards WHERE id = $1 FOR UPDATE`,
        [cardId]
      );

      if (cardResult.rows.length === 0) {
        throw new Error(`Card "${cardId}" not found`);
      }

      const card = cardResult.rows[0];

      if (card.card_type === 'new') {
        // Transition from New to Review: compute initial interval
        const now = new Date();
        const intervalDays = Math.max(
          1,
          Math.round(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        await client.query(
          `UPDATE cards
           SET due = $2,
               card_type = 'review',
               interval_days = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [cardId, dueDate.toISOString(), intervalDays]
        );
      } else {
        await client.query(
          `UPDATE cards
           SET due = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [cardId, dueDate.toISOString()]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set the due date for multiple cards in a single operation.
   *
   * Cards in the 'new' state are transitioned to 'review' with an initial
   * interval, similar to the single-card operation.
   *
   * @param cardIds - Array of card IDs to reschedule.
   * @param dueDate - The new due date for all cards.
   * @returns The number of cards that were updated.
   */
  async batchSetDueDate(cardIds: string[], dueDate: Date): Promise<number> {
    if (cardIds.length === 0) return 0;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const now = new Date();
      const intervalDays = Math.max(
        1,
        Math.round(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      // Update new cards: transition to review with initial interval
      const newResult = await client.query(
        `UPDATE cards
         SET due = $2,
             card_type = 'review',
             interval_days = $3,
             updated_at = NOW()
         WHERE id = ANY($1::uuid[])
           AND card_type = 'new'`,
        [cardIds, dueDate.toISOString(), intervalDays]
      );

      // Update non-new cards: just change the due date
      const otherResult = await client.query(
        `UPDATE cards
         SET due = $2,
             updated_at = NOW()
         WHERE id = ANY($1::uuid[])
           AND card_type != 'new'`,
        [cardIds, dueDate.toISOString()]
      );

      await client.query('COMMIT');

      return (newResult.rowCount ?? 0) + (otherResult.rowCount ?? 0);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // Section 1.6: Reset Card to New
  // =========================================================================

  /**
   * Reset a card to the New state, clearing all scheduling data.
   *
   * This completely resets the card as if it had never been studied.
   * All FSRS parameters are zeroed out, the due date is cleared, and
   * the card type is set to 'new'.
   *
   * @param cardId - The card to reset.
   * @throws Error if the card is not found.
   */
  async resetToNew(cardId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE cards
       SET card_type = 'new',
           due = NULL,
           interval_days = 0,
           stability = 0,
           difficulty = 0,
           reps = 0,
           lapses = 0,
           last_review_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [cardId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }
  }

  /**
   * Reset multiple cards to the New state in a single operation.
   *
   * @param cardIds - Array of card IDs to reset.
   * @returns The number of cards that were reset.
   */
  async batchResetToNew(cardIds: string[]): Promise<number> {
    if (cardIds.length === 0) return 0;

    const result = await this.pool.query(
      `UPDATE cards
       SET card_type = 'new',
           due = NULL,
           interval_days = 0,
           stability = 0,
           difficulty = 0,
           reps = 0,
           lapses = 0,
           last_review_at = NULL,
           updated_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [cardIds]
    );

    return result.rowCount ?? 0;
  }

  // =========================================================================
  // Section 1.6: Reposition New Cards
  // =========================================================================

  /**
   * Reposition new cards in the new card queue by assigning position values.
   *
   * The position is stored in the card's `custom_data` JSON column under
   * the key "position". This position is used by the scheduler to determine
   * the order in which new cards are introduced.
   *
   * @param cardIds       - Array of card IDs to reposition (must all be 'new' type).
   * @param startPosition - The starting position number.
   * @param step          - The increment between positions (e.g. 1 for consecutive, 10 for spaced).
   * @param randomize     - If true, shuffle the positions randomly within the range.
   * @throws Error if any card is not in the 'new' state.
   */
  async repositionNewCards(
    cardIds: string[],
    startPosition: number,
    step: number,
    randomize: boolean
  ): Promise<void> {
    if (cardIds.length === 0) return;

    // Generate the position assignments
    const positions: number[] = [];
    for (let i = 0; i < cardIds.length; i++) {
      positions.push(startPosition + i * step);
    }

    if (randomize) {
      // Fisher-Yates shuffle
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Verify all cards are in 'new' state
      const verifyResult = await client.query(
        `SELECT id FROM cards
         WHERE id = ANY($1::uuid[])
           AND card_type != 'new'`,
        [cardIds]
      );

      if (verifyResult.rows.length > 0) {
        const nonNewIds = verifyResult.rows.map((r: { id: string }) => r.id);
        throw new Error(
          `Cannot reposition non-new cards: ${nonNewIds.join(', ')}`
        );
      }

      // Apply position to each card via custom_data JSONB update
      for (let i = 0; i < cardIds.length; i++) {
        await client.query(
          `UPDATE cards
           SET custom_data = jsonb_set(
             COALESCE(custom_data, '{}'::jsonb),
             '{position}',
             to_jsonb($2::int)
           ),
           updated_at = NOW()
           WHERE id = $1`,
          [cardIds[i], positions[i]]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // Section 1.6: Copy Note
  // =========================================================================

  /**
   * Create a copy of a note and all its cards.
   *
   * The copy gets new UUIDs and fresh timestamps. All cards are created in
   * the 'new' state regardless of the source card states. Tags from the
   * source note are copied to the new note.
   *
   * @param noteId       - The source note to copy.
   * @param targetDeckId - Optional target deck; if omitted, cards go to the same deck as the source.
   * @returns The new note and its cards.
   * @throws Error if the source note is not found.
   */
  async copyNote(
    noteId: string,
    targetDeckId?: string
  ): Promise<CopyNoteResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Read the source note
      const noteResult = await client.query(
        `SELECT id, user_id, note_type_id, fields
         FROM notes WHERE id = $1`,
        [noteId]
      );

      if (noteResult.rows.length === 0) {
        throw new Error(`Note "${noteId}" not found`);
      }

      const sourceNote = noteResult.rows[0];

      // 2. Create a new note with the same fields
      const newNoteResult = await client.query(
        `INSERT INTO notes (user_id, note_type_id, fields, sort_field_value, first_field_checksum)
         SELECT $1, $2, $3,
                sort_field_value,
                first_field_checksum
         FROM notes
         WHERE id = $4
         RETURNING id, note_type_id AS "noteTypeId", fields,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          sourceNote.user_id,
          sourceNote.note_type_id,
          JSON.stringify(sourceNote.fields),
          noteId,
        ]
      );

      const newNote: Note = newNoteResult.rows[0];

      // 3. Get source cards to know what templates to create
      const sourceCardsResult = await client.query(
        `SELECT deck_id, template_ordinal
         FROM cards WHERE note_id = $1
         ORDER BY template_ordinal`,
        [noteId]
      );

      // 4. Create new cards (all as 'new' state)
      const newCards: Card[] = [];
      for (const sourceCard of sourceCardsResult.rows) {
        const deckId = targetDeckId || sourceCard.deck_id;

        const newCardResult = await client.query(
          `INSERT INTO cards (
             note_id, deck_id, template_ordinal,
             status, card_type, due,
             interval_days, stability, difficulty,
             last_review_at, reps, lapses, flag, custom_data
           ) VALUES (
             $1, $2, $3,
             'active', 'new', NULL,
             0, 0, 0,
             NULL, 0, 0, 0, '{}'::jsonb
           )
           RETURNING
             id, note_id AS "noteId", deck_id AS "deckId",
             template_ordinal AS "templateOrdinal",
             status, card_type AS "cardType", due,
             interval_days AS "intervalDays", stability, difficulty,
             last_review_at AS "lastReviewAt", reps, lapses, flag,
             custom_data AS "customData",
             created_at AS "createdAt", updated_at AS "updatedAt"`,
          [newNote.id, deckId, sourceCard.template_ordinal]
        );

        newCards.push(newCardResult.rows[0] as Card);
      }

      // 5. Copy all tags from source note to new note
      await client.query(
        `INSERT INTO note_tags (note_id, tag_id)
         SELECT $1, tag_id
         FROM note_tags
         WHERE note_id = $2`,
        [newNote.id, noteId]
      );

      await client.query('COMMIT');

      return { note: newNote, cards: newCards };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // Section 1.6: Toggle Marked
  // =========================================================================

  /**
   * Toggle the "marked" tag on a note.
   *
   * If the note already has a tag with slug "marked", that tag is removed.
   * If it does not, the "marked" tag is created (if needed) and applied.
   *
   * @param noteId - The note to toggle the marked state on.
   * @returns `true` if the note is now marked, `false` if unmarked.
   * @throws Error if the note is not found.
   */
  async toggleMarked(noteId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get the note's owner
      const noteResult = await client.query(
        `SELECT id, user_id FROM notes WHERE id = $1`,
        [noteId]
      );

      if (noteResult.rows.length === 0) {
        throw new Error(`Note "${noteId}" not found`);
      }

      const userId = noteResult.rows[0].user_id;

      // Ensure the "Marked" tag exists for this user
      const tagResult = await client.query(
        `INSERT INTO tags (user_id, name, slug, color, icon, description)
         VALUES ($1, 'Marked', 'marked', '#F59E0B', '', 'Manually marked notes for review')
         ON CONFLICT (user_id, slug) WHERE parent_id IS NULL
         DO UPDATE SET name = 'Marked'
         RETURNING id`,
        [userId]
      );

      const markedTagId = tagResult.rows[0].id;

      // Check if the note already has the marked tag
      const existingResult = await client.query(
        `SELECT note_id FROM note_tags
         WHERE note_id = $1 AND tag_id = $2`,
        [noteId, markedTagId]
      );

      let isMarked: boolean;

      if (existingResult.rows.length > 0) {
        // Remove the marked tag
        await client.query(
          `DELETE FROM note_tags
           WHERE note_id = $1 AND tag_id = $2`,
          [noteId, markedTagId]
        );
        isMarked = false;
      } else {
        // Add the marked tag
        await client.query(
          `INSERT INTO note_tags (note_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (note_id, tag_id) DO NOTHING`,
          [noteId, markedTagId]
        );
        isMarked = true;
      }

      await client.query('COMMIT');
      return isMarked;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // Section 1.6: Check Leech
  // =========================================================================

  /**
   * Check if a card has become a leech and handle it accordingly.
   *
   * A leech is a card whose lapse count meets or exceeds the configured
   * threshold. When a leech is detected:
   *   - The "leech" tag is always added to the card's note.
   *   - If the action is 'pause', the card is also suspended.
   *
   * The leech check triggers on the exact threshold and then at every
   * subsequent interval of half the threshold to avoid repeated triggers
   * on every single review.
   *
   * @param cardId    - The card to check.
   * @param threshold - Number of lapses to trigger leech status.
   * @param action    - What to do: 'tag_only' or 'pause'.
   * @returns A LeechResult describing what happened.
   * @throws Error if the card is not found.
   */
  async checkLeech(
    cardId: string,
    threshold: number,
    action: 'tag_only' | 'pause'
  ): Promise<LeechResult> {
    // Get card's current state
    const cardResult = await this.pool.query(
      `SELECT c.id, c.lapses, c.note_id, d.user_id
       FROM cards c
       JOIN decks d ON c.deck_id = d.id
       WHERE c.id = $1`,
      [cardId]
    );

    if (cardResult.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }

    const card = cardResult.rows[0];

    // Not a leech if below threshold
    if (card.lapses < threshold) {
      return {
        isLeech: false,
        lapses: card.lapses,
        threshold,
        action,
        wasTagged: false,
        wasPaused: false,
      };
    }

    // Only trigger on exact threshold or subsequent half-threshold intervals
    const halfThreshold = Math.max(Math.floor(threshold / 2), 1);
    if (
      card.lapses !== threshold &&
      (card.lapses - threshold) % halfThreshold !== 0
    ) {
      return {
        isLeech: true,
        lapses: card.lapses,
        threshold,
        action,
        wasTagged: false,
        wasPaused: false,
      };
    }

    // Handle the leech
    const client = await this.pool.connect();
    let wasTagged = false;
    let wasPaused = false;

    try {
      await client.query('BEGIN');

      // Ensure a "leech" tag exists for this user
      const leechTagResult = await client.query(
        `INSERT INTO tags (user_id, name, slug, color, icon, description)
         VALUES ($1, 'Leech', 'leech', '#EF4444', '', 'Cards that have been failed many times')
         ON CONFLICT (user_id, slug) WHERE parent_id IS NULL
         DO UPDATE SET name = 'Leech'
         RETURNING id`,
        [card.user_id]
      );

      const leechTagId = leechTagResult.rows[0].id;

      // Tag the note as a leech
      const tagInsertResult = await client.query(
        `INSERT INTO note_tags (note_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (note_id, tag_id) DO NOTHING
         RETURNING note_id`,
        [card.note_id, leechTagId]
      );

      // wasTagged is true if the row was actually inserted (not a conflict)
      wasTagged = tagInsertResult.rows.length > 0;

      // If action is 'pause', also suspend the card
      if (action === 'pause') {
        const pauseResult = await client.query(
          `UPDATE cards
           SET status = 'paused',
               paused_at = NOW(),
               paused_by = 'leech_auto',
               pause_reason = $2,
               updated_at = NOW()
           WHERE id = $1
             AND status != 'paused'
           RETURNING id`,
          [
            cardId,
            `Leech detected: ${card.lapses} lapses (threshold: ${threshold})`,
          ]
        );
        wasPaused = (pauseResult.rowCount ?? 0) > 0;
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      isLeech: true,
      lapses: card.lapses,
      threshold,
      action,
      wasTagged,
      wasPaused,
    };
  }

  // =========================================================================
  // Section 1.10: Get Card Info
  // =========================================================================

  /**
   * Get comprehensive information about a card for display during review.
   *
   * Returns note fields, deck hierarchy, tags, scheduling data, review
   * statistics, retrievability, and special tag states (leech, marked).
   *
   * @param cardId - The card to retrieve info for.
   * @returns Complete CardInfo for the review UI.
   * @throws Error if the card is not found.
   */
  async getCardInfo(cardId: string): Promise<CardInfo> {
    // Main query: card + note + deck + note_type in a single join
    const mainResult = await this.pool.query(
      `SELECT
         c.id AS "cardId",
         c.note_id AS "noteId",
         c.template_ordinal AS "templateOrdinal",
         c.status,
         c.card_type AS "cardType",
         c.flag,
         c.due,
         c.interval_days AS "intervalDays",
         c.stability,
         c.difficulty,
         c.reps,
         c.lapses,
         c.last_review_at AS "lastReviewAt",
         c.created_at AS "createdAt",
         c.custom_data AS "customData",
         n.fields,
         n.note_type_id AS "noteTypeId",
         d.name AS "deckName",
         d.id AS "deckId",
         nt.name AS "noteTypeName",
         nt.card_templates AS "cardTemplates"
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       JOIN decks d ON c.deck_id = d.id
       JOIN note_types nt ON n.note_type_id = nt.id
       WHERE c.id = $1`,
      [cardId]
    );

    if (mainResult.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }

    const row = mainResult.rows[0];

    // Build deck path using recursive CTE
    const deckPathResult = await this.pool.query(
      `WITH RECURSIVE deck_path AS (
         SELECT id, name, parent_id, 0 AS depth
         FROM decks WHERE id = $1

         UNION ALL

         SELECT d.id, d.name, d.parent_id, dp.depth + 1
         FROM decks d
         JOIN deck_path dp ON d.id = dp.parent_id
       )
       SELECT name FROM deck_path
       ORDER BY depth DESC`,
      [row.deckId]
    );

    const deckPath = deckPathResult.rows.map((r: { name: string }) => r.name);

    // Get tags for this note
    const tagsResult = await this.pool.query(
      `SELECT t.name, t.slug
       FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = $1
       ORDER BY t.name`,
      [row.noteId]
    );

    const tags = tagsResult.rows.map((r: { name: string }) => r.name);
    const tagSlugs = tagsResult.rows.map((r: { slug: string }) => r.slug);
    const isLeech = tagSlugs.includes('leech');
    const isMarked = tagSlugs.includes('marked');

    // Get review statistics: first review, average time, total reviews
    const statsResult = await this.pool.query(
      `SELECT
         MIN(reviewed_at) AS "firstReviewAt",
         AVG(time_spent_ms)::int AS "averageTimeMs",
         COUNT(*)::int AS "totalReviews"
       FROM review_logs
       WHERE card_id = $1`,
      [cardId]
    );

    const stats = statsResult.rows[0];

    // Compute current retrievability
    let retrievabilityValue = 0;
    if (row.stability > 0 && row.lastReviewAt) {
      const elapsedDays =
        (Date.now() - new Date(row.lastReviewAt).getTime()) /
        (1000 * 60 * 60 * 24);
      retrievabilityValue = computeRetrievability(elapsedDays, row.stability);
    } else if (row.cardType === 'new') {
      retrievabilityValue = 0;
    }

    // Get position from custom_data
    const position =
      row.customData && typeof row.customData.position === 'number'
        ? row.customData.position
        : null;

    // Resolve template name from note type's card_templates array
    let templateName = `Card ${row.templateOrdinal + 1}`;
    if (Array.isArray(row.cardTemplates)) {
      const tpl = row.cardTemplates[row.templateOrdinal];
      if (tpl && tpl.name) {
        templateName = tpl.name;
      }
    }

    return {
      cardId: row.cardId,
      noteId: row.noteId,
      deckName: row.deckName,
      deckPath,
      noteTypeName: row.noteTypeName,
      fields: row.fields,
      tags,
      cardType: row.cardType,
      status: row.status,
      flag: row.flag,
      due: row.due ? new Date(row.due) : null,
      intervalDays: row.intervalDays,
      stability: row.stability,
      difficulty: row.difficulty,
      retrievability: Math.round(retrievabilityValue * 10000) / 10000,
      easeFactor: difficultyToEaseFactor(row.difficulty),
      reps: row.reps,
      lapses: row.lapses,
      createdAt: new Date(row.createdAt),
      lastReviewAt: row.lastReviewAt ? new Date(row.lastReviewAt) : null,
      firstReviewAt: stats.firstReviewAt
        ? new Date(stats.firstReviewAt)
        : null,
      averageTimeMs: stats.averageTimeMs || 0,
      totalReviews: stats.totalReviews || 0,
      isLeech,
      isMarked,
      position,
      templateOrdinal: row.templateOrdinal,
      templateName,
    };
  }

  // =========================================================================
  // Section 1.10: Get Previous Card Info
  // =========================================================================

  /**
   * Get information about the most recent review of a card.
   *
   * Returns the rating given, intervals before and after, stability
   * changes, difficulty changes, time spent, and when the review occurred.
   *
   * @param cardId - The card whose last review to retrieve.
   * @returns PreviousCardInfo, or null if the card has never been reviewed.
   * @throws Error if the card is not found.
   */
  async getPreviousCardInfo(
    cardId: string
  ): Promise<PreviousCardInfo | null> {
    const result = await this.pool.query(
      `SELECT
         id AS "reviewLogId",
         card_id AS "cardId",
         rating,
         interval_before AS "intervalBefore",
         interval_after AS "intervalAfter",
         stability_before AS "stabilityBefore",
         stability_after AS "stabilityAfter",
         difficulty_before AS "difficultyBefore",
         difficulty_after AS "difficultyAfter",
         time_spent_ms AS "timeSpentMs",
         review_type AS "reviewType",
         reviewed_at AS "reviewedAt"
       FROM review_logs
       WHERE card_id = $1
       ORDER BY reviewed_at DESC
       LIMIT 1`,
      [cardId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      reviewLogId: row.reviewLogId,
      cardId: row.cardId,
      rating: row.rating,
      intervalBefore: row.intervalBefore ?? 0,
      intervalAfter: row.intervalAfter ?? 0,
      stabilityBefore: row.stabilityBefore ?? 0,
      stabilityAfter: row.stabilityAfter ?? 0,
      difficultyBefore: row.difficultyBefore ?? 0,
      difficultyAfter: row.difficultyAfter ?? 0,
      timeSpentMs: row.timeSpentMs ?? 0,
      reviewType: row.reviewType ?? 'review',
      reviewedAt: new Date(row.reviewedAt),
    };
  }

  // =========================================================================
  // Section 1.10: Edit During Review
  // =========================================================================

  /**
   * Edit a note's fields during an active review session.
   *
   * Updates the specified fields in the note's JSONB `fields` column using
   * the `||` merge operator. Only the provided fields are changed; other
   * fields are preserved.
   *
   * After updating, the sort_field_value and first_field_checksum are
   * recomputed to keep duplicate detection and sorting consistent.
   *
   * @param noteId       - The note to update.
   * @param fieldUpdates - An object mapping field names to their new values.
   * @throws Error if the note is not found.
   */
  async editDuringReview(
    noteId: string,
    fieldUpdates: Record<string, string>
  ): Promise<void> {
    if (Object.keys(fieldUpdates).length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Merge the field updates into the existing fields
      const updateResult = await client.query(
        `UPDATE notes
         SET fields = fields || $2::jsonb,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, fields`,
        [noteId, JSON.stringify(fieldUpdates)]
      );

      if (updateResult.rows.length === 0) {
        throw new Error(`Note "${noteId}" not found`);
      }

      const updatedFields = updateResult.rows[0].fields;

      // Recompute sort_field_value from the first field alphabetically
      // (or the first field in the fields object)
      const fieldNames = Object.keys(updatedFields);
      const sortFieldValue =
        fieldNames.length > 0 ? updatedFields[fieldNames[0]] : '';

      // Recompute first_field_checksum using a simple CRC32-like hash
      // PostgreSQL doesn't have native CRC32, so we use hashtext
      await client.query(
        `UPDATE notes
         SET sort_field_value = $2,
             first_field_checksum = ('x' || LEFT(MD5($2), 8))::bit(32)::int
         WHERE id = $1`,
        [noteId, sortFieldValue || '']
      );

      // Update the cards' updated_at to reflect the content change
      await client.query(
        `UPDATE cards
         SET updated_at = NOW()
         WHERE note_id = $1`,
        [noteId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
