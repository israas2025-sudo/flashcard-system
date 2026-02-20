-- ============================================================================
-- Marketplace — PostgreSQL Schema
-- ============================================================================
-- Community marketplace where users can share, sell, and review flashcard
-- decks. Supports:
--   - marketplace_listings: deck listings with pricing, metadata, and stats
--   - marketplace_purchases: purchase transaction records
--   - marketplace_reviews: buyer reviews and ratings
--
-- Requires: core schema.sql (users, decks tables)
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: marketplace_listings
-- ============================================================================
-- A listing represents a deck that a seller has published to the marketplace.
-- Listings can be free (price = 0) or paid. Each listing tracks aggregate
-- rating and download statistics.
-- ============================================================================

CREATE TABLE marketplace_listings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id         UUID        NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    title           VARCHAR     NOT NULL,
    description     TEXT        NOT NULL DEFAULT '',
    price           NUMERIC(10, 2) NOT NULL DEFAULT 0.00
                    CHECK (price >= 0),
    currency        VARCHAR(3)  NOT NULL DEFAULT 'USD',
    -- ISO 4217 currency code
    language        VARCHAR     NOT NULL,
    -- Target language: 'arabic', 'egyptian', 'quran', 'spanish', 'english', etc.
    card_count      INT         NOT NULL DEFAULT 0
                    CHECK (card_count >= 0),
    -- Number of cards in the deck at time of listing
    rating_avg      FLOAT       NOT NULL DEFAULT 0
                    CHECK (rating_avg >= 0 AND rating_avg <= 5),
    -- Aggregate average rating (0-5 stars)
    rating_count    INT         NOT NULL DEFAULT 0
                    CHECK (rating_count >= 0),
    -- Total number of ratings received
    downloads       INT         NOT NULL DEFAULT 0
                    CHECK (downloads >= 0),
    -- Total number of downloads / purchases
    status          VARCHAR     NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'removed', 'under_review')),
    -- Listing lifecycle status
    tags            JSONB       NOT NULL DEFAULT '[]'::jsonb,
    -- Array of searchable tags: ["vocabulary", "CEFR-B1", "academic"]
    preview_images  JSONB       NOT NULL DEFAULT '[]'::jsonb,
    -- Array of preview image URLs
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A user can only list the same deck once
    UNIQUE (seller_id, deck_id)
);

COMMENT ON TABLE  marketplace_listings IS 'Deck listings published to the community marketplace.';
COMMENT ON COLUMN marketplace_listings.price IS 'Listing price. 0.00 for free decks.';
COMMENT ON COLUMN marketplace_listings.currency IS 'ISO 4217 currency code (e.g., USD, EUR, SAR).';
COMMENT ON COLUMN marketplace_listings.language IS 'Primary language of the deck content.';
COMMENT ON COLUMN marketplace_listings.rating_avg IS 'Denormalized average rating (0-5). Updated via trigger on review insert.';
COMMENT ON COLUMN marketplace_listings.rating_count IS 'Denormalized review count. Updated via trigger on review insert.';
COMMENT ON COLUMN marketplace_listings.downloads IS 'Total downloads / purchases. Incremented on purchase.';
COMMENT ON COLUMN marketplace_listings.status IS 'Lifecycle: draft, active, paused, removed, under_review.';

-- ============================================================================
-- TABLE: marketplace_purchases
-- ============================================================================
-- Records each purchase transaction. For free decks, price_paid = 0.
-- ============================================================================

CREATE TABLE marketplace_purchases (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id      UUID        NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    price_paid      NUMERIC(10, 2) NOT NULL DEFAULT 0.00
                    CHECK (price_paid >= 0),
    -- Actual price paid at time of purchase (may differ from current listing price)
    currency        VARCHAR(3)  NOT NULL DEFAULT 'USD',
    -- Currency of the transaction
    payment_ref     VARCHAR,
    -- External payment reference (Stripe ID, etc.). NULL for free downloads.
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A user can only purchase a listing once
    UNIQUE (buyer_id, listing_id)
);

COMMENT ON TABLE  marketplace_purchases IS 'Purchase / download records for marketplace listings.';
COMMENT ON COLUMN marketplace_purchases.price_paid IS 'Price paid at time of purchase. 0 for free decks.';
COMMENT ON COLUMN marketplace_purchases.payment_ref IS 'External payment gateway reference (e.g., Stripe charge ID).';

