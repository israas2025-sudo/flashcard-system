/**
 * Tag Service
 *
 * Provides complete CRUD operations, hierarchical tree management,
 * note/card associations, batch operations, and search for the
 * tagging system in the multilingual flashcard application.
 *
 * All queries use parameterized statements to prevent SQL injection.
 * Hierarchical queries use recursive CTEs for efficient tree traversal.
 */

import { pool } from '../db/connection';
import type { Tag, TagTreeNode, TagTreeRow, Card } from './types';
import { slugify, generateTagColor } from './tag-utils';

export class TagService {
  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Create a new tag for a user.
   *
   * Generates a slug from the name and a deterministic color if none is provided.
   * Validates that no sibling tag with the same slug exists under the same parent.
   *
   * @param userId - Owner of the tag
   * @param name - Display name for the tag
   * @param parentId - Optional parent tag ID for hierarchy
   * @param color - Optional hex color (auto-generated if omitted)
   * @param icon - Optional icon identifier or emoji
   * @param description - Optional description text
   * @returns The newly created Tag
   * @throws Error if a sibling tag with the same slug already exists
   */
  async createTag(
    userId: string,
    name: string,
    parentId?: string,
    color?: string,
    icon?: string,
    description?: string
  ): Promise<Tag> {
    const slug = slugify(name);
    const tagColor = color || generateTagColor(name);
    const tagIcon = icon || '';
    const tagDescription = description || '';
    const tagParentId = parentId || null;

    // Check for duplicate slug under the same parent
    const duplicateCheck = await pool.query(
      `SELECT id FROM tags
       WHERE user_id = $1
         AND slug = $2
         AND (parent_id = $3 OR (parent_id IS NULL AND $3 IS NULL))
       LIMIT 1`,
      [userId, slug, tagParentId]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error(
        `A tag with slug "${slug}" already exists under the same parent`
      );
    }

    // If a parentId is provided, verify it exists and belongs to the user
    if (tagParentId) {
      const parentCheck = await pool.query(
        `SELECT id FROM tags WHERE id = $1 AND user_id = $2`,
        [tagParentId, userId]
      );
      if (parentCheck.rows.length === 0) {
        throw new Error(`Parent tag "${tagParentId}" not found`);
      }
    }

    const result = await pool.query(
      `INSERT INTO tags (user_id, name, slug, parent_id, color, icon, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id AS "userId", name, slug,
                 parent_id AS "parentId", color, icon, description,
                 created_at AS "createdAt"`,
      [userId, name.trim(), slug, tagParentId, tagColor, tagIcon, tagDescription]
    );

    return result.rows[0] as Tag;
  }

