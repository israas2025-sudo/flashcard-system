/**
 * APKG Importer — Import Anki .apkg Packages
 *
 * An .apkg file is a ZIP archive containing:
 *   - collection.anki2   — A SQLite database with notes, cards, models, decks
 *   - media               — A JSON file mapping numeric filenames to real names
 *   - 0, 1, 2, ...       — The actual media files (images, audio, etc.)
 *
 * This importer:
 *   1. Extracts the ZIP to a temporary directory.
 *   2. Opens collection.anki2 with better-sqlite3 (synchronous SQLite reader).
 *   3. Parses Anki's models, decks, notes, and cards.
 *   4. Maps Anki structures to our internal types.
 *   5. Inserts everything into our PostgreSQL database.
 *   6. Optionally imports media files.
 *   7. Cleans up the temp directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { query, withTransaction } from '../db/connection';
import type {
  AnkiCard,
  AnkiCollection,
  AnkiDeck,
  AnkiField,
  AnkiModel,
  AnkiNote,
  AnkiTemplate,
  ImportOptions,
  ImportResult,
  MediaFile,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The unit separator character Anki uses to delimit fields. */
const FIELD_SEPARATOR = '\x1f';

/** Default import options. */
const DEFAULT_OPTIONS: ImportOptions = {
  duplicateHandling: 'skip',
  importMedia: true,
  preserveScheduling: false,
};

// ---------------------------------------------------------------------------
// ApkgImporter
// ---------------------------------------------------------------------------

export class ApkgImporter {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Import an .apkg file, creating notes, cards, decks, and media in the
   * local database.
   *
   * @param userId   The user who owns the imported content
   * @param filePath Absolute path to the .apkg file
   * @param options  Import configuration
   * @returns        Summary of the import
   */
  async import(
    userId: string,
    filePath: string,
    options?: Partial<ImportOptions>,
  ): Promise<ImportResult> {
    const opts: ImportOptions = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];

