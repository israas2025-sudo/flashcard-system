// @ts-nocheck
/**
 * Import/Export Routes
 *
 * API endpoints for importing and exporting flashcard data.
 * Supports .apkg (Anki package), CSV/TSV, and collection backup formats.
 *
 * Routes:
 *   POST /api/import/apkg        — Import an .apkg file
 *   POST /api/import/csv         — Import a CSV/TSV file
 *   POST /api/import/csv/preview — Preview CSV for field mapping
 *   GET  /api/export/apkg        — Export deck(s) as .apkg
 *   GET  /api/export/csv         — Export deck(s) as CSV/TSV
 *   GET  /api/export/collection  — Export entire collection as .colpkg
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { ApkgImporter } from '../../import-export/apkg-importer';
import { ApkgExporter } from '../../import-export/apkg-exporter';
import { CsvImporter } from '../../import-export/csv-importer';
import { CsvExporter } from '../../import-export/csv-exporter';
import { ApiError, requireFields, validateUUID } from '../server';
import type { CsvFieldMapping, ImportOptions } from '../../import-export/types';
import type { CsvExportOptions } from '../../import-export/csv-exporter';

export const importExportRouter = Router();

const apkgImporter = new ApkgImporter();
const apkgExporter = new ApkgExporter();
const csvImporter = new CsvImporter();
const csvExporter = new CsvExporter();

// ---------------------------------------------------------------------------
// Middleware: Extract userId from request
// ---------------------------------------------------------------------------

function getUserId(req: Request): string {
  const userId =
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    (req.body?.userId as string);

  if (!userId) {
    throw ApiError.unauthorized('User ID is required (x-user-id header or userId parameter)');
  }

  validateUUID(userId, 'userId');
  return userId;
}

// ---------------------------------------------------------------------------
// Helper: Save uploaded file to temp directory
// ---------------------------------------------------------------------------

/**
 * Save a base64-encoded file body or raw buffer to a temp file.
 * Returns the absolute path to the temp file.
 */
function saveUploadedFile(
  fileData: string | Buffer,
  originalFilename: string,
): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-upload-'));
  const ext = path.extname(originalFilename) || '.dat';
  const safeName = `upload-${crypto.randomUUID()}${ext}`;
  const filePath = path.join(tempDir, safeName);

  if (typeof fileData === 'string') {
    // Assume base64 encoded
    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(filePath, buffer);
  } else {
    fs.writeFileSync(filePath, fileData);
  }

  return filePath;
}

/**
 * Clean up a temp file and its parent temp directory.
 */