  /**
   * Retrieve a single tag by its ID.
   *
   * @param tagId - The tag's unique identifier
   * @returns The Tag object
   * @throws Error if the tag is not found
   */
  async getTag(tagId: string): Promise<Tag> {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", name, slug,
              parent_id AS "parentId", color, icon, description,
              created_at AS "createdAt"
       FROM tags
       WHERE id = $1`,
      [tagId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Tag "${tagId}" not found`);
    }

    return result.rows[0] as Tag;
  }

  /**
   * Update one or more fields of an existing tag.
   *
   * If the name is updated, the slug is automatically regenerated.
   * Only provided fields are modified; others remain unchanged.
   *
   * @param tagId - The tag to update
   * @param updates - Partial tag object with fields to change
   * @returns The updated Tag
   * @throws Error if the tag is not found
   */
  async updateTag(tagId: string, updates: Partial<Tag>): Promise<Tag> {
    // Build dynamic SET clause from provided updates
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name.trim());
      // Also regenerate the slug when the name changes
      setClauses.push(`slug = $${paramIndex++}`);
      values.push(slugify(updates.name));
    }

    if (updates.parentId !== undefined) {
      setClauses.push(`parent_id = $${paramIndex++}`);
      values.push(updates.parentId);
    }

    if (updates.color !== undefined) {
      setClauses.push(`color = $${paramIndex++}`);
      values.push(updates.color);
    }

    if (updates.icon !== undefined) {
      setClauses.push(`icon = $${paramIndex++}`);
      values.push(updates.icon);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (setClauses.length === 0) {
      return this.getTag(tagId);
    }

    values.push(tagId);

    const result = await pool.query(
      `UPDATE tags
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, user_id AS "userId", name, slug,
                 parent_id AS "parentId", color, icon, description,
                 created_at AS "createdAt"`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Tag "${tagId}" not found`);
    }

    return result.rows[0] as Tag;
  }

  /**
   * Delete a tag and remove all of its note associations.
   *
   * Child tags are re-parented to the deleted tag's parent (or become
   * root-level if the deleted tag had no parent) to avoid orphans.
   *
   * @param tagId - The tag to delete
   * @throws Error if the tag is not found
   */
  async deleteTag(tagId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the tag's parent so we can re-parent children
      const tagResult = await client.query(
        `SELECT parent_id FROM tags WHERE id = $1`,
        [tagId]
      );

      if (tagResult.rows.length === 0) {
        throw new Error(`Tag "${tagId}" not found`);
      }

      const parentId = tagResult.rows[0].parent_id;

      // Re-parent all children to this tag's parent
      await client.query(
        `UPDATE tags SET parent_id = $1 WHERE parent_id = $2`,
        [parentId, tagId]
      );

      // Remove all note-tag associations
      await client.query(
        `DELETE FROM note_tags WHERE tag_id = $1`,
        [tagId]
      );

      // Delete the tag itself
      await client.query(
        `DELETE FROM tags WHERE id = $1`,
        [tagId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Hierarchy Operations
  // ---------------------------------------------------------------------------

  /**
   * Build the complete tag tree for a user using a recursive CTE.
   *
   * Returns all tags structured as a tree with card counts at each node.
   * The recursive CTE starts from root tags (parent_id IS NULL) and
   * traverses the full depth of the hierarchy.
   *
   * @param userId - The user whose tag tree to retrieve
   * @returns Array of root-level TagTreeNodes, each with nested children
   */
  async getTagTree(userId: string): Promise<TagTreeNode[]> {
    const result = await pool.query(
      `WITH RECURSIVE tag_tree AS (
         -- Base case: root-level tags (no parent)
         SELECT t.id, t.user_id, t.name, t.slug, t.parent_id,
                t.color, t.icon, t.description, t.created_at,
                0 AS depth
         FROM tags t
         WHERE t.parent_id IS NULL AND t.user_id = $1

         UNION ALL

         -- Recursive case: children of already-selected tags
         SELECT t.id, t.user_id, t.name, t.slug, t.parent_id,
                t.color, t.icon, t.description, t.created_at,
                tt.depth + 1
         FROM tags t
         JOIN tag_tree tt ON t.parent_id = tt.id
       )
       SELECT tag_tree.id,
              tag_tree.user_id AS "userId",
              tag_tree.name,
              tag_tree.slug,
              tag_tree.parent_id AS "parentId",
              tag_tree.color,
              tag_tree.icon,
              tag_tree.description,
              tag_tree.created_at AS "createdAt",
              tag_tree.depth,
              COUNT(nt.note_id)::int AS "cardCount"
       FROM tag_tree
       LEFT JOIN note_tags nt ON tag_tree.id = nt.tag_id
       GROUP BY tag_tree.id, tag_tree.user_id, tag_tree.name,
                tag_tree.slug, tag_tree.parent_id, tag_tree.color,
                tag_tree.icon, tag_tree.description, tag_tree.created_at,
                tag_tree.depth
       ORDER BY tag_tree.depth, tag_tree.name`,
      [userId]
    );

    // Build the tree structure from the flat result set
    return this.buildTreeFromRows(result.rows as TagTreeRow[]);
  }

  /**
   * Get the direct children of a tag.
   *
   * @param tagId - The parent tag ID
   * @returns Array of immediate child Tags
   */
  async getChildren(tagId: string): Promise<Tag[]> {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", name, slug,
              parent_id AS "parentId", color, icon, description,
              created_at AS "createdAt"
       FROM tags
       WHERE parent_id = $1
       ORDER BY name`,
      [tagId]
    );

    return result.rows as Tag[];
  }

  /**
   * Get all ancestors of a tag, from the root down to the immediate parent.
   *
   * Uses a recursive CTE that walks up the tree from the given tag to the root.
   * The result is ordered from root (depth 0) to the immediate parent.
   *
   * @param tagId - The tag whose ancestors to find
   * @returns Array of ancestor Tags, ordered root-first
   */
  async getAncestors(tagId: string): Promise<Tag[]> {
    const result = await pool.query(
      `WITH RECURSIVE ancestors AS (
         -- Start from the given tag's parent
         SELECT t.id, t.user_id, t.name, t.slug, t.parent_id,
                t.color, t.icon, t.description, t.created_at,
                1 AS depth
         FROM tags t
         WHERE t.id = (SELECT parent_id FROM tags WHERE id = $1)

         UNION ALL

         -- Walk up to the next parent
         SELECT t.id, t.user_id, t.name, t.slug, t.parent_id,
                t.color, t.icon, t.description, t.created_at,
                a.depth + 1
         FROM tags t
         JOIN ancestors a ON t.id = a.parent_id
       )
       SELECT id, user_id AS "userId", name, slug,
              parent_id AS "parentId", color, icon, description,
              created_at AS "createdAt"
       FROM ancestors
       ORDER BY depth DESC`,
      [tagId]
    );

    return result.rows as Tag[];
  }

  /**
   * Move a tag to a new parent (or to root level if newParentId is null).
   *
   * Validates that the move does not create a circular reference by checking
   * that the new parent is not a descendant of the tag being moved.
   *
   * @param tagId - The tag to move
   * @param newParentId - The new parent tag ID, or null for root level
   * @throws Error if the move would create a circular reference
   */
  async moveTag(tagId: string, newParentId: string | null): Promise<void> {
    if (newParentId === tagId) {
      throw new Error('A tag cannot be its own parent');
    }

    // Check for circular reference: ensure newParentId is not a descendant of tagId
    if (newParentId) {
      const circularCheck = await pool.query(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM tags WHERE parent_id = $1
           UNION ALL
           SELECT t.id FROM tags t JOIN descendants d ON t.parent_id = d.id
         )
         SELECT id FROM descendants WHERE id = $2
         LIMIT 1`,
        [tagId, newParentId]
      );

      if (circularCheck.rows.length > 0) {
        throw new Error(
          'Cannot move tag: the target parent is a descendant of this tag, which would create a cycle'
        );
      }
    }

    const result = await pool.query(
      `UPDATE tags SET parent_id = $1 WHERE id = $2 RETURNING id`,
      [newParentId, tagId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Tag "${tagId}" not found`);
    }
  }

  /**
   * Merge one tag into another.
   *
   * All note associations from the source tag are transferred to the target tag.
   * Duplicate associations (note already tagged with target) are skipped.
   * The source tag is then deleted. Children of the source tag are re-parented
   * to the target tag.
   *
   * @param sourceTagId - The tag to merge from (will be deleted)
   * @param targetTagId - The tag to merge into (will receive all notes)
   */
  async mergeTag(sourceTagId: string, targetTagId: string): Promise<void> {
    if (sourceTagId === targetTagId) {
      throw new Error('Cannot merge a tag into itself');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Move note associations from source to target, skipping duplicates
      await client.query(
        `INSERT INTO note_tags (note_id, tag_id)
         SELECT nt.note_id, $1
         FROM note_tags nt
         WHERE nt.tag_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM note_tags existing
             WHERE existing.note_id = nt.note_id
               AND existing.tag_id = $1
           )`,
        [targetTagId, sourceTagId]
      );

      // Re-parent children of the source tag to the target tag
      await client.query(
        `UPDATE tags SET parent_id = $1 WHERE parent_id = $2`,
        [targetTagId, sourceTagId]
      );

      // Remove all remaining note associations from the source
      await client.query(
        `DELETE FROM note_tags WHERE tag_id = $1`,
        [sourceTagId]
      );

      // Delete the source tag
      await client.query(
        `DELETE FROM tags WHERE id = $1`,
        [sourceTagId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Note Association Operations
  // ---------------------------------------------------------------------------

  /**
   * Associate a tag with a note.
   *
   * Uses ON CONFLICT to silently handle duplicate associations.
   *
   * @param noteId - The note to tag
   * @param tagId - The tag to apply
   */
  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    await pool.query(
      `INSERT INTO note_tags (note_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (note_id, tag_id) DO NOTHING`,
      [noteId, tagId]
    );
  }

  /**
   * Remove a tag association from a note.
   *
   * @param noteId - The note to untag
   * @param tagId - The tag to remove
   */
  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await pool.query(
      `DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2`,
      [noteId, tagId]
    );
  }

  /**
   * Get all tags associated with a specific note.
   *
   * @param noteId - The note whose tags to retrieve
   * @returns Array of Tags applied to the note
   */
  async getNoteTags(noteId: string): Promise<Tag[]> {
    const result = await pool.query(
      `SELECT t.id, t.user_id AS "userId", t.name, t.slug,
              t.parent_id AS "parentId", t.color, t.icon, t.description,
              t.created_at AS "createdAt"
       FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = $1
       ORDER BY t.name`,
      [noteId]
    );

    return result.rows as Tag[];
  }

  /**
   * Get all cards associated with a tag.
   *
   * When includeChildren is true, uses a recursive CTE to find all descendant
   * tags and returns cards from notes tagged with any of them.
   *
   * @param tagId - The tag to query
   * @param includeChildren - Whether to include cards from descendant tags
   * @returns Array of Card objects
   */
  async getCardsByTag(tagId: string, includeChildren = false): Promise<Card[]> {
    let query: string;
    const params: string[] = [tagId];

    if (includeChildren) {
      query = `
        WITH RECURSIVE tag_subtree AS (
          SELECT id FROM tags WHERE id = $1
          UNION ALL
          SELECT t.id FROM tags t JOIN tag_subtree ts ON t.parent_id = ts.id
        )
        SELECT DISTINCT c.id, c.note_id AS "noteId", c.deck_id AS "deckId",
               c.front, c.back, c.queue, c.suspended
        FROM cards c
        JOIN note_tags nt ON c.note_id = nt.note_id
        JOIN tag_subtree ts ON nt.tag_id = ts.id
        ORDER BY c.id`;
    } else {
      query = `
        SELECT DISTINCT c.id, c.note_id AS "noteId", c.deck_id AS "deckId",
               c.front, c.back, c.queue, c.suspended
        FROM cards c
        JOIN note_tags nt ON c.note_id = nt.note_id
        WHERE nt.tag_id = $1
        ORDER BY c.id`;
    }

    const result = await pool.query(query, params);
    return result.rows as Card[];
  }

  /**
   * Get the count of cards associated with a tag.
   *
   * When includeChildren is true, counts cards from all descendant tags as well.
   *
   * @param tagId - The tag to count cards for
   * @param includeChildren - Whether to include descendant tag cards
   * @returns The total card count
   */
  async getTagCardCount(tagId: string, includeChildren = false): Promise<number> {
    let query: string;
    const params: string[] = [tagId];

    if (includeChildren) {
      query = `
        WITH RECURSIVE tag_subtree AS (
          SELECT id FROM tags WHERE id = $1
          UNION ALL
          SELECT t.id FROM tags t JOIN tag_subtree ts ON t.parent_id = ts.id
        )
        SELECT COUNT(DISTINCT c.id)::int AS count
        FROM cards c
        JOIN note_tags nt ON c.note_id = nt.note_id
        JOIN tag_subtree ts ON nt.tag_id = ts.id`;
    } else {
      query = `
        SELECT COUNT(DISTINCT c.id)::int AS count
        FROM cards c
        JOIN note_tags nt ON c.note_id = nt.note_id
        WHERE nt.tag_id = $1`;
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  }

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  /**
   * Add a tag to multiple notes in a single operation.
   *
   * Uses unnest to efficiently insert multiple rows at once.
   * Silently skips any notes that are already tagged.
   *
   * @param noteIds - Array of note IDs to tag
   * @param tagId - The tag to apply to all notes
   */
  async batchAddTag(noteIds: string[], tagId: string): Promise<void> {
    if (noteIds.length === 0) {
      return;
    }

    await pool.query(
      `INSERT INTO note_tags (note_id, tag_id)
       SELECT unnest($1::uuid[]), $2
       ON CONFLICT (note_id, tag_id) DO NOTHING`,
      [noteIds, tagId]
    );
  }

  /**
   * Remove a tag from multiple notes in a single operation.
   *
   * @param noteIds - Array of note IDs to untag
   * @param tagId - The tag to remove from all notes
   */
  async batchRemoveTag(noteIds: string[], tagId: string): Promise<void> {
    if (noteIds.length === 0) {
      return;
    }

    await pool.query(
      `DELETE FROM note_tags
       WHERE note_id = ANY($1::uuid[]) AND tag_id = $2`,
      [noteIds, tagId]
    );
  }

  /**
   * Rename a tag. Updates both the display name and the slug.
   *
   * @param tagId - The tag to rename
   * @param newName - The new display name
   * @returns The updated Tag
   */
  async renameTag(tagId: string, newName: string): Promise<void> {
    const newSlug = slugify(newName);

    const result = await pool.query(
      `UPDATE tags SET name = $1, slug = $2 WHERE id = $3 RETURNING id`,
      [newName.trim(), newSlug, tagId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Tag "${tagId}" not found`);
    }
  }

  // ---------------------------------------------------------------------------
  // Search Operations
  // ---------------------------------------------------------------------------

  /**
   * Search for tags by name using case-insensitive partial matching.
   *
   * Uses ILIKE for PostgreSQL case-insensitive pattern matching.
   * Results are ordered by relevance: exact matches first, then prefix
   * matches, then substring matches.
   *
   * @param userId - The user whose tags to search
   * @param query - The search term
   * @returns Array of matching Tags
   */
  async searchTags(userId: string, query: string): Promise<Tag[]> {
    const searchPattern = `%${query}%`;

    const result = await pool.query(
      `SELECT id, user_id AS "userId", name, slug,
              parent_id AS "parentId", color, icon, description,
              created_at AS "createdAt"
       FROM tags
       WHERE user_id = $1 AND (name ILIKE $2 OR slug ILIKE $2)
       ORDER BY
         CASE
           WHEN LOWER(name) = LOWER($3) THEN 0
           WHEN LOWER(name) LIKE LOWER($3) || '%' THEN 1
           ELSE 2
         END,
         name
       LIMIT 50`,
      [userId, searchPattern, query]
    );

    return result.rows as Tag[];
  }

  /**
   * Find all tags that are not associated with any notes.
   *
   * Useful for cleanup operations to identify and remove unused tags.
   *
   * @param userId - The user whose unused tags to find
   * @returns Array of Tags with no note associations
   */
  async getUnusedTags(userId: string): Promise<Tag[]> {
    const result = await pool.query(
      `SELECT t.id, t.user_id AS "userId", t.name, t.slug,
              t.parent_id AS "parentId", t.color, t.icon, t.description,
              t.created_at AS "createdAt"
       FROM tags t
       LEFT JOIN note_tags nt ON t.id = nt.tag_id
       WHERE t.user_id = $1 AND nt.note_id IS NULL
       ORDER BY t.name`,
      [userId]
    );

    return result.rows as Tag[];
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Assemble a flat list of TagTreeRows (from the recursive CTE) into a
   * nested tree structure.
   *
   * @param rows - Flat array of tag rows with depth information
   * @returns Array of root-level TagTreeNodes with nested children
   */
  private buildTreeFromRows(rows: TagTreeRow[]): TagTreeNode[] {
    const nodeMap = new Map<string, TagTreeNode>();
    const roots: TagTreeNode[] = [];

    // First pass: create all nodes
    for (const row of rows) {
      const node: TagTreeNode = {
        ...row,
        children: [],
        cardCount: row.cardCount,
        depth: row.depth,
      };
      nodeMap.set(node.id, node);
    }

    // Second pass: link parents to children
    for (const row of rows) {
      const node = nodeMap.get(row.id)!;
      if (row.parentId === null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(row.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not in result set (shouldn't happen with correct CTE),
          // treat as root
          roots.push(node);
        }
      }
    }

    return roots;
  }
}
