/**
 * Pause/Resume Service
 *
 * Manages card suspension (pause/resume), skip-until-tomorrow ("bury"),
 * timed pauses, batch operations by tag/deck, and leech detection for
 * the multilingual flashcard application.
 *
 * Card pause state is stored in the `cards` table via the `suspended` boolean
 * and extended metadata columns: `suspended_at`, `suspended_by`, `resume_date`,
 * and `pause_reason`. The scheduler respects the `suspended` flag by excluding
 * suspended cards from review queues.
 *
 * All queries use parameterized statements to prevent SQL injection.
 */

import { pool } from '../db/connection';
import type { PausedCardInfo, PausedCardGroup, PausedBySource } from './types';

export class PauseService {
  // ---------------------------------------------------------------------------
  // Single Card Operations
  // ---------------------------------------------------------------------------

  /**
   * Pause (suspend) a single card indefinitely.
   *
   * Sets the card's `suspended` flag to true and records metadata about
   * when and why the card was paused. The card will not appear in any
   * review queues until explicitly resumed.
   *
   * @param cardId - The card to pause
   * @param reason - Optional human-readable reason for the pause
   */
  async pauseCard(cardId: string, reason?: string): Promise<void> {
    const result = await pool.query(
      `UPDATE cards
       SET suspended = true,
           suspended_at = NOW(),
           suspended_by = 'manual',
           resume_date = NULL,
           pause_reason = $2
       WHERE id = $1
       RETURNING id`,
      [cardId, reason || null]
    );

    if (result.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }
  }

  /**
   * Resume (unsuspend) a single card.
   *
   * Clears the suspended flag and all pause metadata. The card will
   * reappear in review queues according to its scheduling state.
   *
   * @param cardId - The card to resume
   */
  async resumeCard(cardId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE cards
       SET suspended = false,
           suspended_at = NULL,
           suspended_by = NULL,
           resume_date = NULL,
           pause_reason = NULL
       WHERE id = $1
       RETURNING id`,
      [cardId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }
  }

  /**
   * Skip a card until tomorrow ("bury" in SRS terminology).
   *
   * The card is suspended with a resume_date set to the start of the next
   * calendar day. The daily job `unburyAllSkippedCards` or `resumeTimedPauses`
   * will automatically resume it.
   *
   * @param cardId - The card to skip until tomorrow
   */
  async skipUntilTomorrow(cardId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE cards
       SET suspended = true,
           suspended_at = NOW(),
           suspended_by = 'manual',
           resume_date = (CURRENT_DATE + INTERVAL '1 day'),
           pause_reason = 'Skipped until tomorrow'
       WHERE id = $1
       RETURNING id`,
      [cardId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }
  }

  // ---------------------------------------------------------------------------
  // Timed Pause
  // ---------------------------------------------------------------------------

  /**
   * Pause a card until a specific date.
   *
   * The card is suspended and will be automatically resumed when the
   * `resumeTimedPauses` daily job runs on or after the specified date.
   *
   * @param cardId - The card to pause
   * @param resumeDate - The date when the card should automatically resume
   * @param reason - Optional human-readable reason for the pause
   */
  async pauseCardUntil(cardId: string, resumeDate: Date, reason?: string): Promise<void> {
    if (resumeDate <= new Date()) {
      throw new Error('Resume date must be in the future');
    }

    const result = await pool.query(
      `UPDATE cards
       SET suspended = true,
           suspended_at = NOW(),
           suspended_by = 'manual',
           resume_date = $2,
           pause_reason = $3
       WHERE id = $1
       RETURNING id`,
      [cardId, resumeDate.toISOString(), reason || null]
    );

    if (result.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }
  }

  // ---------------------------------------------------------------------------
  // Batch Operations by Tag
  // ---------------------------------------------------------------------------

