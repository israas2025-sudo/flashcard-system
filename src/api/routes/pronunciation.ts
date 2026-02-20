// @ts-nocheck
/**
 * Pronunciation Routes
 *
 * Record, compare, and track pronunciation practice for language cards.
 * Supports audio file uploads, waveform comparison, and progress tracking.
 *
 * Routes:
 * - POST   /api/pronunciation/record            — Save a pronunciation recording (multipart)
 * - GET    /api/pronunciation/card/:cardId       — Get all recordings for a card
 * - POST   /api/pronunciation/compare            — Compare recorded vs reference waveforms
 * - GET    /api/pronunciation/progress/:language  — Get pronunciation progress for a language
 * - DELETE /api/pronunciation/:recordingId        — Delete a recording
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../../db/connection';
import { ApiError, requireFields, validateUUID, parseIntParam } from '../server';
import { authMiddleware } from '../../auth/middleware';
import { AuthService } from '../../auth/auth-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PronunciationRecordingRow {
  id: string;
  user_id: string;
  card_id: string;
  file_path: string;
  duration_ms: number;
  score: number | null;
  feedback: string | null;
  created_at: string;
}

interface ProgressSummary {
  language: string;
  total_recordings: string;
  avg_score: string;
  cards_practiced: string;
  best_score: string;
  recent_trend: string;
}

// ---------------------------------------------------------------------------
// Multer Configuration (audio uploads)
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || './uploads/pronunciation'
);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `recording-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        ApiError.badRequest(
          `Unsupported audio format: ${file.mimetype}. Allowed: ${allowedMimeTypes.join(', ')}`
        ) as unknown as null,
        false
      );
    }
  },
});

// ---------------------------------------------------------------------------
// Router Factory
// ---------------------------------------------------------------------------

/**
 * Create the pronunciation router.
 *
 * @param authService - The AuthService instance for token verification.
 * @returns Express Router with all pronunciation endpoints mounted.
 */
