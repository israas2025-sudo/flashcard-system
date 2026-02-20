/**
 * Note/Card CRUD Service
 *
 * Provides complete lifecycle management for notes and their generated cards:
 * - Create notes with automatic card generation
 * - Read notes with full context (note type, cards, tags)
 * - Update notes with card regeneration (add/remove as needed)
 * - Delete notes and all associated cards and tags
 * - Duplicate detection via first-field checksum
 * - Batch operations for bulk import workflows
 * - Find and replace across note fields
 * - Note type CRUD for managing custom note types
 *
 * All database operations use transactions for consistency.
 * Parameterized queries are used throughout to prevent SQL injection.
 */

import { query, withTransaction, getClient } from '../db/connection';
import { CardGenerator } from '../templates/card-generator';
import { TemplateEngine } from '../templates/template-engine';
import type {
  Note,
  NoteType,
  NoteTypeKind,
  NoteField,
  CardTemplate,
  CardCreationData,
} from '../templates/types';
import type { Tag } from '../tags/types';
import type {
  NoteWithCards,
  NoteCard,
  NoteCreationData,
  NoteUpdateResult,
  DuplicateGroup,
  BatchCreateResult,
  FindReplaceResult,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Compute a CRC32 checksum for duplicate detection.
 *
 * Uses a simple string-hash approach. The value is normalized by trimming,
 * lower-casing, and stripping HTML tags before hashing.
 */
function computeChecksum(value: string): number {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')  // strip HTML
    .replace(/\s+/g, ' ');    // normalize whitespace

  // CRC32 implementation
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < normalized.length; i++) {
    crc ^= normalized.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Get the first field name from a note type's ordered fields.
 */
function getFirstFieldName(noteType: NoteType): string {
  if (noteType.fields.length === 0) {
    throw new Error(`Note type "${noteType.name}" has no fields`);
  }
  const sorted = [...noteType.fields].sort((a, b) => a.ordinal - b.ordinal);
  return sorted[0].name;
}

// ---------------------------------------------------------------------------
// NoteService
// ---------------------------------------------------------------------------

export class NoteService {
  private cardGenerator: CardGenerator;
  private templateEngine: TemplateEngine;

  constructor() {
    this.templateEngine = new TemplateEngine();
    this.cardGenerator = new CardGenerator(this.templateEngine);
  }

  // =========================================================================
  // CRUD — Create
  // =========================================================================

  /**
   * Create a new note and generate its cards.
   *
   * Steps:
   * 1. Fetch the note type to get field definitions and templates
   * 2. Compute first_field_checksum for duplicate detection
   * 3. Insert the note row
   * 4. Use CardGenerator to create card rows for each template
   * 5. Render front/back HTML for each card
   * 6. Add tags via the note_tags junction table
   *
   * @param userId     - Owner of the note
   * @param noteTypeId - ID of the note type schema
   * @param deckId     - Target deck for generated cards
   * @param fields     - Field values keyed by field name
   * @param tags       - Optional tag IDs to associate
   * @returns The created note and its generated cards
   */
  async createNote(
    userId: string,
    noteTypeId: string,
    deckId: string,
    fields: Record<string, string>,
    tags?: string[]
  ): Promise<{ note: Note; cards: NoteCard[] }> {
    // 1. Fetch the note type
    const noteType = await this.fetchNoteType(noteTypeId);

    // 2. Compute checksum on the first field
    const firstFieldName = getFirstFieldName(noteType);
    const firstFieldValue = fields[firstFieldName] || '';
    const checksum = computeChecksum(firstFieldValue);

    // 3 - 6. Perform all inserts in a transaction
    const noteId = generateId();
    const now = new Date();

    const note: Note = {
      id: noteId,
      noteTypeId,
      deckId,
      fields,
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
    };

    // Generate card creation data
    const cardData = this.cardGenerator.generateCards(note, noteType);

    // Render HTML for each card
    const renderedCards: NoteCard[] = cardData.map((cd) => {
      const frontHtml = this.renderCardFront(noteType, cd, fields);
      const backHtml = this.renderCardBack(noteType, cd, fields, frontHtml);

      return {
        id: generateId(),
        noteId,
        deckId,
        templateOrdinal: cd.templateOrdinal,
        clozeOrdinal: cd.clozeOrdinal,
        frontHtml,
        backHtml,
        queue: 0, // new
        suspended: false,
        due: null,
        createdAt: now,
      };
    });

    await withTransaction(async (client) => {
      // Insert note
      await client.query(
        `INSERT INTO notes (id, user_id, note_type_id, deck_id, fields, first_field_checksum, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [noteId, userId, noteTypeId, deckId, JSON.stringify(fields), checksum, now, now]
      );

      // Insert cards
      for (const card of renderedCards) {
        await client.query(
          `INSERT INTO cards (id, note_id, deck_id, template_ordinal, cloze_ordinal, front_html, back_html, queue, suspended, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            card.id, noteId, deckId, card.templateOrdinal, card.clozeOrdinal,
            card.frontHtml, card.backHtml, card.queue, card.suspended, now, now,
          ]
        );
      }

      // Insert tag associations
      if (tags && tags.length > 0) {
        for (const tagId of tags) {
          await client.query(
            `INSERT INTO note_tags (note_id, tag_id, created_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (note_id, tag_id) DO NOTHING`,
            [noteId, tagId, now]
          );
        }
      }
    });

    return { note, cards: renderedCards };
  }

  // =========================================================================
  // CRUD — Read
  // =========================================================================

  /**
   * Retrieve a note with its full context: note type, cards, and tags.
   *
   * @param noteId - The note's unique identifier
   * @returns Complete note data bundle
   * @throws Error if the note is not found
   */
  async getNote(noteId: string): Promise<NoteWithCards> {
    // Fetch note
    const noteResult = await query(
      `SELECT id, note_type_id AS "noteTypeId", deck_id AS "deckId",
              fields, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM notes WHERE id = $1`,
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      throw new Error(`Note "${noteId}" not found`);
    }

    const row = noteResult.rows[0] as Record<string, unknown>;
    const note: Note = {
      id: row.id as string,
      noteTypeId: row.noteTypeId as string,
      deckId: row.deckId as string,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields as string) : row.fields as Record<string, string>,
      tags: [],
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    };

    // Fetch note type
    const noteType = await this.fetchNoteType(note.noteTypeId);

    // Fetch cards
    const cardsResult = await query(
      `SELECT id, note_id AS "noteId", deck_id AS "deckId",
              template_ordinal AS "templateOrdinal", cloze_ordinal AS "clozeOrdinal",
              front_html AS "frontHtml", back_html AS "backHtml",
              queue, suspended, due, created_at AS "createdAt"
       FROM cards WHERE note_id = $1
       ORDER BY template_ordinal, cloze_ordinal`,
      [noteId]
    );

    const cards: NoteCard[] = cardsResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      noteId: r.noteId as string,
      deckId: r.deckId as string,
      templateOrdinal: r.templateOrdinal as number,
      clozeOrdinal: r.clozeOrdinal as number,
      frontHtml: (r.frontHtml as string) || '',
      backHtml: (r.backHtml as string) || '',
      queue: (r.queue as number) || 0,
      suspended: (r.suspended as boolean) || false,
      due: r.due ? new Date(r.due as string) : null,
      createdAt: new Date(r.createdAt as string),
    }));

    // Fetch tags
    const tagsResult = await query(
      `SELECT t.id, t.user_id AS "userId", t.name, t.slug,
              t.parent_id AS "parentId", t.color, t.icon, t.description,
              t.created_at AS "createdAt"
       FROM tags t
       JOIN note_tags nt ON t.id = nt.tag_id
       WHERE nt.note_id = $1
       ORDER BY t.name`,
      [noteId]
    );

    const tags = tagsResult.rows as Tag[];
    note.tags = tags.map((t) => t.id);

    return { note, noteType, cards, tags };
  }

  // =========================================================================
  // CRUD — Update
  // =========================================================================

  /**
   * Update a note's fields and regenerate cards as needed.
   *
   * Steps:
   * 1. Update the note's field values and checksum
   * 2. Re-run CardGenerator to determine what cards should exist
   * 3. Compare expected cards with existing cards
   * 4. Add cards for new templates/cloze numbers
   * 5. Remove cards for deleted templates/cloze numbers
   *
   * Existing cards that still match retain their scheduling state.
   *
   * @param noteId - The note to update
   * @param fields - New field values (complete replacement)
   * @returns The updated note and card change counts
   */
  async updateNote(
    noteId: string,
    fields: Record<string, string>
  ): Promise<NoteUpdateResult> {
    const now = new Date();

    return await withTransaction(async (client) => {
      // Fetch current note
      const noteResult = await client.query(
        `SELECT id, note_type_id, deck_id, fields FROM notes WHERE id = $1 FOR UPDATE`,
        [noteId]
      );

      if (noteResult.rows.length === 0) {
        throw new Error(`Note "${noteId}" not found`);
      }

      const row = noteResult.rows[0];
      const noteTypeId = row.note_type_id as string;
      const deckId = row.deck_id as string;

      // Fetch note type
      const noteType = await this.fetchNoteType(noteTypeId);

      // Compute new checksum
      const firstFieldName = getFirstFieldName(noteType);
      const firstFieldValue = fields[firstFieldName] || '';
      const checksum = computeChecksum(firstFieldValue);

      // Update note fields
      await client.query(
        `UPDATE notes SET fields = $1, first_field_checksum = $2, updated_at = $3 WHERE id = $4`,
        [JSON.stringify(fields), checksum, now, noteId]
      );

      const note: Note = {
        id: noteId,
        noteTypeId,
        deckId,
        fields,
        tags: [],
        createdAt: row.created_at as Date,
        updatedAt: now,
      };

      // Determine what cards should exist now
      const expectedCards = this.cardGenerator.generateCards(note, noteType);

      // Fetch existing cards
      const existingResult = await client.query(
        `SELECT id, template_ordinal, cloze_ordinal FROM cards WHERE note_id = $1`,
        [noteId]
      );

      const existing = existingResult.rows as Array<{
        id: string;
        template_ordinal: number;
        cloze_ordinal: number;
      }>;

      // Build lookup keys for comparison
      const expectedKeys = new Set(
        expectedCards.map((c) => `${c.templateOrdinal}:${c.clozeOrdinal}`)
      );
      const existingMap = new Map(
        existing.map((c) => [`${c.template_ordinal}:${c.cloze_ordinal}`, c.id])
      );

      // Cards to add
      let cardsAdded = 0;
      for (const cd of expectedCards) {
        const key = `${cd.templateOrdinal}:${cd.clozeOrdinal}`;
        if (!existingMap.has(key)) {
          // New card — render and insert
          const frontHtml = this.renderCardFront(noteType, cd, fields);
          const backHtml = this.renderCardBack(noteType, cd, fields, frontHtml);
          const cardId = generateId();

          await client.query(
            `INSERT INTO cards (id, note_id, deck_id, template_ordinal, cloze_ordinal, front_html, back_html, queue, suspended, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0, false, $8, $9)`,
            [cardId, noteId, deckId, cd.templateOrdinal, cd.clozeOrdinal, frontHtml, backHtml, now, now]
          );
          cardsAdded++;
        } else {
          // Existing card — update rendered HTML but keep scheduling state
          const frontHtml = this.renderCardFront(noteType, cd, fields);
          const backHtml = this.renderCardBack(noteType, cd, fields, frontHtml);
          const existingId = existingMap.get(key);

          await client.query(
            `UPDATE cards SET front_html = $1, back_html = $2, updated_at = $3 WHERE id = $4`,
            [frontHtml, backHtml, now, existingId]
          );
        }
      }

      // Cards to remove
      let cardsRemoved = 0;
      for (const [key, cardId] of existingMap) {
        if (!expectedKeys.has(key)) {
          await client.query(`DELETE FROM cards WHERE id = $1`, [cardId]);
          cardsRemoved++;
        }
      }

      return { note, cardsAdded, cardsRemoved };
    });
  }

  // =========================================================================
  // CRUD — Delete
  // =========================================================================

  /**
   * Delete a note and all its associated cards and tag links.
   *
   * @param noteId - The note to delete
   * @throws Error if the note is not found
   */
  async deleteNote(noteId: string): Promise<void> {
    await withTransaction(async (client) => {
      // Verify note exists
      const check = await client.query(
        `SELECT id FROM notes WHERE id = $1`,
        [noteId]
      );

      if (check.rows.length === 0) {
        throw new Error(`Note "${noteId}" not found`);
      }

      // Delete tag associations
      await client.query(`DELETE FROM note_tags WHERE note_id = $1`, [noteId]);

      // Delete cards
      await client.query(`DELETE FROM cards WHERE note_id = $1`, [noteId]);

      // Delete note
      await client.query(`DELETE FROM notes WHERE id = $1`, [noteId]);
    });
  }

  // =========================================================================
  // Duplicate Detection
  // =========================================================================

  /**
   * Check if a note with the same first field value already exists.
   *
   * Uses checksum matching first (fast), then exact comparison
   * on the field value to confirm.
   *
   * @param noteTypeId      - The note type to check within
   * @param firstFieldValue - The first field value to check for duplicates
   * @returns The existing note if a duplicate is found, or null
   */
  async checkDuplicate(
    noteTypeId: string,
    firstFieldValue: string
  ): Promise<Note | null> {
    const checksum = computeChecksum(firstFieldValue);

    const result = await query(
      `SELECT id, note_type_id AS "noteTypeId", deck_id AS "deckId",
              fields, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM notes
       WHERE note_type_id = $1 AND first_field_checksum = $2
       LIMIT 10`,
      [noteTypeId, checksum]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Fetch the note type to get the first field name
    const noteType = await this.fetchNoteType(noteTypeId);
    const firstFieldName = getFirstFieldName(noteType);

    // Exact match check
    const normalizedInput = firstFieldValue.trim().toLowerCase().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');

    for (const row of result.rows) {
      const rowFields = typeof row.fields === 'string' ? JSON.parse(row.fields as string) : row.fields;
      const existing = (rowFields[firstFieldName] || '').trim().toLowerCase().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');

      if (existing === normalizedInput) {
        return {
          id: row.id as string,
          noteTypeId: row.noteTypeId as string,
          deckId: row.deckId as string,
          fields: rowFields as Record<string, string>,
          tags: [],
          createdAt: new Date(row.createdAt as string),
          updatedAt: new Date(row.updatedAt as string),
        };
      }
    }

    return null;
  }

  /**
   * Find all groups of potential duplicate notes for a user and note type.
   *
   * Groups notes by their first_field_checksum. Only groups with 2+
   * notes are returned (since a group of 1 is not a duplicate).
   *
   * @param userId     - The user whose notes to scan
   * @param noteTypeId - The note type to check within
   * @returns Array of duplicate groups
   */
  async findDuplicates(userId: string, noteTypeId: string): Promise<DuplicateGroup[]> {
    const result = await query(
      `SELECT first_field_checksum AS checksum, COUNT(*)::int AS cnt
       FROM notes
       WHERE user_id = $1 AND note_type_id = $2
       GROUP BY first_field_checksum
       HAVING COUNT(*) > 1
       ORDER BY cnt DESC
       LIMIT 100`,
      [userId, noteTypeId]
    );

    const groups: DuplicateGroup[] = [];

    for (const row of result.rows) {
      const checksum = row.checksum as number;
      const notesResult = await query(
        `SELECT id, note_type_id AS "noteTypeId", deck_id AS "deckId",
                fields, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM notes
         WHERE user_id = $1 AND note_type_id = $2 AND first_field_checksum = $3
         ORDER BY created_at`,
        [userId, noteTypeId, checksum]
      );

      const notes: Note[] = notesResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        noteTypeId: r.noteTypeId as string,
        deckId: r.deckId as string,
        fields: typeof r.fields === 'string' ? JSON.parse(r.fields as string) : r.fields as Record<string, string>,
        tags: [],
        createdAt: new Date(r.createdAt as string),
        updatedAt: new Date(r.updatedAt as string),
      }));

      groups.push({ checksum, notes });
    }

    return groups;
  }

  // =========================================================================
  // Batch Operations
  // =========================================================================

  /**
   * Create multiple notes in a single batch operation.
   *
   * Duplicate detection is performed for each note. Duplicates are
   * skipped (not created) and counted in the result.
   *
   * @param userId - Owner of the notes
   * @param notes  - Array of note creation data
   * @returns Counts of created and skipped notes
   */
  async batchCreateNotes(
    userId: string,
    notes: NoteCreationData[]
  ): Promise<BatchCreateResult> {
    let created = 0;
    let duplicatesSkipped = 0;
    const noteIds: string[] = [];

    for (const noteData of notes) {
      try {
        // Fetch note type for duplicate checking
        const noteType = await this.fetchNoteType(noteData.noteTypeId);
        const firstFieldName = getFirstFieldName(noteType);
        const firstFieldValue = noteData.fields[firstFieldName] || '';

        // Check for duplicate
        const duplicate = await this.checkDuplicate(noteData.noteTypeId, firstFieldValue);
        if (duplicate) {
          duplicatesSkipped++;
          continue;
        }

        // Create the note
        const result = await this.createNote(
          userId,
          noteData.noteTypeId,
          noteData.deckId,
          noteData.fields,
          noteData.tags
        );

        noteIds.push(result.note.id);
        created++;
      } catch (error) {
        // Log but continue with next note
        console.error(`Failed to create note in batch:`, error);
      }
    }

    return { created, duplicatesSkipped, noteIds };
  }

  /**
   * Delete multiple notes in a single batch operation.
   *
   * @param noteIds - Array of note IDs to delete
   * @returns Number of notes successfully deleted
   */
  async batchDeleteNotes(noteIds: string[]): Promise<number> {
    let deleted = 0;

    await withTransaction(async (client) => {
      for (const noteId of noteIds) {
        // Delete tag associations
        await client.query(`DELETE FROM note_tags WHERE note_id = $1`, [noteId]);

        // Delete cards
        await client.query(`DELETE FROM cards WHERE note_id = $1`, [noteId]);

        // Delete note
        const result = await client.query(`DELETE FROM notes WHERE id = $1`, [noteId]);
        if ((result.rowCount ?? 0) > 0) {
          deleted++;
        }
      }
    });

    return deleted;
  }

  // =========================================================================
  // Field Operations
  // =========================================================================

  /**
   * Find and replace text in a specific field across matching notes.
   *
   * Supports both literal string matching and regex patterns.
   *
   * @param userId      - The user whose notes to search
   * @param searchQuery - Optional note search query (e.g., deck filter)
   * @param fieldName   - The field name to search within
   * @param find        - The text or regex pattern to find
   * @param replace     - The replacement text
   * @param useRegex    - Whether to treat 'find' as a regex
   * @returns Count of modified notes and total replacements
   */
  async findAndReplace(
    userId: string,
    searchQuery: string,
    fieldName: string,
    find: string,
    replace: string,
    useRegex: boolean
  ): Promise<FindReplaceResult> {
    // Fetch all notes for this user
    let sql = `SELECT id, fields FROM notes WHERE user_id = $1`;
    const params: unknown[] = [userId];

    if (searchQuery) {
      sql += ` AND (fields::text ILIKE $2)`;
      params.push(`%${searchQuery}%`);
    }

    const result = await query(sql, params);
    let notesModified = 0;
    let totalReplacements = 0;
    const now = new Date();

    for (const row of result.rows) {
      const noteId = row.id as string;
      const fields = typeof row.fields === 'string' ? JSON.parse(row.fields as string) : row.fields as Record<string, string>;

      const fieldValue = fields[fieldName];
      if (!fieldValue) continue;

      let newValue: string;
      let replacementCount = 0;

      if (useRegex) {
        try {
          const regex = new RegExp(find, 'g');
          const matches = fieldValue.match(regex);
          replacementCount = matches ? matches.length : 0;
          newValue = fieldValue.replace(regex, replace);
        } catch {
          // Invalid regex — skip this note
          continue;
        }
      } else {
        // Literal string replace (all occurrences)
        const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        const matches = fieldValue.match(regex);
        replacementCount = matches ? matches.length : 0;
        newValue = fieldValue.replace(regex, replace);
      }

      if (newValue !== fieldValue) {
        const updatedFields = { ...fields, [fieldName]: newValue };
        await query(
          `UPDATE notes SET fields = $1, updated_at = $2 WHERE id = $3`,
          [JSON.stringify(updatedFields), now, noteId]
        );

        // Regenerate card HTML
        await this.regenerateCardHtml(noteId);

        notesModified++;
        totalReplacements += replacementCount;
      }
    }

    return { notesModified, totalReplacements };
  }

  // =========================================================================
  // Note Type Management
  // =========================================================================

  /**
   * Create a new note type.
   *
   * @param userId   - Owner of the note type
   * @param noteType - Partial note type data
   * @returns The created note type
   */
  async createNoteType(userId: string, noteType: Partial<NoteType>): Promise<NoteType> {
    const id = generateId();
    const now = new Date();

    const fullNoteType: NoteType = {
      id,
      name: noteType.name || 'Untitled',
      kind: noteType.kind || ('standard' as NoteTypeKind),
      fields: noteType.fields || [],
      templates: noteType.templates || [],
      css: noteType.css || '',
      createdAt: now,
      updatedAt: now,
    };

    await query(
      `INSERT INTO note_types (id, user_id, name, kind, fields, templates, css, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id, userId, fullNoteType.name, fullNoteType.kind,
        JSON.stringify(fullNoteType.fields), JSON.stringify(fullNoteType.templates),
        fullNoteType.css, now, now,
      ]
    );

    return fullNoteType;
  }

  /**
   * Update an existing note type.
   *
   * @param noteTypeId - The note type to update
   * @param updates    - Partial note type data with fields to change
   * @returns The updated note type
   */
  async updateNoteType(noteTypeId: string, updates: Partial<NoteType>): Promise<NoteType> {
    const now = new Date();
    const current = await this.fetchNoteType(noteTypeId);

    const updated: NoteType = {
      ...current,
      name: updates.name ?? current.name,
      kind: updates.kind ?? current.kind,
      fields: updates.fields ?? current.fields,
      templates: updates.templates ?? current.templates,
      css: updates.css ?? current.css,
      updatedAt: now,
    };

    await query(
      `UPDATE note_types SET name = $1, kind = $2, fields = $3, templates = $4, css = $5, updated_at = $6
       WHERE id = $7`,
      [
        updated.name, updated.kind,
        JSON.stringify(updated.fields), JSON.stringify(updated.templates),
        updated.css, now, noteTypeId,
      ]
    );

    return updated;
  }

  /**
   * Delete a note type.
   *
   * Only allowed if no notes use this note type.
   *
   * @param noteTypeId - The note type to delete
   * @throws Error if notes still reference this note type
   */
  async deleteNoteType(noteTypeId: string): Promise<void> {
    // Check for dependent notes
    const check = await query(
      `SELECT COUNT(*)::int AS cnt FROM notes WHERE note_type_id = $1`,
      [noteTypeId]
    );

    if ((check.rows[0] as Record<string, unknown>).cnt as number > 0) {
      throw new Error(
        `Cannot delete note type: ${(check.rows[0] as Record<string, unknown>).cnt} notes still use it. ` +
        `Delete or reassign those notes first.`
      );
    }

    const result = await query(`DELETE FROM note_types WHERE id = $1`, [noteTypeId]);
    if ((result.rowCount ?? 0) === 0) {
      throw new Error(`Note type "${noteTypeId}" not found`);
    }
  }

  /**
   * Get all note types belonging to a user.
   *
   * @param userId - The user whose note types to retrieve
   * @returns Array of note types
   */
  async getNoteTypes(userId: string): Promise<NoteType[]> {
    const result = await query(
      `SELECT id, name, kind, fields, templates, css,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM note_types
       WHERE user_id = $1
       ORDER BY name`,
      [userId]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      kind: row.kind as NoteTypeKind,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields as string) : row.fields as NoteField[],
      templates: typeof row.templates === 'string' ? JSON.parse(row.templates as string) : row.templates as CardTemplate[],
      css: (row.css as string) || '',
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    }));
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Fetch a note type by ID.
   */
  private async fetchNoteType(noteTypeId: string): Promise<NoteType> {
    const result = await query(
      `SELECT id, name, kind, fields, templates, css,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM note_types WHERE id = $1`,
      [noteTypeId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Note type "${noteTypeId}" not found`);
    }

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
      kind: row.kind as NoteTypeKind,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields as string) : row.fields as NoteField[],
      templates: typeof row.templates === 'string' ? JSON.parse(row.templates as string) : row.templates as CardTemplate[],
      css: (row.css as string) || '',
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    };
  }

  /**
   * Render the front HTML for a card.
   */
  private renderCardFront(
    noteType: NoteType,
    cardData: CardCreationData,
    fields: Record<string, string>
  ): string {
    const template = noteType.templates[cardData.templateOrdinal];
    if (!template) return '';

    const options = {
      side: 'front' as const,
      showClozeAnswer: false,
      clozeOrdinal: cardData.clozeOrdinal > 0 ? cardData.clozeOrdinal : undefined,
    };

    return this.templateEngine.render(template.frontTemplate, fields, options);
  }

  /**
   * Render the back HTML for a card.
   */
  private renderCardBack(
    noteType: NoteType,
    cardData: CardCreationData,
    fields: Record<string, string>,
    frontHtml: string
  ): string {
    const template = noteType.templates[cardData.templateOrdinal];
    if (!template) return '';

    const options = {
      frontHtml,
      side: 'back' as const,
      showClozeAnswer: true,
      clozeOrdinal: cardData.clozeOrdinal > 0 ? cardData.clozeOrdinal : undefined,
    };

    return this.templateEngine.render(template.backTemplate, fields, options);
  }

  /**
   * Regenerate rendered HTML for all cards of a note.
   * Called after field updates to keep card content in sync.
   */
  private async regenerateCardHtml(noteId: string): Promise<void> {
    const noteData = await this.getNote(noteId);
    const { note, noteType, cards } = noteData;
    const now = new Date();

    for (const card of cards) {
      const cardData: CardCreationData = {
        noteId: note.id,
        deckId: note.deckId,
        templateOrdinal: card.templateOrdinal,
        clozeOrdinal: card.clozeOrdinal,
      };

      const frontHtml = this.renderCardFront(noteType, cardData, note.fields);
      const backHtml = this.renderCardBack(noteType, cardData, note.fields, frontHtml);

      await query(
        `UPDATE cards SET front_html = $1, back_html = $2, updated_at = $3 WHERE id = $4`,
        [frontHtml, backHtml, now, card.id]
      );
    }
  }
}