  /**
   * Pause all cards associated with a tag.
   *
   * When `includeChildren` is true, uses a recursive CTE to find all
   * descendant tags and pauses cards from notes tagged with any of them.
   * Only affects cards that are not already suspended.
   *
   * @param tagId - The tag whose cards to pause
   * @param includeChildren - Whether to include descendant tags
   * @param reason - Optional reason for the batch pause
   * @returns The number of cards that were paused
   */
  async pauseByTag(
    tagId: string,
    includeChildren: boolean,
    reason?: string
  ): Promise<number> {
    let query: string;
    const params: (string | null)[] = [reason || null];

    if (includeChildren) {
      query = `
        WITH RECURSIVE tag_subtree AS (
          SELECT id FROM tags WHERE id = $2
          UNION ALL
          SELECT t.id FROM tags t JOIN tag_subtree ts ON t.parent_id = ts.id
        ),
        target_cards AS (
          SELECT DISTINCT c.id
          FROM cards c
          JOIN note_tags nt ON c.note_id = nt.note_id
          JOIN tag_subtree ts ON nt.tag_id = ts.id
          WHERE c.suspended = false
        )
        UPDATE cards
        SET suspended = true,
            suspended_at = NOW(),
            suspended_by = 'tag_batch',
            pause_reason = $1
        FROM target_cards
        WHERE cards.id = target_cards.id`;
      params.push(tagId);
    } else {
      query = `
        WITH target_cards AS (
          SELECT DISTINCT c.id
          FROM cards c
          JOIN note_tags nt ON c.note_id = nt.note_id
          WHERE nt.tag_id = $2
            AND c.suspended = false
        )
        UPDATE cards
        SET suspended = true,
            suspended_at = NOW(),
            suspended_by = 'tag_batch',
            pause_reason = $1
        FROM target_cards
        WHERE cards.id = target_cards.id`;
      params.push(tagId);
    }

    const result = await pool.query(query, params);
    return result.rowCount ?? 0;
  }

