// @ts-nocheck
/**
 * Tags Routes
 *
 * CRUD operations for the hierarchical tagging system.
 * Supports tag trees, card counts, and bulk pause/resume.
 *
 * Routes:
 * - GET    /api/tags              — Get tag tree with counts
 * - POST   /api/tags              — Create a new tag
 * - PUT    /api/tags/:id          — Update a tag
 * - DELETE /api/tags/:id          — Delete a tag
 * - POST   /api/tags/:id/pause    — Pause all cards with this tag
 * - POST   /api/tags/:id/resume   — Resume all cards with this tag
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../../db/connection';
import { ApiError, requireFields, validateUUID } from '../server';

export const tagsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/tags — Get tag tree with counts
// ---------------------------------------------------------------------------

tagsRouter.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch all tags with card counts via note_tags join
      const result = await query(
        `SELECT
          t.*,
          COUNT(DISTINCT nt.note_id) as note_count,
          COUNT(DISTINCT c.id) as card_count
        FROM tags t
        LEFT JOIN note_tags nt ON nt.tag_id = t.id
        LEFT JOIN cards c ON c.note_id = nt.note_id
        GROUP BY t.id
        ORDER BY t.name`
      );

      // Build tree structure
      const tags = result.rows;
      const tagMap = new Map<string, Record<string, unknown>>();
      const roots: Record<string, unknown>[] = [];

      // First pass: index by id
      for (const tag of tags) {
        tagMap.set(tag.id, {
          ...tag,
          children: [],
          note_count: parseInt(tag.note_count) || 0,
          card_count: parseInt(tag.card_count) || 0,
        });
      }

      // Second pass: build tree
      for (const tag of tagMap.values()) {
        if (tag.parent_id && tagMap.has(tag.parent_id as string)) {
          const parent = tagMap.get(tag.parent_id as string)!;
          (parent.children as Record<string, unknown>[]).push(tag);
        } else {
          roots.push(tag);
        }
      }

      res.json({ data: { tags: roots } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/tags — Create a new tag
// ---------------------------------------------------------------------------

tagsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, parentId, color, icon, description } = req.body;

      requireFields(req.body, ['name']);

      if (typeof name !== 'string' || name.trim().length === 0) {
        throw ApiError.badRequest('Tag name cannot be empty');
      }

      if (name.trim().length > 100) {
        throw ApiError.badRequest('Tag name cannot exceed 100 characters');
      }

      // Disallow hierarchy separator in tag names
      if (name.includes('::')) {
        throw ApiError.badRequest('Tag name cannot contain "::"');
      }

      // Generate slug
      const slug = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\u0600-\u06FF\u4E00-\u9FFF]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Verify parent exists if provided
      if (parentId) {
        validateUUID(parentId, 'parentId');
        const parentResult = await query(
          'SELECT id FROM tags WHERE id = $1',
          [parentId]
        );
        if (parentResult.rowCount === 0) {
          throw ApiError.notFound('Parent tag');
        }
      }

      // Check for duplicate slug under same parent
      const existingResult = await query(
        `SELECT id FROM tags
         WHERE slug = $1 AND ${parentId ? 'parent_id = $2' : 'parent_id IS NULL'}`,
        parentId ? [slug, parentId] : [slug]
      );

      if (existingResult.rowCount! > 0) {
        throw ApiError.conflict(`A tag with slug "${slug}" already exists at this level`);
      }

      const result = await query(
        `INSERT INTO tags (name, slug, parent_id, color, icon, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [
          name.trim(),
          slug,
          parentId || null,
          color || '#3B82F6',
          icon || '',
          (description || '').trim(),
        ]
      );

      res.status(201).json({ data: { tag: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/tags/:id — Update a tag
// ---------------------------------------------------------------------------

tagsRouter.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const { name, parentId, color, icon, description } = req.body;

      if (
        name === undefined &&
        parentId === undefined &&
        color === undefined &&
        icon === undefined &&
        description === undefined
      ) {
        throw ApiError.badRequest('At least one field must be provided for update');
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          throw ApiError.badRequest('Tag name cannot be empty');
        }
        if (name.includes('::')) {
          throw ApiError.badRequest('Tag name cannot contain "::"');
        }

        const slug = name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\u0600-\u06FF\u4E00-\u9FFF]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        updates.push(`name = $${paramIndex}`);
        values.push(name.trim());
        paramIndex++;
        updates.push(`slug = $${paramIndex}`);
        values.push(slug);
        paramIndex++;
      }

      if (parentId !== undefined) {
        if (parentId !== null) {
          validateUUID(parentId, 'parentId');
          if (parentId === id) {
            throw ApiError.badRequest('A tag cannot be its own parent');
          }
        }
        updates.push(`parent_id = $${paramIndex}`);
        values.push(parentId);
        paramIndex++;
      }

      if (color !== undefined) {
        updates.push(`color = $${paramIndex}`);
        values.push(color);
        paramIndex++;
      }

      if (icon !== undefined) {
        updates.push(`icon = $${paramIndex}`);
        values.push(icon);
        paramIndex++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(description);
        paramIndex++;
      }

      values.push(id);

      const result = await query(
        `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        throw ApiError.notFound('Tag');
      }

      res.json({ data: { tag: result.rows[0] } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/tags/:id — Delete a tag
// ---------------------------------------------------------------------------

tagsRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      await withTransaction(async (client) => {
        // Verify tag exists
        const tagResult = await client.query(
          'SELECT * FROM tags WHERE id = $1',
          [id]
        );
        if (tagResult.rowCount === 0) {
          throw ApiError.notFound('Tag');
        }
        const tag = tagResult.rows[0];

        // Re-parent child tags to this tag's parent
        await client.query(
          'UPDATE tags SET parent_id = $1 WHERE parent_id = $2',
          [tag.parent_id, id]
        );

        // Remove all note-tag associations
        await client.query('DELETE FROM note_tags WHERE tag_id = $1', [id]);

        // Delete the tag
        await client.query('DELETE FROM tags WHERE id = $1', [id]);
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/tags/:id/pause — Pause all cards with this tag
// ---------------------------------------------------------------------------

tagsRouter.post(
  '/:id/pause',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Verify tag exists
      const tagResult = await query('SELECT id FROM tags WHERE id = $1', [id]);
      if (tagResult.rowCount === 0) {
        throw ApiError.notFound('Tag');
      }

      // Get all descendant tag IDs (include this tag)
      const descendantResult = await query(
        `WITH RECURSIVE tag_tree AS (
          SELECT id FROM tags WHERE id = $1
          UNION ALL
          SELECT t.id FROM tags t
          INNER JOIN tag_tree tt ON t.parent_id = tt.id
        )
        SELECT id FROM tag_tree`,
        [id]
      );
      const allTagIds = descendantResult.rows.map((r: { id: string }) => r.id);

      // Suspend all cards associated with notes that have any of these tags
      const result = await query(
        `UPDATE cards SET suspended = true, updated_at = NOW()
         WHERE note_id IN (
           SELECT DISTINCT note_id FROM note_tags
           WHERE tag_id = ANY($1::uuid[])
         )
         AND suspended = false`,
        [allTagIds]
      );

      res.json({
        data: {
          pausedCount: result.rowCount || 0,
          tagId: id,
          includedTags: allTagIds,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/tags/:id/resume — Resume all cards with this tag
// ---------------------------------------------------------------------------

tagsRouter.post(
  '/:id/resume',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Verify tag exists
      const tagResult = await query('SELECT id FROM tags WHERE id = $1', [id]);
      if (tagResult.rowCount === 0) {
        throw ApiError.notFound('Tag');
      }

      // Get all descendant tag IDs (include this tag)
      const descendantResult = await query(
        `WITH RECURSIVE tag_tree AS (
          SELECT id FROM tags WHERE id = $1
          UNION ALL
          SELECT t.id FROM tags t
          INNER JOIN tag_tree tt ON t.parent_id = tt.id
        )
        SELECT id FROM tag_tree`,
        [id]
      );
      const allTagIds = descendantResult.rows.map((r: { id: string }) => r.id);

      // Resume all suspended cards associated with these tags
      const result = await query(
        `UPDATE cards SET suspended = false, updated_at = NOW()
         WHERE note_id IN (
           SELECT DISTINCT note_id FROM note_tags
           WHERE tag_id = ANY($1::uuid[])
         )
         AND suspended = true`,
        [allTagIds]
      );

      res.json({
        data: {
          resumedCount: result.rowCount || 0,
          tagId: id,
          includedTags: allTagIds,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
