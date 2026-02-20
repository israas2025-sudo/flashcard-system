/**
 * CSV/TSV Exporter — Export Flashcards to Delimited Text Files
 *
 * Exports notes from selected decks as a CSV or TSV file.
 * Each row represents one note, with columns for each note field,
 * plus optional columns for tags and scheduling metadata.
 *
 * The output is RFC 4180 compliant: fields containing the delimiter,
 * double-quotes, or newlines are wrapped in double-quotes with internal
 * quotes escaped as "".
 */

import * as fs from 'fs';
import * as path from 'path';
import { query } from '../db/connection';
import type { ExportOptions } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options specific to CSV export.
 */
export interface CsvExportOptions extends ExportOptions {
  /** Column delimiter character. Default: '\t' (TSV). */
  delimiter: string;

  /** Whether to include a header row. Default: true. */
  includeHeader: boolean;

  /** Whether to strip HTML tags from field values. Default: false. */
  stripHtml: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CSV_EXPORT_OPTIONS: CsvExportOptions = {
  includeScheduling: false,
  includeMedia: false,
  includeTags: true,
  delimiter: '\t',
  includeHeader: true,
  stripHtml: false,
};

// ---------------------------------------------------------------------------
// CsvExporter
// ---------------------------------------------------------------------------

export class CsvExporter {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Export notes from the specified decks as a CSV/TSV file.
   *
   * @param userId     The user whose data to export
   * @param deckIds    The deck IDs to include (includes descendant decks)
   * @param outputPath The absolute path where the file will be written
   * @param options    Export configuration
   * @returns          The absolute path of the created file
   */
  async export(
    userId: string,
    deckIds: string[],
    outputPath: string,
    options?: Partial<CsvExportOptions>,
  ): Promise<string> {
    const opts: CsvExportOptions = { ...DEFAULT_CSV_EXPORT_OPTIONS, ...options };

    if (deckIds.length === 0) {
      throw new Error('At least one deck ID is required for export');
    }

    // Resolve all descendant deck IDs
    const allDeckIds = await this.resolveDescendantDecks(deckIds);

    // Fetch note types used by notes in these decks
    const noteTypesResult = await query<{
      id: string;
      name: string;
      fields: string;
    }>(
      `SELECT DISTINCT nt.id, nt.name, nt.fields
       FROM note_types nt
       INNER JOIN notes n ON n.note_type_id = nt.id
       WHERE n.deck_id = ANY($1::uuid[])`,
      [allDeckIds],
    );

    if (noteTypesResult.rowCount === 0) {
      throw new Error('No notes found in the specified decks');
    }

    // Collect all unique field names across all note types
    const allFieldNames = new Set<string>();
    const noteTypeFieldMap = new Map<string, string[]>();

    for (const nt of noteTypesResult.rows) {
      const fields = typeof nt.fields === 'string'
        ? JSON.parse(nt.fields)
        : nt.fields;
      const names = (fields as Array<{ name: string }>).map((f) => f.name);
      noteTypeFieldMap.set(nt.id, names);
      for (const name of names) {
        allFieldNames.add(name);
      }
    }

    const orderedFieldNames = Array.from(allFieldNames);

    // Build the header row
    const headerColumns: string[] = [...orderedFieldNames];

    if (opts.includeTags) {
      headerColumns.push('Tags');
    }

    if (opts.includeScheduling) {
      headerColumns.push('Deck', 'NoteType', 'Queue', 'Due', 'Interval', 'Reps', 'Lapses');
    }

    // Fetch notes with optional tags and scheduling data
    let tagSelect = '';
    let tagJoin = '';
    if (opts.includeTags) {
      tagSelect = `, ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) AS tags`;
      tagJoin = `LEFT JOIN note_tags nt2 ON nt2.note_id = n.id
                 LEFT JOIN tags t ON t.id = nt2.tag_id`;
    }

    let schedSelect = '';
    let schedJoin = '';
    if (opts.includeScheduling) {
      schedSelect = `, d.name AS deck_name, ntype.name AS note_type_name,
                       c.queue, c.due, c.scheduled_days, c.reps, c.lapses`;
      schedJoin = `LEFT JOIN cards c ON c.note_id = n.id AND c.template_ordinal = 0
                   LEFT JOIN decks d ON d.id = n.deck_id
                   LEFT JOIN note_types ntype ON ntype.id = n.note_type_id`;
    }

    const notesResult = await query<Record<string, unknown>>(
      `SELECT n.id, n.note_type_id, n.fields
              ${tagSelect}
              ${schedSelect}
       FROM notes n
       ${tagJoin}
       ${schedJoin}
       WHERE n.deck_id = ANY($1::uuid[])
       GROUP BY n.id, n.note_type_id, n.fields
              ${opts.includeScheduling ? ', d.name, ntype.name, c.queue, c.due, c.scheduled_days, c.reps, c.lapses' : ''}
       ORDER BY n.created_at`,
      [allDeckIds],
    );

    // Build CSV content
    const lines: string[] = [];

    if (opts.includeHeader) {
      lines.push(this.formatRow(headerColumns, opts.delimiter));
    }

    for (const row of notesResult.rows) {
      const fields = typeof row.fields === 'string'
        ? JSON.parse(row.fields as string)
        : row.fields;

      const columns: string[] = [];

      // Add field values in the canonical order
      for (const fieldName of orderedFieldNames) {
        let value = (fields as Record<string, string>)[fieldName] || '';
        if (opts.stripHtml) {
          value = this.stripHtmlTags(value);
        }
        columns.push(value);
      }

      // Add tags
      if (opts.includeTags) {
        const tags = row.tags as string[] | null;
        columns.push(tags ? tags.join(' ') : '');
      }

      // Add scheduling data
      if (opts.includeScheduling) {
        columns.push(
          (row.deck_name as string) || '',
          (row.note_type_name as string) || '',
          String(row.queue ?? ''),
          row.due ? new Date(row.due as string).toISOString() : '',
          String(row.scheduled_days ?? ''),
          String(row.reps ?? ''),
          String(row.lapses ?? ''),
        );
      }

      lines.push(this.formatRow(columns, opts.delimiter));
    }

    // Write the file
    const content = lines.join('\n') + '\n';

    // Ensure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf-8');

    return outputPath;
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  /**
   * Format a single row as a delimited string (RFC 4180 compliant).
   * Fields containing the delimiter, double-quotes, or newlines are
   * quoted and internal double-quotes are escaped.
   */
  private formatRow(columns: string[], delimiter: string): string {
    return columns
      .map((value) => {
        // Check if the value needs quoting
        if (
          value.includes(delimiter) ||
          value.includes('"') ||
          value.includes('\n') ||
          value.includes('\r')
        ) {
          // Escape internal double-quotes
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        }
        return value;
      })
      .join(delimiter);
  }

  /**
   * Strip HTML tags from a string, leaving only the text content.
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Resolve all descendant deck IDs from the given deck IDs.
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
}
