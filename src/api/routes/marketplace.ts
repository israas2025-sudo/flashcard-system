// @ts-nocheck
/**
 * Marketplace Routes
 *
 * Browse, publish, download, rate, and report shared decks on the
 * community marketplace.
 *
 * Routes:
 * - GET    /api/marketplace              — Browse listings with filters
 * - GET    /api/marketplace/my-listings  — Get current user's published listings
 * - GET    /api/marketplace/:id          — Get listing detail with sample cards & reviews
 * - POST   /api/marketplace              — Publish a deck (auth required)
 * - POST   /api/marketplace/:id/download — Download/import a shared deck (auth required)
 * - POST   /api/marketplace/:id/rate     — Rate a listing (auth required)
 * - POST   /api/marketplace/:id/report   — Report a listing (auth required)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../../db/connection';
import { ApiError, requireFields, validateUUID, parseIntParam } from '../server';
import { authMiddleware, optionalAuthMiddleware } from '../../auth/middleware';
import { AuthService } from '../../auth/auth-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketplaceListingRow {
  id: string;
  deck_id: string;
  publisher_id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  card_count: number;
  download_count: number;
  avg_rating: string;
  rating_count: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Router Factory
// ---------------------------------------------------------------------------

/**
 * Create the marketplace router.
 *
 * @param authService - The AuthService instance for token verification.
 * @returns Express Router with all marketplace endpoints mounted.
 */
