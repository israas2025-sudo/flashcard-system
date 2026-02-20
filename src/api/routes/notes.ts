// @ts-nocheck
/**
 * Notes Routes
 *
 * CRUD operations for notes. Creating or updating a note automatically
 * triggers card generation/regeneration via the CardGenerator.
 *
 * Routes:
 * - POST   /api/notes              — Create a new note (auto-generates cards)
 * - GET    /api/notes/:id          — Get a note with all its cards
 * - PUT    /api/notes/:id          — Update note fields (regenerate cards if needed)
 * - DELETE /api/notes/:id          — Delete a note and all its cards
 * - POST   /api/notes/:id/tags     — Add a tag to a note
 * - DELETE /api/notes/:id/tags/:tagId — Remove a tag from a note
 * - POST   /api/notes/:id/duplicate — Find duplicates for this note
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../../db/connection';
import { CardGenerator } from '../../templates/card-generator';
import { TemplateEngine } from '../../templates/template-engine';
import { ApiError, requireFields, validateUUID } from '../server';

export const notesRouter = Router();

const templateEngine = new TemplateEngine();
const cardGenerator = new CardGenerator(templateEngine);

// ---------------------------------------------------------------------------
// POST /api/notes — Create a new note
// ---------------------------------------------------------------------------

notesRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { noteTypeId, deckId, fields, tags } = req.body;

      requireFields(req.body, ['noteTypeId', 'deckId', 'fields']);
      validateUUID(noteTypeId, 'noteTypeId');
      validateUUID(deckId, 'deckId');

      if (typeof fields !== 'object' || Array.isArray(fields)) {
        throw ApiError.badRequest('fields must be an object mapping field names to values');
      }

      const result = await withTransaction(async (client) => {
        // 1. Verify note type exists and fetch it
        const noteTypeResult = await client.query(
          'SELECT * FROM note_types WHERE id = $1',
          [noteTypeId]
        );
        if (noteTypeResult.rowCount === 0) {
          throw ApiError.notFound('Note type');
        }
        const noteType = noteTypeResult.rows[0];

        // 2. Verify deck exists
        const deckResult = await client.query(
          'SELECT id FROM decks WHERE id = $1',
          [deckId]
        );
        if (deckResult.rowCount === 0) {
          throw ApiError.notFound('Deck');
        }

        // 3. Create the note
        const noteResult = await client.query(
          `INSERT INTO notes (note_type_id, deck_id, fields, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING *`,
          [noteTypeId, deckId, JSON.stringify(fields)]
        );
        const note = noteResult.rows[0];

        // 4. Add tags if provided
        if (Array.isArray(tags) && tags.length > 0) {
          for (const tagId of tags) {
            validateUUID(tagId, 'tagId');
            await client.query(
              `INSERT INTO note_tags (note_id, tag_id, created_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (note_id, tag_id) DO NOTHING`,
              [note.id, tagId]
            );
          }
        }

        // 5. Generate cards
        const noteForGenerator = {
          id: note.id,
          noteTypeId: noteType.id,
          deckId,
          fields,
          tags: tags || [],
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        };

        // Parse the note type into the expected format
        const parsedNoteType = {
          id: noteType.id,
          name: noteType.name,
          kind: noteType.kind,
          fields: JSON.parse(noteType.fields || '[]'),
          templates: JSON.parse(noteType.templates || '[]'),
          css: noteType.css || '',
          createdAt: noteType.created_at,
          updatedAt: noteType.updated_at,
        };

        const cardDataList = cardGenerator.generateCards(
          noteForGenerator,
          parsedNoteType
        );

        // 6. Insert generated cards
        const createdCards = [];
        for (const cardData of cardDataList) {
          const cardResult = await client.query(
            `INSERT INTO cards (note_id, deck_id, template_ordinal, cloze_ordinal,
                                queue, due, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 0, NOW(), NOW(), NOW())
             RETURNING *`,
            [
              cardData.noteId,
              cardData.deckId,
              cardData.templateOrdinal,
              cardData.clozeOrdinal,
            ]
          );
          createdCards.push(cardResult.rows[0]);
        }

        return { note, cards: createdCards };
      });

      res.status(201).json({
        data: {
          note: result.note,
          cards: result.cards,
          cardCount: result.cards.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/notes/:id — Get a note with all its cards
// ---------------------------------------------------------------------------

notesRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Fetch the note
      const noteResult = await query(
        'SELECT * FROM notes WHERE id = $1',
        [id]
      );
      if (noteResult.rowCount === 0) {
        throw ApiError.notFound('Note');
      }
      const note = noteResult.rows[0];

      // Fetch associated cards
      const cardsResult = await query(
        `SELECT * FROM cards WHERE note_id = $1 ORDER BY template_ordinal, cloze_ordinal`,
        [id]
      );

      // Fetch associated tags
      const tagsResult = await query(
        `SELECT t.* FROM tags t
         INNER JOIN note_tags nt ON nt.tag_id = t.id
         WHERE nt.note_id = $1
         ORDER BY t.name`,
        [id]
      );

      res.json({
        data: {
          note,
          cards: cardsResult.rows,
          tags: tagsResult.rows,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/notes/:id — Update note fields
// ---------------------------------------------------------------------------

notesRouter.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const { fields, deckId } = req.body;

      if (!fields && !deckId) {
        throw ApiError.badRequest('At least one of fields or deckId must be provided');
      }

      if (fields && (typeof fields !== 'object' || Array.isArray(fields))) {
        throw ApiError.badRequest('fields must be an object mapping field names to values');
      }

      const result = await withTransaction(async (client) => {
        // Verify note exists
        const existingResult = await client.query(
          'SELECT * FROM notes WHERE id = $1',
          [id]
        );
        if (existingResult.rowCount === 0) {
          throw ApiError.notFound('Note');
        }
        const existing = existingResult.rows[0];

        // Build the update query
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (fields) {
          updates.push(`fields = $${paramIndex}`);
          values.push(JSON.stringify(fields));
          paramIndex++;
        }

        if (deckId) {
          validateUUID(deckId, 'deckId');
          updates.push(`deck_id = $${paramIndex}`);
          values.push(deckId);
          paramIndex++;
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const noteResult = await client.query(
          `UPDATE notes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          values
        );
        const updatedNote = noteResult.rows[0];

        // If fields changed, regenerate cards
        let regeneratedCards: unknown[] = [];
        if (fields) {
          // Fetch the note type
          const noteTypeResult = await client.query(
            'SELECT * FROM note_types WHERE id = $1',
            [existing.note_type_id]
          );

          if (noteTypeResult.rowCount! > 0) {
            const noteType = noteTypeResult.rows[0];
            const parsedNoteType = {
              id: noteType.id,
              name: noteType.name,
              kind: noteType.kind,
              fields: JSON.parse(noteType.fields || '[]'),
              templates: JSON.parse(noteType.templates || '[]'),
              css: noteType.css || '',
              createdAt: noteType.created_at,
              updatedAt: noteType.updated_at,
            };

            const noteForGenerator = {
              id,
              noteTypeId: noteType.id,
              deckId: deckId || existing.deck_id,
              fields: fields || JSON.parse(existing.fields),
              tags: [],
              createdAt: existing.created_at,
              updatedAt: new Date(),
            };

            const newCardData = cardGenerator.generateCards(
              noteForGenerator,
              parsedNoteType
            );

            // Get existing cards
            const existingCards = await client.query(
              'SELECT * FROM cards WHERE note_id = $1',
              [id]
            );

            // Determine which cards to add/remove
            const existingKeys = new Set(
              existingCards.rows.map(
                (c: Record<string, unknown>) =>
                  `${c.template_ordinal}:${c.cloze_ordinal}`
              )
            );
            const newKeys = new Set(
              newCardData.map((c) => `${c.templateOrdinal}:${c.clozeOrdinal}`)
            );

            // Remove cards that are no longer needed
            for (const card of existingCards.rows) {
              const key = `${card.template_ordinal}:${card.cloze_ordinal}`;
              if (!newKeys.has(key)) {
                await client.query('DELETE FROM cards WHERE id = $1', [card.id]);
              }
            }

            // Add new cards
            for (const cardData of newCardData) {
              const key = `${cardData.templateOrdinal}:${cardData.clozeOrdinal}`;
              if (!existingKeys.has(key)) {
                await client.query(
                  `INSERT INTO cards (note_id, deck_id, template_ordinal, cloze_ordinal,
                                      queue, due, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, 0, NOW(), NOW(), NOW())`,
                  [id, cardData.deckId, cardData.templateOrdinal, cardData.clozeOrdinal]
                );
              }
            }

            // Fetch final card list
            const finalCards = await client.query(
              'SELECT * FROM cards WHERE note_id = $1 ORDER BY template_ordinal, cloze_ordinal',
              [id]
            );
            regeneratedCards = finalCards.rows;
          }
        }

        return { note: updatedNote, cards: regeneratedCards };
      });

      res.json({
        data: {
          note: result.note,
          cards: result.cards,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/notes/:id — Delete a note and all its cards
// ---------------------------------------------------------------------------

notesRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      await withTransaction(async (client) => {
        // Verify note exists
        const noteResult = await client.query(
          'SELECT id FROM notes WHERE id = $1',
          [id]
        );
        if (noteResult.rowCount === 0) {
          throw ApiError.notFound('Note');
        }

        // Delete review logs for all cards of this note
        await client.query(
          `DELETE FROM review_logs WHERE card_id IN
           (SELECT id FROM cards WHERE note_id = $1)`,
          [id]
        );

        // Delete all cards
        await client.query('DELETE FROM cards WHERE note_id = $1', [id]);

        // Delete tag associations
        await client.query('DELETE FROM note_tags WHERE note_id = $1', [id]);

        // Delete the note itself
        await client.query('DELETE FROM notes WHERE id = $1', [id]);
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/notes/:id/tags — Add a tag to a note
// ---------------------------------------------------------------------------

notesRouter.post(
  '/:id/tags',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');
      requireFields(req.body, ['tagId']);

      const { tagId } = req.body;
      validateUUID(tagId, 'tagId');

      // Verify note exists
      const noteResult = await query('SELECT id FROM notes WHERE id = $1', [id]);
      if (noteResult.rowCount === 0) {
        throw ApiError.notFound('Note');
      }

      // Verify tag exists
      const tagResult = await query('SELECT id FROM tags WHERE id = $1', [tagId]);
      if (tagResult.rowCount === 0) {
        throw ApiError.notFound('Tag');
      }

      // Create association (ignore if already exists)
      await query(
        `INSERT INTO note_tags (note_id, tag_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (note_id, tag_id) DO NOTHING`,
        [id, tagId]
      );

      // Return the updated tag list
      const tagsResult = await query(
        `SELECT t.* FROM tags t
         INNER JOIN note_tags nt ON nt.tag_id = t.id
         WHERE nt.note_id = $1
         ORDER BY t.name`,
        [id]
      );

      res.status(201).json({
        data: { tags: tagsResult.rows },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/notes/:id/tags/:tagId — Remove a tag from a note
// ---------------------------------------------------------------------------

notesRouter.delete(
  '/:id/tags/:tagId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, tagId } = req.params;
      validateUUID(id, 'id');
      validateUUID(tagId, 'tagId');

      const result = await query(
        'DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2',
        [id, tagId]
      );

      if (result.rowCount === 0) {
        throw ApiError.notFound('Tag association');
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/notes/:id/duplicate — Find duplicates for this note
// ---------------------------------------------------------------------------

notesRouter.post(
  '/:id/duplicate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Fetch the note
      const noteResult = await query('SELECT * FROM notes WHERE id = $1', [id]);
      if (noteResult.rowCount === 0) {
        throw ApiError.notFound('Note');
      }
      const note = noteResult.rows[0];
      const noteFields = typeof note.fields === 'string'
        ? JSON.parse(note.fields)
        : note.fields;

      // Fetch the note type to know which fields are unique
      const noteTypeResult = await query(
        'SELECT * FROM note_types WHERE id = $1',
        [note.note_type_id]
      );
      if (noteTypeResult.rowCount === 0) {
        throw ApiError.notFound('Note type');
      }
      const noteType = noteTypeResult.rows[0];
      const fieldDefs = JSON.parse(noteType.fields || '[]');

      // Find fields marked as unique
      const uniqueFields: string[] = fieldDefs
        .filter((f: { isUnique?: boolean }) => f.isUnique)
        .map((f: { name: string }) => f.name);

      // If no unique fields, use the first field
      const fieldsToCheck =
        uniqueFields.length > 0 ? uniqueFields : fieldDefs.length > 0
          ? [fieldDefs[0].name]
          : [];

      if (fieldsToCheck.length === 0) {
        res.json({ data: { duplicates: [] } });
        return;
      }

      // Search for notes with matching field values
      const conditions = fieldsToCheck.map(
        (fieldName: string, i: number) =>
          `fields->>'${fieldName}' = $${i + 1}`
      );
      const values = fieldsToCheck.map(
        (fieldName: string) => noteFields[fieldName] || ''
      );

      // Exclude the current note
      const whereClause = `(${conditions.join(' OR ')}) AND id != $${values.length + 1} AND note_type_id = $${values.length + 2}`;
      values.push(id, note.note_type_id);

      const duplicatesResult = await query(
        `SELECT * FROM notes WHERE ${whereClause} LIMIT 20`,
        values
      );

      res.json({
        data: {
          duplicates: duplicatesResult.rows,
          checkedFields: fieldsToCheck,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
