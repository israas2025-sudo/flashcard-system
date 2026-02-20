-- ============================================================================
-- Pronunciation Features — PostgreSQL Schema
-- ============================================================================
-- Extends the core flashcard schema with tables for pronunciation practice:
--   - pronunciation_recordings: user audio recordings with AI-scored feedback
--   - pronunciation_models: language-specific pronunciation scoring models
--
-- Requires: core schema.sql (users, cards tables)
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: pronunciation_models
-- ============================================================================
-- Stores references to pronunciation scoring models. Each language can have
-- multiple model versions; the system uses the latest active version.
-- ============================================================================

CREATE TABLE pronunciation_models (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    language    VARCHAR     NOT NULL,
    -- language: 'arabic', 'egyptian', 'quran', 'spanish', 'english'
    model_url   TEXT        NOT NULL,
    -- URL or path to the model artifact (e.g., S3 URL, local path)
    version     VARCHAR     NOT NULL,
    -- Semantic version string (e.g., '1.0.0', '2.1.3')
    description TEXT        NOT NULL DEFAULT '',
    -- Optional description of this model version
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Whether this model version is currently in use
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only one active model per language at a time
    UNIQUE (language, version)
);

COMMENT ON TABLE  pronunciation_models IS 'Language-specific pronunciation scoring models. Each language can have multiple versions.';
COMMENT ON COLUMN pronunciation_models.language IS 'Target language: arabic, egyptian, quran, spanish, english.';
COMMENT ON COLUMN pronunciation_models.model_url IS 'URL or path to the model artifact (S3, GCS, or local filesystem).';
COMMENT ON COLUMN pronunciation_models.version IS 'Semantic version string for the model (e.g., 1.0.0).';
COMMENT ON COLUMN pronunciation_models.is_active IS 'Whether this model version is currently used for scoring.';

-- ============================================================================
-- TABLE: pronunciation_recordings
-- ============================================================================
-- Stores user pronunciation recordings and their AI-generated scores. Each
-- recording is tied to a specific card (word) and user.
-- ============================================================================

CREATE TABLE pronunciation_recordings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id     UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    audio_url   TEXT        NOT NULL,
    -- URL or storage path to the recorded audio file
    duration_ms INT,
    -- Duration of the recording in milliseconds
    score       FLOAT       CHECK (score >= 0 AND score <= 100),
    -- AI pronunciation score (0-100). NULL if scoring is pending.
    feedback    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    -- Structured feedback from the pronunciation model:
    --   {
    --     "overall_score": 85.5,
    --     "phoneme_scores": [{"phoneme": "...", "score": 90, "feedback": "..."}],
    --     "stress_accuracy": 92,
    --     "intonation_score": 78,
    --     "suggestions": ["..."],
    --     "model_version": "1.0.0"
    --   }
    model_id    UUID        REFERENCES pronunciation_models(id) ON DELETE SET NULL,
    -- The model version used to score this recording
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  pronunciation_recordings IS 'User pronunciation recordings with AI-scored feedback for each card.';
COMMENT ON COLUMN pronunciation_recordings.audio_url IS 'URL or storage path to the recorded audio file.';
COMMENT ON COLUMN pronunciation_recordings.score IS 'AI pronunciation score 0-100. NULL if scoring is still pending.';
COMMENT ON COLUMN pronunciation_recordings.feedback IS 'Structured JSON feedback: phoneme scores, stress, intonation, suggestions.';
COMMENT ON COLUMN pronunciation_recordings.model_id IS 'Reference to the pronunciation model version used for scoring.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup of a user's recordings for a specific card (practice history)
CREATE INDEX idx_pronunciation_recordings_user_card
    ON pronunciation_recordings (user_id, card_id, created_at DESC);

-- Query recordings by score for analytics (e.g., "worst pronunciations")
CREATE INDEX idx_pronunciation_recordings_score
    ON pronunciation_recordings (user_id, score)
    WHERE score IS NOT NULL;

-- Find the active model for a language
CREATE INDEX idx_pronunciation_models_active
    ON pronunciation_models (language, is_active)
    WHERE is_active = TRUE;

-- ============================================================================
-- TRIGGER: ensure only one active model per language
-- ============================================================================
-- When a new model is marked active, deactivate all other models for that
-- language. This ensures the UNIQUE constraint on (language, is_active)
-- is effectively "at most one active per language".
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_deactivate_other_models()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        UPDATE pronunciation_models
        SET is_active = FALSE
        WHERE language = NEW.language
          AND id != NEW.id
          AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pronunciation_models_single_active
    BEFORE INSERT OR UPDATE ON pronunciation_models
    FOR EACH ROW
    WHEN (NEW.is_active = TRUE)
    EXECUTE FUNCTION trigger_deactivate_other_models();

COMMIT;