function cleanupTempFile(filePath: string): void {
  try {
    const dir = path.dirname(filePath);
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// POST /api/import/apkg — Import an .apkg file
// ---------------------------------------------------------------------------

importExportRouter.post(
  '/import/apkg',
  async (req: Request, res: Response, next: NextFunction) => {
    let tempFilePath: string | null = null;

    try {
      const userId = getUserId(req);
      requireFields(req.body, ['file', 'filename']);

      const { file, filename } = req.body;

      // Validate file extension
      if (!filename.toLowerCase().endsWith('.apkg')) {
        throw ApiError.badRequest('File must have a .apkg extension');
      }

      // Save to temp file
      tempFilePath = saveUploadedFile(file, filename);

      // Build import options
      const options: Partial<ImportOptions> = {};

      if (req.body.targetDeckId) {
        validateUUID(req.body.targetDeckId, 'targetDeckId');
        options.targetDeckId = req.body.targetDeckId;
      }

      if (req.body.duplicateHandling) {
        const valid = ['skip', 'update', 'import_as_new'];
        if (!valid.includes(req.body.duplicateHandling)) {
          throw ApiError.badRequest(
            `duplicateHandling must be one of: ${valid.join(', ')}`,
          );
        }
        options.duplicateHandling = req.body.duplicateHandling;
      }

      if (req.body.importMedia !== undefined) {
        options.importMedia = Boolean(req.body.importMedia);
      }

      if (req.body.preserveScheduling !== undefined) {
        options.preserveScheduling = Boolean(req.body.preserveScheduling);
      }

      const result = await apkgImporter.import(userId, tempFilePath, options);

      const statusCode = result.success ? 200 : 422;

      res.status(statusCode).json({
        data: {
          success: result.success,
          notesImported: result.notesImported,
          cardsImported: result.cardsImported,
          mediaImported: result.mediaImported,
          duplicatesSkipped: result.duplicatesSkipped,
          errors: result.errors,
        },
      });
    } catch (err) {
      next(err);
    } finally {
      if (tempFilePath) {
        cleanupTempFile(tempFilePath);
      }
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/import/csv — Import a CSV/TSV file
// ---------------------------------------------------------------------------

importExportRouter.post(
  '/import/csv',
  async (req: Request, res: Response, next: NextFunction) => {
    let tempFilePath: string | null = null;

    try {
      const userId = getUserId(req);
      requireFields(req.body, ['file', 'filename', 'mapping']);

      const { file, filename, mapping } = req.body;

      // Validate mapping
      const fieldMapping = mapping as CsvFieldMapping;
      if (!fieldMapping.noteTypeId || !fieldMapping.deckId || !fieldMapping.fieldMap) {
        throw ApiError.badRequest(
          'mapping must include noteTypeId, deckId, and fieldMap',
        );
      }
      validateUUID(fieldMapping.noteTypeId, 'mapping.noteTypeId');
      validateUUID(fieldMapping.deckId, 'mapping.deckId');

      if (typeof fieldMapping.fieldMap !== 'object' || Array.isArray(fieldMapping.fieldMap)) {
        throw ApiError.badRequest('mapping.fieldMap must be an object');
      }

      // Save to temp file
      tempFilePath = saveUploadedFile(file, filename);

      // Build import options
      const options: Partial<ImportOptions> = {};
      if (req.body.duplicateHandling) {
        options.duplicateHandling = req.body.duplicateHandling;
      }

      const result = await csvImporter.import(
        userId,
        tempFilePath,
        {
          ...fieldMapping,
          delimiter: fieldMapping.delimiter || '\t',
          hasHeader: fieldMapping.hasHeader !== false,
        },
        options,
      );

      const statusCode = result.success ? 200 : 422;

      res.status(statusCode).json({
        data: {
          success: result.success,
          notesImported: result.notesImported,
          cardsImported: result.cardsImported,
          mediaImported: result.mediaImported,
          duplicatesSkipped: result.duplicatesSkipped,
          errors: result.errors,
        },
      });
    } catch (err) {
      next(err);
    } finally {
      if (tempFilePath) {
        cleanupTempFile(tempFilePath);
      }
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/import/csv/preview — Preview CSV for field mapping
// ---------------------------------------------------------------------------

importExportRouter.post(
  '/import/csv/preview',
  async (req: Request, res: Response, next: NextFunction) => {
    let tempFilePath: string | null = null;

    try {
      requireFields(req.body, ['file', 'filename']);

      const { file, filename, delimiter } = req.body;

      // Save to temp file
      tempFilePath = saveUploadedFile(file, filename);

      const preview = csvImporter.preview(tempFilePath, delimiter);

      res.json({
        data: {
          delimiter: preview.delimiter,
          encoding: preview.encoding,
          hasHeader: preview.hasHeader,
          headers: preview.headers,
          rows: preview.rows,
          totalRows: preview.totalRows,
        },
      });
    } catch (err) {
      next(err);
    } finally {
      if (tempFilePath) {
        cleanupTempFile(tempFilePath);
      }
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/export/apkg — Export deck(s) as .apkg
// ---------------------------------------------------------------------------

importExportRouter.get(
  '/export/apkg',
  async (req: Request, res: Response, next: NextFunction) => {
    let outputPath: string | null = null;

    try {
      const userId = getUserId(req);

      // Parse deck IDs from query (comma-separated)
      const deckIdsParam = req.query.deckIds as string;
      if (!deckIdsParam) {
        throw ApiError.badRequest('deckIds query parameter is required (comma-separated UUIDs)');
      }

      const deckIds = deckIdsParam.split(',').map((id) => id.trim());
      for (const id of deckIds) {
        validateUUID(id, 'deckId');
      }

      // Build export options
      const includeScheduling = req.query.includeScheduling !== 'false';
      const includeMedia = req.query.includeMedia !== 'false';
      const includeTags = req.query.includeTags !== 'false';

      // Generate the .apkg to a temp file
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-export-'));
      outputPath = path.join(tempDir, `export-${Date.now()}.apkg`);

      await apkgExporter.export(userId, deckIds, outputPath, {
        includeScheduling,
        includeMedia,
        includeTags,
      });

      // Send the file as a download
      const filename = `flashcards-${Date.now()}.apkg`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      const fileBuffer = fs.readFileSync(outputPath);
      res.send(fileBuffer);
    } catch (err) {
      next(err);
    } finally {
      if (outputPath) {
        try {
          fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
        } catch {
          // Non-fatal cleanup
        }
      }
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/export/csv — Export deck(s) as CSV/TSV
// ---------------------------------------------------------------------------

importExportRouter.get(
  '/export/csv',
  async (req: Request, res: Response, next: NextFunction) => {
    let outputPath: string | null = null;

    try {
      const userId = getUserId(req);

      // Parse deck IDs
      const deckIdsParam = req.query.deckIds as string;
      if (!deckIdsParam) {
        throw ApiError.badRequest('deckIds query parameter is required (comma-separated UUIDs)');
      }

      const deckIds = deckIdsParam.split(',').map((id) => id.trim());
      for (const id of deckIds) {
        validateUUID(id, 'deckId');
      }

      // Build export options
      const options: Partial<CsvExportOptions> = {};

      if (req.query.delimiter) {
        const delimMap: Record<string, string> = {
          tab: '\t',
          comma: ',',
          semicolon: ';',
          pipe: '|',
        };
        options.delimiter = delimMap[req.query.delimiter as string] || '\t';
      }

      if (req.query.includeHeader !== undefined) {
        options.includeHeader = req.query.includeHeader !== 'false';
      }

      if (req.query.stripHtml !== undefined) {
        options.stripHtml = req.query.stripHtml === 'true';
      }

      if (req.query.includeTags !== undefined) {
        options.includeTags = req.query.includeTags !== 'false';
      }

      if (req.query.includeScheduling !== undefined) {
        options.includeScheduling = req.query.includeScheduling === 'true';
      }

      // Generate the CSV to a temp file
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-export-'));
      const ext = options.delimiter === ',' ? '.csv' : '.tsv';
      outputPath = path.join(tempDir, `export-${Date.now()}${ext}`);

      await csvExporter.export(userId, deckIds, outputPath, options);

      // Send the file
      const filename = `flashcards-${Date.now()}${ext}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', ext === '.csv' ? 'text/csv; charset=utf-8' : 'text/tab-separated-values; charset=utf-8');

      const fileContent = fs.readFileSync(outputPath, 'utf-8');
      res.send(fileContent);
    } catch (err) {
      next(err);
    } finally {
      if (outputPath) {
        try {
          fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
        } catch {
          // Non-fatal cleanup
        }
      }
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/export/collection — Export entire collection as .colpkg
// ---------------------------------------------------------------------------

importExportRouter.get(
  '/export/collection',
  async (req: Request, res: Response, next: NextFunction) => {
    let outputPath: string | null = null;

    try {
      const userId = getUserId(req);

      // Generate the .colpkg to a temp file
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-export-'));
      outputPath = path.join(tempDir, `collection-${Date.now()}.colpkg`);

      await apkgExporter.exportCollection(userId, outputPath);

      // Send the file
      const filename = `collection-backup-${Date.now()}.colpkg`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      const fileBuffer = fs.readFileSync(outputPath);
      res.send(fileBuffer);
    } catch (err) {
      next(err);
    } finally {
      if (outputPath) {
        try {
          fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
        } catch {
          // Non-fatal cleanup
        }
      }
    }
  },
);
