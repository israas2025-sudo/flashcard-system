// @ts-nocheck
/**
 * Media Routes
 *
 * API routes for media file management: uploading, retrieving, deleting,
 * listing, cleanup, and storage usage statistics.
 *
 * Routes:
 * - POST   /api/media/upload   — Multipart file upload
 * - POST   /api/media/paste    — Clipboard paste upload (base64)
 * - POST   /api/media/url      — Upload from URL
 * - GET    /api/media/:id      — Get/serve media file
 * - GET    /api/media/:id/info — Get media metadata
 * - DELETE /api/media/:id      — Delete media
 * - GET    /api/media          — List user media (paginated)
 * - POST   /api/media/cleanup  — Delete unused media
 * - GET    /api/media/usage    — Storage usage stats
 * - GET    /api/media/changes  — Sync: get media changes since USN
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../../db/connection';
import { ApiError, validateUUID, parseIntParam } from '../server';
import { MediaService } from '../../media/media-service';
import { ALL_SUPPORTED_TYPES, MAX_FILE_SIZE_BYTES } from '../../media/types';

export const mediaRouter = Router();

// ---------------------------------------------------------------------------
// Initialize MediaService
// ---------------------------------------------------------------------------

const storagePath = process.env.MEDIA_STORAGE_PATH || './storage/media';
const baseUrl = process.env.MEDIA_BASE_URL || '/api';

function getMediaService(): MediaService {
  return new MediaService(getPool(), storagePath, baseUrl);
}

// ---------------------------------------------------------------------------
// Middleware: Extract userId from request
// (In production this would come from auth middleware; here we use a header)
// ---------------------------------------------------------------------------

function getUserId(req: Request): string {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    throw ApiError.unauthorized('Missing x-user-id header');
  }
  validateUUID(userId, 'x-user-id');
  return userId;
}

// ---------------------------------------------------------------------------
// Middleware: Parse multipart body for file upload
// Reads raw body chunks and parses the multipart boundary.
// ---------------------------------------------------------------------------

interface ParsedMultipartFile {
  fieldName: string;
  filename: string;
  mimeType: string;
  data: Buffer;
}

function parseMultipartBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/);
  return match ? (match[1] || match[2]) : null;
}

function parseMultipartBody(body: Buffer, boundary: string): ParsedMultipartFile[] {
  const files: ParsedMultipartFile[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundary = Buffer.from(`--${boundary}--`);

  // Split body on boundary
  let start = 0;
  const parts: Buffer[] = [];

  while (true) {
    const idx = body.indexOf(boundaryBuffer, start);
    if (idx === -1) break;
    if (start > 0) {
      // The part is between previous boundary and current one
      // Remove the trailing \r\n before the boundary
      let end = idx;
      if (body[end - 2] === 0x0d && body[end - 1] === 0x0a) {
        end -= 2;
      }
      parts.push(body.slice(start, end));
    }
    start = idx + boundaryBuffer.length;
    // Skip past \r\n after boundary
    if (body[start] === 0x0d && body[start + 1] === 0x0a) {
      start += 2;
    }
    // Check if this is the end boundary
    if (body.indexOf(endBoundary, idx) === idx) break;
  }

  for (const part of parts) {
    // Find the header/body separator (double CRLF)
    const separatorIdx = part.indexOf('\r\n\r\n');
    if (separatorIdx === -1) continue;

    const headerSection = part.slice(0, separatorIdx).toString('utf-8');
    const bodySection = part.slice(separatorIdx + 4);

    // Parse Content-Disposition header
    const dispositionMatch = headerSection.match(
      /Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i
    );
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    if (!filename) continue; // Skip non-file fields

    // Parse Content-Type header
    const contentTypeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
    const mimeType = contentTypeMatch
      ? contentTypeMatch[1].trim()
      : 'application/octet-stream';

    files.push({ fieldName, filename, mimeType, data: bodySection });
  }

  return files;
}

// ---------------------------------------------------------------------------
// POST /api/media/upload — Multipart file upload
// ---------------------------------------------------------------------------

mediaRouter.post(
  '/upload',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const service = getMediaService();

      const contentType = req.headers['content-type'] || '';

      // Handle multipart/form-data
      if (contentType.includes('multipart/form-data')) {
        const boundary = parseMultipartBoundary(contentType);
        if (!boundary) {
          throw ApiError.badRequest('Invalid multipart content-type: missing boundary');
        }

        // Collect raw body
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', resolve);
          req.on('error', reject);
        });
        const rawBody = Buffer.concat(chunks);

        if (rawBody.length > MAX_FILE_SIZE_BYTES) {
          throw ApiError.badRequest(
            `File exceeds maximum size of ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB`
          );
        }

        const files = parseMultipartBody(rawBody, boundary);
        if (files.length === 0) {
          throw ApiError.badRequest('No file found in upload. Send file in a "file" form field.');
        }

        const file = files[0];
        const media = await service.upload(userId, file.data, file.filename, file.mimeType);

        res.status(201).json({ data: { media } });
        return;
      }

      // Handle application/octet-stream with filename in header
      if (contentType.includes('application/octet-stream')) {
        const filename = (req.headers['x-filename'] as string) || 'upload';
        const mimeType = (req.headers['x-mime-type'] as string) || 'application/octet-stream';

        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', resolve);
          req.on('error', reject);
        });
        const buffer = Buffer.concat(chunks);

        if (buffer.length === 0) {
          throw ApiError.badRequest('Empty request body');
        }

        const media = await service.upload(userId, buffer, filename, mimeType);
        res.status(201).json({ data: { media } });
        return;
      }

      throw ApiError.badRequest(
        'Unsupported Content-Type. Use multipart/form-data or application/octet-stream.'
      );
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/media/paste — Clipboard paste upload (base64)
// ---------------------------------------------------------------------------

mediaRouter.post(
  '/paste',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const service = getMediaService();

      const { base64Data, mimeType } = req.body;

      if (!base64Data || typeof base64Data !== 'string') {
        throw ApiError.badRequest('Missing required field: base64Data (string)');
      }

      if (!mimeType || typeof mimeType !== 'string') {
        throw ApiError.badRequest('Missing required field: mimeType (string)');
      }

      const media = await service.uploadFromPaste(userId, base64Data, mimeType);
      res.status(201).json({ data: { media } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/media/url — Upload from URL
// ---------------------------------------------------------------------------

mediaRouter.post(
  '/url',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const service = getMediaService();

      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        throw ApiError.badRequest('Missing required field: url (string)');
      }

      const media = await service.uploadFromUrl(userId, url);
      res.status(201).json({ data: { media } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/media/usage — Storage usage stats
// (Must be defined before /:id to avoid matching "usage" as an ID)
// ---------------------------------------------------------------------------

mediaRouter.get(
  '/usage',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const service = getMediaService();

      const usage = await service.getStorageUsage(userId);

      res.json({
        data: {
          usage,
          formattedTotal: formatBytes(usage.totalBytes),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/media/changes — Sync: get media changes since USN
// ---------------------------------------------------------------------------

mediaRouter.get(
  '/changes',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const service = getMediaService();

      const sinceUSN = parseIntParam(req.query.sinceUSN as string, 0, 'sinceUSN');
      const changes = await service.getMediaChanges(userId, sinceUSN);

      res.json({ data: { changes } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/media/cleanup — Delete unused media
// ---------------------------------------------------------------------------

mediaRouter.post(
  '/cleanup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const service = getMediaService();

      // Optionally preview what would be deleted (dry run)
      const dryRun = req.query.dryRun === 'true';

      if (dryRun) {
        const unusedMedia = await service.findUnused(userId);
        res.json({
          data: {
            dryRun: true,
            unusedCount: unusedMedia.length,
            unusedMedia,
          },
        });
        return;
      }

      const deletedCount = await service.cleanupUnused(userId);

      res.json({
        data: {
          dryRun: false,
          deletedCount,
          message: `Deleted ${deletedCount} unused media file(s)`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/media — List user media (paginated)
// ---------------------------------------------------------------------------

mediaRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const service = getMediaService();

      const page = parseIntParam(req.query.page as string, 1, 'page');
      const pageSize = parseIntParam(req.query.pageSize as string, 20, 'pageSize');

      const result = await service.getUserMedia(userId, page, pageSize);

      res.json({
        data: {
          media: result.media,
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/media/:id — Serve/download media file
// ---------------------------------------------------------------------------

mediaRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      const service = getMediaService();

      // Check if client wants metadata or the actual file
      const accept = req.headers.accept || '';
      const wantsJson = accept.includes('application/json');

      if (wantsJson) {
        // Return metadata
        const media = await service.get(id);
        res.json({ data: { media } });
        return;
      }

      // Serve the actual file
      const { buffer, mimeType, filename } = await service.getFileBuffer(id);

      res.set({
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/media/:id — Delete media
// ---------------------------------------------------------------------------

mediaRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');
      getUserId(req); // Ensure authenticated

      const service = getMediaService();
      await service.delete(id);

      res.json({
        data: { deleted: true, mediaId: id },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Helper: Format bytes for human display
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