    // Validate the input file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        notesImported: 0,
        cardsImported: 0,
        mediaImported: 0,
        duplicatesSkipped: 0,
        errors: [`File not found: ${filePath}`],
      };
    }

    // Create a temp directory for extraction
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apkg-import-'));

    try {
      // --- Step 1: Extract the ZIP ---
      const zip = new AdmZip(filePath);
      zip.extractAllTo(tempDir, true);

      // --- Step 2: Parse the SQLite database ---
      const anki2Path = path.join(tempDir, 'collection.anki2');
      if (!fs.existsSync(anki2Path)) {
        return {
          success: false,
          notesImported: 0,
          cardsImported: 0,
          mediaImported: 0,
          duplicatesSkipped: 0,
          errors: ['Invalid .apkg file: collection.anki2 not found in archive'],
        };
      }

      const collection = this.parseAnki2(anki2Path);

      // --- Step 3: Map Anki note types to our note types ---
      const ourNoteTypes = this.mapNoteTypes(
        Array.from(collection.models.values()),
      );

      // Build a map from Anki model ID -> our note type ID
      const noteTypeMap = new Map<string, string>();
      const ankiModels = Array.from(collection.models.values());
      for (let i = 0; i < ankiModels.length; i++) {
        noteTypeMap.set(ankiModels[i].id, ourNoteTypes[i].id);
      }

      // --- Step 4: Map Anki decks to our decks ---
      const deckMap = new Map<string, string>(); // Anki deck ID -> our deck ID
      const ankiDecks = Array.from(collection.decks.values());

      // --- Step 5: Insert into database ---
      let notesImported = 0;
      let cardsImported = 0;
      let duplicatesSkipped = 0;

      await withTransaction(async (client) => {
        // Insert note types
        for (const noteType of ourNoteTypes) {
          await client.query(
            `INSERT INTO note_types (id, name, kind, fields, templates, css, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               fields = EXCLUDED.fields,
               templates = EXCLUDED.templates,
               css = EXCLUDED.css,
               updated_at = NOW()`,
            [
              noteType.id,
              noteType.name,
              noteType.kind,
              JSON.stringify(noteType.fields),
              JSON.stringify(noteType.templates),
              noteType.css,
            ],
          );
        }

        // Insert decks (handling hierarchy via :: separator)
        for (const ankiDeck of ankiDecks) {
          // Skip the default deck if it's empty
          if (ankiDeck.id === 1 && ankiDeck.name === 'Default') {
            // Use target deck or create a default
            const targetId = opts.targetDeckId || crypto.randomUUID();
            deckMap.set(String(ankiDeck.id), targetId);

            if (!opts.targetDeckId) {
              await client.query(
                `INSERT INTO decks (id, name, parent_id, description, created_at, updated_at)
                 VALUES ($1, $2, NULL, $3, NOW(), NOW())
                 ON CONFLICT (id) DO NOTHING`,
                [targetId, 'Default', ankiDeck.desc || ''],
              );
            }
            continue;
          }

          const deckId = opts.targetDeckId || crypto.randomUUID();
          deckMap.set(String(ankiDeck.id), deckId);

          // Parse hierarchical deck names (e.g., "Parent::Child::Grandchild")
          const parts = ankiDeck.name.split('::');
          let parentId: string | null = null;

          if (parts.length > 1) {
            // Find or create parent decks
            for (let i = 0; i < parts.length - 1; i++) {
              const parentName = parts.slice(0, i + 1).join('::');
              const parentResult = await client.query<{ id: string }>(
                `SELECT id FROM decks WHERE name = $1 LIMIT 1`,
                [parentName],
              );
              if (parentResult.rowCount! > 0) {
                parentId = parentResult.rows[0].id;
              } else {
                const newParentId = crypto.randomUUID();
                await client.query(
                  `INSERT INTO decks (id, name, parent_id, description, created_at, updated_at)
                   VALUES ($1, $2, $3, '', NOW(), NOW())`,
                  [newParentId, parentName, parentId],
                );
                parentId = newParentId;
              }
            }
          }

          if (!opts.targetDeckId) {
            await client.query(
              `INSERT INTO decks (id, name, parent_id, description, created_at, updated_at)
               VALUES ($1, $2, $3, $4, NOW(), NOW())
               ON CONFLICT (id) DO NOTHING`,
              [deckId, ankiDeck.name, parentId, ankiDeck.desc || ''],
            );
          }
        }

        // Build note map: Anki note ID -> our note ID
        const noteMap = new Map<string, string>();

        // Insert notes
        for (const ankiNote of collection.notes) {
          const modelId = String(ankiNote.mid);
          const ourNoteTypeId = noteTypeMap.get(modelId);
          if (!ourNoteTypeId) {
            errors.push(`Skipping note ${ankiNote.id}: unknown model ${modelId}`);
            continue;
          }

          // Parse fields
          const fieldValues = ankiNote.flds.split(FIELD_SEPARATOR);
          const model = collection.models.get(modelId)!;
          const fields: Record<string, string> = {};
          for (let i = 0; i < model.flds.length; i++) {
            fields[model.flds[i].name] = fieldValues[i] || '';
          }

          // Check for duplicates (using first field checksum)
          if (opts.duplicateHandling !== 'import_as_new') {
            const firstFieldValue = fieldValues[0] || '';
            const existingResult = await client.query<{ id: string }>(
              `SELECT id FROM notes
               WHERE note_type_id = $1
                 AND fields->>$2 = $3
               LIMIT 1`,
              [ourNoteTypeId, model.flds[0]?.name || '', firstFieldValue],
            );

            if (existingResult.rowCount! > 0) {
              if (opts.duplicateHandling === 'skip') {
                duplicatesSkipped++;
                // Still need to map for cards
                noteMap.set(String(ankiNote.id), existingResult.rows[0].id);
                continue;
              }

              if (opts.duplicateHandling === 'update') {
                // Update existing note
                await client.query(
                  `UPDATE notes SET fields = $1, updated_at = NOW() WHERE id = $2`,
                  [JSON.stringify(fields), existingResult.rows[0].id],
                );
                noteMap.set(String(ankiNote.id), existingResult.rows[0].id);
                notesImported++;
                continue;
              }
            }
          }

          // Determine the deck for this note (first card's deck)
          const noteCards = collection.cards.filter((c) => c.nid === ankiNote.id);
          const firstCardDeckId = noteCards.length > 0
            ? String(noteCards[0].did)
            : String(ankiDecks[0]?.id || 1);
          const ourDeckId = opts.targetDeckId || deckMap.get(firstCardDeckId) || deckMap.values().next().value;

          const noteId = crypto.randomUUID();
          noteMap.set(String(ankiNote.id), noteId);

          await client.query(
            `INSERT INTO notes (id, note_type_id, deck_id, fields, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              noteId,
              ourNoteTypeId,
              ourDeckId,
              JSON.stringify(fields),
              new Date(ankiNote.id), // Anki note ID is epoch ms
            ],
          );
          notesImported++;

          // Import tags
          const tagIds = await this.convertTags(ankiNote.tags, userId, client);
          for (const tagId of tagIds) {
            await client.query(
              `INSERT INTO note_tags (note_id, tag_id, created_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (note_id, tag_id) DO NOTHING`,
              [noteId, tagId],
            );
          }
        }

        // Insert cards
        for (const ankiCard of collection.cards) {
          const ourNoteId = noteMap.get(String(ankiCard.nid));
          if (!ourNoteId) {
            errors.push(`Skipping card ${ankiCard.id}: orphaned (note ${ankiCard.nid} not imported)`);
            continue;
          }

          const ourDeckId = opts.targetDeckId
            || deckMap.get(String(ankiCard.did))
            || deckMap.values().next().value;

          const cardId = crypto.randomUUID();

          // Map Anki scheduling data
          let queue = 0; // new
          let due = new Date();
          let stability = 0;
          let difficulty = 5;
          let scheduledDays = 0;
          let reps = 0;
          let lapses = 0;

          if (opts.preserveScheduling) {
            // Map Anki queue values to our system
            switch (ankiCard.queue) {
              case 0:  queue = 0; break; // new
              case 1:  queue = 1; break; // learning
              case 2:  queue = 2; break; // review
              case 3:  queue = 3; break; // relearning
              case -1: queue = 0; break; // suspended -> treat as new but flag
              case -2: queue = 0; break; // buried -> treat as new but flag
              case -3: queue = 0; break; // user buried -> treat as new
              default: queue = 0;
            }

            // Convert Anki due to a Date
            if (ankiCard.type === 2) {
              // Review card: due is days since collection creation
              const collectionCreation = collection.crt * 1000;
              due = new Date(collectionCreation + ankiCard.due * 86400000);
            } else if (ankiCard.type === 1 || ankiCard.type === 3) {
              // Learning/relearning: due is epoch seconds
              due = new Date(ankiCard.due * 1000);
            }

            stability = ankiCard.ivl > 0 ? ankiCard.ivl : 0;
            difficulty = ankiCard.factor > 0 ? (ankiCard.factor / 1000) * 4 + 1 : 5;
            scheduledDays = ankiCard.ivl > 0 ? ankiCard.ivl : 0;
            reps = ankiCard.reps;
            lapses = ankiCard.lapses;
          }

          await client.query(
            `INSERT INTO cards (
               id, note_id, deck_id, template_ordinal, cloze_ordinal,
               queue, due, stability, difficulty, scheduled_days,
               reps, lapses, suspended, buried,
               created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, 0,
               $5, $6, $7, $8, $9,
               $10, $11, $12, $13,
               $14, NOW()
             )`,
            [
              cardId,
              ourNoteId,
              ourDeckId,
              ankiCard.ord,
              queue,
              due,
              stability,
              difficulty,
              scheduledDays,
              reps,
              lapses,
              ankiCard.queue === -1, // suspended
              ankiCard.queue === -2 || ankiCard.queue === -3, // buried
              new Date(ankiCard.id), // Anki card ID is epoch ms
            ],
          );
          cardsImported++;
        }
      });

      // --- Step 6: Import media ---
      let mediaImported = 0;
      if (opts.importMedia) {
        const mediaFiles = await this.importMedia(tempDir, userId);
        mediaImported = mediaFiles.length;
      }

      return {
        success: true,
        notesImported,
        cardsImported,
        mediaImported,
        duplicatesSkipped,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        notesImported: 0,
        cardsImported: 0,
        mediaImported: 0,
        duplicatesSkipped: 0,
        errors: [`Import failed: ${message}`],
      };
    } finally {
      // Clean up temp directory
      this.cleanupTempDir(tempDir);
    }
  }

  // -----------------------------------------------------------------------
  // Private: Parse collection.anki2
  // -----------------------------------------------------------------------

  /**
   * Open and parse the SQLite database from the .apkg archive.
   */
  private parseAnki2(dbPath: string): AnkiCollection {
    const db = new Database(dbPath, { readonly: true });

    try {
      // Read the collection metadata from the `col` table
      const colRow = db.prepare('SELECT * FROM col').get() as {
        id: number;
        crt: number;
        mod: number;
        scm: number;
        ver: number;
        dty: number;
        usn: number;
        ls: number;
        conf: string;
        models: string;
        decks: string;
        dconf: string;
        tags: string;
      };

      // Parse models (note types)
      const modelsJson = JSON.parse(colRow.models) as Record<string, AnkiModel>;
      const models = new Map<string, AnkiModel>();
      for (const [id, model] of Object.entries(modelsJson)) {
        models.set(id, {
          id: String(id),
          name: model.name,
          type: model.type || 0,
          flds: (model.flds || []).map((f: AnkiField) => ({
            name: f.name,
            ord: f.ord,
            sticky: f.sticky || false,
            rtl: f.rtl || false,
            font: f.font || 'Arial',
            size: f.size || 20,
            description: f.description || '',
          })),
          tmpls: (model.tmpls || []).map((t: AnkiTemplate) => ({
            name: t.name,
            ord: t.ord,
            qfmt: t.qfmt,
            afmt: t.afmt,
            bqfmt: t.bqfmt || '',
            bafmt: t.bafmt || '',
            did: t.did || null,
          })),
          css: model.css || '',
          mod: model.mod || 0,
          tags: model.tags || [],
          sortf: model.sortf || 0,
        });
      }

      // Parse decks
      const decksJson = JSON.parse(colRow.decks) as Record<string, AnkiDeck>;
      const decks = new Map<string, AnkiDeck>();
      for (const [id, deck] of Object.entries(decksJson)) {
        decks.set(id, {
          id: parseInt(id, 10),
          name: deck.name,
          mod: deck.mod || 0,
          desc: deck.desc || '',
          dyn: deck.dyn || 0,
          conf: deck.conf || 1,
        });
      }

      // Read notes
      const noteRows = db.prepare('SELECT * FROM notes').all() as AnkiNote[];
      const notes: AnkiNote[] = noteRows.map((row) => ({
        id: row.id,
        guid: row.guid,
        mid: row.mid,
        mod: row.mod,
        usn: row.usn,
        tags: row.tags,
        flds: row.flds,
        sfld: row.sfld,
        csum: row.csum,
        flags: row.flags,
        data: row.data,
      }));

      // Read cards
      const cardRows = db.prepare('SELECT * FROM cards').all() as AnkiCard[];
      const cards: AnkiCard[] = cardRows.map((row) => ({
        id: row.id,
        nid: row.nid,
        did: row.did,
        ord: row.ord,
        mod: row.mod,
        usn: row.usn,
        type: row.type,
        queue: row.queue,
        due: row.due,
        ivl: row.ivl,
        factor: row.factor,
        reps: row.reps,
        lapses: row.lapses,
        left: row.left,
        odue: row.odue,
        odid: row.odid,
        flags: row.flags,
        data: row.data,
      }));

      return {
        models,
        decks,
        notes,
        cards,
        crt: colRow.crt,
        mod: colRow.mod,
      };
    } finally {
      db.close();
    }
  }

  // -----------------------------------------------------------------------
  // Private: Map Note Types
  // -----------------------------------------------------------------------

  /**
   * Convert Anki models to our note type format.
   */
  private mapNoteTypes(
    ankiModels: AnkiModel[],
  ): Array<{
    id: string;
    name: string;
    kind: string;
    fields: Array<{
      ordinal: number;
      name: string;
      required: boolean;
      font: string;
      fontSize: number;
      rtl: boolean;
      isUnique: boolean;
      description: string;
    }>;
    templates: Array<{
      ordinal: number;
      name: string;
      frontTemplate: string;
      backTemplate: string;
      css: string;
    }>;
    css: string;
  }> {
    return ankiModels.map((model) => ({
      id: crypto.randomUUID(),
      name: model.name,
      kind: model.type === 1 ? 'cloze' : 'standard',
      fields: model.flds
        .sort((a, b) => a.ord - b.ord)
        .map((f, index) => ({
          ordinal: index,
          name: f.name,
          required: index === 0, // First field is always required
          font: f.font || 'Arial',
          fontSize: f.size || 20,
          rtl: f.rtl || false,
          isUnique: index === 0, // First field used for duplicate detection
          description: f.description || '',
        })),
      templates: model.tmpls
        .sort((a, b) => a.ord - b.ord)
        .map((t, index) => ({
          ordinal: index,
          name: t.name,
          frontTemplate: t.qfmt,
          backTemplate: t.afmt,
          css: '', // Per-template CSS is empty; shared CSS is at model level
        })),
      css: model.css,
    }));
  }

  // -----------------------------------------------------------------------
  // Private: Import Media
  // -----------------------------------------------------------------------

  /**
   * Import media files from the extracted .apkg archive.
   *
   * The archive contains a `media` file (JSON mapping numeric filenames
   * to real filenames) and the actual files named 0, 1, 2, etc.
   */
  private async importMedia(
    tempDir: string,
    userId: string,
  ): Promise<MediaFile[]> {
    const mediaJsonPath = path.join(tempDir, 'media');
    if (!fs.existsSync(mediaJsonPath)) {
      return [];
    }

    let mediaMap: Record<string, string>;
    try {
      const raw = fs.readFileSync(mediaJsonPath, 'utf-8');
      mediaMap = JSON.parse(raw);
    } catch {
      return [];
    }

    const mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
    const userMediaDir = path.join(mediaDir, userId);

    // Ensure the user media directory exists
    if (!fs.existsSync(userMediaDir)) {
      fs.mkdirSync(userMediaDir, { recursive: true });
    }

    const imported: MediaFile[] = [];

    for (const [numericName, realName] of Object.entries(mediaMap)) {
      const sourcePath = path.join(tempDir, numericName);
      if (!fs.existsSync(sourcePath)) continue;

      const destPath = path.join(userMediaDir, realName);

      try {
        fs.copyFileSync(sourcePath, destPath);
        const stats = fs.statSync(destPath);
        const mimeType = this.guessMimeType(realName);

        // Record in the database
        const mediaId = crypto.randomUUID();
        await query(
          `INSERT INTO media (id, user_id, filename, mime_type, size_bytes, local_path, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT DO NOTHING`,
          [mediaId, userId, realName, mimeType, stats.size, destPath],
        );

        imported.push({
          filename: realName,
          mimeType,
          size: stats.size,
          localPath: destPath,
        });
      } catch (err) {
        // Non-fatal: skip this media file
        console.warn(`[ApkgImporter] Could not import media "${realName}":`, err);
      }
    }

    return imported;
  }

  // -----------------------------------------------------------------------
  // Private: Convert Tags
  // -----------------------------------------------------------------------

  /**
   * Convert Anki's space-separated tag string to our relational tag IDs.
   * Creates tags that don't exist yet.
   */
  private async convertTags(
    ankiTags: string,
    userId: string,
    client: { query: (text: string, params?: unknown[]) => Promise<{ rows: { id: string }[]; rowCount: number | null }> },
  ): Promise<string[]> {
    const tagNames = ankiTags
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (tagNames.length === 0) return [];

    const tagIds: string[] = [];

    for (const tagName of tagNames) {
      // Handle hierarchical tags (Anki uses :: separator)
      const cleanName = tagName.replace(/::/g, ' > ');

      // Check if tag already exists
      const existing = await client.query(
        `SELECT id FROM tags WHERE user_id = $1 AND name = $2 LIMIT 1`,
        [userId, cleanName],
      );

      if (existing.rowCount! > 0) {
        tagIds.push(existing.rows[0].id);
      } else {
        // Create the tag
        const tagId = crypto.randomUUID();
        const slug = cleanName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 100);

        await client.query(
          `INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description, created_at)
           VALUES ($1, $2, $3, $4, NULL, '#6B7280', '', '', NOW())`,
          [tagId, userId, cleanName, slug],
        );
        tagIds.push(tagId);
      }
    }

    return tagIds;
  }

  // -----------------------------------------------------------------------
  // Private: Utilities
  // -----------------------------------------------------------------------

  /**
   * Guess the MIME type from a filename extension.
   */
  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Recursively remove a temporary directory.
   */
  private cleanupTempDir(dirPath: string): void {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch {
      console.warn(`[ApkgImporter] Could not clean up temp dir: ${dirPath}`);
    }
  }
}
