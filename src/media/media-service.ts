/**
 * Media Management Service
 *
 * Handles uploading, storing, retrieving, and managing media files (images,
 * audio, video) for the flashcard system. Supports direct file upload,
 * clipboard paste (base64), and URL-based download. Tracks media changes
 * for sync and provides storage usage analytics.
 */

import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

import {
  Media,
  MediaChange,
  MediaRow,
  MediaChangeRow,
  PaginatedMediaResult,
  StorageUsage,
  ALL_SUPPORTED_TYPES,
  MAX_FILE_SIZE_BYTES,
  MIME_TO_EXTENSION,
  getMediaCategory,
} from './types';

// ---------------------------------------------------------------------------
// Helper: Map a database row to a Media object
// ---------------------------------------------------------------------------

function rowToMedia(row: MediaRow, baseUrl: string): Media {
  return {
    id: row.id,
    userId: row.user_id,
    filename: row.filename,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    url: `${baseUrl}/media/${row.filename}`,
    checksum: row.checksum,
    createdAt: new Date(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Helper: Compute SHA-256 checksum of a buffer
// ---------------------------------------------------------------------------

function computeChecksum(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ---------------------------------------------------------------------------
// Helper: Generate a unique filename with UUID
// ---------------------------------------------------------------------------

function generateUniqueFilename(originalFilename: string, mimeType: string): string {
  const uuid = crypto.randomUUID();
  // Prefer extension from MIME type, fall back to original extension
  const extFromMime = MIME_TO_EXTENSION[mimeType];
  const extFromFile = path.extname(originalFilename).toLowerCase();
  const ext = extFromMime || extFromFile || '';
  return `${uuid}${ext}`;
}

// ---------------------------------------------------------------------------
// Helper: Download a file from a URL
// ---------------------------------------------------------------------------

function downloadFile(url: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const MAX_REDIRECTS = 5;
    let redirectCount = 0;

    function doRequest(requestUrl: string): void {
      protocol.get(requestUrl, (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++;
          if (redirectCount > MAX_REDIRECTS) {
            reject(new Error('Too many redirects'));
            return;
          }
          doRequest(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download file: HTTP ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        res.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE_BYTES) {
            res.destroy();
            reject(new Error(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES} bytes`));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const mimeType = res.headers['content-type'] || 'application/octet-stream';
          // Extract filename from URL path
          const urlPath = new URL(requestUrl).pathname;
          const filename = path.basename(urlPath) || 'downloaded-file';
          resolve({ buffer, mimeType: mimeType.split(';')[0].trim(), filename });
        });

        res.on('error', reject);
      }).on('error', reject);
    }

    doRequest(url);
  });
}

// ---------------------------------------------------------------------------
// Helper: Validate MIME type
// ---------------------------------------------------------------------------

function validateMimeType(mimeType: string): void {
  const supported = ALL_SUPPORTED_TYPES as readonly string[];
  if (!supported.includes(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Supported types: ${ALL_SUPPORTED_TYPES.join(', ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Validate file size
// ---------------------------------------------------------------------------

function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const maxMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    throw new Error(`File size ${sizeBytes} bytes exceeds maximum of ${maxMB} MB`);
  }
  if (sizeBytes === 0) {
    throw new Error('File is empty (0 bytes)');
  }
}

// ---------------------------------------------------------------------------
// MediaService
// ---------------------------------------------------------------------------

export class MediaService {
  private pool: Pool;
  private storagePath: string;
  private baseUrl: string;

  /**
   * @param pool - PostgreSQL connection pool
   * @param storagePath - Absolute path to the local storage directory for media files
   * @param baseUrl - Base URL for constructing public file URLs (default: '/api')
   */
  constructor(pool: Pool, storagePath: string, baseUrl: string = '/api') {
    this.pool = pool;
    this.storagePath = storagePath;
    this.baseUrl = baseUrl;

    // Ensure storage directory exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  // -------------------------------------------------------------------------
  // Upload: standard file upload
  // -------------------------------------------------------------------------

  /**
   * Upload a media file (image, audio, video).
   *
   * 1. Validates MIME type and file size
   * 2. Generates a unique filename (UUID + extension)
   * 3. Computes SHA-256 checksum
   * 4. Writes the file to local storage
   * 5. Inserts a row into the media table
   * 6. Records the change for sync tracking
   * 7. Returns the media object with a public URL
   */
  async upload(
    userId: string,
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<Media> {
    validateMimeType(mimeType);
    validateFileSize(file.length);

    const uniqueFilename = generateUniqueFilename(filename, mimeType);
    const checksum = computeChecksum(file);
    const filePath = path.join(this.storagePath, uniqueFilename);

    // Check for duplicate by checksum (same user, same file)
    const duplicateCheck = await this.pool.query(
      'SELECT * FROM media WHERE user_id = $1 AND checksum = $2 LIMIT 1',
      [userId, checksum]
    );

    if (duplicateCheck.rows.length > 0) {
      // Return existing media rather than creating a duplicate
      return rowToMedia(duplicateCheck.rows[0] as MediaRow, this.baseUrl);
    }

    // Write file to disk
    await fs.promises.writeFile(filePath, file);

    // Insert into database with transaction for atomicity
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO media (
          user_id, filename, original_filename, mime_type,
          size_bytes, storage_path, checksum
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [userId, uniqueFilename, filename, mimeType, file.length, filePath, checksum]
      );

      const mediaRow = insertResult.rows[0] as MediaRow;

      // Record sync change
      await this.recordChange(client, mediaRow.id, userId, 'added');

      await client.query('COMMIT');
      return rowToMedia(mediaRow, this.baseUrl);
    } catch (err) {
      await client.query('ROLLBACK');
      // Clean up the written file on failure
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // Upload: clipboard paste (base64 data)
  // -------------------------------------------------------------------------

  /**
   * Upload from clipboard paste (base64 encoded data).
   * Strips the data URI prefix if present, decodes to a Buffer,
   * then delegates to the standard upload flow.
   */
  async uploadFromPaste(
    userId: string,
    base64Data: string,
    mimeType: string
  ): Promise<Media> {
    // Strip data URI prefix if present (e.g., "data:image/png;base64,...")
    let cleanData = base64Data;
    const dataUriMatch = base64Data.match(/^data:[^;]+;base64,(.+)$/);
    if (dataUriMatch) {
      cleanData = dataUriMatch[1];
      // Also extract MIME type from data URI if not explicitly provided
      const uriMimeMatch = base64Data.match(/^data:([^;]+);base64,/);
      if (uriMimeMatch && (!mimeType || mimeType === 'application/octet-stream')) {
        mimeType = uriMimeMatch[1];
      }
    }

    const buffer = Buffer.from(cleanData, 'base64');
    if (buffer.length === 0) {
      throw new Error('Empty base64 data');
    }

    // Generate a filename from MIME type since paste has no filename
    const ext = MIME_TO_EXTENSION[mimeType] || '';
    const pasteFilename = `paste-${Date.now()}${ext}`;

    return this.upload(userId, buffer, pasteFilename, mimeType);
  }

  // -------------------------------------------------------------------------
  // Upload: from URL
  // -------------------------------------------------------------------------

  /**
   * Upload from a URL by downloading the file and storing it locally.
   */
  async uploadFromUrl(userId: string, url: string): Promise<Media> {
    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    const { buffer, mimeType, filename } = await downloadFile(url);
    return this.upload(userId, buffer, filename, mimeType);
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  /**
   * Delete a media file by ID. Removes the file from disk and the database row.
   */
  async delete(mediaId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch the media record
      const result = await client.query(
        'SELECT * FROM media WHERE id = $1',
        [mediaId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Media not found: ${mediaId}`);
      }

      const mediaRow = result.rows[0] as MediaRow;

      // Record sync change before deletion
      await this.recordChange(client, mediaId, mediaRow.user_id, 'deleted');

      // Delete from database
      await client.query('DELETE FROM media WHERE id = $1', [mediaId]);

      await client.query('COMMIT');

      // Delete file from disk (after successful DB operation)
      const filePath = path.join(this.storagePath, mediaRow.filename);
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // File might already be gone; log but do not throw
        console.warn(`[MediaService] Could not delete file: ${filePath}`);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // Get by ID
  // -------------------------------------------------------------------------

  /**
   * Retrieve a single media record by ID.
   */
  async get(mediaId: string): Promise<Media> {
    const result = await this.pool.query(
      'SELECT * FROM media WHERE id = $1',
      [mediaId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Media not found: ${mediaId}`);
    }

    return rowToMedia(result.rows[0] as MediaRow, this.baseUrl);
  }

  // -------------------------------------------------------------------------
  // List user media (paginated)
  // -------------------------------------------------------------------------

  /**
   * Get all media for a user with pagination.
   *
   * @param userId - The user's ID
   * @param page - Page number (1-based, default 1)
   * @param pageSize - Items per page (default 20, max 100)
   */
  async getUserMedia(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedMediaResult> {
    // Clamp pageSize
    const clampedPageSize = Math.min(Math.max(1, pageSize), 100);
    const clampedPage = Math.max(1, page);
    const offset = (clampedPage - 1) * clampedPageSize;

    // Get total count
    const countResult = await this.pool.query(
      'SELECT COUNT(*) as total FROM media WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const result = await this.pool.query(
      `SELECT * FROM media
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, clampedPageSize, offset]
    );

    const media = result.rows.map((row: MediaRow) => rowToMedia(row, this.baseUrl));

    return { media, total };
  }

  // -------------------------------------------------------------------------
  // Find unused media
  // -------------------------------------------------------------------------

  /**
   * Find media files not referenced by any note field.
   * Searches note fields (JSONB) for media filenames to determine usage.
   */
  async findUnused(userId: string): Promise<Media[]> {
    // A media file is "unused" if its filename does not appear in any note's
    // fields JSONB column for the same user.
    const result = await this.pool.query(
      `SELECT m.* FROM media m
       WHERE m.user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM notes n
           WHERE n.user_id = $1
             AND n.fields::text LIKE '%' || m.filename || '%'
         )
       ORDER BY m.created_at ASC`,
      [userId]
    );

    return result.rows.map((row: MediaRow) => rowToMedia(row, this.baseUrl));
  }

  // -------------------------------------------------------------------------
  // Cleanup unused media
  // -------------------------------------------------------------------------

  /**
   * Delete all unused media files for a user.
   * Returns the number of files deleted.
   */
  async cleanupUnused(userId: string): Promise<number> {
    const unusedMedia = await this.findUnused(userId);

    if (unusedMedia.length === 0) {
      return 0;
    }

    let deletedCount = 0;
    for (const media of unusedMedia) {
      try {
        await this.delete(media.id);
        deletedCount++;
      } catch (err) {
        console.error(`[MediaService] Failed to delete unused media ${media.id}:`, err);
        // Continue deleting other files
      }
    }

    return deletedCount;
  }

  // -------------------------------------------------------------------------
  // Sync: media changes since a given USN
  // -------------------------------------------------------------------------

  /**
   * Get media changes since a given update sequence number (USN) for sync.
   */
  async getMediaChanges(userId: string, sinceUSN: number): Promise<MediaChange[]> {
    const result = await this.pool.query(
      `SELECT media_id, change_type, usn
       FROM media_changes
       WHERE user_id = $1 AND usn > $2
       ORDER BY usn ASC`,
      [userId, sinceUSN]
    );

    return result.rows.map((row: MediaChangeRow) => ({
      mediaId: row.media_id,
      changeType: row.change_type,
      usn: row.usn,
    }));
  }

  // -------------------------------------------------------------------------
  // Storage usage
  // -------------------------------------------------------------------------

  /**
   * Get storage usage statistics for a user.
   */
  async getStorageUsage(userId: string): Promise<StorageUsage> {
    // Total size and count
    const totalsResult = await this.pool.query(
      `SELECT
        COALESCE(SUM(size_bytes), 0)::bigint as total_bytes,
        COUNT(*)::int as file_count
       FROM media
       WHERE user_id = $1`,
      [userId]
    );

    const totalBytes = parseInt(totalsResult.rows[0].total_bytes, 10);
    const fileCount = parseInt(totalsResult.rows[0].file_count, 10);

    // Breakdown by MIME type category
    const byTypeResult = await this.pool.query(
      `SELECT
        CASE
          WHEN mime_type LIKE 'image/%' THEN 'image'
          WHEN mime_type LIKE 'audio/%' THEN 'audio'
          WHEN mime_type LIKE 'video/%' THEN 'video'
          ELSE 'other'
        END as category,
        COALESCE(SUM(size_bytes), 0)::bigint as bytes
       FROM media
       WHERE user_id = $1
       GROUP BY category`,
      [userId]
    );

    const byType: Record<string, number> = {};
    for (const row of byTypeResult.rows) {
      byType[row.category] = parseInt(row.bytes, 10);
    }

    return { totalBytes, fileCount, byType };
  }

  // -------------------------------------------------------------------------
  // Serve file: get the file buffer for an HTTP response
  // -------------------------------------------------------------------------

  /**
   * Read the raw file buffer from disk for serving over HTTP.
   * Returns the buffer along with the MIME type for setting Content-Type.
   */
  async getFileBuffer(mediaId: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const media = await this.get(mediaId);
    const filePath = path.join(this.storagePath, media.filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found on disk: ${media.filename}`);
    }

    const buffer = await fs.promises.readFile(filePath);
    return { buffer, mimeType: media.mimeType, filename: media.originalFilename };
  }

  // -------------------------------------------------------------------------
  // Private: Record a sync change
  // -------------------------------------------------------------------------

  /**
   * Record a media change event for sync tracking.
   * Increments the user's USN and stores the change.
   */
  private async recordChange(
    client: PoolClient,
    mediaId: string,
    userId: string,
    changeType: 'added' | 'deleted'
  ): Promise<void> {
    // Get the next USN for this user (atomic increment)
    const usnResult = await client.query(
      `INSERT INTO user_sync_state (user_id, media_usn)
       VALUES ($1, 1)
       ON CONFLICT (user_id)
       DO UPDATE SET media_usn = user_sync_state.media_usn + 1
       RETURNING media_usn`,
      [userId]
    );

    const usn = usnResult.rows[0].media_usn;

    // Insert the change record
    await client.query(
      `INSERT INTO media_changes (media_id, user_id, change_type, usn)
       VALUES ($1, $2, $3, $4)`,
      [mediaId, userId, changeType, usn]
    );
  }
}
