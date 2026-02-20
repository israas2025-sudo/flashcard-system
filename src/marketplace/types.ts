/**
 * types.ts -- Type definitions for the deck marketplace.
 *
 * Covers listings, reviews, reports, creation inputs, and filtering
 * options. These types are shared across the marketplace service,
 * API routes, and UI components.
 */

// ---------------------------------------------------------------------------
// Marketplace Listing
// ---------------------------------------------------------------------------

/**
 * A published deck available for download in the marketplace.
 *
 * Listings include metadata, pricing (currently free-only), download
 * statistics, and aggregate review scores.
 */
export interface MarketplaceListing {
  /** Unique identifier (UUID v4). */
  id: string;

  /** ID of the user who published this deck. */
  publisherId: string;

  /** Display name of the publisher. */
  publisherName: string;

  /** ID of the original source deck. */
  sourceDeckId: string;

  /** Title of the listing (may differ from the original deck name). */
  title: string;

  /** Detailed description in plain text or markdown. */
  description: string;

  /** Short summary shown in search results (max ~200 characters). */
  shortDescription: string;

  /** Category for browsing (e.g. 'language', 'science', 'history'). */
  category: string;

  /** Language tags (e.g. ['ar', 'en'] for an Arabic-English deck). */
  languages: string[];

  /** Freeform tags for search and filtering. */
  tags: string[];

  /** Total number of cards in the published snapshot. */
  cardCount: number;

  /** Number of times this listing has been downloaded. */
  downloadCount: number;

  /** Average rating from user reviews (1-5, or null if no reviews). */
  averageRating: number | null;

  /** Total number of reviews submitted. */
  reviewCount: number;

  /** URL to a preview image or thumbnail. */
  thumbnailUrl: string | null;

  /** Whether the listing is currently visible in the marketplace. */
  isPublished: boolean;

  /** Whether the listing has been flagged for moderation. */
  isFlagged: boolean;

  /** Version number, incremented on each republish. */
  version: number;

  /** Timestamp when the listing was first created. */
  createdAt: Date;

  /** Timestamp of the most recent update. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Marketplace Review
// ---------------------------------------------------------------------------

/**
 * A user-submitted review of a marketplace listing.
 */
export interface MarketplaceReview {
  /** Unique identifier. */
  id: string;

  /** ID of the listing being reviewed. */
  listingId: string;

  /** ID of the user who wrote the review. */
  reviewerId: string;

  /** Display name of the reviewer. */
  reviewerName: string;

  /** Star rating from 1 to 5. */
  rating: number;

  /** Optional text commentary. */
  comment: string;

  /** Whether the reviewer has actually downloaded the deck. */
  isVerifiedDownload: boolean;

  /** Timestamp when the review was submitted. */
  createdAt: Date;

  /** Timestamp of the most recent edit, or null if never edited. */
  updatedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Create Listing Input
// ---------------------------------------------------------------------------

/**
 * Input data for publishing a deck to the marketplace.
 */
export interface CreateListingInput {
  /** ID of the source deck to publish. */
  sourceDeckId: string;

  /** Title for the listing. */
  title: string;

  /** Full description (plain text or markdown). */
  description: string;

  /** Short summary for search results. */
  shortDescription: string;

  /** Category (e.g. 'language', 'science', 'math'). */
  category: string;

  /** Language tags (ISO 639-1 codes). */
  languages: string[];

  /** Freeform tags for discoverability. */
  tags: string[];

  /** Optional thumbnail URL. */
  thumbnailUrl?: string;
}

// ---------------------------------------------------------------------------
// Marketplace Filters
// ---------------------------------------------------------------------------

/**
 * Filter and sort options for browsing the marketplace.
 */
export interface MarketplaceFilters {
  /** Free-text search query. */
  query?: string;

  /** Filter by category. */
  category?: string;

  /** Filter by language (ISO 639-1 code). */
  language?: string;

  /** Filter by tag. */
  tag?: string;

  /** Minimum average rating (1-5). */
  minRating?: number;

  /** Minimum card count. */
  minCards?: number;

  /** Maximum card count. */
  maxCards?: number;

  /** Sort order for results. */
  sortBy?: 'newest' | 'popular' | 'top_rated' | 'most_downloaded' | 'recently_updated';

  /** Sort direction. */
  sortDirection?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Paginated result wrapper for marketplace listings.
 */
export interface PaginatedListings {
  /** The current page of listings. */
  listings: MarketplaceListing[];

  /** Total number of listings matching the filters. */
  total: number;

  /** Current page number (1-based). */
  page: number;

  /** Number of listings per page. */
  pageSize: number;

  /** Whether there are more pages available. */
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Listing Detail
// ---------------------------------------------------------------------------

/**
 * Extended listing data returned by getListingDetail, including
 * sample cards and recent reviews.
 */
export interface ListingDetail extends MarketplaceListing {
  /** A sample of cards from the deck for preview (up to 10). */
  sampleCards: SampleCard[];

  /** Recent reviews for this listing. */
  recentReviews: MarketplaceReview[];
}

/**
 * A preview card from a marketplace listing.
 */
export interface SampleCard {
  /** Front content of the card. */
  front: string;

  /** Back content of the card. */
  back: string;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/**
 * A user-submitted report against a marketplace listing.
 */
export interface MarketplaceReport {
  /** Unique identifier. */
  id: string;

  /** ID of the listing being reported. */
  listingId: string;

  /** ID of the user submitting the report. */
  reporterId: string;

  /** Reason category for the report. */
  reason: 'inappropriate' | 'copyright' | 'spam' | 'inaccurate' | 'other';

  /** Detailed description of the issue. */
  details: string;

  /** Current status of the report. */
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';

  /** Timestamp when the report was submitted. */
  createdAt: Date;
}
