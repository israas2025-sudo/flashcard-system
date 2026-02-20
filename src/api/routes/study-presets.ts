// @ts-nocheck
/**
 * Study Presets Routes
 *
 * CRUD operations and study session management for study presets
 * (Section 2.4 "Smart Study"). Presets combine deck, tag, state,
 * and difficulty filters into a reusable configuration that can
 * be pinned to the dashboard for quick access.
 *
 * Routes:
 * - GET    /api/study-presets              — List user's presets (with card counts)
 * - POST   /api/study-presets              — Create a preset
 * - PUT    /api/study-presets/:id          — Update a preset
 * - DELETE /api/study-presets/:id          — Delete a preset
 * - PATCH  /api/study-presets/:id/pin      — Toggle pin status
 * - GET    /api/study-presets/:id/count    — Get matching card count
 * - POST   /api/study-presets/:id/study    — Start study session from preset
 * - GET    /api/study-presets/built-in     — Get built-in presets
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError, requireFields, validateUUID } from '../server';
import { authMiddleware } from '../../auth/middleware';
import { AuthService } from '../../auth/auth-service';

// ---------------------------------------------------------------------------
// Router Factory
// ---------------------------------------------------------------------------

/**
 * Create the study presets router.
 *
 * @param authService - The AuthService instance for token verification.
 * @returns Express Router with all study preset endpoints mounted.
 */
export function createStudyPresetsRouter(authService: AuthService): Router {
  const router = Router();
  const requireAuth = authMiddleware(authService);

  // All study preset routes require authentication
  router.use(requireAuth);

  // Lazy-load the service to avoid circular dependency issues at import time
  let _service: any = null;
  function getService() {
    if (!_service) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { StudyPresetService } = require('../../study-presets');
      _service = new StudyPresetService();
    }
    return _service;
  }

  // -------------------------------------------------------------------------
  // GET /built-in — Get built-in presets
  // (Must be defined BEFORE /:id routes to avoid param collision)
  // -------------------------------------------------------------------------

  router.get(
    '/built-in',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const presets = await service.getBuiltInPresets(req.userId!);

        res.json({
          data: { presets },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET / — List user's presets (with card counts)
  // -------------------------------------------------------------------------

  router.get(
    '/',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const presets = await service.getUserPresets(req.userId!);

        res.json({
          data: { presets },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST / — Create a preset
  // -------------------------------------------------------------------------

  router.post(
    '/',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const { name, tagFilter, deckFilter, stateFilter, isPinned } = req.body;

        requireFields(req.body, ['name']);

        if (typeof name !== 'string' || name.trim().length === 0) {
          throw ApiError.badRequest('Preset name cannot be empty');
        }

        if (name.trim().length > 200) {
          throw ApiError.badRequest('Preset name cannot exceed 200 characters');
        }

        // Validate arrays
        if (tagFilter !== undefined && !Array.isArray(tagFilter)) {
          throw ApiError.badRequest('tagFilter must be an array of tag IDs');
        }
        if (deckFilter !== undefined && !Array.isArray(deckFilter)) {
          throw ApiError.badRequest('deckFilter must be an array of deck IDs');
        }

        const preset = await service.createPreset(req.userId!, {
          name: name.trim(),
          tagFilter: tagFilter || [],
          deckFilter: deckFilter || [],
          stateFilter: stateFilter || undefined,
          isPinned: isPinned || false,
        });

        res.status(201).json({
          data: { preset },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
          next(ApiError.conflict(err.message));
        } else {
          next(err);
        }
      }
    }
  );

  // -------------------------------------------------------------------------
  // PUT /:id — Update a preset
  // -------------------------------------------------------------------------

  router.put(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const { id } = req.params;
        validateUUID(id, 'id');

        const { name, tagFilter, deckFilter, stateFilter, isPinned } = req.body;

        if (
          name === undefined &&
          tagFilter === undefined &&
          deckFilter === undefined &&
          stateFilter === undefined &&
          isPinned === undefined
        ) {
          throw ApiError.badRequest('At least one field must be provided for update');
        }

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
          throw ApiError.badRequest('Preset name cannot be empty');
        }

        if (tagFilter !== undefined && !Array.isArray(tagFilter)) {
          throw ApiError.badRequest('tagFilter must be an array of tag IDs');
        }

        if (deckFilter !== undefined && !Array.isArray(deckFilter)) {
          throw ApiError.badRequest('deckFilter must be an array of deck IDs');
        }

        const preset = await service.updatePreset(id, {
          name,
          tagFilter,
          deckFilter,
          stateFilter,
          isPinned,
        });

        res.json({
          data: { preset },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          next(ApiError.notFound('Preset'));
        } else if (err instanceof Error && err.message.includes('already exists')) {
          next(ApiError.conflict(err.message));
        } else {
          next(err);
        }
      }
    }
  );

  // -------------------------------------------------------------------------
  // DELETE /:id — Delete a preset
  // -------------------------------------------------------------------------

  router.delete(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const { id } = req.params;
        validateUUID(id, 'id');

        await service.deletePreset(id);

        res.status(204).send();
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          next(ApiError.notFound('Preset'));
        } else {
          next(err);
        }
      }
    }
  );

  // -------------------------------------------------------------------------
  // PATCH /:id/pin — Toggle pin status
  // -------------------------------------------------------------------------

  router.patch(
    '/:id/pin',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const { id } = req.params;
        validateUUID(id, 'id');

        // If pinned is provided, use it; otherwise toggle
        const { pinned } = req.body;

        if (pinned !== undefined && typeof pinned !== 'boolean') {
          throw ApiError.badRequest('pinned must be a boolean value');
        }

        await service.pinPreset(id, pinned);

        res.json({
          data: {
            presetId: id,
            isPinned: pinned,
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          next(ApiError.notFound('Preset'));
        } else {
          next(err);
        }
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /:id/count — Get matching card count
  // -------------------------------------------------------------------------

  router.get(
    '/:id/count',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const { id } = req.params;
        validateUUID(id, 'id');

        const count = await service.getPresetCardCount(id);

        res.json({
          data: {
            presetId: id,
            cardCount: count,
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          next(ApiError.notFound('Preset'));
        } else {
          next(err);
        }
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /:id/study — Start study session from preset
  // -------------------------------------------------------------------------

  router.post(
    '/:id/study',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const service = getService();
        const { id } = req.params;
        validateUUID(id, 'id');

        const session = await service.startPresetStudySession(req.userId!, id);

        res.json({
          data: {
            session: {
              presetId: session.presetId,
              cardCount: session.cards.length,
              totalMatching: session.totalMatching,
              cards: session.cards,
            },
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          next(ApiError.notFound('Preset'));
        } else if (err instanceof Error && err.message.includes('does not belong')) {
          next(ApiError.forbidden(err.message));
        } else {
          next(err);
        }
      }
    }
  );

  return router;
}

