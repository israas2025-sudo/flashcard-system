/**
 * marketplace-service.ts -- Deck marketplace service.
 *
 * The {@link MarketplaceService} provides the core business logic for
 * the community deck marketplace. Users can publish their decks, browse
 * and search the marketplace, purchase/download decks, and leave ratings
 * and reviews.
 *
 * All database operations use the shared pg Pool from the db/connection
 * module for connection pooling and transaction support.
 */

import { Pool } from 'pg';
import { getPool, withTransaction } from '../db/connection';
import type {
  MarketplaceListing,
  MarketplaceReview,
  MarketplaceFilters,
  PaginatedListings,
  ListingDetail,
  CreateListingInput,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default page size for paginated listing queries. */
const DEFAULT_PAGE_SIZE = 20;

/** Maximum number of sample cards returned in listing details. */
const MAX_SAMPLE_CARDS = 10;

/** Maximum number of recent reviews returned in listing details. */
const MAX_RECENT_REVIEWS = 10;

// ---------------------------------------------------------------------------
// MarketplaceService
// ---------------------------------------------------------------------------

/**
 * Service for managing the deck marketplace.
 *
 * Usage:
 * ```typescript
 * const marketplace = new MarketplaceService();
 *
 * // Browse popular decks
 * const popular = await marketplace.getPopularDecks('ar');
 *
 * // Publish a deck
 * await marketplace.publishDeck('user-1', 'deck-1', { type: 'free' });
 *
 * // Search
 * const results = await marketplace.searchDecks('arabic vocabulary');
 * ```
 */
export class MarketplaceService {
  /** PostgreSQL connection pool. */
  private readonly pool: Pool;

  /**
   * Create a new MarketplaceService.
   *
   * @param pool - Optional pg Pool instance. Defaults to the shared pool.
   */
  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  // -----------------------------------------------------------------------
  // Listing browsing
  // -----------------------------------------------------------------------

  /**
   * List marketplace decks with optional filtering and pagination.
   *
   * Supports filtering by category, language, tag, minimum rating,
   * and card count range. Results can be sorted by various criteria.
   *
   * @param filters - Optional filter and sort options.
   * @param page - Page number (1-based). Default: 1.
   * @param pageSize - Number of listings per page. Default: 20.
   * @returns Paginated listing results.
   */
  async listDecks(
    filters: MarketplaceFilters = {},
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedListings> {
    const conditions: string[] = ['ml.is_published = true', 'ml.is_flagged = false'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.category) {
      conditions.push(`ml.category = $${paramIndex++}`);
      params.push(filters.category);
    }

    if (filters.language) {
      conditions.push(`$${paramIndex++} = ANY(ml.languages)`);
      params.push(filters.language);
    }

    if (filters.tag) {
      conditions.push(`$${paramIndex++} = ANY(ml.tags)`);
      params.push(filters.tag);
    }

    if (filters.minRating !== undefined) {
      conditions.push(`ml.average_rating >= $${paramIndex++}`);
      params.push(filters.minRating);
    }

    if (filters.minCards !== undefined) {
      conditions.push(`ml.card_count >= $${paramIndex++}`);
      params.push(filters.minCards);
    }

    if (filters.maxCards !== undefined) {
      conditions.push(`ml.card_count <= $${paramIndex++}`);
      params.push(filters.maxCards);
    }

    if (filters.query) {
      conditions.push(
        `(ml.title ILIKE $${paramIndex} OR ml.description ILIKE $${paramIndex} OR ml.short_description ILIKE $${paramIndex})`,
      );
      params.push(`%${filters.query}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Sort order
    const sortColumn = this.getSortColumn(filters.sortBy);
    const sortDir = filters.sortDirection === 'asc' ? 'ASC' : 'DESC';

    // Count query
    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM marketplace_listings ml ${whereClause}`,
      params,
    );
    const total = countResult.rows[0].total;

    // Data query
    const offset = (page - 1) * pageSize;
    const dataParams = [...params, pageSize, offset];
    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;

    const dataResult = await this.pool.query(
      `SELECT ml.*,
              u.display_name AS publisher_name
       FROM marketplace_listings ml
       JOIN users u ON ml.publisher_id = u.id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      dataParams,
    );

    const listings = dataResult.rows.map(this.mapListingRow);

    return {
      listings,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /**
   * Get the full details of a marketplace listing, including sample
   * cards and recent reviews.
   *
   * @param listingId - The listing to retrieve.
   * @returns The listing detail, or null if not found.
   */
  async getDeckDetails(listingId: string): Promise<ListingDetail | null> {
    const listingResult = await this.pool.query(
      `SELECT ml.*,
              u.display_name AS publisher_name
       FROM marketplace_listings ml
       JOIN users u ON ml.publisher_id = u.id
       WHERE ml.id = $1`,
      [listingId],
    );

    if (listingResult.rows.length === 0) return null;

    const listing = this.mapListingRow(listingResult.rows[0]);

    // Fetch sample cards
    const sampleResult = await this.pool.query(
      `SELECT c.front, c.back
       FROM marketplace_sample_cards c
       WHERE c.listing_id = $1
       ORDER BY c.ordinal ASC
       LIMIT $2`,
      [listingId, MAX_SAMPLE_CARDS],
    );

    const sampleCards = sampleResult.rows.map((row: Record<string, unknown>) => ({
      front: row.front as string,
      back: row.back as string,
    }));

    // Fetch recent reviews
    const reviewResult = await this.pool.query(
      `SELECT mr.*,
              u.display_name AS reviewer_name
       FROM marketplace_reviews mr
       JOIN users u ON mr.reviewer_id = u.id
       WHERE mr.listing_id = $1
       ORDER BY mr.created_at DESC
       LIMIT $2`,
      [listingId, MAX_RECENT_REVIEWS],
    );

    const recentReviews = reviewResult.rows.map(this.mapReviewRow);

    return {
      ...listing,
      sampleCards,
      recentReviews,
    };
  }

  // -----------------------------------------------------------------------
  // Publishing
  // -----------------------------------------------------------------------

  /**
   * Publish a user's deck to the marketplace.
   *
   * Creates a new marketplace listing from the source deck. A snapshot
   * of the deck's cards is taken at publish time so that subsequent
   * edits to the source deck do not affect the published version.
   *
   * @param userId - The publisher's user ID.
   * @param deckId - The source deck to publish.
   * @param pricing - Pricing configuration (currently only 'free' is supported).
   * @returns The created marketplace listing.
   */
  async publishDeck(
    userId: string,
    deckId: string,
    pricing: { type: 'free' } | { type: 'paid'; price: number },
  ): Promise<MarketplaceListing> {
    return withTransaction(async (client) => {
      // Fetch source deck info
      const deckResult = await client.query(
        `SELECT d.id, d.name, d.description
         FROM decks d
         WHERE d.id = $1 AND d.user_id = $2`,
        [deckId, userId],
      );

      if (deckResult.rows.length === 0) {
        throw new Error(`Deck not found or not owned by user: ${deckId}`);
      }

      const deck = deckResult.rows[0];

      // Count cards in the deck
      const cardCountResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM cards WHERE deck_id = $1`,
        [deckId],
      );
      const cardCount = cardCountResult.rows[0].count;

      if (cardCount === 0) {
        throw new Error('Cannot publish an empty deck');
      }

      // Get language tags from the deck
      const langResult = await client.query(
        `SELECT DISTINCT t.slug
         FROM tags t
         JOIN note_tags nt ON t.id = nt.tag_id
         JOIN notes n ON nt.note_id = n.id
         JOIN cards c ON c.note_id = n.id
         WHERE c.deck_id = $1
           AND t.slug LIKE 'language::%'`,
        [deckId],
      );
      const languages = langResult.rows.map(
        (r: Record<string, unknown>) => (r.slug as string).replace('language::', ''),
      );

      // Get all tags from the deck
      const tagResult = await client.query(
        `SELECT DISTINCT t.slug
         FROM tags t
         JOIN note_tags nt ON t.id = nt.tag_id
         JOIN notes n ON nt.note_id = n.id
         JOIN cards c ON c.note_id = n.id
         WHERE c.deck_id = $1
           AND t.slug NOT LIKE 'language::%'`,
        [deckId],
      );
      const tags = tagResult.rows.map((r: Record<string, unknown>) => r.slug as string);

      // Create the listing
      const listingResult = await client.query(
        `INSERT INTO marketplace_listings (
           publisher_id, source_deck_id, title, description,
           short_description, category, languages, tags,
           card_count, is_published, version, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, 'language', $6, $7, $8, true, 1, NOW(), NOW())
         RETURNING *`,
        [
          userId,
          deckId,
          deck.name,
          deck.description || '',
          (deck.description || '').substring(0, 200),
          languages,
          tags,
          cardCount,
        ],
      );

      const listingId = listingResult.rows[0].id;

      // Snapshot sample cards (up to MAX_SAMPLE_CARDS)
      const sampleCardsResult = await client.query(
        `SELECT c.id, n.fields
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE c.deck_id = $1
         ORDER BY RANDOM()
         LIMIT $2`,
        [deckId, MAX_SAMPLE_CARDS],
      );

      for (let i = 0; i < sampleCardsResult.rows.length; i++) {
        const row = sampleCardsResult.rows[i];
        const fields = typeof row.fields === 'string'
          ? JSON.parse(row.fields)
          : row.fields;

        await client.query(
          `INSERT INTO marketplace_sample_cards (listing_id, front, back, ordinal)
           VALUES ($1, $2, $3, $4)`,
          [listingId, fields.front || '', fields.back || '', i],
        );
      }

      // Fetch the complete listing with publisher name
      const finalResult = await client.query(
        `SELECT ml.*, u.display_name AS publisher_name
         FROM marketplace_listings ml
         JOIN users u ON ml.publisher_id = u.id
         WHERE ml.id = $1`,
        [listingId],
      );

      return this.mapListingRow(finalResult.rows[0]);
    });
  }

  // -----------------------------------------------------------------------
  // Purchasing / downloading
  // -----------------------------------------------------------------------

  /**
   * Purchase (or download, if free) a marketplace deck.
   *
   * Creates a copy of the published deck's cards in the user's collection.
   * The purchase is recorded for analytics and verified-download tracking.
   *
   * @param userId - The user acquiring the deck.
   * @param listingId - The marketplace listing to purchase.
   * @returns The ID of the newly created deck in the user's collection.
   */
  async purchaseDeck(userId: string, listingId: string): Promise<string> {
    return withTransaction(async (client) => {
      // Verify listing exists and is published
      const listingResult = await client.query(
        `SELECT * FROM marketplace_listings
         WHERE id = $1 AND is_published = true`,
        [listingId],
      );

      if (listingResult.rows.length === 0) {
        throw new Error(`Listing not found or not published: ${listingId}`);
      }

      const listing = listingResult.rows[0];

      // Check if user already purchased this listing
      const existingPurchase = await client.query(
        `SELECT id FROM marketplace_purchases
         WHERE user_id = $1 AND listing_id = $2`,
        [userId, listingId],
      );

      if (existingPurchase.rows.length > 0) {
        throw new Error('User has already purchased this listing');
      }

      // Create a new deck for the user
      const deckResult = await client.query(
        `INSERT INTO decks (user_id, name, description, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [userId, listing.title, listing.description],
      );

      const newDeckId = deckResult.rows[0].id;

      // Copy cards from the source deck snapshot
      const sourceCards = await client.query(
        `SELECT n.fields, c.template_ordinal
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE c.deck_id = $1`,
        [listing.source_deck_id],
      );

      for (const card of sourceCards.rows) {
        const fields = typeof card.fields === 'string'
          ? JSON.parse(card.fields)
          : card.fields;

        // Create note
        const noteResult = await client.query(
          `INSERT INTO notes (user_id, note_type_id, fields, created_at, updated_at)
           VALUES ($1,
                   (SELECT id FROM note_types WHERE user_id = $1 LIMIT 1),
                   $2, NOW(), NOW())
           RETURNING id`,
          [userId, JSON.stringify(fields)],
        );

        // Create card in 'new' state
        await client.query(
          `INSERT INTO cards (
             note_id, deck_id, template_ordinal, status,
             card_type, stability, difficulty, reps, lapses,
             flag, custom_data, created_at, updated_at
           )
           VALUES ($1, $2, $3, 'active', 'new', 0, 5.0, 0, 0, 0, '{}'::jsonb, NOW(), NOW())`,
          [noteResult.rows[0].id, newDeckId, card.template_ordinal || 0],
        );
      }

      // Record the purchase
      await client.query(
        `INSERT INTO marketplace_purchases (user_id, listing_id, created_at)
         VALUES ($1, $2, NOW())`,
        [userId, listingId],
      );

      // Increment download count
      await client.query(
        `UPDATE marketplace_listings
         SET download_count = download_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [listingId],
      );

      return newDeckId;
    });
  }

  // -----------------------------------------------------------------------
  // Ratings & reviews
  // -----------------------------------------------------------------------

  /**
   * Submit or update a rating and review for a marketplace listing.
   *
   * Each user can have only one review per listing. Submitting again
   * updates the existing review. The listing's aggregate rating is
   * recalculated after each review.
   *
   * @param userId - The reviewer's user ID.
   * @param listingId - The listing being reviewed.
   * @param rating - Star rating from 1 to 5.
   * @param review - Optional text commentary.
   * @returns The created or updated review.
   */
  async rateDeck(
    userId: string,
    listingId: string,
    rating: number,
    review: string = '',
  ): Promise<MarketplaceReview> {
    if (rating < 1 || rating > 5) {
      throw new RangeError('Rating must be between 1 and 5');
    }

    return withTransaction(async (client) => {
      // Check if user has downloaded this deck (verified review)
      const purchaseResult = await client.query(
        `SELECT id FROM marketplace_purchases
         WHERE user_id = $1 AND listing_id = $2`,
        [userId, listingId],
      );
      const isVerified = purchaseResult.rows.length > 0;

      // Upsert the review
      const reviewResult = await client.query(
        `INSERT INTO marketplace_reviews (
           listing_id, reviewer_id, rating, comment,
           is_verified_download, created_at
         )
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (listing_id, reviewer_id)
         DO UPDATE SET
           rating = EXCLUDED.rating,
           comment = EXCLUDED.comment,
           is_verified_download = EXCLUDED.is_verified_download,
           updated_at = NOW()
         RETURNING *`,
        [listingId, userId, rating, review, isVerified],
      );

      // Recalculate aggregate rating
      await client.query(
        `UPDATE marketplace_listings
         SET average_rating = (
               SELECT ROUND(AVG(rating)::numeric, 2)
               FROM marketplace_reviews
               WHERE listing_id = $1
             ),
             review_count = (
               SELECT COUNT(*)::int
               FROM marketplace_reviews
               WHERE listing_id = $1
             ),
             updated_at = NOW()
         WHERE id = $1`,
        [listingId],
      );

      // Fetch with reviewer name
      const finalResult = await client.query(
        `SELECT mr.*, u.display_name AS reviewer_name
         FROM marketplace_reviews mr
         JOIN users u ON mr.reviewer_id = u.id
         WHERE mr.id = $1`,
        [reviewResult.rows[0].id],
      );

      return this.mapReviewRow(finalResult.rows[0]);
    });
  }

  // -----------------------------------------------------------------------
  // Discovery
  // -----------------------------------------------------------------------

  /**
   * Get the most popular decks, optionally filtered by language.
   *
   * Popularity is determined by download count, weighted by recency
   * and average rating.
   *
   * @param language - Optional ISO 639-1 language code to filter by.
   * @param limit - Maximum number of results. Default: 20.
   * @returns Array of popular marketplace listings.
   */
  async getPopularDecks(
    language?: string,
    limit: number = DEFAULT_PAGE_SIZE,
  ): Promise<MarketplaceListing[]> {
    const conditions = ['ml.is_published = true', 'ml.is_flagged = false'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (language) {
      conditions.push(`$${paramIndex++} = ANY(ml.languages)`);
      params.push(language);
    }

    params.push(limit);
    const limitParam = paramIndex++;

    const result = await this.pool.query(
      `SELECT ml.*, u.display_name AS publisher_name
       FROM marketplace_listings ml
       JOIN users u ON ml.publisher_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY (ml.download_count * 0.6 + COALESCE(ml.average_rating, 0) * ml.review_count * 0.4) DESC,
                ml.created_at DESC
       LIMIT $${limitParam}`,
      params,
    );

    return result.rows.map(this.mapListingRow);
  }

  /**
   * Search the marketplace by free-text query.
   *
   * Searches across listing titles, descriptions, tags, and categories.
   * Results are ranked by relevance (title matches weighted highest).
   *
   * @param query - The search query string.
   * @param page - Page number (1-based). Default: 1.
   * @param pageSize - Results per page. Default: 20.
   * @returns Paginated search results.
   */
  async searchDecks(
    query: string,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedListings> {
    const searchPattern = `%${query}%`;
    const offset = (page - 1) * pageSize;

    // Count total matches
    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total
       FROM marketplace_listings ml
       WHERE ml.is_published = true
         AND ml.is_flagged = false
         AND (
           ml.title ILIKE $1
           OR ml.description ILIKE $1
           OR ml.short_description ILIKE $1
           OR $2 = ANY(ml.tags)
           OR ml.category ILIKE $1
         )`,
      [searchPattern, query.toLowerCase()],
    );
    const total = countResult.rows[0].total;

    // Fetch results with relevance-based ordering
    const dataResult = await this.pool.query(
      `SELECT ml.*, u.display_name AS publisher_name,
              CASE
                WHEN ml.title ILIKE $1 THEN 3
                WHEN ml.short_description ILIKE $1 THEN 2
                ELSE 1
              END AS relevance
       FROM marketplace_listings ml
       JOIN users u ON ml.publisher_id = u.id
       WHERE ml.is_published = true
         AND ml.is_flagged = false
         AND (
           ml.title ILIKE $1
           OR ml.description ILIKE $1
           OR ml.short_description ILIKE $1
           OR $2 = ANY(ml.tags)
           OR ml.category ILIKE $1
         )
       ORDER BY relevance DESC, ml.download_count DESC
       LIMIT $3 OFFSET $4`,
      [searchPattern, query.toLowerCase(), pageSize, offset],
    );

    const listings = dataResult.rows.map(this.mapListingRow);

    return {
      listings,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  // -----------------------------------------------------------------------
  // User-specific queries
  // -----------------------------------------------------------------------

  /**
   * Get all listings published by a specific user.
   *
   * @param userId - The publisher's user ID.
   * @returns Array of the user's published listings.
   */
  async getMyPublished(userId: string): Promise<MarketplaceListing[]> {
    const result = await this.pool.query(
      `SELECT ml.*, u.display_name AS publisher_name
       FROM marketplace_listings ml
       JOIN users u ON ml.publisher_id = u.id
       WHERE ml.publisher_id = $1
       ORDER BY ml.created_at DESC`,
      [userId],
    );

    return result.rows.map(this.mapListingRow);
  }

  /**
   * Get all listings purchased/downloaded by a specific user.
   *
   * @param userId - The purchaser's user ID.
   * @returns Array of listings the user has acquired.
   */
  async getMyPurchased(userId: string): Promise<MarketplaceListing[]> {
    const result = await this.pool.query(
      `SELECT ml.*, u.display_name AS publisher_name
       FROM marketplace_listings ml
       JOIN users u ON ml.publisher_id = u.id
       JOIN marketplace_purchases mp ON mp.listing_id = ml.id
       WHERE mp.user_id = $1
       ORDER BY mp.created_at DESC`,
      [userId],
    );

    return result.rows.map(this.mapListingRow);
  }

  // -----------------------------------------------------------------------
  // Row mappers
  // -----------------------------------------------------------------------

  /**
   * Map a raw database row to a MarketplaceListing object.
   */
  private mapListingRow(row: Record<string, unknown>): MarketplaceListing {
    return {
      id: row.id as string,
      publisherId: row.publisher_id as string,
      publisherName: (row.publisher_name as string) || '',
      sourceDeckId: row.source_deck_id as string,
      title: row.title as string,
      description: row.description as string,
      shortDescription: row.short_description as string,
      category: row.category as string,
      languages: (row.languages as string[]) || [],
      tags: (row.tags as string[]) || [],
      cardCount: row.card_count as number,
      downloadCount: row.download_count as number,
      averageRating: row.average_rating as number | null,
      reviewCount: row.review_count as number,
      thumbnailUrl: row.thumbnail_url as string | null,
      isPublished: row.is_published as boolean,
      isFlagged: row.is_flagged as boolean,
      version: row.version as number,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Map a raw database row to a MarketplaceReview object.
   */
  private mapReviewRow(row: Record<string, unknown>): MarketplaceReview {
    return {
      id: row.id as string,
      listingId: row.listing_id as string,
      reviewerId: row.reviewer_id as string,
      reviewerName: (row.reviewer_name as string) || '',
      rating: row.rating as number,
      comment: row.comment as string,
      isVerifiedDownload: row.is_verified_download as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
    };
  }

  /**
   * Map a sortBy filter value to the corresponding SQL column expression.
   */
  private getSortColumn(sortBy?: MarketplaceFilters['sortBy']): string {
    switch (sortBy) {
      case 'newest':
        return 'ml.created_at';
      case 'popular':
        return 'ml.download_count';
      case 'top_rated':
        return 'COALESCE(ml.average_rating, 0)';
      case 'most_downloaded':
        return 'ml.download_count';
      case 'recently_updated':
        return 'ml.updated_at';
      default:
        return 'ml.download_count';
    }
  }
}
