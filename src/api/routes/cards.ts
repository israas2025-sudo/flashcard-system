// @ts-nocheck
/**
 * Cards Routes
 *
 * Card study and management operations. Handles fetching study cards,
 * submitting reviews, undoing reviews, and card state management.
 *
 * Routes:
 * - GET  /api/cards/study?deckId=X&tags=Y — Get next study cards
 * - POST /api/cards/:id/review            — Submit a review (rating + time)
 * - POST /api/cards/:id/undo              — Undo last review
 * - PUT  /api/cards/:id/flag              — Set flag on card
 * - PUT  /api/cards/:id/pause             — Pause (suspend) card
 * - PUT  /api/cards/:id/resume            — Resume a paused card
 * - PUT  /api/cards/:id/skip              — Skip card until tomorrow
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../../db/connection';
import { ApiError, validateUUID, parseIntParam } from '../server';

export const cardsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/cards/study — Get next study cards
// ---------------------------------------------------------------------------

cardsRouter.get(
  '/study',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deckId = req.query.deckId as string | undefined;
      const tagsParam = req.query.tags as string | undefined;
      const limit = parseIntParam(req.query.limit as string, 20, 'limit');

      // Build the WHERE clause dynamically
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Card must be due and not suspended/buried
      conditions.push(`c.due <= NOW()`);
      conditions.push(`c.suspended = false`);
      conditions.push(`c.buried = false`);

      // Filter by deck
      if (deckId) {
        validateUUID(deckId, 'deckId');
        // Include child decks via recursive query
        conditions.push(
          `c.deck_id IN (
            WITH RECURSIVE deck_tree AS (
              SELECT id FROM decks WHERE id = $${paramIndex}
              UNION ALL
              SELECT d.id FROM decks d
              INNER JOIN deck_tree dt ON d.parent_id = dt.id
            )
            SELECT id FROM deck_tree
          )`
        );
        params.push(deckId);
        paramIndex++;
      }

      // Filter by tags
      if (tagsParam) {
        const tagIds = tagsParam.split(',').map((t) => t.trim());
        for (const tagId of tagIds) {
          validateUUID(tagId, 'tagId');
        }
        conditions.push(
          `c.note_id IN (
            SELECT nt.note_id FROM note_tags nt
            WHERE nt.tag_id = ANY($${paramIndex}::uuid[])
          )`
        );
        params.push(tagIds);
        paramIndex++;
      }

      // Limit
      params.push(limit);

      const whereClause = conditions.join(' AND ');

      // Order: learning cards first (queue=1,3), then new (queue=0), then review (queue=2)
      // Within each group, order by due date
      const result = await query(
        `SELECT c.*, n.fields as note_fields, n.note_type_id
         FROM cards c
         LEFT JOIN notes n ON c.note_id = n.id
         WHERE ${whereClause}
         ORDER BY
           CASE
             WHEN c.queue IN (1, 3) THEN 0  -- Learning/Relearning first
             WHEN c.queue = 0 THEN 1         -- New cards second
             ELSE 2                           -- Review cards last
           END,
           c.due ASC
         LIMIT $${paramIndex}`,
        params
      );

      // Gather counts for the session
      const countResult = await query(
        `SELECT
           COUNT(*) FILTER (WHERE queue = 0 AND due <= NOW() AND NOT suspended AND NOT buried) as new_count,
           COUNT(*) FILTER (WHERE queue IN (1, 3) AND due <= NOW() AND NOT suspended AND NOT buried) as learning_count,
           COUNT(*) FILTER (WHERE queue = 2 AND due <= NOW() AND NOT suspended AND NOT buried) as review_count
         FROM cards c
         ${deckId ? `WHERE c.deck_id IN (
           WITH RECURSIVE deck_tree AS (
             SELECT id FROM decks WHERE id = $1
             UNION ALL
             SELECT d.id FROM decks d INNER JOIN deck_tree dt ON d.parent_id = dt.id
           )
           SELECT id FROM deck_tree
         )` : ''}`,
        deckId ? [deckId] : []
      );

      res.json({
        data: {
          cards: result.rows,
          counts: countResult.rows[0] || {
            new_count: 0,
            learning_count: 0,
            review_count: 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/cards/:id/review — Submit a review
// ---------------------------------------------------------------------------

cardsRouter.post(
  '/:id/review',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const { rating, timeSpentMs } = req.body;

      // Validate rating (1=Again, 2=Hard, 3=Good, 4=Easy)
      if (!rating || ![1, 2, 3, 4].includes(rating)) {
        throw ApiError.badRequest('rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)');
      }

      if (timeSpentMs !== undefined && (typeof timeSpentMs !== 'number' || timeSpentMs < 0)) {
        throw ApiError.badRequest('timeSpentMs must be a non-negative number');
      }

      const result = await withTransaction(async (client) => {
        // Fetch current card state
        const cardResult = await client.query(
          'SELECT * FROM cards WHERE id = $1',
          [id]
        );
        if (cardResult.rowCount === 0) {
          throw ApiError.notFound('Card');
        }
        const card = cardResult.rows[0];

        if (card.suspended) {
          throw ApiError.badRequest('Cannot review a suspended card');
        }

        // Snapshot the card state before the review (for undo)
        const stateBefore = {
          queue: card.queue,
          due: card.due,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          reps: card.reps,
          lapses: card.lapses,
        };

        // Compute new scheduling state
        // This is a simplified FSRS-like update; the actual scheduling
        // module would be imported and used here.
        const now = new Date();
        let newQueue = card.queue;
        let newDue = now;
        let newStability = card.stability || 1;
        let newDifficulty = card.difficulty || 5;
        let newReps = (card.reps || 0) + 1;
        let newLapses = card.lapses || 0;
        let newScheduledDays = 0;

        if (rating === 1) {
          // Again: go to relearning
          newQueue = 3;
          newDue = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
          newLapses += 1;
          newStability = Math.max(0.1, newStability * 0.5);
          newScheduledDays = 0;
        } else if (rating === 2) {
          // Hard
          if (card.queue === 0 || card.queue === 1) {
            // Learning: stay in learning with a longer step
            newQueue = 1;
            newDue = new Date(now.getTime() + 6 * 60 * 1000); // 6 minutes
            newScheduledDays = 0;
          } else {
            // Review: shorter interval
            const interval = Math.max(1, Math.round(newStability * 1.2));
            newDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
            newScheduledDays = interval;
            newStability *= 1.1;
          }
        } else if (rating === 3) {
          // Good
          if (card.queue === 0) {
            // New -> Learning
            newQueue = 1;
            newDue = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
            newScheduledDays = 0;
          } else if (card.queue === 1 || card.queue === 3) {
            // Learning/Relearning -> Graduate to Review
            newQueue = 2;
            const interval = Math.max(1, Math.round(newStability));
            newDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
            newScheduledDays = interval;
          } else {
            // Review: standard interval
            const interval = Math.max(1, Math.round(newStability * 2.5));
            newDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
            newScheduledDays = interval;
            newStability *= 1.5;
          }
        } else if (rating === 4) {
          // Easy
          if (card.queue === 0 || card.queue === 1 || card.queue === 3) {
            // Graduate immediately to Review with easy bonus
            newQueue = 2;
            const interval = Math.max(4, Math.round(newStability * 1.3));
            newDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
            newScheduledDays = interval;
            newStability *= 2.0;
          } else {
            // Review: longer interval with easy bonus
            const interval = Math.max(1, Math.round(newStability * 3.5));
            newDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
            newScheduledDays = interval;
            newStability *= 2.0;
          }
          newDifficulty = Math.max(1, newDifficulty - 0.15);
        }

        // Clamp difficulty
        newDifficulty = Math.min(10, Math.max(1, newDifficulty));

        // Calculate elapsed days since last review
        const elapsedDays = card.last_review
          ? Math.max(
              0,
              (now.getTime() - new Date(card.last_review).getTime()) /
                (24 * 60 * 60 * 1000)
            )
          : 0;

        // Update the card
        const updatedCard = await client.query(
          `UPDATE cards SET
            queue = $1,
            due = $2,
            stability = $3,
            difficulty = $4,
            reps = $5,
            lapses = $6,
            scheduled_days = $7,
            elapsed_days = $8,
            last_review = $9,
            updated_at = NOW()
           WHERE id = $10
           RETURNING *`,
          [
            newQueue,
            newDue,
            newStability,
            newDifficulty,
            newReps,
            newLapses,
            newScheduledDays,
            elapsedDays,
            now,
            id,
          ]
        );

        // Create review log entry
        const logResult = await client.query(
          `INSERT INTO review_logs (
            card_id, rating, state_before, state_after,
            reviewed_at, time_spent_ms,
            scheduling_snapshot_before, scheduling_snapshot_after,
            due_before, due_after
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            id,
            rating,
            card.queue,
            newQueue,
            now,
            timeSpentMs || 0,
            JSON.stringify(stateBefore),
            JSON.stringify({
              queue: newQueue,
              due: newDue,
              stability: newStability,
              difficulty: newDifficulty,
              reps: newReps,
              lapses: newLapses,
              scheduled_days: newScheduledDays,
            }),
            card.due,
            newDue,
          ]
        );

        return {
          card: updatedCard.rows[0],
          reviewLog: logResult.rows[0],
          nextDue: newDue,
          interval: newScheduledDays,
        };
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/cards/:id/undo — Undo last review
// ---------------------------------------------------------------------------

cardsRouter.post(
  '/:id/undo',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const result = await withTransaction(async (client) => {
        // Find the most recent review log for this card
        const logResult = await client.query(
          `SELECT * FROM review_logs
           WHERE card_id = $1
           ORDER BY reviewed_at DESC
           LIMIT 1`,
          [id]
        );

        if (logResult.rowCount === 0) {
          throw ApiError.badRequest('No review to undo for this card');
        }

        const log = logResult.rows[0];
        const snapshotBefore = typeof log.scheduling_snapshot_before === 'string'
          ? JSON.parse(log.scheduling_snapshot_before)
          : log.scheduling_snapshot_before;

        // Restore the card to its pre-review state
        const updatedCard = await client.query(
          `UPDATE cards SET
            queue = $1,
            due = $2,
            stability = $3,
            difficulty = $4,
            reps = $5,
            lapses = $6,
            scheduled_days = $7,
            elapsed_days = $8,
            updated_at = NOW()
           WHERE id = $9
           RETURNING *`,
          [
            snapshotBefore.queue,
            log.due_before,
            snapshotBefore.stability,
            snapshotBefore.difficulty,
            snapshotBefore.reps,
            snapshotBefore.lapses,
            snapshotBefore.scheduled_days || 0,
            snapshotBefore.elapsed_days || 0,
            id,
          ]
        );

        // Delete the review log entry
        await client.query('DELETE FROM review_logs WHERE id = $1', [log.id]);

        return { card: updatedCard.rows[0], undoneReview: log };
      });

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/cards/:id/flag — Set flag on card
// ---------------------------------------------------------------------------

cardsRouter.put(
  '/:id/flag',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const { flag } = req.body;

      // Validate flag value (0=none, 1-7=colored flags)
      if (flag === undefined || typeof flag !== 'number' || flag < 0 || flag > 7) {
        throw ApiError.badRequest('flag must be a number between 0 (none) and 7');
      }

      const result = await query(
        `UPDATE cards SET flag = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [flag, id]
      );

      if (result.rowCount === 0) {
        throw ApiError.notFound('Card');
      }

      res.json({ data: { card: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/cards/:id/pause — Pause (suspend) card
// ---------------------------------------------------------------------------

cardsRouter.put(
  '/:id/pause',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const result = await query(
        `UPDATE cards SET suspended = true, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rowCount === 0) {
        throw ApiError.notFound('Card');
      }

      res.json({ data: { card: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/cards/:id/resume — Resume a paused card
// ---------------------------------------------------------------------------

cardsRouter.put(
  '/:id/resume',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const result = await query(
        `UPDATE cards SET suspended = false, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rowCount === 0) {
        throw ApiError.notFound('Card');
      }

      res.json({ data: { card: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/cards/:id/skip — Skip card until tomorrow
// ---------------------------------------------------------------------------

cardsRouter.put(
  '/:id/skip',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Set the card as buried and due tomorrow at the start of day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const result = await query(
        `UPDATE cards SET buried = true, due = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [tomorrow, id]
      );

      if (result.rowCount === 0) {
        throw ApiError.notFound('Card');
      }

      res.json({ data: { card: result.rows[0], skipUntil: tomorrow } });
    } catch (err) {
      next(err);
    }
  }
);