export function createPronunciationRouter(authService: AuthService): Router {
  const router = Router();
  const requireAuth = authMiddleware(authService);

  // -------------------------------------------------------------------------
  // POST /record — Save a pronunciation recording (multipart upload)
  // -------------------------------------------------------------------------

  router.post(
    '/record',
    requireAuth,
    upload.single('audio'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          throw ApiError.badRequest(
            'Audio file is required. Send as multipart/form-data with field name "audio".'
          );
        }

        const { cardId, durationMs } = req.body;

        if (!cardId) {
          throw ApiError.badRequest('cardId is required');
        }
        validateUUID(cardId, 'cardId');

        const duration = durationMs ? parseInt(durationMs, 10) : null;
        if (durationMs !== undefined && (isNaN(duration as number) || (duration as number) < 0)) {
          throw ApiError.badRequest('durationMs must be a non-negative integer');
        }

        // Verify the card exists
        const cardResult = await query(
          'SELECT id FROM cards WHERE id = $1',
          [cardId]
        );
        if (cardResult.rowCount === 0) {
          throw ApiError.notFound('Card');
        }

        // Save the recording record
        const recordingResult = await query(
          `INSERT INTO pronunciation_recordings
            (user_id, card_id, file_path, duration_ms, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING *`,
          [req.userId, cardId, req.file.path, duration]
        );

        res.status(201).json({
          data: { recording: recordingResult.rows[0] },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /card/:cardId — Get all recordings for a card
  // -------------------------------------------------------------------------

  router.get(
    '/card/:cardId',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { cardId } = req.params;
        validateUUID(cardId, 'cardId');

        // Verify card exists
        const cardResult = await query(
          'SELECT id FROM cards WHERE id = $1',
          [cardId]
        );
        if (cardResult.rowCount === 0) {
          throw ApiError.notFound('Card');
        }

        const result = await query(
          `SELECT *
           FROM pronunciation_recordings
           WHERE card_id = $1 AND user_id = $2
           ORDER BY created_at DESC`,
          [cardId, req.userId]
        );

        // Compute summary stats
        const recordings = result.rows;
        const scoredRecordings = recordings.filter(
          (r: PronunciationRecordingRow) => r.score !== null
        );
        const avgScore =
          scoredRecordings.length > 0
            ? scoredRecordings.reduce(
                (sum: number, r: PronunciationRecordingRow) => sum + (r.score || 0),
                0
              ) / scoredRecordings.length
            : null;

        res.json({
          data: {
            recordings,
            summary: {
              totalRecordings: recordings.length,
              averageScore: avgScore !== null ? Math.round(avgScore * 100) / 100 : null,
              bestScore: scoredRecordings.length > 0
                ? Math.max(...scoredRecordings.map((r: PronunciationRecordingRow) => r.score || 0))
                : null,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /compare — Compare recorded vs reference waveforms
  // -------------------------------------------------------------------------

  router.post(
    '/compare',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { recordingId, referenceId } = req.body;

        requireFields(req.body, ['recordingId']);
        validateUUID(recordingId, 'recordingId');

        // Fetch the user's recording
        const recordingResult = await query(
          `SELECT * FROM pronunciation_recordings
           WHERE id = $1 AND user_id = $2`,
          [recordingId, req.userId]
        );
        if (recordingResult.rowCount === 0) {
          throw ApiError.notFound('Recording');
        }

        const recording = recordingResult.rows[0];

        // Fetch the reference recording (either a provided ID or the card's reference)
        let reference: Record<string, unknown> | null = null;
        if (referenceId) {
          validateUUID(referenceId, 'referenceId');
          const refResult = await query(
            'SELECT * FROM pronunciation_references WHERE id = $1',
            [referenceId]
          );
          if (refResult.rowCount === 0) {
            throw ApiError.notFound('Reference recording');
          }
          reference = refResult.rows[0];
        } else {
          // Try to find a reference for the card
          const refResult = await query(
            'SELECT * FROM pronunciation_references WHERE card_id = $1 LIMIT 1',
            [recording.card_id]
          );
          if ((refResult.rowCount ?? 0) > 0) {
            reference = refResult.rows[0];
          }
        }

        if (!reference) {
          throw ApiError.notFound(
            'No reference recording found for this card. Provide a referenceId or add a reference for the card.'
          );
        }

        // Perform comparison (placeholder scoring logic --
        // in production this would call a speech analysis service)
        const score = Math.round(Math.random() * 40 + 60); // Placeholder: 60-100
        const feedback = generateFeedback(score);

        // Save the score to the recording
        await query(
          `UPDATE pronunciation_recordings
           SET score = $1, feedback = $2
           WHERE id = $3`,
          [score, feedback, recordingId]
        );

        res.json({
          data: {
            recordingId,
            referenceId: (reference as Record<string, unknown>).id,
            score,
            feedback,
            details: {
              accuracy: score,
              fluency: Math.max(0, score - Math.round(Math.random() * 10)),
              pronunciation: Math.max(0, score - Math.round(Math.random() * 15)),
            },
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /progress/:language — Get pronunciation progress for a language
  // -------------------------------------------------------------------------

  router.get(
    '/progress/:language',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { language } = req.params;

        if (!language || language.trim().length === 0) {
          throw ApiError.badRequest('language parameter is required');
        }

        // Get overall progress
        const progressResult = await query(
          `SELECT
             COUNT(*) as total_recordings,
             ROUND(AVG(pr.score)::numeric, 2) as avg_score,
             COUNT(DISTINCT pr.card_id) as cards_practiced,
             MAX(pr.score) as best_score
           FROM pronunciation_recordings pr
           INNER JOIN cards c ON pr.card_id = c.id
           INNER JOIN notes n ON c.note_id = n.id
           INNER JOIN note_tags nt ON n.id = nt.note_id
           INNER JOIN tags t ON nt.tag_id = t.id
           WHERE pr.user_id = $1
             AND t.name ILIKE $2
             AND pr.score IS NOT NULL`,
          [req.userId, `%${language}%`]
        );

        // Get recent trend (last 7 days vs previous 7 days)
        const trendResult = await query(
          `SELECT
             ROUND(AVG(pr.score) FILTER (
               WHERE pr.created_at >= NOW() - INTERVAL '7 days'
             )::numeric, 2) as recent_avg,
             ROUND(AVG(pr.score) FILTER (
               WHERE pr.created_at >= NOW() - INTERVAL '14 days'
                 AND pr.created_at < NOW() - INTERVAL '7 days'
             )::numeric, 2) as previous_avg
           FROM pronunciation_recordings pr
           INNER JOIN cards c ON pr.card_id = c.id
           INNER JOIN notes n ON c.note_id = n.id
           INNER JOIN note_tags nt ON n.id = nt.note_id
           INNER JOIN tags t ON nt.tag_id = t.id
           WHERE pr.user_id = $1
             AND t.name ILIKE $2
             AND pr.score IS NOT NULL`,
          [req.userId, `%${language}%`]
        );

        // Get daily breakdown for the last 30 days
        const dailyResult = await query(
          `SELECT
             DATE(pr.created_at) as date,
             COUNT(*) as recordings,
             ROUND(AVG(pr.score)::numeric, 2) as avg_score
           FROM pronunciation_recordings pr
           INNER JOIN cards c ON pr.card_id = c.id
           INNER JOIN notes n ON c.note_id = n.id
           INNER JOIN note_tags nt ON n.id = nt.note_id
           INNER JOIN tags t ON nt.tag_id = t.id
           WHERE pr.user_id = $1
             AND t.name ILIKE $2
             AND pr.created_at >= NOW() - INTERVAL '30 days'
             AND pr.score IS NOT NULL
           GROUP BY DATE(pr.created_at)
           ORDER BY date DESC`,
          [req.userId, `%${language}%`]
        );

        const progress = progressResult.rows[0];
        const trend = trendResult.rows[0];

        const recentAvg = parseFloat(trend?.recent_avg) || 0;
        const previousAvg = parseFloat(trend?.previous_avg) || 0;
        let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
        if (recentAvg > previousAvg + 2) trendDirection = 'improving';
        else if (recentAvg < previousAvg - 2) trendDirection = 'declining';

        res.json({
          data: {
            language,
            totalRecordings: parseInt(progress?.total_recordings) || 0,
            averageScore: parseFloat(progress?.avg_score) || 0,
            cardsPracticed: parseInt(progress?.cards_practiced) || 0,
            bestScore: parseFloat(progress?.best_score) || 0,
            trend: trendDirection,
            recentAverage: recentAvg,
            previousAverage: previousAvg,
            dailyBreakdown: dailyResult.rows,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // DELETE /:recordingId — Delete a recording
  // -------------------------------------------------------------------------

  router.delete(
    '/:recordingId',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { recordingId } = req.params;
        validateUUID(recordingId, 'recordingId');

        const result = await query(
          `DELETE FROM pronunciation_recordings
           WHERE id = $1 AND user_id = $2
           RETURNING id, file_path`,
          [recordingId, req.userId]
        );

        if (result.rowCount === 0) {
          throw ApiError.notFound('Recording');
        }

        // Note: In production, also delete the file from disk/object storage.
        // const filePath = result.rows[0].file_path;
        // await fs.unlink(filePath).catch(() => {});

        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate human-readable feedback based on a pronunciation score.
 */
function generateFeedback(score: number): string {
  if (score >= 90) return 'Excellent pronunciation! Very close to native.';
  if (score >= 75) return 'Good pronunciation. Minor areas for improvement.';
  if (score >= 60) return 'Fair pronunciation. Keep practicing the highlighted sounds.';
  return 'Needs improvement. Try listening to the reference again and focus on individual sounds.';
}
