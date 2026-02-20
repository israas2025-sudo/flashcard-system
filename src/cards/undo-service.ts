/**
 * Undo Service
 *
 * Implements the review undo functionality described in Section 1.10 of
 * the flashcard system specification.
 *
 * When a user reviews a card, the pre-review card state is pushed onto an
 * undo stack. The user can then undo the last review, which:
 *   1. Restores the card to its exact pre-review scheduling state.
 *   2. Deletes the corresponding review_log entry.
 *   3. Returns the card to the review queue.
 *
 * The undo stack is capped at 50 entries to limit memory usage.
 * Only the most recent action can be undone at a time (single-level undo
 * with a stack for multiple consecutive undos).
 */

import { Pool } from 'pg';
import type { UndoEntry, UndoResult } from './types';

export class UndoService {
  /** Stack of review actions that can be undone, most recent on top. */
  private undoStack: UndoEntry[] = [];

  /** Maximum number of undo entries to keep. */
  private static readonly MAX_STACK_SIZE = 50;

  constructor(private pool: Pool) {}

  // =========================================================================
  // Record an action
  // =========================================================================

  /**
   * Record a review action for potential undo.
   *
   * This should be called immediately after a review is applied, with the
   * card's state from *before* the review. The entry includes enough data
   * to fully restore the card and remove the review log.
   *
   * If the stack exceeds the maximum size (50), the oldest entry is removed.
   *
   * @param entry - The undo entry capturing the pre-review state.
   */
  recordAction(entry: UndoEntry): void {
    this.undoStack.push(entry);

    if (this.undoStack.length > UndoService.MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
  }

  // =========================================================================
  // Undo the last review
  // =========================================================================

  /**
   * Undo the most recent review action.
   *
   * Performs the following steps in a single transaction:
   *   1. Restores the card's scheduling state to the pre-review values:
   *      card_type, due, interval_days, stability, difficulty, reps,
   *      lapses, and last_review_at.
   *   2. Deletes the review_log entry that was created by the review.
   *   3. Returns an UndoResult describing what was undone.
   *
   * @returns An UndoResult if an action was undone, or null if the stack is empty.
   */
  async undo(): Promise<UndoResult | null> {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Restore the card to its previous scheduling state
      const restoreResult = await client.query(
        `UPDATE cards
         SET card_type = $2,
             due = $3,
             interval_days = $4,
             stability = $5,
             difficulty = $6,
             reps = $7,
             lapses = $8,
             last_review_at = $9,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [
          entry.cardId,
          entry.previousState.cardType,
          entry.previousState.due
            ? entry.previousState.due.toISOString()
            : null,
          entry.previousState.intervalDays,
          entry.previousState.stability,
          entry.previousState.difficulty,
          entry.previousState.reps,
          entry.previousState.lapses,
          entry.previousState.lastReviewAt
            ? entry.previousState.lastReviewAt.toISOString()
            : null,
        ]
      );

      if (restoreResult.rows.length === 0) {
        // Card may have been deleted; still remove the review log
        // and report partial success
      }

      // 2. Delete the review log entry
      await client.query(
        `DELETE FROM review_logs WHERE id = $1`,
        [entry.reviewLogId]
      );

      // 3. If the card was paused by leech detection during this review,
      //    and the previous state was not paused, restore active status
      await client.query(
        `UPDATE cards
         SET status = 'active',
             paused_at = NULL,
             paused_by = NULL,
             pause_reason = NULL
         WHERE id = $1
           AND status = 'paused'
           AND paused_by = 'leech_auto'`,
        [entry.cardId]
      );

      await client.query('COMMIT');

      const description = `Undo ${entry.rating} on "${entry.cardFrontPreview}"`;

      return {
        cardId: entry.cardId,
        rating: entry.rating,
        description,
        success: true,
      };
    } catch (error) {
      await client.query('ROLLBACK');

      // Re-push the entry so the user can try again
      this.undoStack.push(entry);

      throw error;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // Query operations
  // =========================================================================

  /**
   * Check if there is an action available to undo.
   *
   * @returns `true` if at least one review can be undone.
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Get a human-readable description of what would be undone.
   *
   * Returns a string like 'Undo good on "What is the Arabic word for..."'
   * for display in the UI undo button tooltip.
   *
   * @returns A description string, or null if the stack is empty.
   */
  peekUndo(): string | null {
    const entry = this.undoStack[this.undoStack.length - 1];
    if (!entry) return null;
    return `Undo ${entry.rating} on "${entry.cardFrontPreview}"`;
  }

  /**
   * Get the most recent undo entry without removing it from the stack.
   *
   * @returns The most recent UndoEntry, or null if the stack is empty.
   */
  peekEntry(): UndoEntry | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1];
  }

  /**
   * Get the current number of entries in the undo stack.
   *
   * @returns The number of undoable actions.
   */
  getStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * Clear the entire undo stack.
   *
   * Use this when starting a new study session or when the undo history
   * should be invalidated (e.g. after a sync operation).
   */
  clear(): void {
    this.undoStack = [];
  }

  /**
   * Create an UndoEntry from a card's current state before a review.
   *
   * This is a convenience method that queries the database for the card's
   * current state and constructs a complete UndoEntry. Call this *before*
   * applying the review, then call recordAction() with the result *after*
   * the review is applied and you have the review log ID.
   *
   * @param cardId    - The card about to be reviewed.
   * @param rating    - The rating about to be applied.
   * @param reviewLogId - The review log ID (assigned after review).
   * @returns A complete UndoEntry ready to be recorded.
   * @throws Error if the card is not found.
   */
  async buildEntry(
    cardId: string,
    rating: string,
    reviewLogId: string
  ): Promise<UndoEntry> {
    const result = await this.pool.query(
      `SELECT
         c.id,
         c.card_type,
         c.due,
         c.interval_days,
         c.stability,
         c.difficulty,
         c.reps,
         c.lapses,
         c.last_review_at,
         LEFT(n.fields ->> (
           SELECT key FROM jsonb_each_text(n.fields) LIMIT 1
         ), 50) AS front_preview
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE c.id = $1`,
      [cardId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }

    const row = result.rows[0];

    return {
      cardId,
      reviewLogId,
      cardFrontPreview: row.front_preview || '(empty)',
      rating,
      previousState: {
        cardType: row.card_type,
        due: row.due ? new Date(row.due) : null,
        intervalDays: row.interval_days,
        stability: row.stability,
        difficulty: row.difficulty,
        reps: row.reps,
        lapses: row.lapses,
        lastReviewAt: row.last_review_at
          ? new Date(row.last_review_at)
          : null,
      },
      timestamp: new Date(),
    };
  }
}
