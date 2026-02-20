// @ts-nocheck
/**
 * Sync Routes
 *
 * API endpoints for the USN-based cloud sync system.
 * Handles incremental sync, full sync, change recording, and status queries.
 *
 * Routes:
 *   POST /api/sync                — Perform an incremental sync
 *   POST /api/sync/full           — Force a full sync (upload or download)
 *   GET  /api/sync/status         — Get current sync status for the user
 *   GET  /api/sync/changes        — Get local changes since a given USN
 *   POST /api/sync/record-change  — Record a local change for sync tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SyncService } from '../../sync/sync-service';
import { ApiError, requireFields, validateUUID } from '../server';
import type { SyncEntityType } from '../../sync/types';

export const syncRouter = Router();

const syncService = new SyncService();

// ---------------------------------------------------------------------------
// Middleware: Extract userId from request
// ---------------------------------------------------------------------------

/**
 * Extract and validate the userId from the request.
 * In a real application this would come from the authenticated session/token.
 * For now we accept it as a header or query parameter.
 */
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
// POST /api/sync — Perform incremental sync
// ---------------------------------------------------------------------------

syncRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      // Check if full sync is needed
      const needsFull = await syncService.needsFullSync(userId);
      if (needsFull) {
        res.status(409).json({
          error: {
            code: 'FULL_SYNC_REQUIRED',
            message: 'Full sync is required. Schema version mismatch or first-time sync.',
          },
          data: {
            needsFullSync: true,
          },
        });
        return;
      }

      const result = await syncService.incrementalSync(userId);

      res.json({
        data: {
          success: result.success,
          sentChanges: result.sentChanges,
          receivedChanges: result.receivedChanges,
          conflicts: result.conflicts,
          newUSN: result.newUSN,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/sync/full — Force a full sync (upload or download)
// ---------------------------------------------------------------------------

syncRouter.post(
  '/full',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      requireFields(req.body, ['direction']);

      const { direction } = req.body;

      if (direction !== 'upload' && direction !== 'download') {
        throw ApiError.badRequest('direction must be "upload" or "download"');
      }

      const result = await syncService.fullSync(userId, direction);

      res.json({
        data: {
          success: result.success,
          sentChanges: result.sentChanges,
          receivedChanges: result.receivedChanges,
          conflicts: result.conflicts,
          newUSN: result.newUSN,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/sync/status — Get sync status
// ---------------------------------------------------------------------------

syncRouter.get(
  '/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const status = await syncService.getSyncStatus(userId);

      res.json({
        data: {
          lastSyncAt: status.lastSyncAt,
          localUSN: status.localUSN,
          serverUSN: status.serverUSN,
          pendingChanges: status.pendingChanges,
          isSyncing: status.isSyncing,
          needsFullSync: await syncService.needsFullSync(userId),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/sync/changes — Get local changes since a given USN
// ---------------------------------------------------------------------------

syncRouter.get(
  '/changes',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      const sinceUSN = parseInt(req.query.sinceUSN as string, 10);
      if (isNaN(sinceUSN) || sinceUSN < 0) {
        throw ApiError.badRequest('sinceUSN must be a non-negative integer');
      }

      const changeset = await syncService.getChangesSince(userId, sinceUSN);

      res.json({
        data: {
          usn: changeset.usn,
          notes: changeset.notes.length,
          cards: changeset.cards.length,
          decks: changeset.decks.length,
          tags: changeset.tags.length,
          noteTypes: changeset.noteTypes.length,
          deletedIds: changeset.deletedIds.length,
          changeset,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/sync/record-change — Record a local change
// ---------------------------------------------------------------------------

syncRouter.post(
  '/record-change',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      requireFields(req.body, ['entityType', 'entityId', 'changeType']);

      const { entityType, entityId, changeType } = req.body;

      // Validate entityType
      const validEntityTypes: SyncEntityType[] = [
        'note', 'card', 'deck', 'tag', 'note_type', 'media',
      ];
      if (!validEntityTypes.includes(entityType)) {
        throw ApiError.badRequest(
          `entityType must be one of: ${validEntityTypes.join(', ')}`,
        );
      }

      // Validate changeType
      const validChangeTypes = ['create', 'update', 'delete'];
      if (!validChangeTypes.includes(changeType)) {
        throw ApiError.badRequest(
          `changeType must be one of: ${validChangeTypes.join(', ')}`,
        );
      }

      validateUUID(entityId, 'entityId');

      await syncService.recordChange(userId, entityType, entityId, changeType);

      const newUSN = await syncService.getLocalUSN(userId);

      res.status(201).json({
        data: {
          recorded: true,
          localUSN: newUSN,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/sync/apply — Apply remote changes (server -> client push)
// ---------------------------------------------------------------------------

syncRouter.post(
  '/apply',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      requireFields(req.body, ['changeset']);

      const { changeset } = req.body;

      // Validate changeset structure
      if (!changeset || typeof changeset !== 'object') {
        throw ApiError.badRequest('changeset must be a valid SyncChangeset object');
      }

      if (typeof changeset.usn !== 'number') {
        throw ApiError.badRequest('changeset.usn must be a number');
      }

      const result = await syncService.applyRemoteChanges(userId, changeset);

      res.json({
        data: {
          success: result.success,
          receivedChanges: result.receivedChanges,
          conflicts: result.conflicts,
          newUSN: result.newUSN,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
