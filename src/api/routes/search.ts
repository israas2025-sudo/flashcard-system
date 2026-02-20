// @ts-nocheck
/**
 * Search Routes
 *
 * Full-text and filtered search across cards and notes,
 * plus batch operations on search results.
 *
 * Routes:
 * - GET  /api/search?q=QUERY&page=1&sort=due  — Search cards
 * - POST /api/search/batch                     — Batch operations on search results
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../../db/connection';
import { ApiError, validateUUID, parseIntParam } from '../server';

export const searchRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/search — Search cards
// ---------------------------------------------------------------------------

searchRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string || '').trim();
      const page = parseIntParam(req.query.page as string, 1, 'page');
      const pageSize = parseIntParam(req.query.pageSize as string, 25, 'pageSize');
      const sort = (req.query.sort as string) || 'due';
      const order = (req.query.order as string) || 'asc';
      const deckId = req.query.deckId as string | undefined;
      const tagIds = req.query.tags as string | undefined;
      const state = req.query.state as string | undefined;
      const flagFilter = req.query.flag as string | undefined;

      // Validate sort field
      const validSorts = ['due', 'created_at', 'updated_at', 'reps', 'lapses', 'stability', 'difficulty'];
      if (!validSorts.includes(sort)) {
        throw ApiError.badRequest(
          `Invalid sort field. Must be one of: ${validSorts.join(', ')}`
        );
      }

      // Validate order direction
      if (!['asc', 'desc'].includes(order.toLowerCase())) {
        throw ApiError.badRequest('order must be "asc" or "desc"');
      }

      // Validate page
      if (page < 1) {
        throw ApiError.badRequest('page must be >= 1');
      }

      if (pageSize < 1 || pageSize > 100) {
        throw ApiError.badRequest('pageSize must be between 1 and 100');
      }

      // Build query
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Text search (searches note fields via JSON)
      if (q.length > 0) {
        conditions.push(
          `(n.fields::text ILIKE $${paramIndex} OR c.id::text ILIKE $${paramIndex})`
        );
        params.push(`%${q}%`);
        paramIndex++;
      }

      // Deck filter (including child decks)
      if (deckId) {
        validateUUID(deckId, 'deckId');
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

      // Tag filter
      if (tagIds) {
        const tagIdList = tagIds.split(',').map((t) => t.trim());
        for (const tagId of tagIdList) {
          validateUUID(tagId, 'tagId');
        }
        conditions.push(
          `c.note_id IN (
            SELECT DISTINCT nt.note_id FROM note_tags nt
            WHERE nt.tag_id = ANY($${paramIndex}::uuid[])
          )`
        );
        params.push(tagIdList);
        paramIndex++;
      }

      // State filter
      if (state) {
        const validStates: Record<string, string> = {
          'new': 'c.queue = 0',
          'learning': 'c.queue = 1',
          'review': 'c.queue = 2',
          'relearning': 'c.queue = 3',
          'suspended': 'c.suspended = true',
          'buried': 'c.buried = true',
          'due': 'c.due <= NOW() AND NOT c.suspended AND NOT c.buried',
        };

        if (!validStates[state]) {
          throw ApiError.badRequest(
            `Invalid state filter. Must be one of: ${Object.keys(validStates).join(', ')}`
          );
        }
        conditions.push(validStates[state]);
      }

      // Flag filter
      if (flagFilter !== undefined) {
        const flagValue = parseInt(flagFilter, 10);
        if (isNaN(flagValue) || flagValue < 0 || flagValue > 7) {
          throw ApiError.badRequest('flag must be between 0 and 7');
        }
        conditions.push(`c.flag = $${paramIndex}`);
        params.push(flagValue);
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total
         FROM cards c
         LEFT JOIN notes n ON c.note_id = n.id
         ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total) || 0;

      // Get paginated results
      const offset = (page - 1) * pageSize;
      params.push(pageSize, offset);

      const searchResult = await query(
        `SELECT
          c.*,
          n.fields as note_fields,
          n.note_type_id,
          d.name as deck_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
             FROM tags t
             INNER JOIN note_tags nt ON nt.tag_id = t.id
             WHERE nt.note_id = c.note_id),
            '[]'::json
          ) as tags
        FROM cards c
        LEFT JOIN notes n ON c.note_id = n.id
        LEFT JOIN decks d ON c.deck_id = d.id
        ${whereClause}
        ORDER BY c.${sort} ${order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      res.json({
        data: {
          cards: searchResult.rows,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            hasMore: page * pageSize < total,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/search/batch — Batch operations on search results
// ---------------------------------------------------------------------------

searchRouter.post(
  '/batch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action, cardIds, options } = req.body;

      // Validate required fields
      if (!action || typeof action !== 'string') {
        throw ApiError.badRequest('action is required and must be a string');
      }

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        throw ApiError.badRequest('cardIds must be a non-empty array');
      }

      if (cardIds.length > 1000) {
        throw ApiError.badRequest('Cannot batch more than 1000 cards at once');
      }

      // Validate all card IDs
      for (const cardId of cardIds) {
        validateUUID(cardId, 'cardId');
      }

      const validActions = [
        'suspend',
        'unsuspend',
        'bury',
        'unbury',
        'set_flag',
        'move_deck',
        'reset_scheduling',
        'delete',
        'add_tag',
        'remove_tag',
      ];

      if (!validActions.includes(action)) {
        throw ApiError.badRequest(
          `Invalid action. Must be one of: ${validActions.join(', ')}`
        );
      }

      let affectedCount = 0;

      await withTransaction(async (client) => {
        switch (action) {
          case 'suspend': {
            const result = await client.query(
              `UPDATE cards SET suspended = true, updated_at = NOW()
               WHERE id = ANY($1::uuid[]) AND suspended = false`,
              [cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'unsuspend': {
            const result = await client.query(
              `UPDATE cards SET suspended = false, updated_at = NOW()
               WHERE id = ANY($1::uuid[]) AND suspended = true`,
              [cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'bury': {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const result = await client.query(
              `UPDATE cards SET buried = true, due = $1, updated_at = NOW()
               WHERE id = ANY($2::uuid[])`,
              [tomorrow, cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'unbury': {
            const result = await client.query(
              `UPDATE cards SET buried = false, updated_at = NOW()
               WHERE id = ANY($1::uuid[]) AND buried = true`,
              [cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'set_flag': {
            const flag = options?.flag;
            if (flag === undefined || typeof flag !== 'number' || flag < 0 || flag > 7) {
              throw ApiError.badRequest('options.flag must be a number between 0 and 7');
            }
            const result = await client.query(
              `UPDATE cards SET flag = $1, updated_at = NOW()
               WHERE id = ANY($2::uuid[])`,
              [flag, cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'move_deck': {
            const deckId = options?.deckId;
            if (!deckId) {
              throw ApiError.badRequest('options.deckId is required for move_deck action');
            }
            validateUUID(deckId, 'options.deckId');

            // Verify deck exists
            const deckCheck = await client.query(
              'SELECT id FROM decks WHERE id = $1',
              [deckId]
            );
            if (deckCheck.rowCount === 0) {
              throw ApiError.notFound('Target deck');
            }

            const result = await client.query(
              `UPDATE cards SET deck_id = $1, updated_at = NOW()
               WHERE id = ANY($2::uuid[])`,
              [deckId, cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'reset_scheduling': {
            const result = await client.query(
              `UPDATE cards SET
                queue = 0,
                due = NOW(),
                stability = NULL,
                difficulty = NULL,
                reps = 0,
                lapses = 0,
                scheduled_days = 0,
                elapsed_days = 0,
                last_review = NULL,
                suspended = false,
                buried = false,
                updated_at = NOW()
              WHERE id = ANY($1::uuid[])`,
              [cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'delete': {
            // Delete review logs first
            await client.query(
              'DELETE FROM review_logs WHERE card_id = ANY($1::uuid[])',
              [cardIds]
            );

            const result = await client.query(
              'DELETE FROM cards WHERE id = ANY($1::uuid[])',
              [cardIds]
            );
            affectedCount = result.rowCount || 0;
            break;
          }

          case 'add_tag': {
            const tagId = options?.tagId;
            if (!tagId) {
              throw ApiError.badRequest('options.tagId is required for add_tag action');
            }
            validateUUID(tagId, 'options.tagId');

            // Get note IDs for these cards
            const noteIds = await client.query(
              'SELECT DISTINCT note_id FROM cards WHERE id = ANY($1::uuid[]) AND note_id IS NOT NULL',
              [cardIds]
            );

            for (const row of noteIds.rows) {
              await client.query(
                `INSERT INTO note_tags (note_id, tag_id, created_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (note_id, tag_id) DO NOTHING`,
                [row.note_id, tagId]
              );
            }
            affectedCount = noteIds.rowCount || 0;
            break;
          }

          case 'remove_tag': {
            const tagId = options?.tagId;
            if (!tagId) {
              throw ApiError.badRequest('options.tagId is required for remove_tag action');
            }
            validateUUID(tagId, 'options.tagId');

            const noteIds = await client.query(
              'SELECT DISTINCT note_id FROM cards WHERE id = ANY($1::uuid[]) AND note_id IS NOT NULL',
              [cardIds]
            );
            const noteIdList = noteIds.rows.map((r: { note_id: string }) => r.note_id);

            const result = await client.query(
              'DELETE FROM note_tags WHERE note_id = ANY($1::uuid[]) AND tag_id = $2',
              [noteIdList, tagId]
            );
            affectedCount = result.rowCount || 0;
            break;
          }
        }
      });

      res.json({
        data: {
          action,
          requestedCount: cardIds.length,
          affectedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
