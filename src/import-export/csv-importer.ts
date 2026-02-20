/**
 * CSV/TSV Importer — Import Flashcards from Delimited Text Files
 *
 * Supports:
 *   - Custom delimiters (comma, tab, semicolon, pipe, etc.)
 *   - Automatic delimiter and encoding detection
 *   - Header row detection
 *   - Field mapping UI via preview()
 *   - Tag extraction from a dedicated column
 *   - Duplicate detection and handling
 *
 * The CSV importer works in two phases:
 *   1. preview()  — Parse the first N rows for the user to configure
 *                   field mapping in the UI.
 *   2. import()   — Import all rows using the confirmed mapping.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { query, withTransaction } from '../db/connection';
import type { CsvFieldMapping, CsvPreview, ImportOptions, ImportResult } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of preview rows to show in the mapping UI. */
const PREVIEW_ROW_COUNT = 10;

/** Common delimiters to test during auto-detection. */
const CANDIDATE_DELIMITERS = ['\t', ',', ';', '|'];

/** Default import options for CSV. */
const DEFAULT_CSV_OPTIONS: ImportOptions = {
  duplicateHandling: 'skip',
  importMedia: false,
  preserveScheduling: false,
};

// ---------------------------------------------------------------------------
// CsvImporter
// ---------------------------------------------------------------------------

