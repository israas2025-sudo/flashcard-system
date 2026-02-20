-- ============================================================================
-- Seed Data: Default Deck Presets
-- ============================================================================
-- Depends on: schema.sql, seed_note_types.sql (for the seed user)
-- Must be run BEFORE seed_decks.sql (decks reference preset IDs)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. STANDARD PRESET
-- Balanced settings for general language learning.
-- 20 new cards/day, 200 reviews/day, standard FSRS defaults.
-- ============================================================================
INSERT INTO deck_presets (id, user_id, name, new_cards_per_day, max_reviews_per_day,
    learning_steps, relearning_steps, graduating_interval_days, easy_interval_days,
    desired_retention, fsrs_parameters, leech_threshold, leech_action,
    bury_new_siblings, bury_review_siblings)
VALUES (
    'e0000000-0000-4000-e000-000000000001',
    'a0000000-0000-4000-a000-000000000001',
    'Standard',
    20,     -- new_cards_per_day
    200,    -- max_reviews_per_day
    '[1, 10]'::jsonb,          -- learning_steps (1min, 10min)
    '[10]'::jsonb,             -- relearning_steps (10min)
    1,      -- graduating_interval_days
    4,      -- easy_interval_days
    0.9,    -- desired_retention (90%)
    '[0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.0, 0.0]'::jsonb,
    8,      -- leech_threshold
    'tag_only',
    TRUE,   -- bury_new_siblings
    TRUE    -- bury_review_siblings
);

-- ============================================================================
-- 2. INTENSIVE PRESET
-- For aggressive learners who want maximum throughput.
-- 50 new cards/day, 500 reviews/day, tighter steps.
-- ============================================================================
INSERT INTO deck_presets (id, user_id, name, new_cards_per_day, max_reviews_per_day,
    learning_steps, relearning_steps, graduating_interval_days, easy_interval_days,
    desired_retention, fsrs_parameters, leech_threshold, leech_action,
    bury_new_siblings, bury_review_siblings)
VALUES (
    'e0000000-0000-4000-e000-000000000002',
    'a0000000-0000-4000-a000-000000000001',
    'Intensive',
    50,     -- new_cards_per_day
    500,    -- max_reviews_per_day
    '[1, 5, 10]'::jsonb,      -- learning_steps (1min, 5min, 10min) — extra step
    '[5, 10]'::jsonb,         -- relearning_steps (5min, 10min)
    1,      -- graduating_interval_days
    3,      -- easy_interval_days (shorter than standard)
    0.9,    -- desired_retention (90%)
    '[0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.0, 0.0]'::jsonb,
    10,     -- leech_threshold (slightly more forgiving)
    'tag_only',
    FALSE,  -- bury_new_siblings (show more cards)
    TRUE    -- bury_review_siblings
);

-- ============================================================================
-- 3. LIGHT PRESET
-- For maintenance / casual learners or busy periods.
-- 10 new cards/day, 100 reviews/day, gentle schedule.
-- ============================================================================
INSERT INTO deck_presets (id, user_id, name, new_cards_per_day, max_reviews_per_day,
    learning_steps, relearning_steps, graduating_interval_days, easy_interval_days,
    desired_retention, fsrs_parameters, leech_threshold, leech_action,
    bury_new_siblings, bury_review_siblings)
VALUES (
    'e0000000-0000-4000-e000-000000000003',
    'a0000000-0000-4000-a000-000000000001',
    'Light',
    10,     -- new_cards_per_day
    100,    -- max_reviews_per_day
    '[1, 10, 30]'::jsonb,     -- learning_steps (1min, 10min, 30min) — spacious
    '[10]'::jsonb,            -- relearning_steps (10min)
    2,      -- graduating_interval_days (longer first interval)
    5,      -- easy_interval_days (generous easy bonus)
    0.85,   -- desired_retention (85% — accepts a bit more forgetting)
    '[0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.0, 0.0]'::jsonb,
    6,      -- leech_threshold (flag leeches earlier)
    'pause', -- leech_action (auto-pause to keep queue manageable)
    TRUE,   -- bury_new_siblings
    TRUE    -- bury_review_siblings
);

-- ============================================================================
-- 4. QURAN MEMORIZATION PRESET
-- Specialized for Quran hifdh (memorization).
-- Few new ayaat/day, unlimited reviews, very short learning steps
-- to force many repetitions in one session.
-- ============================================================================
INSERT INTO deck_presets (id, user_id, name, new_cards_per_day, max_reviews_per_day,
    learning_steps, relearning_steps, graduating_interval_days, easy_interval_days,
    desired_retention, fsrs_parameters, leech_threshold, leech_action,
    bury_new_siblings, bury_review_siblings)
VALUES (
    'e0000000-0000-4000-e000-000000000004',
    'a0000000-0000-4000-a000-000000000001',
    'Quran Memorization',
    5,      -- new_cards_per_day (few new ayaat — quality over quantity)
    9999,   -- max_reviews_per_day (effectively unlimited)
    '[0.5, 1, 3, 10, 30]'::jsonb,  -- learning_steps (30s, 1m, 3m, 10m, 30m) — many short reps
    '[1, 5, 15]'::jsonb,           -- relearning_steps (1m, 5m, 15m) — intensive re-learning
    1,      -- graduating_interval_days
    2,      -- easy_interval_days (conservative — even "easy" ayaat need review)
    0.95,   -- desired_retention (95% — high bar for Quran)
    '[0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.0, 0.0]'::jsonb,
    5,      -- leech_threshold (flag struggling ayaat quickly)
    'tag_only', -- leech_action (never auto-pause Quran)
    FALSE,  -- bury_new_siblings (want to see related ayaat together)
    FALSE   -- bury_review_siblings (review all cards from same note)
);

COMMIT;
