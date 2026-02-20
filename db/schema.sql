-- ============================================================================
-- Multilingual Flashcard System — Complete PostgreSQL Schema
-- ============================================================================
-- Requires PostgreSQL 14+ (for gen_random_uuid())
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() on PG < 14
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for search

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR     UNIQUE NOT NULL,
    password_hash   VARCHAR     NOT NULL,
    display_name    VARCHAR,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settings        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    -- settings stores: day_boundary_hour, default_desired_retention,
    --                  theme, language_priorities
    xp_total        BIGINT      NOT NULL DEFAULT 0,
    streak_current  INT         NOT NULL DEFAULT 0,
    streak_longest  INT         NOT NULL DEFAULT 0,
    streak_freezes_available INT NOT NULL DEFAULT 0,
    last_study_date DATE
);

COMMENT ON TABLE  users IS 'Registered users of the flashcard system.';
COMMENT ON COLUMN users.settings IS 'JSON object: {day_boundary_hour, default_desired_retention, theme, language_priorities}.';

-- ============================================================================
-- TABLE: note_types
-- ============================================================================
CREATE TABLE note_types (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR     NOT NULL,
    fields          JSONB       NOT NULL,
    -- fields: array of {name, type, sort_order, is_rtl, font_family}
    card_templates  JSONB       NOT NULL,
    -- card_templates: array of {name, front_html, back_html}
    css             TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  note_types IS 'Defines the field schema and card templates for a category of notes.';
COMMENT ON COLUMN note_types.fields IS 'Array of {name, type, sort_order, is_rtl, font_family}.';
COMMENT ON COLUMN note_types.card_templates IS 'Array of {name, front_html, back_html}.';

-- ============================================================================
-- TABLE: deck_presets
-- (must come before decks because decks references it)
-- ============================================================================
CREATE TABLE deck_presets (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                    VARCHAR NOT NULL,
    new_cards_per_day       INT     NOT NULL DEFAULT 20,
    max_reviews_per_day     INT     NOT NULL DEFAULT 200,
    learning_steps          JSONB   NOT NULL DEFAULT '[1, 10]'::jsonb,
    -- array of step durations in minutes
    relearning_steps        JSONB   NOT NULL DEFAULT '[10]'::jsonb,
    graduating_interval_days INT    NOT NULL DEFAULT 1,
    easy_interval_days      INT     NOT NULL DEFAULT 4,
    desired_retention       FLOAT   NOT NULL DEFAULT 0.9,
    fsrs_parameters         JSONB,
    -- array of 19 floats (FSRS-5 model weights)
    leech_threshold         INT     NOT NULL DEFAULT 8,
    leech_action            VARCHAR NOT NULL DEFAULT 'tag_only'
                            CHECK (leech_action IN ('tag_only', 'pause')),
    bury_new_siblings       BOOLEAN NOT NULL DEFAULT TRUE,
    bury_review_siblings    BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE  deck_presets IS 'Reusable scheduling / FSRS configuration sets for decks.';
COMMENT ON COLUMN deck_presets.learning_steps IS 'Array of step durations in minutes, e.g. [1, 10].';
COMMENT ON COLUMN deck_presets.fsrs_parameters IS 'Array of 19 FSRS-5 model weight floats.';

-- ============================================================================
-- TABLE: decks
-- ============================================================================
CREATE TABLE decks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR     NOT NULL,
    parent_id       UUID        REFERENCES decks(id) ON DELETE SET NULL,
    preset_id       UUID        REFERENCES deck_presets(id),
    description     TEXT        NOT NULL DEFAULT '',
    is_filtered     BOOLEAN     NOT NULL DEFAULT FALSE,
    filter_query    TEXT,
    position        INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  decks IS 'Hierarchical deck tree. parent_id enables nesting (e.g. Languages > Arabic > Vocab).';

-- ============================================================================
-- TABLE: notes
-- ============================================================================
CREATE TABLE notes (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_type_id        UUID        NOT NULL REFERENCES note_types(id) ON DELETE RESTRICT,
    fields              JSONB       NOT NULL,
    sort_field_value    TEXT,
    first_field_checksum INT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  notes IS 'A single knowledge unit whose fields are rendered by note_type templates into one or more cards.';
COMMENT ON COLUMN notes.first_field_checksum IS 'CRC32 of the first field value for fast duplicate detection.';

-- ============================================================================
-- TABLE: cards
-- ============================================================================
CREATE TABLE cards (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id             UUID        NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    deck_id             UUID        NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    template_ordinal    INT         NOT NULL DEFAULT 0,
    status              VARCHAR     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'skipped_today')),
    card_type           VARCHAR     NOT NULL DEFAULT 'new'
                        CHECK (card_type IN ('new', 'learning', 'review', 'relearning')),
    due                 TIMESTAMPTZ,
    interval_days       INT         NOT NULL DEFAULT 0,
    stability           FLOAT       NOT NULL DEFAULT 0,
    difficulty          FLOAT       NOT NULL DEFAULT 0,
    last_review_at      TIMESTAMPTZ,
    reps                INT         NOT NULL DEFAULT 0,
    lapses              INT         NOT NULL DEFAULT 0,
    flag                INT         NOT NULL DEFAULT 0
                        CHECK (flag >= 0 AND flag <= 7),
    paused_at           TIMESTAMPTZ,
    paused_by           VARCHAR
                        CHECK (paused_by IN ('manual', 'tag_batch', 'deck_batch', 'leech_auto')),
    resume_date         DATE,
    pause_reason        TEXT,
    custom_data         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  cards IS 'A reviewable card generated from a note + template pair. Carries all FSRS scheduling state.';

-- ============================================================================
-- TABLE: review_logs
-- ============================================================================
CREATE TABLE review_logs (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id             UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    reviewed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rating              VARCHAR     NOT NULL
                        CHECK (rating IN ('again', 'hard', 'good', 'easy')),
    interval_before     INT,
    interval_after      INT,
    stability_before    FLOAT,
    stability_after     FLOAT,
    difficulty_before   FLOAT,
    difficulty_after    FLOAT,
    time_spent_ms       INT,
    review_type         VARCHAR
                        CHECK (review_type IN ('learning', 'review', 'relearning', 'filtered'))
);

COMMENT ON TABLE review_logs IS 'Immutable audit trail of every review event, used for FSRS re-training and statistics.';

-- ============================================================================
-- TABLE: tags
-- ============================================================================
CREATE TABLE tags (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR     NOT NULL,
    slug        VARCHAR     NOT NULL,
    parent_id   UUID        REFERENCES tags(id) ON DELETE SET NULL,
    color       VARCHAR(7)  NOT NULL DEFAULT '#6366F1',
    icon        VARCHAR     NOT NULL DEFAULT '',
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, slug)
);

COMMENT ON TABLE tags IS 'Hierarchical tags for cross-cutting classification of notes.';

-- ============================================================================
-- TABLE: note_tags (join table)
-- ============================================================================
CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,

    PRIMARY KEY (note_id, tag_id)
);

