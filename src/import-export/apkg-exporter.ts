/**
 * APKG Exporter — Export Decks as Anki .apkg or .colpkg Packages
 *
 * Produces a ZIP archive that Anki can import, containing:
 *   - collection.anki2   — SQLite database with notes, cards, models, decks
 *   - media              — JSON mapping of numeric filenames to real names
 *   - 0, 1, 2, ...      — Actual media files
 *
 * Two export modes:
 *   1. `export()`           — Exports selected deck(s) as a .apkg file.
 *   2. `exportCollection()` — Exports the entire user collection as a .colpkg backup.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { query } from '../db/connection';
import type { ExportOptions } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The unit separator character Anki uses to delimit fields. */
const FIELD_SEPARATOR = '\x1f';

/** Default export options. */
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeScheduling: true,
  includeMedia: true,
  includeTags: true,
};

// ---------------------------------------------------------------------------
// ApkgExporter
// ---------------------------------------------------------------------------

export class ApkgExporter {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Export one or more decks as an .apkg file.
   *
   * @param userId     The user whose data to export
   * @param deckIds    The deck IDs to include
   * @param outputPath The absolute path where the .apkg will be written
   * @param options    Export configuration
   * @returns          The absolute path of the created .apkg file
   */
  async export(
    userId: string,
    deckIds: string[],
    outputPath: string,
    options?: Partial<ExportOptions>,
  ): Promise<string> {
    const opts: ExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };

    if (deckIds.length === 0) {
      throw new Error('At least one deck ID is required for export');
    }

    // Resolve all descendant deck IDs (recursive hierarchy)
    const allDeckIds = await this.resolveDescendantDecks(deckIds);

