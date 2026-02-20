// @ts-nocheck
/**
 * Decks Routes
 *
 * CRUD operations for decks with hierarchical support (parent/child).
 * Includes deck tree retrieval with card counts and statistics.
 *
 * Routes:
 * - GET    /api/decks         — Get deck tree with card counts
 * - POST   /api/decks         — Create a new deck
 * - PUT    /api/decks/:id     — Update a deck
 * - DELETE /api/decks/:id     — Delete a deck (move cards or delete)
 * - GET    /api/decks/:id/stats — Get deck statistics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../../db/connection';
import { ApiError, requireFields, validateUUID } from '../server';

export const decksRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/decks — Get deck tree with card counts
// ---------------------------------------------------------------------------

decksRouter.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch all decks with card count aggregations
      const result = await query(
        `WITH deck_counts AS (
          SELECT
            d.id,
            d.name,
            d.parent_id,
            d.description,
            d.created_at,
            d.updated_at,
            COUNT(c.id) FILTER (WHERE c.queue = 0 AND NOT c.suspended AND NOT c.buried AND c.due <= NOW()) as new_count,
            COUNT(c.id) FILTER (WHERE c.queue IN (1, 3) AND NOT c.suspended AND NOT c.buried AND c.due <= NOW()) as learning_count,
            COUNT(c.id) FILTER (WHERE c.queue = 2 AND NOT c.suspended AND NOT c.buried AND c.due <= NOW()) as review_count,
            COUNT(c.id) as total_count,
            COUNT(c.id) FILTER (WHERE c.suspended) as suspended_count
          FROM decks d
          LEFT JOIN cards c ON c.deck_id = d.id
          GROUP BY d.id
        )
        SELECT * FROM deck_counts
        ORDER BY name`
      );

      // Build tree structure from flat rows
      const decks = result.rows;
      const deckMap = new Map<string, Record<string, unknown>>();
      const roots: Record<string, unknown>[] = [];

      // First pass: create map
      for (const deck of decks as Record<string, any>[]) {
        deckMap.set(deck.id as string, {
          ...deck,
          children: [],
          new_count: parseInt(deck.new_count) || 0,
          learning_count: parseInt(deck.learning_count) || 0,
          review_count: parseInt(deck.review_count) || 0,
          total_count: parseInt(deck.total_count) || 0,
          suspended_count: parseInt(deck.suspended_count) || 0,
        });
      }

      // Second pass: build tree
      for (const deck of Array.from(deckMap.values())) {
        if (deck.parent_id && deckMap.has(deck.parent_id as string)) {
          const parent = deckMap.get(deck.parent_id as string)!;
          (parent.children as Record<string, unknown>[]).push(deck);
        } else {
          roots.push(deck);
        }
      }

      // Accumulate child counts into parents (bottom-up)
      const accumulateCounts = (node: Record<string, any>): void => {
        const children = node.children as Record<string, any>[];
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          accumulateCounts(child);
          node.new_count += child.new_count as number;
          node.learning_count += child.learning_count as number;
          node.review_count += child.review_count as number;
          node.total_count += child.total_count as number;
        }
      };

      for (const root of roots) {
        accumulateCounts(root);
      }

      res.json({ data: { decks: roots } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/decks — Create a new deck
// ---------------------------------------------------------------------------

decksRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, parentId, description } = req.body;

      requireFields(req.body, ['name']);

      if (typeof name !== 'string' || name.trim().length === 0) {
        throw ApiError.badRequest('Deck name cannot be empty');
      }

      if (name.trim().length > 200) {
        throw ApiError.badRequest('Deck name cannot exceed 200 characters');
      }

      // Verify parent exists if provided
      if (parentId) {
        validateUUID(parentId, 'parentId');
        const parentResult = await query(
          'SELECT id FROM decks WHERE id = $1',
          [parentId]
        );
        if (parentResult.rowCount === 0) {
          throw ApiError.notFound('Parent deck');
        }
      }

      // Check for duplicate name under the same parent
      const existingResult = await query(
        `SELECT id FROM decks
         WHERE name = $1 AND ${parentId ? 'parent_id = $2' : 'parent_id IS NULL'}`,
        parentId ? [name.trim(), parentId] : [name.trim()]
      );

      if (existingResult.rowCount! > 0) {
        throw ApiError.conflict(
          `A deck named "${name.trim()}" already exists at this level`
        );
      }

      const result = await query(
        `INSERT INTO decks (name, parent_id, description, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [name.trim(), parentId || null, (description || '').trim()]
      );

      res.status(201).json({ data: { deck: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/decks/:id — Update a deck
// ---------------------------------------------------------------------------

decksRouter.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const { name, parentId, description } = req.body;

      if (!name && parentId === undefined && description === undefined) {
        throw ApiError.badRequest(
          'At least one of name, parentId, or description must be provided'
        );
      }

      // Build update dynamically
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          throw ApiError.badRequest('Deck name cannot be empty');
        }
        updates.push(`name = $${paramIndex}`);
        values.push(name.trim());
        paramIndex++;
      }

      if (parentId !== undefined) {
        if (parentId !== null) {
          validateUUID(parentId, 'parentId');
          // Prevent circular references
          if (parentId === id) {
            throw ApiError.badRequest('A deck cannot be its own parent');
          }
          // Verify parent exists
          const parentResult = await query(
            'SELECT id FROM decks WHERE id = $1',
            [parentId]
          );
          if (parentResult.rowCount === 0) {
            throw ApiError.notFound('Parent deck');
          }
          // Check that new parent is not a descendant of this deck
          const descendantCheck = await query(
            `WITH RECURSIVE descendants AS (
              SELECT id FROM decks WHERE parent_id = $1
              UNION ALL
              SELECT d.id FROM decks d
              INNER JOIN descendants desc ON d.parent_id = desc.id
            )
            SELECT id FROM descendants WHERE id = $2`,
            [id, parentId]
          );
          if (descendantCheck.rowCount! > 0) {
            throw ApiError.badRequest(
              'Cannot move a deck under its own descendant (circular reference)'
            );
          }
        }
        updates.push(`parent_id = $${paramIndex}`);
        values.push(parentId);
        paramIndex++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(description);
        paramIndex++;
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        throw ApiError.notFound('Deck');
      }

      res.json({ data: { deck: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/decks/:id — Delete a deck
// ---------------------------------------------------------------------------

decksRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Strategy: 'delete' removes cards, 'move' moves them to parent
      const strategy = (req.query.strategy as string) || 'delete';

      if (!['delete', 'move'].includes(strategy)) {
        throw ApiError.badRequest('strategy must be "delete" or "move"');
      }

      await withTransaction(async (client) => {
        // Verify deck exists
        const deckResult = await client.query(
          'SELECT * FROM decks WHERE id = $1',
          [id]
        );
        if (deckResult.rowCount === 0) {
          throw ApiError.notFound('Deck');
        }
        const deck = deckResult.rows[0];

        if (strategy === 'move') {
          // Move cards and child decks to the parent deck (or root)
          const newParentId = deck.parent_id || null;

          // Move cards in this deck to the parent
          if (newParentId) {
            await client.query(
              'UPDATE cards SET deck_id = $1, updated_at = NOW() WHERE deck_id = $2',
              [newParentId, id]
            );
          } else {
            // No parent to move to -- cannot move cards
            const cardCount = await client.query(
              'SELECT COUNT(*) as count FROM cards WHERE deck_id = $1',
              [id]
            );
            if (parseInt(cardCount.rows[0].count) > 0) {
              throw ApiError.badRequest(
                'Cannot move cards from a root deck with no parent. Use strategy=delete or move cards manually first.'
              );
            }
          }

          // Re-parent child decks
          await client.query(
            'UPDATE decks SET parent_id = $1, updated_at = NOW() WHERE parent_id = $2',
            [newParentId, id]
          );
        } else {
          // Delete strategy: remove all cards and child decks recursively
          // First, get all descendant deck IDs
          const descendantResult = await client.query(
            `WITH RECURSIVE deck_tree AS (
              SELECT id FROM decks WHERE id = $1
              UNION ALL
              SELECT d.id FROM decks d
              INNER JOIN deck_tree dt ON d.parent_id = dt.id
            )
            SELECT id FROM deck_tree`,
            [id]
          );
          const allDeckIds = descendantResult.rows.map(
            (r: { id: string }) => r.id
          );

          // Delete review logs for all cards in these decks
          await client.query(
            `DELETE FROM review_logs WHERE card_id IN
             (SELECT id FROM cards WHERE deck_id = ANY($1::uuid[]))`,
            [allDeckIds]
          );

          // Delete all cards in these decks
          await client.query(
            'DELETE FROM cards WHERE deck_id = ANY($1::uuid[])',
            [allDeckIds]
          );

          // Delete note_tags for notes that only belong to these decks
          await client.query(
            `DELETE FROM note_tags WHERE note_id IN
             (SELECT id FROM notes WHERE deck_id = ANY($1::uuid[]))`,
            [allDeckIds]
          );

          // Delete notes that belong to these decks
          await client.query(
            'DELETE FROM notes WHERE deck_id = ANY($1::uuid[])',
            [allDeckIds]
          );

          // Delete all descendant decks (children first)
          for (const deckId of allDeckIds.reverse()) {
            await client.query('DELETE FROM decks WHERE id = $1', [deckId]);
          }
        }

        // Delete the deck itself (if strategy was 'move', the deck is empty now)
        if (strategy === 'move') {
          await client.query('DELETE FROM decks WHERE id = $1', [id]);
        }
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/decks/:id/stats — Get deck statistics
// ---------------------------------------------------------------------------

decksRouter.get(
  '/:id/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Verify deck exists
      const deckResult = await query('SELECT * FROM decks WHERE id = $1', [id]);
      if (deckResult.rowCount === 0) {
        throw ApiError.notFound('Deck');
      }

      // Get all deck IDs (including descendants)
      const descendantResult = await query(
        `WITH RECURSIVE deck_tree AS (
          SELECT id FROM decks WHERE id = $1
          UNION ALL
          SELECT d.id FROM decks d
          INNER JOIN deck_tree dt ON d.parent_id = dt.id
        )
        SELECT id FROM deck_tree`,
        [id]
      );
      const allDeckIds = descendantResult.rows.map((r: any) => r.id as string);

      // Card state breakdown
      const stateResult = await query(
        `SELECT
          COUNT(*) FILTER (WHERE queue = 0) as new_count,
          COUNT(*) FILTER (WHERE queue = 1) as learning_count,
          COUNT(*) FILTER (WHERE queue = 2) as review_count,
          COUNT(*) FILTER (WHERE queue = 3) as relearning_count,
          COUNT(*) FILTER (WHERE suspended = true) as suspended_count,
          COUNT(*) FILTER (WHERE buried = true) as buried_count,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE queue = 2 AND due <= NOW() AND NOT suspended AND NOT buried) as due_review_count,
          AVG(stability) FILTER (WHERE queue = 2 AND scheduled_days >= 21) as avg_mature_stability,
          AVG(scheduled_days) FILTER (WHERE queue = 2 AND scheduled_days >= 21) as avg_mature_interval
        FROM cards
        WHERE deck_id = ANY($1::uuid[])`,
        [allDeckIds]
      );

      // Recent accuracy (last 30 days)
      const accuracyResult = await query(
        `SELECT
          COUNT(*) as total_reviews,
          COUNT(*) FILTER (WHERE rating >= 2) as correct_reviews,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE rating >= 2)::numeric / COUNT(*)::numeric, 4)
            ELSE 0
          END as accuracy
        FROM review_logs rl
        INNER JOIN cards c ON rl.card_id = c.id
        WHERE c.deck_id = ANY($1::uuid[])
          AND rl.reviewed_at >= NOW() - INTERVAL '30 days'`,
        [allDeckIds]
      );

      // Average review time
      const timeResult = await query(
        `SELECT
          AVG(time_spent_ms) as avg_time_ms,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_spent_ms) as median_time_ms
        FROM review_logs rl
        INNER JOIN cards c ON rl.card_id = c.id
        WHERE c.deck_id = ANY($1::uuid[])
          AND rl.reviewed_at >= NOW() - INTERVAL '30 days'`,
        [allDeckIds]
      );

      const stats = stateResult.rows[0] as any;
      const accuracy = accuracyResult.rows[0] as any;
      const timeStats = timeResult.rows[0] as any;

      // Estimate remaining review time
      const dueCards =
        parseInt(stats.due_review_count) +
        parseInt(stats.learning_count) +
        parseInt(stats.relearning_count);
      const avgTimePerCard = parseFloat(timeStats.avg_time_ms) || 15000;
      const estimatedMinutes = Math.round((dueCards * avgTimePerCard) / 60000);

      res.json({
        data: {
          deck: deckResult.rows[0],
          stats: {
            newCount: parseInt(stats.new_count) || 0,
            learningCount: parseInt(stats.learning_count) || 0,
            reviewCount: parseInt(stats.review_count) || 0,
            relearningCount: parseInt(stats.relearning_count) || 0,
            suspendedCount: parseInt(stats.suspended_count) || 0,
            buriedCount: parseInt(stats.buried_count) || 0,
            totalCount: parseInt(stats.total_count) || 0,
            dueReviewCount: parseInt(stats.due_review_count) || 0,
            averageMatureInterval: parseFloat(stats.avg_mature_interval) || 0,
            recentAccuracy: parseFloat(accuracy.accuracy) || 0,
            totalReviews30d: parseInt(accuracy.total_reviews) || 0,
            averageReviewTimeMs: parseFloat(timeStats.avg_time_ms) || 0,
            medianReviewTimeMs: parseFloat(timeStats.median_time_ms) || 0,
            estimatedMinutes,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