export class CsvImporter {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Import a CSV/TSV file using the provided field mapping.
   *
   * @param userId  The user who owns the imported content
   * @param filePath Absolute path to the CSV/TSV file
   * @param mapping  Field mapping configuration
   * @param options  Additional import options
   * @returns        Summary of the import
   */
  async import(
    userId: string,
    filePath: string,
    mapping: CsvFieldMapping,
    options?: Partial<ImportOptions>,
  ): Promise<ImportResult> {
    const opts: ImportOptions = { ...DEFAULT_CSV_OPTIONS, ...options };
    const errors: string[] = [];

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

    // Validate the mapping references a real note type and deck
    const noteTypeResult = await query<{ id: string; fields: string }>(
      `SELECT id, fields FROM note_types WHERE id = $1`,
      [mapping.noteTypeId],
    );
    if (noteTypeResult.rowCount === 0) {
      return {
        success: false,
        notesImported: 0,
        cardsImported: 0,
        mediaImported: 0,
        duplicatesSkipped: 0,
        errors: [`Note type not found: ${mapping.noteTypeId}`],
      };
    }

    const deckResult = await query<{ id: string }>(
      `SELECT id FROM decks WHERE id = $1`,
      [mapping.deckId],
    );
    if (deckResult.rowCount === 0) {
      return {
        success: false,
        notesImported: 0,
        cardsImported: 0,
        mediaImported: 0,
        duplicatesSkipped: 0,
        errors: [`Deck not found: ${mapping.deckId}`],
      };
    }

    // Read and parse the file
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = this.parseRows(content, mapping.delimiter);

    if (rows.length === 0) {
      return {
        success: false,
        notesImported: 0,
        cardsImported: 0,
        mediaImported: 0,
        duplicatesSkipped: 0,
        errors: ['File is empty or could not be parsed'],
      };
    }

    // Skip header row if configured
    const dataRows = mapping.hasHeader ? rows.slice(1) : rows;

    if (dataRows.length === 0) {
      return {
        success: false,
        notesImported: 0,
        cardsImported: 0,
        mediaImported: 0,
        duplicatesSkipped: 0,
        errors: ['File contains only a header row with no data'],
      };
    }

    // Get the note type's field definitions for duplicate detection
    const noteTypeFields = typeof noteTypeResult.rows[0].fields === 'string'
      ? JSON.parse(noteTypeResult.rows[0].fields)
      : noteTypeResult.rows[0].fields;
    const firstFieldName = noteTypeFields.length > 0 ? noteTypeFields[0].name : null;

    let notesImported = 0;
    let cardsImported = 0;
    let duplicatesSkipped = 0;

    await withTransaction(async (client) => {
      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];

        try {
          // Build field values from the mapping
          const fields: Record<string, string> = {};
          for (const [colIndexStr, fieldName] of Object.entries(mapping.fieldMap)) {
            const colIndex = parseInt(colIndexStr, 10);
            fields[fieldName] = row[colIndex] || '';
          }

          // Check if at least the first mapped field has a value
          const firstMappedField = Object.values(mapping.fieldMap)[0];
          const firstMappedValue = firstMappedField ? fields[firstMappedField] : null;
          if (!firstMappedValue || firstMappedValue.trim() === '') {
            errors.push(`Row ${rowIndex + 1}: skipped (empty first field)`);
            continue;
          }

          // Check for duplicates
          if (opts.duplicateHandling !== 'import_as_new' && firstFieldName) {
            const firstFieldValue = fields[firstFieldName] || '';
            if (firstFieldValue.trim() !== '') {
              const dupResult = await client.query<{ id: string }>(
                `SELECT id FROM notes
                 WHERE note_type_id = $1
                   AND fields->>$2 = $3
                 LIMIT 1`,
                [mapping.noteTypeId, firstFieldName, firstFieldValue],
              );

              if (dupResult.rowCount! > 0) {
                if (opts.duplicateHandling === 'skip') {
                  duplicatesSkipped++;
                  continue;
                }

                if (opts.duplicateHandling === 'update') {
                  // Update existing note
                  await client.query(
                    `UPDATE notes SET fields = $1, updated_at = NOW() WHERE id = $2`,
                    [JSON.stringify(fields), dupResult.rows[0].id],
                  );
                  notesImported++;
                  continue;
                }
              }
            }
          }

          // Create the note
          const noteId = crypto.randomUUID();
          await client.query(
            `INSERT INTO notes (id, note_type_id, deck_id, fields, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [noteId, mapping.noteTypeId, mapping.deckId, JSON.stringify(fields)],
          );
          notesImported++;

          // Create a card for each template in the note type
          const templates = typeof noteTypeResult.rows[0].fields === 'string'
            ? JSON.parse(noteTypeResult.rows[0].fields)
            : noteTypeResult.rows[0].fields;

          // We need the templates, not fields -- fetch them
          const ntResult = await client.query<{ templates: string }>(
            `SELECT templates FROM note_types WHERE id = $1`,
            [mapping.noteTypeId],
          );
          const noteTemplates = ntResult.rowCount! > 0
            ? (typeof ntResult.rows[0].templates === 'string'
                ? JSON.parse(ntResult.rows[0].templates)
                : ntResult.rows[0].templates)
            : [{ ordinal: 0 }];

          // Ensure at least one card is generated
          const templateList = Array.isArray(noteTemplates) && noteTemplates.length > 0
            ? noteTemplates
            : [{ ordinal: 0 }];

          for (const template of templateList) {
            const cardId = crypto.randomUUID();
            await client.query(
              `INSERT INTO cards (id, note_id, deck_id, template_ordinal, cloze_ordinal, queue, due, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW(), NOW())`,
              [cardId, noteId, mapping.deckId, template.ordinal || 0],
            );
            cardsImported++;
          }

          // Handle tags from the tag column
          if (mapping.tagColumn !== undefined && row[mapping.tagColumn]) {
            const tagString = row[mapping.tagColumn];
            const tagNames = tagString
              .split(/[,;\s]+/)
              .map((t: string) => t.trim())
              .filter((t: string) => t.length > 0);

            for (const tagName of tagNames) {
              const tagId = await this.findOrCreateTag(
                userId,
                tagName,
                client,
              );
              await client.query(
                `INSERT INTO note_tags (note_id, tag_id, created_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (note_id, tag_id) DO NOTHING`,
                [noteId, tagId],
              );
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`Row ${rowIndex + 1}: ${message}`);
        }
      }
    });

    return {
      success: errors.length === 0 || notesImported > 0,
      notesImported,
      cardsImported,
      mediaImported: 0,
      duplicatesSkipped,
      errors,
    };
  }

  /**
   * Preview the first N rows of a CSV file for field mapping configuration.
   *
   * @param filePath  Absolute path to the CSV/TSV file
   * @param delimiter Optional delimiter override (auto-detected if omitted)
   * @returns         Preview data for the UI
   */
  preview(filePath: string, delimiter?: string): CsvPreview {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const format = this.detectFormat(filePath);

    const effectiveDelimiter = delimiter || format.delimiter;
    const rows = this.parseRows(content, effectiveDelimiter);

    if (rows.length === 0) {
      return {
        delimiter: effectiveDelimiter,
        encoding: format.encoding,
        hasHeader: false,
        headers: [],
        rows: [],
        totalRows: 0,
      };
    }

    // Determine headers
    let headers: string[];
    let dataRows: string[][];

    if (format.hasHeader) {
      headers = rows[0];
      dataRows = rows.slice(1, PREVIEW_ROW_COUNT + 1);
    } else {
      // Generate generic column names
      const colCount = rows[0].length;
      headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
      dataRows = rows.slice(0, PREVIEW_ROW_COUNT);
    }

    return {
      delimiter: effectiveDelimiter,
      encoding: format.encoding,
      hasHeader: format.hasHeader,
      headers,
      rows: dataRows,
      totalRows: rows.length,
    };
  }

  /**
   * Auto-detect the delimiter, encoding, and whether a header row is present.
   *
   * @param filePath Absolute path to the file
   * @returns        Detected format parameters
   */
  detectFormat(filePath: string): { delimiter: string; encoding: string; hasHeader: boolean } {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read the first few KB for detection
    const buffer = Buffer.alloc(8192);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    const sample = buffer.slice(0, bytesRead).toString('utf-8');

    // Detect encoding (simplified: check for BOM)
    let encoding = 'utf-8';
    if (bytesRead >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      encoding = 'utf-8-bom';
    } else if (bytesRead >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      encoding = 'utf-16-le';
    } else if (bytesRead >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      encoding = 'utf-16-be';
    }

    // Detect delimiter by counting occurrences in the first few lines
    const sampleLines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 10);

    const delimiter = this.detectDelimiter(sampleLines);

    // Detect header row
    const hasHeader = this.detectHeader(sampleLines, delimiter);

    return { delimiter, encoding, hasHeader };
  }

  // -----------------------------------------------------------------------
  // Private: CSV Parsing
  // -----------------------------------------------------------------------

  /**
   * Parse CSV content into rows of string arrays, handling quoted fields.
   */
  private parseRows(content: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    // Strip BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.substring(1);
    }

    while (i < content.length) {
      const char = content[i];

      if (inQuotes) {
        if (char === '"') {
          // Check for escaped quote (double quote)
          if (i + 1 < content.length && content[i + 1] === '"') {
            currentField += '"';
            i += 2;
            continue;
          }
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
        currentField += char;
        i++;
        continue;
      }

      // Not in quotes
      if (char === '"' && currentField.length === 0) {
        // Start of quoted field
        inQuotes = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      }

      if (char === '\n' || char === '\r') {
        // End of line
        if (char === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
          i++; // Skip \n in \r\n
        }

        currentRow.push(currentField);
        currentField = '';

        // Only add non-empty rows
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    // Handle last field/row (file may not end with newline)
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some((f) => f.trim().length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Detect the most likely delimiter by looking at consistency of field counts.
   */
  private detectDelimiter(lines: string[]): string {
    if (lines.length === 0) return '\t';

    let bestDelimiter = '\t';
    let bestScore = -1;

    for (const delim of CANDIDATE_DELIMITERS) {
      const counts = lines.map((line) => {
        // Simple count (doesn't handle quoted fields for detection, but good enough)
        return line.split(delim).length;
      });

      // Score: consistency of column count across lines
      if (counts.length === 0) continue;

      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);

      // Must have at least 2 columns
      if (minCount < 2) continue;

      // Score: prefer high column count with low variance
      const score = minCount * (minCount === maxCount ? 2 : 1);

      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delim;
      }
    }

    return bestDelimiter;
  }

  /**
   * Heuristically detect whether the first row is a header.
   *
   * A header row is likely if:
   *   - All values in the first row are relatively short text
   *   - The first row contains no numeric-only values
   *   - The data rows contain some numeric values
   */
  private detectHeader(lines: string[], delimiter: string): boolean {
    if (lines.length < 2) return false;

    const firstRow = lines[0].split(delimiter);
    const secondRow = lines[1].split(delimiter);

    // Check if first row looks like headers (short, non-numeric text)
    const firstRowIsText = firstRow.every((cell) => {
      const trimmed = cell.trim().replace(/^"|"$/g, '');
      return trimmed.length < 50 && isNaN(Number(trimmed));
    });

    // Check if second row has any numeric values (data-like)
    const secondRowHasNumbers = secondRow.some((cell) => {
      const trimmed = cell.trim().replace(/^"|"$/g, '');
      return !isNaN(Number(trimmed)) && trimmed.length > 0;
    });

    // Check if first row values differ in type from the rest
    const firstRowTypes = firstRow.map((c) => typeof this.inferType(c));
    const secondRowTypes = secondRow.map((c) => typeof this.inferType(c));
    const typeMismatch = firstRowTypes.some(
      (t, i) => i < secondRowTypes.length && t !== secondRowTypes[i],
    );

    return firstRowIsText && (secondRowHasNumbers || typeMismatch);
  }

  /**
   * Infer the type of a cell value for header detection.
   */
  private inferType(value: string): string | number | boolean {
    const trimmed = value.trim().replace(/^"|"$/g, '');
    if (trimmed === '') return '';
    if (trimmed === 'true' || trimmed === 'false') return true;
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
    return trimmed;
  }

  // -----------------------------------------------------------------------
  // Private: Tag Helper
  // -----------------------------------------------------------------------

  /**
   * Find an existing tag by name or create it.
   */
  private async findOrCreateTag(
    userId: string,
    tagName: string,
    client: { query: (text: string, params?: unknown[]) => Promise<{ rows: { id: string }[]; rowCount: number | null }> },
  ): Promise<string> {
    const existing = await client.query(
      `SELECT id FROM tags WHERE user_id = $1 AND name = $2 LIMIT 1`,
      [userId, tagName],
    );

    if (existing.rowCount! > 0) {
      return existing.rows[0].id;
    }

    const tagId = crypto.randomUUID();
    const slug = tagName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);

    await client.query(
      `INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description, created_at)
       VALUES ($1, $2, $3, $4, NULL, '#6B7280', '', '', NOW())`,
      [tagId, userId, tagName, slug],
    );

    return tagId;
  }
}