  /**
   * Resume all cards associated with a tag.
   *
   * When `includeChildren` is true, uses a recursive CTE to find all
   * descendant tags and resumes cards from notes tagged with any of them.
   * Only affects cards that are currently suspended.
   *
   * @param tagId - The tag whose cards to resume
   * @param includeChildren - Whether to include descendant tags
   * @returns The number of cards that were resumed
   */
  async resumeByTag(tagId: string, includeChildren: boolean): Promise<number> {
    let query: string;
    const params: string[] = [tagId];

    if (includeChildren) {
      query = `
        WITH RECURSIVE tag_subtree AS (
          SELECT id FROM tags WHERE id = $1
          UNION ALL
          SELECT t.id FROM tags t JOIN tag_subtree ts ON t.parent_id = ts.id
        ),
        target_cards AS (
          SELECT DISTINCT c.id
          FROM cards c
          JOIN note_tags nt ON c.note_id = nt.note_id
          JOIN tag_subtree ts ON nt.tag_id = ts.id
          WHERE c.suspended = true
        )
        UPDATE cards
        SET suspended = false,
            suspended_at = NULL,
            suspended_by = NULL,
            resume_date = NULL,
            pause_reason = NULL
        FROM target_cards
        WHERE cards.id = target_cards.id`;
    } else {
      query = `
        WITH target_cards AS (
          SELECT DISTINCT c.id
          FROM cards c
          JOIN note_tags nt ON c.note_id = nt.note_id
          WHERE nt.tag_id = $1
            AND c.suspended = true
        )
        UPDATE cards
        SET suspended = false,
            suspended_at = NULL,
            suspended_by = NULL,
            resume_date = NULL,
            pause_reason = NULL
        FROM target_cards
        WHERE cards.id = target_cards.id`;
    }

    const result = await pool.query(query, params);
    return result.rowCount ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Batch Operations by Deck
  // ---------------------------------------------------------------------------

  /**
   * Pause all cards in a deck.
   *
   * When `includeSubdecks` is true, uses a recursive CTE to find all
   * sub-decks (children) and pauses cards from all of them.
   * Only affects cards that are not already suspended.
   *
   * @param deckId - The deck whose cards to pause
   * @param includeSubdecks - Whether to include sub-deck cards
   * @param reason - Optional reason for the batch pause
   * @returns The number of cards that were paused
   */
  async pauseByDeck(
    deckId: string,
    includeSubdecks: boolean,
    reason?: string
  ): Promise<number> {
    let query: string;
    const params: (string | null)[] = [reason || null];

    if (includeSubdecks) {
      query = `
        WITH RECURSIVE deck_subtree AS (
          SELECT id FROM decks WHERE id = $2
          UNION ALL
          SELECT d.id FROM decks d JOIN deck_subtree ds ON d.parent_id = ds.id
        )
        UPDATE cards
        SET suspended = true,
            suspended_at = NOW(),
            suspended_by = 'deck_batch',
            pause_reason = $1
        WHERE deck_id IN (SELECT id FROM deck_subtree)
          AND suspended = false`;
      params.push(deckId);
    } else {
      query = `
        UPDATE cards
        SET suspended = true,
            suspended_at = NOW(),
            suspended_by = 'deck_batch',
            pause_reason = $1
        WHERE deck_id = $2
          AND suspended = false`;
      params.push(deckId);
    }

    const result = await pool.query(query, params);
    return result.rowCount ?? 0;
  }

  /**
   * Resume all cards in a deck.
   *
   * When `includeSubdecks` is true, uses a recursive CTE to find all
   * sub-decks and resumes cards from all of them.
   * Only affects cards that are currently suspended.
   *
   * @param deckId - The deck whose cards to resume
   * @param includeSubdecks - Whether to include sub-deck cards
   * @returns The number of cards that were resumed
   */
  async resumeByDeck(deckId: string, includeSubdecks: boolean): Promise<number> {
    let query: string;
    const params: string[] = [deckId];

    if (includeSubdecks) {
      query = `
        WITH RECURSIVE deck_subtree AS (
          SELECT id FROM decks WHERE id = $1
          UNION ALL
          SELECT d.id FROM decks d JOIN deck_subtree ds ON d.parent_id = ds.id
        )
        UPDATE cards
        SET suspended = false,
            suspended_at = NULL,
            suspended_by = NULL,
            resume_date = NULL,
            pause_reason = NULL
        WHERE deck_id IN (SELECT id FROM deck_subtree)
          AND suspended = true`;
    } else {
      query = `
        UPDATE cards
        SET suspended = false,
            suspended_at = NULL,
            suspended_by = NULL,
            resume_date = NULL,
            pause_reason = NULL
        WHERE deck_id = $1
          AND suspended = true`;
    }

    const result = await pool.query(query, params);
    return result.rowCount ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Query Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all paused cards for a user, optionally grouped by tag, deck, or reason.
   *
   * Returns detailed information about each paused card including the deck name,
   * a preview of the front content, when it was paused, and why.
   *
   * @param userId - The user whose paused cards to retrieve
   * @param groupBy - Optional grouping dimension: 'tag', 'deck', or 'reason'
   * @returns Array of PausedCardGroup objects
   */
  async getPausedCards(
    userId: string,
    groupBy?: 'tag' | 'deck' | 'reason'
  ): Promise<PausedCardGroup[]> {
    // Base query to get all paused cards for the user with deck info
    const baseQuery = `
      SELECT c.id AS "cardId",
             c.note_id AS "noteId",
             d.name AS "deckName",
             LEFT(c.front, 100) AS "frontPreview",
             c.suspended_at AS "pausedAt",
             c.suspended_by AS "pausedBy",
             c.resume_date AS "resumeDate",
             c.pause_reason AS "pauseReason"
      FROM cards c
      JOIN decks d ON c.deck_id = d.id
      WHERE d.user_id = $1
        AND c.suspended = true
      ORDER BY c.suspended_at DESC`;

    const cardResult = await pool.query(baseQuery, [userId]);
    const allCards = cardResult.rows as PausedCardInfo[];

    if (!groupBy) {
      // Return a single group containing all paused cards
      return [
        {
          groupName: 'All Paused Cards',
          groupType: 'reason' as const,
          count: allCards.length,
          cards: allCards,
        },
      ];
    }

    if (groupBy === 'deck') {
      return this.groupCardsByDeck(allCards);
    }

    if (groupBy === 'reason') {
      return this.groupCardsByReason(allCards);
    }

    if (groupBy === 'tag') {
      return this.groupCardsByTag(userId, allCards);
    }

    return [];
  }

  /**
   * Get the total count of paused cards for a user.
   *
   * @param userId - The user whose paused card count to retrieve
   * @returns The number of currently paused cards
   */
  async getPausedCardCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(c.id)::int AS count
       FROM cards c
       JOIN decks d ON c.deck_id = d.id
       WHERE d.user_id = $1
         AND c.suspended = true`,
      [userId]
    );

    return result.rows[0].count;
  }

  // ---------------------------------------------------------------------------
  // Daily Jobs
  // ---------------------------------------------------------------------------

  /**
   * Unbury all cards that were skipped until today.
   *
   * This should be run at the start of each study day (day boundary).
   * It resumes all cards for the given user whose `resume_date` has
   * passed and whose `pause_reason` indicates they were buried (skipped).
   *
   * @param userId - The user whose buried cards to unbury
   * @returns The number of cards that were unburied
   */
  async unburyAllSkippedCards(userId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE cards
       SET suspended = false,
           suspended_at = NULL,
           suspended_by = NULL,
           resume_date = NULL,
           pause_reason = NULL
       WHERE id IN (
         SELECT c.id
         FROM cards c
         JOIN decks d ON c.deck_id = d.id
         WHERE d.user_id = $1
           AND c.suspended = true
           AND c.resume_date IS NOT NULL
           AND c.resume_date <= CURRENT_DATE
       )`,
      [userId]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Resume all cards across ALL users whose timed pause has expired.
   *
   * This is a system-wide job that should be run periodically (e.g., via cron)
   * to automatically resume cards whose `resume_date` has passed.
   *
   * @returns The number of cards that were resumed
   */
  async resumeTimedPauses(): Promise<number> {
    const result = await pool.query(
      `UPDATE cards
       SET suspended = false,
           suspended_at = NULL,
           suspended_by = NULL,
           resume_date = NULL,
           pause_reason = NULL
       WHERE suspended = true
         AND resume_date IS NOT NULL
         AND resume_date <= CURRENT_DATE`
    );

    return result.rowCount ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Leech Detection
  // ---------------------------------------------------------------------------

  /**
   * Check if a card has become a leech and optionally pause it.
   *
   * A "leech" is a card that has been failed (lapsed) an excessive number
   * of times, indicating the user is struggling with it. This method checks
   * the card's lapse count against the configured threshold and takes the
   * specified action.
   *
   * This should be called after each failed review.
   *
   * @param cardId - The card to check
   * @param leechThreshold - Number of lapses to trigger leech status
   * @param leechAction - Action to take: 'tag_only' or 'pause'
   * @returns true if the card was identified as a leech, false otherwise
   */
  async checkAndPauseLeech(
    cardId: string,
    leechThreshold: number,
    leechAction: 'tag_only' | 'pause'
  ): Promise<boolean> {
    // Get the card's current lapse count
    const cardResult = await pool.query(
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

    // Check if the card has reached the leech threshold.
    // Only trigger on the exact threshold crossing and then at every
    // subsequent multiple of half the threshold (to avoid repeated triggers).
    if (card.lapses < leechThreshold) {
      return false;
    }

    // Only trigger on exact threshold or subsequent half-threshold intervals
    const halfThreshold = Math.max(Math.floor(leechThreshold / 2), 1);
    if (
      card.lapses !== leechThreshold &&
      (card.lapses - leechThreshold) % halfThreshold !== 0
    ) {
      return false;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Ensure a "leech" tag exists for this user
      const leechTagResult = await client.query(
        `INSERT INTO tags (user_id, name, slug, color, icon, description)
         VALUES ($1, 'Leech', 'leech', '#EF4444', '🩸', 'Cards that have been failed many times')
         ON CONFLICT (user_id, slug, parent_id) DO UPDATE SET name = 'Leech'
         RETURNING id`,
        [card.user_id]
      );

      const leechTagId = leechTagResult.rows[0].id;

      // Tag the note as a leech (idempotent via ON CONFLICT)
      await client.query(
        `INSERT INTO note_tags (note_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (note_id, tag_id) DO NOTHING`,
        [card.note_id, leechTagId]
      );

      // If the action is 'pause', also suspend the card
      if (leechAction === 'pause') {
        await client.query(
          `UPDATE cards
           SET suspended = true,
               suspended_at = NOW(),
               suspended_by = 'leech_auto',
               pause_reason = $2
           WHERE id = $1
             AND suspended = false`,
          [cardId, `Leech detected: ${card.lapses} lapses (threshold: ${leechThreshold})`]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Group paused cards by their deck name.
   */
  private groupCardsByDeck(cards: PausedCardInfo[]): PausedCardGroup[] {
    const groups = new Map<string, PausedCardInfo[]>();

    for (const card of cards) {
      const key = card.deckName;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    }

    return Array.from(groups.entries()).map(([deckName, deckCards]) => ({
      groupName: deckName,
      groupType: 'deck' as const,
      count: deckCards.length,
      cards: deckCards,
    }));
  }

  /**
   * Group paused cards by their pause reason.
   */
  private groupCardsByReason(cards: PausedCardInfo[]): PausedCardGroup[] {
    const groups = new Map<string, PausedCardInfo[]>();

    for (const card of cards) {
      const key = card.pauseReason || 'No reason specified';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    }

    return Array.from(groups.entries()).map(([reason, reasonCards]) => ({
      groupName: reason,
      groupType: 'reason' as const,
      count: reasonCards.length,
      cards: reasonCards,
    }));
  }

  /**
   * Group paused cards by their associated tags.
   *
   * A card may appear in multiple tag groups if its note has multiple tags.
   * Cards with no tags appear in an "Untagged" group.
   */
  private async groupCardsByTag(
    userId: string,
    cards: PausedCardInfo[]
  ): Promise<PausedCardGroup[]> {
    if (cards.length === 0) {
      return [];
    }

    const cardIds = cards.map((c) => c.cardId);

    // Get tag associations for all paused cards
    const tagResult = await pool.query(
      `SELECT c.id AS card_id, t.name AS tag_name
       FROM cards c
       JOIN note_tags nt ON c.note_id = nt.note_id
       JOIN tags t ON nt.tag_id = t.id
       WHERE c.id = ANY($1::uuid[])
         AND t.user_id = $2
       ORDER BY t.name`,
      [cardIds, userId]
    );

    // Build a map of card_id -> tag names
    const cardTagMap = new Map<string, Set<string>>();
    for (const row of tagResult.rows) {
      if (!cardTagMap.has(row.card_id)) {
        cardTagMap.set(row.card_id, new Set());
      }
      cardTagMap.get(row.card_id)!.add(row.tag_name);
    }

    // Group cards by tag
    const groups = new Map<string, PausedCardInfo[]>();

    for (const card of cards) {
      const tags = cardTagMap.get(card.cardId);
      if (!tags || tags.size === 0) {
        const key = 'Untagged';
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(card);
      } else {
        for (const tagName of tags) {
          if (!groups.has(tagName)) {
            groups.set(tagName, []);
          }
          groups.get(tagName)!.push(card);
        }
      }
    }

    return Array.from(groups.entries()).map(([tagName, tagCards]) => ({
      groupName: tagName,
      groupType: 'tag' as const,
      count: tagCards.length,
      cards: tagCards,
    }));
  }
}
