-- ============================================================================
-- Seed Data: Default Deck Hierarchy
-- ============================================================================
-- Depends on: schema.sql, seed_note_types.sql (for the seed user),
--             seed_deck_presets.sql (for preset_id references)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ROOT DECK: Languages
-- ============================================================================
INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d0000000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Languages', NULL, NULL,
 'Root deck for all language learning flashcards', 0);

-- ============================================================================
-- CLASSICAL ARABIC  (and subdecks)
-- ============================================================================
INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d1000000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Classical Arabic', 'd0000000-0000-4000-d000-000000000001', 'e0000000-0000-4000-e000-000000000001',
 'Modern Standard Arabic and Classical Arabic vocabulary and grammar', 0);

INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d1100000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Vocabulary', 'd1000000-0000-4000-d000-000000000001', NULL,
 'General Classical Arabic vocabulary', 0),

('d1100000-0000-4000-d000-000000000002', 'a0000000-0000-4000-a000-000000000001',
 'Grammar', 'd1000000-0000-4000-d000-000000000001', NULL,
 'Arabic grammar rules and patterns', 1),

('d1100000-0000-4000-d000-000000000003', 'a0000000-0000-4000-a000-000000000001',
 'Nahw', 'd1100000-0000-4000-d000-000000000002', NULL,
 'Syntax rules (Nahw)', 0),

('d1100000-0000-4000-d000-000000000004', 'a0000000-0000-4000-a000-000000000001',
 'Sarf', 'd1100000-0000-4000-d000-000000000002', NULL,
 'Morphology rules (Sarf)', 1),

('d1100000-0000-4000-d000-000000000005', 'a0000000-0000-4000-a000-000000000001',
 'Islamic Terms', 'd1000000-0000-4000-d000-000000000001', NULL,
 'Islamic terminology in Classical Arabic', 2);

-- ============================================================================
-- EGYPTIAN ARABIC  (and subdecks)
-- ============================================================================
INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d2000000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Egyptian Arabic', 'd0000000-0000-4000-d000-000000000001', 'e0000000-0000-4000-e000-000000000001',
 'Egyptian Colloquial Arabic (Ammiyya)', 1);

INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d2100000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Everyday Phrases', 'd2000000-0000-4000-d000-000000000001', NULL,
 'Common everyday expressions and phrases', 0),

('d2100000-0000-4000-d000-000000000002', 'a0000000-0000-4000-a000-000000000001',
 'Vocabulary', 'd2000000-0000-4000-d000-000000000001', NULL,
 'General Egyptian Arabic vocabulary', 1),

('d2100000-0000-4000-d000-000000000003', 'a0000000-0000-4000-a000-000000000001',
 'Slang & Idioms', 'd2000000-0000-4000-d000-000000000001', NULL,
 'Slang, idioms, and culturally specific expressions', 2),

('d2100000-0000-4000-d000-000000000004', 'a0000000-0000-4000-a000-000000000001',
 'Verbs & Conjugation', 'd2000000-0000-4000-d000-000000000001', NULL,
 'Egyptian Arabic verb forms and conjugation patterns', 3);

-- ============================================================================
-- QURAN  (and subdecks)
-- ============================================================================
INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d3000000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Quran', 'd0000000-0000-4000-d000-000000000001', 'e0000000-0000-4000-e000-000000000004',
 'Quran memorization and understanding', 2);

INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d3100000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Juz 30 (Amma)', 'd3000000-0000-4000-d000-000000000001', NULL,
 'Juz Amma — the 30th part, short surahs commonly memorized first', 0),

('d3100000-0000-4000-d000-000000000002', 'a0000000-0000-4000-a000-000000000001',
 'Juz 29 (Tabarak)', 'd3000000-0000-4000-d000-000000000001', NULL,
 'Juz Tabarak — the 29th part', 1),

('d3100000-0000-4000-d000-000000000003', 'a0000000-0000-4000-a000-000000000001',
 'Al-Baqarah', 'd3000000-0000-4000-d000-000000000001', NULL,
 'Surah Al-Baqarah — the longest surah', 2),

('d3100000-0000-4000-d000-000000000004', 'a0000000-0000-4000-a000-000000000001',
 'Themes', 'd3000000-0000-4000-d000-000000000001', NULL,
 'Thematic collections of ayaat (e.g. Duas, Tawheed, Stories)', 3),

('d3100000-0000-4000-d000-000000000005', 'a0000000-0000-4000-a000-000000000001',
 'Tajweed', 'd3000000-0000-4000-d000-000000000001', NULL,
 'Tajweed rules illustrated with Quranic examples', 4),