COMMENT ON TABLE note_tags IS 'Many-to-many relationship between notes and tags.';

-- ============================================================================
-- TABLE: media
-- ============================================================================
CREATE TABLE media (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename     TEXT        NOT NULL,
    mime_type    VARCHAR,
    size_bytes   INT,
    storage_path TEXT        NOT NULL,
    checksum     VARCHAR,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE media IS 'Registry of uploaded media files (audio, images) referenced in note fields.';

-- ============================================================================
-- TABLE: study_presets
-- ============================================================================
CREATE TABLE study_presets (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR     NOT NULL,
    tag_filter   JSONB       NOT NULL DEFAULT '[]'::jsonb,
    deck_filter  JSONB       NOT NULL DEFAULT '[]'::jsonb,
    state_filter JSONB       NOT NULL DEFAULT '{}'::jsonb,
    is_pinned    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE study_presets IS 'Saved study session filters combining tag, deck, and card-state criteria.';

-- ============================================================================
-- TABLE: user_achievements
-- ============================================================================
CREATE TABLE user_achievements (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR     NOT NULL,
    earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, achievement_id)
);

COMMENT ON TABLE user_achievements IS 'Records which achievements each user has unlocked.';

-- ============================================================================
-- TABLE: achievements (reference / catalog)
-- ============================================================================
CREATE TABLE achievements (
    id          VARCHAR     PRIMARY KEY,
    name        VARCHAR     NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    icon        VARCHAR     NOT NULL DEFAULT '',
    xp_reward   INT         NOT NULL DEFAULT 0,
    category    VARCHAR     NOT NULL DEFAULT 'general',
    sort_order  INT         NOT NULL DEFAULT 0
);

COMMENT ON TABLE achievements IS 'Master catalog of all possible achievements.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary study queue: fetch cards due in a specific deck by state
CREATE INDEX idx_cards_study_queue
    ON cards (deck_id, status, card_type, due);

-- Sibling lookups (bury siblings after review)
CREATE INDEX idx_cards_note_id
    ON cards (note_id);

-- Duplicate detection on notes
CREATE INDEX idx_notes_duplicate_check
    ON notes (note_type_id, first_field_checksum);

-- Tag-based filtering via the join table
CREATE INDEX idx_note_tags_tag_id
    ON note_tags (tag_id);

-- Statistics and FSRS re-training queries
CREATE INDEX idx_review_logs_card_reviewed
    ON review_logs (card_id, reviewed_at);

-- Tag hierarchy traversal
CREATE INDEX idx_tags_user_parent
    ON tags (user_id, parent_id);

-- Timed pause resume check (find cards whose pause has expired)
CREATE INDEX idx_cards_pause_resume
    ON cards (status, resume_date)
    WHERE status = 'paused' AND resume_date IS NOT NULL;

-- Deck hierarchy traversal
CREATE INDEX idx_decks_parent
    ON decks (user_id, parent_id);

-- Note types per user
CREATE INDEX idx_note_types_user
    ON note_types (user_id);

-- Media per user
CREATE INDEX idx_media_user
    ON media (user_id);

-- ============================================================================
-- TRIGGER: auto-update updated_at columns
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_note_types_updated_at
    BEFORE UPDATE ON note_types
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMIT;