-- ============================================================================
-- TABLE: marketplace_reviews
-- ============================================================================
-- Buyer reviews and ratings. A buyer can leave only one review per listing.
-- Inserting or updating a review triggers recalculation of the listing's
-- aggregate rating.
-- ============================================================================

CREATE TABLE marketplace_reviews (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id      UUID        NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    rating          INT         NOT NULL CHECK (rating >= 1 AND rating <= 5),
    -- Star rating: 1-5
    review_text     TEXT        NOT NULL DEFAULT '',
    -- Optional written review
    is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
    -- TRUE if the reviewer has a verified purchase for this listing
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One review per user per listing
    UNIQUE (reviewer_id, listing_id)
);

COMMENT ON TABLE  marketplace_reviews IS 'Buyer reviews and ratings for marketplace listings.';
COMMENT ON COLUMN marketplace_reviews.rating IS 'Star rating 1-5.';
COMMENT ON COLUMN marketplace_reviews.is_verified IS 'TRUE if the reviewer has a confirmed purchase of this listing.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Browse active listings by language and rating
CREATE INDEX idx_marketplace_listings_browse
    ON marketplace_listings (status, language, rating_avg DESC, downloads DESC)
    WHERE status = 'active';

-- Search listings by seller
CREATE INDEX idx_marketplace_listings_seller
    ON marketplace_listings (seller_id, status);

-- Full-text search on title and description
CREATE INDEX idx_marketplace_listings_title_trgm
    ON marketplace_listings USING gin (title gin_trgm_ops);

CREATE INDEX idx_marketplace_listings_description_trgm
    ON marketplace_listings USING gin (description gin_trgm_ops);

-- Buyer purchase history
CREATE INDEX idx_marketplace_purchases_buyer
    ON marketplace_purchases (buyer_id, purchased_at DESC);

-- Listing purchase count queries
CREATE INDEX idx_marketplace_purchases_listing
    ON marketplace_purchases (listing_id);

-- Reviews for a listing (sorted by newest first)
CREATE INDEX idx_marketplace_reviews_listing
    ON marketplace_reviews (listing_id, created_at DESC);

-- Reviews by a user
CREATE INDEX idx_marketplace_reviews_reviewer
    ON marketplace_reviews (reviewer_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on listings
CREATE TRIGGER trg_marketplace_listings_updated_at
    BEFORE UPDATE ON marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-update updated_at on reviews
CREATE TRIGGER trg_marketplace_reviews_updated_at
    BEFORE UPDATE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- TRIGGER: Recalculate listing rating on review insert/update/delete
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_listing_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_listing_id UUID;
BEGIN
    -- Determine which listing to recalculate
    IF TG_OP = 'DELETE' THEN
        target_listing_id := OLD.listing_id;
    ELSE
        target_listing_id := NEW.listing_id;
    END IF;

    -- Recalculate aggregate rating
    UPDATE marketplace_listings
    SET rating_avg = COALESCE(
            (SELECT AVG(rating)::FLOAT FROM marketplace_reviews WHERE listing_id = target_listing_id),
            0
        ),
        rating_count = (SELECT COUNT(*) FROM marketplace_reviews WHERE listing_id = target_listing_id)
    WHERE id = target_listing_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_reviews_rating_calc
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_listing_rating();

-- ============================================================================
-- TRIGGER: Increment download count on purchase
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_increment_downloads()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE marketplace_listings
    SET downloads = downloads + 1
    WHERE id = NEW.listing_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_purchases_download_count
    AFTER INSERT ON marketplace_purchases
    FOR EACH ROW EXECUTE FUNCTION trigger_increment_downloads();

-- ============================================================================
-- TRIGGER: Auto-set is_verified on reviews
-- ============================================================================
-- When a review is inserted, check if the reviewer has purchased the listing
-- and set is_verified accordingly.
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_review_verified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_verified := EXISTS (
        SELECT 1
        FROM marketplace_purchases
        WHERE buyer_id = NEW.reviewer_id
          AND listing_id = NEW.listing_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_reviews_set_verified
    BEFORE INSERT OR UPDATE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_set_review_verified();

COMMIT;