('d3100000-0000-4000-d000-000000000006', 'a0000000-0000-4000-a000-000000000001',
 'Vocabulary', 'd3000000-0000-4000-d000-000000000001', NULL,
 'Frequently recurring Quranic vocabulary', 5);

-- ============================================================================
-- SPANISH  (and subdecks by CEFR level)
-- ============================================================================
INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d4000000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'Spanish', 'd0000000-0000-4000-d000-000000000001', 'e0000000-0000-4000-e000-000000000001',
 'Spanish language vocabulary and grammar', 3);

INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d4100000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'A1 — Beginner', 'd4000000-0000-4000-d000-000000000001', NULL,
 'CEFR A1 level vocabulary and phrases', 0),

('d4100000-0000-4000-d000-000000000002', 'a0000000-0000-4000-a000-000000000001',
 'A2 — Elementary', 'd4000000-0000-4000-d000-000000000001', NULL,
 'CEFR A2 level vocabulary and phrases', 1),

('d4100000-0000-4000-d000-000000000003', 'a0000000-0000-4000-a000-000000000001',
 'B1 — Intermediate', 'd4000000-0000-4000-d000-000000000001', NULL,
 'CEFR B1 level vocabulary and phrases', 2),

('d4100000-0000-4000-d000-000000000004', 'a0000000-0000-4000-a000-000000000001',
 'B2 — Upper Intermediate', 'd4000000-0000-4000-d000-000000000001', NULL,
 'CEFR B2 level vocabulary and phrases', 3),

('d4100000-0000-4000-d000-000000000005', 'a0000000-0000-4000-a000-000000000001',
 'C1 — Advanced', 'd4000000-0000-4000-d000-000000000001', NULL,
 'CEFR C1 level vocabulary and phrases', 4),

('d4100000-0000-4000-d000-000000000006', 'a0000000-0000-4000-a000-000000000001',
 'Conjugation Drills', 'd4000000-0000-4000-d000-000000000001', NULL,
 'Focused verb conjugation practice across all tenses', 5),

('d4100000-0000-4000-d000-000000000007', 'a0000000-0000-4000-a000-000000000001',
 'Grammar Rules', 'd4000000-0000-4000-d000-000000000001', NULL,
 'Spanish grammar concepts and rules', 6);

-- ============================================================================
-- ENGLISH  (and subdecks by source)
-- ============================================================================
INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d5000000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'English', 'd0000000-0000-4000-d000-000000000001', 'e0000000-0000-4000-e000-000000000001',
 'Advanced English vocabulary building', 4);

INSERT INTO decks (id, user_id, name, parent_id, preset_id, description, position) VALUES
('d5100000-0000-4000-d000-000000000001', 'a0000000-0000-4000-a000-000000000001',
 'GRE Vocabulary', 'd5000000-0000-4000-d000-000000000001', NULL,
 'GRE test preparation vocabulary', 0),

('d5100000-0000-4000-d000-000000000002', 'a0000000-0000-4000-a000-000000000001',
 'SAT Vocabulary', 'd5000000-0000-4000-d000-000000000001', NULL,
 'SAT test preparation vocabulary', 1),

('d5100000-0000-4000-d000-000000000003', 'a0000000-0000-4000-a000-000000000001',
 'IELTS Academic', 'd5000000-0000-4000-d000-000000000001', NULL,
 'IELTS Academic word list', 2),

('d5100000-0000-4000-d000-000000000004', 'a0000000-0000-4000-a000-000000000001',
 'From Reading', 'd5000000-0000-4000-d000-000000000001', NULL,
 'Words encountered while reading books and articles', 3),

('d5100000-0000-4000-d000-000000000005', 'a0000000-0000-4000-a000-000000000001',
 'From Podcasts', 'd5000000-0000-4000-d000-000000000001', NULL,
 'Words encountered while listening to podcasts', 4),

('d5100000-0000-4000-d000-000000000006', 'a0000000-0000-4000-a000-000000000001',
 'Phrasal Verbs', 'd5000000-0000-4000-d000-000000000001', NULL,
 'Common and advanced phrasal verbs', 5),

('d5100000-0000-4000-d000-000000000007', 'a0000000-0000-4000-a000-000000000001',
 'Idioms & Expressions', 'd5000000-0000-4000-d000-000000000001', NULL,
 'English idioms and fixed expressions', 6);

COMMIT;