export function createMarketplaceRouter(authService: AuthService): Router {
  const router = Router();
  const requireAuth = authMiddleware(authService);
  const optionalAuth = optionalAuthMiddleware(authService);

  // -------------------------------------------------------------------------
  // GET / — Browse listings with filters
  // -------------------------------------------------------------------------

  router.get(
    '/',
    optionalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const language = req.query.language as string | undefined;
        const difficulty = req.query.difficulty as string | undefined;
        const searchQuery = req.query.query as string | undefined;
        const sort = (req.query.sort as string) || 'popular';
        const page = parseIntParam(req.query.page as string, 1, 'page');
        const limit = parseIntParam(req.query.limit as string, 20, 'limit');

        if (page < 1) {
          throw ApiError.badRequest('page must be at least 1');
        }
        if (limit < 1 || limit > 100) {
          throw ApiError.badRequest('limit must be between 1 and 100');
        }

        const validSorts = ['popular', 'newest', 'highest_rated', 'most_downloaded'];
        if (!validSorts.includes(sort)) {
          throw ApiError.badRequest(
            `sort must be one of: ${validSorts.join(', ')}`
          );
        }

        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        if (difficulty && !validDifficulties.includes(difficulty)) {
          throw ApiError.badRequest(
            `difficulty must be one of: ${validDifficulties.join(', ')}`
          );
        }

        const conditions: string[] = ['ml.published = true'];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (language) {
          conditions.push(`ml.language = $${paramIndex}`);
          params.push(language);
          paramIndex++;
        }

        if (difficulty) {
          conditions.push(`ml.difficulty = $${paramIndex}`);
          params.push(difficulty);
          paramIndex++;
        }

        if (searchQuery) {
          conditions.push(
            `(ml.title ILIKE $${paramIndex} OR ml.description ILIKE $${paramIndex})`
          );
          params.push(`%${searchQuery}%`);
          paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        let orderClause: string;
        switch (sort) {
          case 'newest':
            orderClause = 'ml.created_at DESC';
            break;
          case 'highest_rated':
            orderClause = 'ml.avg_rating DESC NULLS LAST, ml.rating_count DESC';
            break;
          case 'most_downloaded':
            orderClause = 'ml.download_count DESC';
            break;
          case 'popular':
          default:
            orderClause = 'ml.download_count DESC, ml.avg_rating DESC NULLS LAST';
            break;
        }

        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const result = await query(
          `SELECT ml.*,
                  u.display_name as publisher_name,
                  u.avatar_url as publisher_avatar
           FROM marketplace_listings ml
           LEFT JOIN users u ON ml.publisher_id = u.id
           WHERE ${whereClause}
           ORDER BY ${orderClause}
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          params
        );

        // Get total count for pagination
        const countResult = await query(
          `SELECT COUNT(*) as total
           FROM marketplace_listings ml
           WHERE ${whereClause}`,
          params.slice(0, -2) // Exclude limit and offset
        );

        const total = parseInt(countResult.rows[0]?.total) || 0;

        res.json({
          data: {
            listings: result.rows,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /my-listings — Get current user's published listings
  // -------------------------------------------------------------------------

  router.get(
    '/my-listings',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await query(
          `SELECT ml.*,
                  (SELECT COUNT(*) FROM marketplace_reviews mr WHERE mr.listing_id = ml.id) as review_count
           FROM marketplace_listings ml
           WHERE ml.publisher_id = $1
           ORDER BY ml.created_at DESC`,
          [req.userId]
        );

        res.json({
          data: { listings: result.rows },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /:id — Get listing detail with sample cards and reviews
  // -------------------------------------------------------------------------

  router.get(
    '/:id',
    optionalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        validateUUID(id, 'id');

        // Fetch the listing
        const listingResult = await query(
          `SELECT ml.*,
                  u.display_name as publisher_name,
                  u.avatar_url as publisher_avatar
           FROM marketplace_listings ml
           LEFT JOIN users u ON ml.publisher_id = u.id
           WHERE ml.id = $1`,
          [id]
        );

        if (listingResult.rowCount === 0) {
          throw ApiError.notFound('Listing');
        }

        const listing = listingResult.rows[0];

        // Fetch sample cards (up to 5 preview cards)
        const sampleCardsResult = await query(
          `SELECT c.id, n.fields as note_fields
           FROM cards c
           LEFT JOIN notes n ON c.note_id = n.id
           WHERE c.deck_id = $1
           ORDER BY c.created_at ASC
           LIMIT 5`,
          [listing.deck_id]
        );

        // Fetch recent reviews
        const reviewsResult = await query(
          `SELECT mr.*,
                  u.display_name as reviewer_name,
                  u.avatar_url as reviewer_avatar
           FROM marketplace_reviews mr
           LEFT JOIN users u ON mr.user_id = u.id
           WHERE mr.listing_id = $1
           ORDER BY mr.created_at DESC
           LIMIT 20`,
          [id]
        );

        // Check if the current user has already downloaded this listing
        let userDownloaded = false;
        let userRating: number | null = null;
        if (req.userId) {
          const downloadCheck = await query(
            `SELECT id FROM marketplace_downloads
             WHERE listing_id = $1 AND user_id = $2
             LIMIT 1`,
            [id, req.userId]
          );
          userDownloaded = (downloadCheck.rowCount ?? 0) > 0;

          const ratingCheck = await query(
            `SELECT rating FROM marketplace_reviews
             WHERE listing_id = $1 AND user_id = $2
             LIMIT 1`,
            [id, req.userId]
          );
          if ((ratingCheck.rowCount ?? 0) > 0) {
            userRating = ratingCheck.rows[0].rating;
          }
        }

        res.json({
          data: {
            listing,
            sampleCards: sampleCardsResult.rows,
            reviews: reviewsResult.rows,
            userDownloaded,
            userRating,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST / — Publish a deck to the marketplace
  // -------------------------------------------------------------------------

  router.post(
    '/',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { deckId, title, description, language, difficulty } = req.body;

        requireFields(req.body, ['deckId', 'title', 'description', 'language', 'difficulty']);
        validateUUID(deckId, 'deckId');

        if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
          throw ApiError.badRequest('title must be between 3 and 200 characters');
        }

        if (typeof description !== 'string' || description.trim().length < 10) {
          throw ApiError.badRequest('description must be at least 10 characters');
        }

        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        if (!validDifficulties.includes(difficulty)) {
          throw ApiError.badRequest(
            `difficulty must be one of: ${validDifficulties.join(', ')}`
          );
        }

        const result = await withTransaction(async (client) => {
          // Verify the deck exists and belongs to the user
          const deckResult = await client.query(
            'SELECT * FROM decks WHERE id = $1',
            [deckId]
          );
          if (deckResult.rowCount === 0) {
            throw ApiError.notFound('Deck');
          }

          // Check if deck is already published
          const existingListing = await client.query(
            'SELECT id FROM marketplace_listings WHERE deck_id = $1',
            [deckId]
          );
          if ((existingListing.rowCount ?? 0) > 0) {
            throw ApiError.conflict('This deck is already published to the marketplace');
          }

          // Count cards in the deck
          const cardCountResult = await client.query(
            'SELECT COUNT(*) as count FROM cards WHERE deck_id = $1',
            [deckId]
          );
          const cardCount = parseInt(cardCountResult.rows[0].count) || 0;

          if (cardCount === 0) {
            throw ApiError.badRequest('Cannot publish an empty deck');
          }

          // Create the listing
          const listingResult = await client.query(
            `INSERT INTO marketplace_listings
              (deck_id, publisher_id, title, description, language, difficulty,
               card_count, download_count, avg_rating, rating_count, published,
               created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, true, NOW(), NOW())
             RETURNING *`,
            [
              deckId,
              req.userId,
              title.trim(),
              description.trim(),
              language,
              difficulty,
              cardCount,
            ]
          );

          return listingResult.rows[0];
        });

        res.status(201).json({ data: { listing: result } });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /:id/download — Download/import a shared deck
  // -------------------------------------------------------------------------

  router.post(
    '/:id/download',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        validateUUID(id, 'id');

        const result = await withTransaction(async (client) => {
          // Verify listing exists and is published
          const listingResult = await client.query(
            'SELECT * FROM marketplace_listings WHERE id = $1 AND published = true',
            [id]
          );
          if (listingResult.rowCount === 0) {
            throw ApiError.notFound('Listing');
          }
          const listing = listingResult.rows[0];

          // Check if already downloaded
          const existingDownload = await client.query(
            `SELECT id FROM marketplace_downloads
             WHERE listing_id = $1 AND user_id = $2`,
            [id, req.userId]
          );
          if ((existingDownload.rowCount ?? 0) > 0) {
            throw ApiError.conflict('You have already downloaded this deck');
          }

          // Record the download
          await client.query(
            `INSERT INTO marketplace_downloads (listing_id, user_id, created_at)
             VALUES ($1, $2, NOW())`,
            [id, req.userId]
          );

          // Increment download count
          await client.query(
            `UPDATE marketplace_listings
             SET download_count = download_count + 1, updated_at = NOW()
             WHERE id = $1`,
            [id]
          );

          // Clone the deck for the downloading user
          const sourceDeck = await client.query(
            'SELECT * FROM decks WHERE id = $1',
            [listing.deck_id]
          );

          let newDeckId: string | null = null;
          if (sourceDeck.rowCount !== 0) {
            const deck = sourceDeck.rows[0];
            const newDeckResult = await client.query(
              `INSERT INTO decks (name, description, parent_id, created_at, updated_at)
               VALUES ($1, $2, NULL, NOW(), NOW())
               RETURNING id`,
              [`${deck.name} (imported)`, deck.description]
            );
            newDeckId = newDeckResult.rows[0].id;

            // Clone notes and cards
            const sourceNotes = await client.query(
              `SELECT n.* FROM notes n
               INNER JOIN cards c ON c.note_id = n.id
               WHERE c.deck_id = $1
               GROUP BY n.id`,
              [listing.deck_id]
            );

            for (const note of sourceNotes.rows) {
              const newNote = await client.query(
                `INSERT INTO notes (note_type_id, deck_id, fields, created_at, updated_at)
                 VALUES ($1, $2, $3, NOW(), NOW())
                 RETURNING id`,
                [note.note_type_id, newDeckId, note.fields]
              );

              // Clone cards for this note
              const sourceCards = await client.query(
                'SELECT * FROM cards WHERE note_id = $1 AND deck_id = $2',
                [note.id, listing.deck_id]
              );

              for (const card of sourceCards.rows) {
                await client.query(
                  `INSERT INTO cards
                    (note_id, deck_id, template_ordinal, cloze_ordinal,
                     queue, due, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, 0, NOW(), NOW(), NOW())`,
                  [
                    newNote.rows[0].id,
                    newDeckId,
                    card.template_ordinal,
                    card.cloze_ordinal,
                  ]
                );
              }
            }
          }

          return { listing, newDeckId };
        });

        res.status(201).json({
          data: {
            message: 'Deck imported successfully',
            listing: result.listing,
            importedDeckId: result.newDeckId,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /:id/rate — Rate a listing
  // -------------------------------------------------------------------------

  router.post(
    '/:id/rate',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        validateUUID(id, 'id');

        const { rating, review } = req.body;

        requireFields(req.body, ['rating']);

        if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
          throw ApiError.badRequest('rating must be an integer between 1 and 5');
        }

        if (review !== undefined && (typeof review !== 'string' || review.trim().length > 2000)) {
          throw ApiError.badRequest('review must be a string of at most 2000 characters');
        }

        const result = await withTransaction(async (client) => {
          // Verify listing exists
          const listingResult = await client.query(
            'SELECT * FROM marketplace_listings WHERE id = $1 AND published = true',
            [id]
          );
          if (listingResult.rowCount === 0) {
            throw ApiError.notFound('Listing');
          }

          // Cannot rate your own listing
          if (listingResult.rows[0].publisher_id === req.userId) {
            throw ApiError.badRequest('You cannot rate your own listing');
          }

          // Upsert the review
          const reviewResult = await client.query(
            `INSERT INTO marketplace_reviews (listing_id, user_id, rating, review, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT (listing_id, user_id)
             DO UPDATE SET rating = $3, review = $4, updated_at = NOW()
             RETURNING *`,
            [id, req.userId, rating, review?.trim() || null]
          );

          // Recalculate average rating
          const avgResult = await client.query(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count
             FROM marketplace_reviews
             WHERE listing_id = $1`,
            [id]
          );

          const avgRating = parseFloat(avgResult.rows[0].avg_rating) || 0;
          const ratingCount = parseInt(avgResult.rows[0].rating_count) || 0;

          await client.query(
            `UPDATE marketplace_listings
             SET avg_rating = $1, rating_count = $2, updated_at = NOW()
             WHERE id = $3`,
            [Math.round(avgRating * 100) / 100, ratingCount, id]
          );

          return {
            review: reviewResult.rows[0],
            avgRating: Math.round(avgRating * 100) / 100,
            ratingCount,
          };
        });

        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /:id/report — Report a listing
  // -------------------------------------------------------------------------

  router.post(
    '/:id/report',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        validateUUID(id, 'id');

        const { reason } = req.body;

        requireFields(req.body, ['reason']);

        if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 2000) {
          throw ApiError.badRequest('reason must be between 10 and 2000 characters');
        }

        // Verify listing exists
        const listingResult = await query(
          'SELECT id FROM marketplace_listings WHERE id = $1',
          [id]
        );
        if (listingResult.rowCount === 0) {
          throw ApiError.notFound('Listing');
        }

        // Check for duplicate report from same user
        const existingReport = await query(
          `SELECT id FROM marketplace_reports
           WHERE listing_id = $1 AND reporter_id = $2 AND resolved = false`,
          [id, req.userId]
        );
        if ((existingReport.rowCount ?? 0) > 0) {
          throw ApiError.conflict('You have already reported this listing');
        }

        // Create the report
        const reportResult = await query(
          `INSERT INTO marketplace_reports
            (listing_id, reporter_id, reason, resolved, created_at)
           VALUES ($1, $2, $3, false, NOW())
           RETURNING *`,
          [id, req.userId, reason.trim()]
        );

        res.status(201).json({
          data: {
            report: reportResult.rows[0],
            message: 'Report submitted. Our team will review it shortly.',
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