    return this.buildApkg(userId, allDeckIds, outputPath, opts, false);
  }

  /**
   * Export the entire user collection as a .colpkg backup file.
   *
   * @param userId     The user whose collection to export
   * @param outputPath The absolute path where the .colpkg will be written
   * @returns          The absolute path of the created .colpkg file
   */
  async exportCollection(
    userId: string,
    outputPath: string,
  ): Promise<string> {
    const opts: ExportOptions = {
      includeScheduling: true,
      includeMedia: true,
      includeTags: true,
    };

    // Get all deck IDs for this user
    const deckResult = await query<{ id: string }>(
      `SELECT id FROM decks`,
    );
    const allDeckIds = deckResult.rows.map((r) => r.id);

    if (allDeckIds.length === 0) {
      throw new Error('No decks found for export');
    }

    return this.buildApkg(userId, allDeckIds, outputPath, opts, true);
  }

  // -----------------------------------------------------------------------
  // Private: Build the .apkg archive
  // -----------------------------------------------------------------------

  /**
   * Core logic: build the SQLite database, gather media, and ZIP it all up.
   */
  private async buildApkg(
    userId: string,
    deckIds: string[],
    outputPath: string,
    opts: ExportOptions,
    isCollection: boolean,
  ): Promise<string> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apkg-export-'));
    const anki2Path = path.join(tempDir, 'collection.anki2');

    try {
      // --- Step 1: Create the SQLite database ---
      const db = new Database(anki2Path);
      this.initAnki2Schema(db);

      // --- Step 2: Fetch our data from PostgreSQL ---
      const decks = await this.fetchDecks(deckIds);
      const noteTypes = await this.fetchNoteTypes(deckIds);
      const notes = await this.fetchNotes(deckIds, opts);
      const cards = await this.fetchCards(deckIds, opts);

      // --- Step 3: Build Anki collection metadata ---
      const creationTime = Math.floor(Date.now() / 1000);
      const ankiModels = this.buildAnkiModels(noteTypes);
      const ankiDecks = this.buildAnkiDecks(decks);

      // Insert collection row
      db.prepare(
        `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        1,
        creationTime,
        creationTime,
        creationTime * 1000,
        11, // schema version
        0,
        -1,
        0,
        '{}',
        JSON.stringify(ankiModels),
        JSON.stringify(ankiDecks),
        JSON.stringify({ '1': { id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, new: { bury: false, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 0], order: 1, perDay: 20 }, rev: { bury: false, ease4: 1.3, ivlFct: 1, maxIvl: 36500, perDay: 200, hardFactor: 1.2 }, lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 } } }),
        '{}',
      );

      // Build ID maps (our UUID -> Anki numeric ID)
      const noteTypeIdMap = new Map<string, number>();
      let ankiModelId = creationTime * 1000;
      for (const nt of noteTypes) {
        noteTypeIdMap.set(nt.id, ankiModelId);
        ankiModelId++;
      }

      const deckIdMap = new Map<string, number>();
      let ankiDeckId = 1;
      for (const deck of decks) {
        deckIdMap.set(deck.id, ankiDeckId);
        ankiDeckId++;
      }

      const noteIdMap = new Map<string, number>();
      let ankiNoteId = creationTime * 1000;

      // --- Step 4: Insert notes ---
      const insertNote = db.prepare(
        `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      for (const note of notes) {
        const ankiId = ankiNoteId++;
        noteIdMap.set(note.id, ankiId);

        const noteTypeFields = JSON.parse(note.fields_def || '[]') as { name: string }[];
        const fields = typeof note.fields === 'string'
          ? JSON.parse(note.fields)
          : note.fields;

        // Build field string (separated by \x1f)
        const fieldValues = noteTypeFields.map((f: { name: string }) => fields[f.name] || '');
        const flds = fieldValues.join(FIELD_SEPARATOR);
        const sfld = fieldValues[0] || '';
        const csum = this.fieldChecksum(sfld);

        // Build tag string
        let tagString = '';
        if (opts.includeTags && note.tags) {
          tagString = ` ${note.tags.join(' ')} `;
        }

        const guid = this.generateGuid(ankiId);

        insertNote.run(
          ankiId,
          guid,
          noteTypeIdMap.get(note.note_type_id) || creationTime * 1000,
          Math.floor(new Date(note.updated_at).getTime() / 1000),
          -1,
          tagString,
          flds,
          sfld,
          csum,
          0,
          '',
        );
      }

      // --- Step 5: Insert cards ---
      const insertCard = db.prepare(
        `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      let ankiCardId = creationTime * 1000;
      for (const card of cards) {
        const noteAnkiId = noteIdMap.get(card.note_id);
        if (!noteAnkiId) continue;

        const deckAnkiId = deckIdMap.get(card.deck_id) || 1;

        let type = 0;
        let cardQueue = 0;
        let due = 0;
        let ivl = 0;
        let factor = 2500;

        if (opts.includeScheduling) {
          // Map our queue to Anki type/queue
          switch (card.queue) {
            case 0: type = 0; cardQueue = 0; break; // new
            case 1: type = 1; cardQueue = 1; break; // learning
            case 2: type = 2; cardQueue = 2; break; // review
            case 3: type = 3; cardQueue = 3; break; // relearning
            default: type = 0; cardQueue = 0;
          }

          if (card.suspended) {
            cardQueue = -1;
          } else if (card.buried) {
            cardQueue = -2;
          }

          // Convert due date to Anki format
          if (type === 2) {
            // Review: days since epoch start (Anki uses collection creation date)
            due = Math.floor(
              (new Date(card.due).getTime() - creationTime * 1000) / 86400000,
            );
          } else if (type === 1 || type === 3) {
            // Learning: epoch seconds
            due = Math.floor(new Date(card.due).getTime() / 1000);
          } else {
            due = ankiCardId; // new cards use a sequence
          }

          ivl = card.scheduled_days || 0;
          factor = card.difficulty
            ? Math.round(((card.difficulty - 1) / 4) * 1000)
            : 2500;
        }

        insertCard.run(
          ankiCardId++,
          noteAnkiId,
          deckAnkiId,
          card.template_ordinal || 0,
          Math.floor(new Date(card.updated_at).getTime() / 1000),
          -1,
          type,
          cardQueue,
          due,
          ivl,
          factor,
          card.reps || 0,
          card.lapses || 0,
          0,
          0,
          0,
          0,
          '',
        );
      }

      // Finalize the SQLite database
      db.close();

      // --- Step 6: Gather media files ---
      const mediaMap: Record<string, string> = {};
      let mediaIndex = 0;

      if (opts.includeMedia) {
        const mediaFiles = await this.fetchMediaFiles(userId, deckIds);

        for (const media of mediaFiles) {
          if (fs.existsSync(media.local_path)) {
            const numericName = String(mediaIndex);
            fs.copyFileSync(media.local_path, path.join(tempDir, numericName));
            mediaMap[numericName] = media.filename;
            mediaIndex++;
          }
        }
      }

      // Write the media mapping JSON
      fs.writeFileSync(
        path.join(tempDir, 'media'),
        JSON.stringify(mediaMap),
        'utf-8',
      );

      // --- Step 7: Create the ZIP archive ---
      const zip = new AdmZip();
      zip.addLocalFile(anki2Path, '', 'collection.anki2');
      zip.addLocalFile(path.join(tempDir, 'media'), '', 'media');

      // Add media files
      for (const numericName of Object.keys(mediaMap)) {
        const mediaPath = path.join(tempDir, numericName);
        if (fs.existsSync(mediaPath)) {
          zip.addLocalFile(mediaPath, '', numericName);
        }
      }

      // Ensure the output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      zip.writeZip(outputPath);

      return outputPath;
    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        console.warn(`[ApkgExporter] Could not clean up temp dir: ${tempDir}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private: SQLite Schema
  // -----------------------------------------------------------------------

  /**
   * Initialize the Anki2 SQLite database schema.
   */
  private initAnki2Schema(db: InstanceType<typeof Database>): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS col (
        id    INTEGER PRIMARY KEY,
        crt   INTEGER NOT NULL,
        mod   INTEGER NOT NULL,
        scm   INTEGER NOT NULL,
        ver   INTEGER NOT NULL,
        dty   INTEGER NOT NULL,
        usn   INTEGER NOT NULL,
        ls    INTEGER NOT NULL,
        conf  TEXT    NOT NULL,
        models TEXT   NOT NULL,
        decks TEXT    NOT NULL,
        dconf TEXT    NOT NULL,
        tags  TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id    INTEGER PRIMARY KEY,
        guid  TEXT    NOT NULL,
        mid   INTEGER NOT NULL,
        mod   INTEGER NOT NULL,
        usn   INTEGER NOT NULL,
        tags  TEXT    NOT NULL,
        flds  TEXT    NOT NULL,
        sfld  TEXT    NOT NULL,
        csum  INTEGER NOT NULL,
        flags INTEGER NOT NULL,
        data  TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards (
        id     INTEGER PRIMARY KEY,
        nid    INTEGER NOT NULL,
        did    INTEGER NOT NULL,
        ord    INTEGER NOT NULL,
        mod    INTEGER NOT NULL,
        usn    INTEGER NOT NULL,
        type   INTEGER NOT NULL,
        queue  INTEGER NOT NULL,
        due    INTEGER NOT NULL,
        ivl    INTEGER NOT NULL,
        factor INTEGER NOT NULL,
        reps   INTEGER NOT NULL,
        lapses INTEGER NOT NULL,
        left   INTEGER NOT NULL,
        odue   INTEGER NOT NULL,
        odid   INTEGER NOT NULL,
        flags  INTEGER NOT NULL,
        data   TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS revlog (
        id    INTEGER PRIMARY KEY,
        cid   INTEGER NOT NULL,
        usn   INTEGER NOT NULL,
        ease  INTEGER NOT NULL,
        ivl   INTEGER NOT NULL,
        lastIvl INTEGER NOT NULL,
        factor  INTEGER NOT NULL,
        time    INTEGER NOT NULL,
        type    INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS graves (
        usn  INTEGER NOT NULL,
        oid  INTEGER NOT NULL,
        type INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS ix_notes_usn ON notes (usn);
      CREATE INDEX IF NOT EXISTS ix_cards_usn ON cards (usn);
      CREATE INDEX IF NOT EXISTS ix_revlog_usn ON revlog (usn);
      CREATE INDEX IF NOT EXISTS ix_cards_nid ON cards (nid);
      CREATE INDEX IF NOT EXISTS ix_cards_sched ON cards (did, queue, due);
      CREATE INDEX IF NOT EXISTS ix_revlog_cid ON revlog (cid);
      CREATE INDEX IF NOT EXISTS ix_notes_csum ON notes (csum);
    `);
  }

  // -----------------------------------------------------------------------
  // Private: Data Fetching
  // -----------------------------------------------------------------------

  /**
   * Resolve all descendant decks for the given deck IDs (recursive hierarchy).
   */
  private async resolveDescendantDecks(deckIds: string[]): Promise<string[]> {
    const result = await query<{ id: string }>(
      `WITH RECURSIVE deck_tree AS (
         SELECT id FROM decks WHERE id = ANY($1::uuid[])
         UNION ALL
         SELECT d.id FROM decks d
         INNER JOIN deck_tree dt ON d.parent_id = dt.id
       )
       SELECT id FROM deck_tree`,
      [deckIds],
    );
    return result.rows.map((r) => r.id);
  }

  /**
   * Fetch deck data for the specified IDs.
   */
  private async fetchDecks(
    deckIds: string[],
  ): Promise<Array<{ id: string; name: string; parent_id: string | null; description: string }>> {
    const result = await query<{
      id: string;
      name: string;
      parent_id: string | null;
      description: string;
    }>(
      `SELECT id, name, parent_id, description FROM decks WHERE id = ANY($1::uuid[]) ORDER BY name`,
      [deckIds],
    );
    return result.rows;
  }

  /**
   * Fetch note types used by notes in the specified decks.
   */
  private async fetchNoteTypes(
    deckIds: string[],
  ): Promise<Array<{
    id: string;
    name: string;
    kind: string;
    fields: string;
    templates: string;
    css: string;
  }>> {
    const result = await query<{
      id: string;
      name: string;
      kind: string;
      fields: string;
      templates: string;
      css: string;
    }>(
      `SELECT DISTINCT nt.id, nt.name, nt.kind, nt.fields, nt.templates, nt.css
       FROM note_types nt
       INNER JOIN notes n ON n.note_type_id = nt.id
       WHERE n.deck_id = ANY($1::uuid[])`,
      [deckIds],
    );
    return result.rows;
  }

  /**
   * Fetch notes belonging to the specified decks.
   */
  private async fetchNotes(
    deckIds: string[],
    opts: ExportOptions,
  ): Promise<Array<{
    id: string;
    note_type_id: string;
    fields: string;
    fields_def: string;
    tags: string[] | null;
    updated_at: Date;
  }>> {
    let tagSelect = 'NULL AS tags';
    let tagJoin = '';
    if (opts.includeTags) {
      tagSelect = 'ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) AS tags';
      tagJoin = 'LEFT JOIN note_tags nt2 ON nt2.note_id = n.id LEFT JOIN tags t ON t.id = nt2.tag_id';
    }

    const result = await query<{
      id: string;
      note_type_id: string;
      fields: string;
      fields_def: string;
      tags: string[] | null;
      updated_at: Date;
    }>(
      `SELECT n.id, n.note_type_id, n.fields, nt.fields AS fields_def, n.updated_at,
              ${tagSelect}
       FROM notes n
       INNER JOIN note_types nt ON nt.id = n.note_type_id
       ${tagJoin}
       WHERE n.deck_id = ANY($1::uuid[])
       GROUP BY n.id, n.note_type_id, n.fields, nt.fields, n.updated_at`,
      [deckIds],
    );
    return result.rows;
  }

  /**
   * Fetch cards belonging to the specified decks.
   */
  private async fetchCards(
    deckIds: string[],
    _opts: ExportOptions,
  ): Promise<Array<{
    id: string;
    note_id: string;
    deck_id: string;
    template_ordinal: number;
    queue: number;
    due: Date;
    stability: number;
    difficulty: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    suspended: boolean;
    buried: boolean;
    updated_at: Date;
  }>> {
    const result = await query<{
      id: string;
      note_id: string;
      deck_id: string;
      template_ordinal: number;
      queue: number;
      due: Date;
      stability: number;
      difficulty: number;
      scheduled_days: number;
      reps: number;
      lapses: number;
      suspended: boolean;
      buried: boolean;
      updated_at: Date;
    }>(
      `SELECT id, note_id, deck_id, template_ordinal, queue, due,
              COALESCE(stability, 0) AS stability,
              COALESCE(difficulty, 5) AS difficulty,
              COALESCE(scheduled_days, 0) AS scheduled_days,
              COALESCE(reps, 0) AS reps,
              COALESCE(lapses, 0) AS lapses,
              COALESCE(suspended, FALSE) AS suspended,
              COALESCE(buried, FALSE) AS buried,
              updated_at
       FROM cards
       WHERE deck_id = ANY($1::uuid[])
       ORDER BY note_id, template_ordinal`,
      [deckIds],
    );
    return result.rows;
  }

  /**
   * Fetch media files associated with the specified decks.
   */
  private async fetchMediaFiles(
    userId: string,
    _deckIds: string[],
  ): Promise<Array<{ filename: string; local_path: string }>> {
    try {
      const result = await query<{ filename: string; local_path: string }>(
        `SELECT filename, local_path FROM media WHERE user_id = $1`,
        [userId],
      );
      return result.rows;
    } catch {
      // Media table may not exist
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // Private: Anki Model / Deck Builders
  // -----------------------------------------------------------------------

  /**
   * Build the Anki models JSON object from our note types.
   */
  private buildAnkiModels(
    noteTypes: Array<{
      id: string;
      name: string;
      kind: string;
      fields: string;
      templates: string;
      css: string;
    }>,
  ): Record<string, Record<string, unknown>> {
    const models: Record<string, Record<string, unknown>> = {};
    let modelId = Math.floor(Date.now() / 1000) * 1000;

    for (const nt of noteTypes) {
      const id = modelId++;
      const fields = typeof nt.fields === 'string' ? JSON.parse(nt.fields) : nt.fields;
      const templates = typeof nt.templates === 'string' ? JSON.parse(nt.templates) : nt.templates;

      models[String(id)] = {
        id,
        name: nt.name,
        type: nt.kind === 'cloze' ? 1 : 0,
        mod: Math.floor(Date.now() / 1000),
        usn: -1,
        sortf: 0,
        did: 1,
        tmpls: (templates as Array<{ name: string; ordinal: number; frontTemplate: string; backTemplate: string }>).map(
          (t: { name: string; ordinal: number; frontTemplate: string; backTemplate: string }) => ({
            name: t.name,
            ord: t.ordinal,
            qfmt: t.frontTemplate,
            afmt: t.backTemplate,
            bqfmt: '',
            bafmt: '',
            did: null,
          }),
        ),
        flds: (fields as Array<{ name: string; ordinal: number; font: string; fontSize: number; rtl: boolean; description: string }>).map(
          (f: { name: string; ordinal: number; font: string; fontSize: number; rtl: boolean; description: string }) => ({
            name: f.name,
            ord: f.ordinal,
            sticky: false,
            rtl: f.rtl || false,
            font: f.font || 'Arial',
            size: f.fontSize || 20,
            description: f.description || '',
          }),
        ),
        css: nt.css || '',
        latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
        latexPost: '\\end{document}',
        latexsvg: false,
        req: [],
        tags: [],
        vers: [],
      };
    }

    return models;
  }

  /**
   * Build the Anki decks JSON object from our deck records.
   */
  private buildAnkiDecks(
    decks: Array<{ id: string; name: string; parent_id: string | null; description: string }>,
  ): Record<string, Record<string, unknown>> {
    const ankiDecks: Record<string, Record<string, unknown>> = {};
    let deckId = 1;

    for (const deck of decks) {
      const id = deckId++;
      ankiDecks[String(id)] = {
        id,
        name: deck.name,
        mod: Math.floor(Date.now() / 1000),
        usn: -1,
        lrnToday: [0, 0],
        revToday: [0, 0],
        newToday: [0, 0],
        timeToday: [0, 0],
        collapsed: false,
        browserCollapsed: false,
        desc: deck.description || '',
        dyn: 0,
        conf: 1,
        extendNew: 0,
        extendRev: 0,
      };
    }

    return ankiDecks;
  }

  // -----------------------------------------------------------------------
  // Private: Utilities
  // -----------------------------------------------------------------------

  /**
   * Compute a checksum of a field value (Anki uses a 32-bit integer from SHA1).
   */
  private fieldChecksum(value: string): number {
    const stripped = value.replace(/<[^>]+>/g, '').trim();
    const hash = crypto.createHash('sha1').update(stripped, 'utf-8').digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Generate a base91-like GUID for an Anki note.
   */
  private generateGuid(id: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~';
    let result = '';
    let n = id;
    while (n > 0) {
      result = chars[n % chars.length] + result;
      n = Math.floor(n / chars.length);
    }
    return result || 'A';
  }
}
