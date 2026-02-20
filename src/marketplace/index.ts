/**
 * index.ts -- Barrel export for the marketplace module.
 *
 * Re-exports all public types, classes, and interfaces so consumers
 * can import from a single entry point:
 *
 * ```typescript
 * import {
 *   MarketplaceService,
 *   MarketplaceListing,
 *   MarketplaceFilters,
 * } from './marketplace';
 * ```
 */

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export { MarketplaceService } from './marketplace-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  MarketplaceListing,
  MarketplaceReview,
  CreateListingInput,
  MarketplaceFilters,
  PaginatedListings,
  ListingDetail,
  SampleCard,
  MarketplaceReport,
} from './types';
