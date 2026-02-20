-- ============================================================================
-- Seed Data: Complete Tag Hierarchy for 5 Languages
-- ============================================================================
-- Depends on: schema.sql, seed_note_types.sql (for the seed user)
-- ============================================================================

BEGIN;

-- ============================================================================
-- LANGUAGE ROOT TAGS
-- ============================================================================
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c0000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Classical Arabic',  'classical-arabic',  NULL, '#059669', '', 'Tags related to Classical / Modern Standard Arabic'),
('c0000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Egyptian Arabic',   'egyptian-arabic',   NULL, '#d97706', '', 'Tags related to Egyptian Colloquial Arabic'),
('c0000000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Quran',             'quran',             NULL, '#7c3aed', '', 'Tags related to Quranic Arabic and memorization'),
('c0000000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Spanish',           'spanish',           NULL, '#dc2626', '', 'Tags related to Spanish language learning'),
('c0000000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'English',           'english',           NULL, '#2563eb', '', 'Tags related to advanced English vocabulary');

-- ============================================================================
-- CLASSICAL ARABIC — Part of Speech Tags
-- ============================================================================
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c1000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Part of Speech',    'ca-pos',                'c0000000-0000-4000-c000-000000000001', '#059669', '', 'Arabic parts of speech'),
('c1000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Ism (Noun)',        'ca-pos-ism',            'c1000000-0000-4000-c000-000000000001', '#059669', '', 'Nouns / Ism'),
('c1000000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Fil (Verb)',       'ca-pos-fil',            'c1000000-0000-4000-c000-000000000001', '#059669', '', 'Verbs / Fil'),
('c1000000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Harf (Particle)',   'ca-pos-harf',           'c1000000-0000-4000-c000-000000000001', '#059669', '', 'Particles / Harf'),
('c1000000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Sifah (Adjective)', 'ca-pos-sifah',          'c1000000-0000-4000-c000-000000000001', '#059669', '', 'Adjectives / Sifah'),
('c1000000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Dharf (Adverb)',    'ca-pos-dharf',          'c1000000-0000-4000-c000-000000000001', '#059669', '', 'Adverbs / Dharf');

-- CLASSICAL ARABIC — Grammar Topics
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c1100000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Grammar',           'ca-grammar',            'c0000000-0000-4000-c000-000000000001', '#047857', '', 'Arabic grammar topics'),
('c1100000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Nahw (Syntax)',     'ca-grammar-nahw',       'c1100000-0000-4000-c000-000000000001', '#047857', '', 'Syntax / Nahw'),
('c1100000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Sarf (Morphology)', 'ca-grammar-sarf',       'c1100000-0000-4000-c000-000000000001', '#047857', '', 'Morphology / Sarf'),
('c1100000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Irab (Case Endings)','ca-grammar-irab',      'c1100000-0000-4000-c000-000000000002', '#047857', '', 'Case endings / I''rab'),
('c1100000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Verb Forms (Awzaan)','ca-grammar-awzaan',    'c1100000-0000-4000-c000-000000000003', '#047857', '', 'Ten verb forms / Awzaan'),
('c1100000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Jumlah Ismiyyah',   'ca-grammar-jumlah-ism', 'c1100000-0000-4000-c000-000000000002', '#047857', '', 'Nominal sentence'),
('c1100000-0000-4000-c000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'Jumlah Filiyyah',  'ca-grammar-jumlah-fil', 'c1100000-0000-4000-c000-000000000002', '#047857', '', 'Verbal sentence'),
('c1100000-0000-4000-c000-000000000008', 'a0000000-0000-4000-a000-000000000001', 'Idaafah',           'ca-grammar-idaafah',    'c1100000-0000-4000-c000-000000000002', '#047857', '', 'Possessive construction / Idaafah');

-- CLASSICAL ARABIC — Frequency / Level Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c1200000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Frequency',         'ca-frequency',          'c0000000-0000-4000-c000-000000000001', '#10b981', '', 'Word frequency tiers'),
('c1200000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Top 500',           'ca-freq-500',           'c1200000-0000-4000-c000-000000000001', '#10b981', '', 'Most common 500 words'),
('c1200000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Top 1000',          'ca-freq-1000',          'c1200000-0000-4000-c000-000000000001', '#10b981', '', 'Most common 1000 words'),
('c1200000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Top 3000',          'ca-freq-3000',          'c1200000-0000-4000-c000-000000000001', '#10b981', '', 'Most common 3000 words'),
('c1200000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Advanced',          'ca-freq-advanced',      'c1200000-0000-4000-c000-000000000001', '#10b981', '', 'Advanced / literary vocabulary');

-- CLASSICAL ARABIC — Topic Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c1300000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Topics',            'ca-topics',             'c0000000-0000-4000-c000-000000000001', '#34d399', '', 'Thematic groupings'),
('c1300000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Islamic Terms',     'ca-topic-islamic',      'c1300000-0000-4000-c000-000000000001', '#34d399', '', 'Islamic terminology'),
('c1300000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Daily Life',        'ca-topic-daily',        'c1300000-0000-4000-c000-000000000001', '#34d399', '', 'Everyday vocabulary'),
('c1300000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Academic',          'ca-topic-academic',     'c1300000-0000-4000-c000-000000000001', '#34d399', '', 'Academic / scholarly terms'),
('c1300000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Media & News',      'ca-topic-media',        'c1300000-0000-4000-c000-000000000001', '#34d399', '', 'Media and news vocabulary'),
('c1300000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Literature',        'ca-topic-literature',   'c1300000-0000-4000-c000-000000000001', '#34d399', '', 'Literary Arabic vocabulary');

-- CLASSICAL ARABIC — Source Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c1400000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Source',            'ca-source',             'c0000000-0000-4000-c000-000000000001', '#6ee7b7', '', 'Learning material source'),
('c1400000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Al-Kitaab',         'ca-source-alkitaab',    'c1400000-0000-4000-c000-000000000001', '#6ee7b7', '', 'Al-Kitaab textbook series'),
('c1400000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Madinah Books',     'ca-source-madinah',     'c1400000-0000-4000-c000-000000000001', '#6ee7b7', '', 'Madinah Arabic course'),
('c1400000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Hans Wehr',         'ca-source-hanswehr',    'c1400000-0000-4000-c000-000000000001', '#6ee7b7', '', 'Hans Wehr dictionary');

-- ============================================================================
-- EGYPTIAN ARABIC — Tags
-- ============================================================================
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c2000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Part of Speech',    'ea-pos',                'c0000000-0000-4000-c000-000000000002', '#d97706', '', 'Egyptian Arabic parts of speech'),
('c2000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Noun',              'ea-pos-noun',           'c2000000-0000-4000-c000-000000000001', '#d97706', '', 'Nouns'),
('c2000000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Verb',              'ea-pos-verb',           'c2000000-0000-4000-c000-000000000001', '#d97706', '', 'Verbs'),
('c2000000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Expression',        'ea-pos-expression',     'c2000000-0000-4000-c000-000000000001', '#d97706', '', 'Common expressions and idioms'),
('c2000000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Adjective',         'ea-pos-adjective',      'c2000000-0000-4000-c000-000000000001', '#d97706', '', 'Adjectives'),
('c2000000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Slang',             'ea-pos-slang',          'c2000000-0000-4000-c000-000000000001', '#d97706', '', 'Slang and colloquial terms');

-- EGYPTIAN ARABIC — Level Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c2100000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Level',             'ea-level',              'c0000000-0000-4000-c000-000000000002', '#f59e0b', '', 'Proficiency levels'),
('c2100000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Beginner',          'ea-level-beginner',     'c2100000-0000-4000-c000-000000000001', '#f59e0b', '', 'Beginner level vocabulary'),
('c2100000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Intermediate',      'ea-level-intermediate', 'c2100000-0000-4000-c000-000000000001', '#f59e0b', '', 'Intermediate level vocabulary'),
('c2100000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Advanced',          'ea-level-advanced',     'c2100000-0000-4000-c000-000000000001', '#f59e0b', '', 'Advanced level vocabulary');

-- EGYPTIAN ARABIC — Topic Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c2200000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Topics',            'ea-topics',             'c0000000-0000-4000-c000-000000000002', '#fbbf24', '', 'Thematic groupings'),
('c2200000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Greetings',         'ea-topic-greetings',    'c2200000-0000-4000-c000-000000000001', '#fbbf24', '', 'Greetings and pleasantries'),
('c2200000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Food & Drink',      'ea-topic-food',         'c2200000-0000-4000-c000-000000000001', '#fbbf24', '', 'Food and drink vocabulary'),
('c2200000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Transport',         'ea-topic-transport',    'c2200000-0000-4000-c000-000000000001', '#fbbf24', '', 'Transportation vocabulary'),
('c2200000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Shopping',          'ea-topic-shopping',     'c2200000-0000-4000-c000-000000000001', '#fbbf24', '', 'Shopping vocabulary'),
('c2200000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Family',            'ea-topic-family',       'c2200000-0000-4000-c000-000000000001', '#fbbf24', '', 'Family and relationships'),
('c2200000-0000-4000-c000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'Work',              'ea-topic-work',         'c2200000-0000-4000-c000-000000000001', '#fbbf24', '', 'Work and professional vocabulary'),
('c2200000-0000-4000-c000-000000000008', 'a0000000-0000-4000-a000-000000000001', 'Travel & Directions','ea-topic-travel',      'c2200000-0000-4000-c000-000000000001', '#fbbf24', '', 'Travel and directions');

-- ============================================================================
-- QURAN — Tags
-- ============================================================================
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c3000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Juz',               'quran-juz',             'c0000000-0000-4000-c000-000000000003', '#7c3aed', '', 'Quran divisions by Juz'),
('c3000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Juz 30 (Amma)',     'quran-juz-30',          'c3000000-0000-4000-c000-000000000001', '#7c3aed', '', 'Juz Amma — short surahs'),
('c3000000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Juz 29 (Tabarak)',  'quran-juz-29',          'c3000000-0000-4000-c000-000000000001', '#7c3aed', '', 'Juz Tabarak'),
('c3000000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Juz 1 (Alif Laam Meem)','quran-juz-1',      'c3000000-0000-4000-c000-000000000001', '#7c3aed', '', 'Juz 1 — Al-Baqarah opening');

-- QURAN — Surah Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c3100000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Surah',             'quran-surah',           'c0000000-0000-4000-c000-000000000003', '#8b5cf6', '', 'Individual surahs'),
('c3100000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Al-Fatihah',        'quran-surah-fatihah',   'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah Al-Fatihah (1)'),
('c3100000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Al-Baqarah',        'quran-surah-baqarah',   'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah Al-Baqarah (2)'),
('c3100000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Al-Mulk',           'quran-surah-mulk',      'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah Al-Mulk (67)'),
('c3100000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Ya-Sin',            'quran-surah-yasin',     'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah Ya-Sin (36)'),
('c3100000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Al-Kahf',           'quran-surah-kahf',      'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah Al-Kahf (18)'),
('c3100000-0000-4000-c000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'An-Nas',            'quran-surah-nas',       'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah An-Nas (114)'),
('c3100000-0000-4000-c000-000000000008', 'a0000000-0000-4000-a000-000000000001', 'Al-Falaq',          'quran-surah-falaq',     'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah Al-Falaq (113)'),
('c3100000-0000-4000-c000-000000000009', 'a0000000-0000-4000-a000-000000000001', 'Al-Ikhlas',         'quran-surah-ikhlas',    'c3100000-0000-4000-c000-000000000001', '#8b5cf6', '', 'Surah Al-Ikhlas (112)');

-- QURAN — Theme Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c3200000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Themes',            'quran-themes',          'c0000000-0000-4000-c000-000000000003', '#a78bfa', '', 'Quranic themes'),
('c3200000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Tawheed',           'quran-theme-tawheed',   'c3200000-0000-4000-c000-000000000001', '#a78bfa', '', 'Monotheism / Oneness of God'),
('c3200000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Prophets',          'quran-theme-prophets',  'c3200000-0000-4000-c000-000000000001', '#a78bfa', '', 'Stories of the Prophets'),
('c3200000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Day of Judgment',   'quran-theme-judgment',  'c3200000-0000-4000-c000-000000000001', '#a78bfa', '', 'Eschatology and Hereafter'),
('c3200000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Ethics & Morals',   'quran-theme-ethics',    'c3200000-0000-4000-c000-000000000001', '#a78bfa', '', 'Ethical teachings'),
('c3200000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Dua (Supplication)','quran-theme-dua',       'c3200000-0000-4000-c000-000000000001', '#a78bfa', '', 'Prayers and supplications from the Quran'),
('c3200000-0000-4000-c000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'Legal Rulings',     'quran-theme-legal',     'c3200000-0000-4000-c000-000000000001', '#a78bfa', '', 'Ayaat al-Ahkaam'),
('c3200000-0000-4000-c000-000000000008', 'a0000000-0000-4000-a000-000000000001', 'Nature & Creation', 'quran-theme-nature',    'c3200000-0000-4000-c000-000000000001', '#a78bfa', '', 'Signs in nature / creation');

-- QURAN — Tajweed Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c3300000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Tajweed Rules',     'quran-tajweed',         'c0000000-0000-4000-c000-000000000003', '#c4b5fd', '', 'Tajweed rules encountered'),
('c3300000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Idghaam',           'quran-tajweed-idghaam', 'c3300000-0000-4000-c000-000000000001', '#c4b5fd', '', 'Merging of letters'),
('c3300000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Ikhfaa',            'quran-tajweed-ikhfaa',  'c3300000-0000-4000-c000-000000000001', '#c4b5fd', '', 'Hidden nasalization'),
('c3300000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Iqlaab',            'quran-tajweed-iqlaab',  'c3300000-0000-4000-c000-000000000001', '#c4b5fd', '', 'Conversion of noon to meem'),
('c3300000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Idhaar',            'quran-tajweed-idhaar',  'c3300000-0000-4000-c000-000000000001', '#c4b5fd', '', 'Clear pronunciation'),
('c3300000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Madd',              'quran-tajweed-madd',    'c3300000-0000-4000-c000-000000000001', '#c4b5fd', '', 'Elongation rules'),
('c3300000-0000-4000-c000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'Qalqalah',          'quran-tajweed-qalqalah','c3300000-0000-4000-c000-000000000001', '#c4b5fd', '', 'Echoing / bouncing sound'),
('c3300000-0000-4000-c000-000000000008', 'a0000000-0000-4000-a000-000000000001', 'Ghunnah',           'quran-tajweed-ghunnah', 'c3300000-0000-4000-c000-000000000001', '#c4b5fd', '', 'Nasalization');

-- QURAN — Memorization Status Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c3400000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Memorization',      'quran-memorization',    'c0000000-0000-4000-c000-000000000003', '#ddd6fe', '', 'Memorization progress tracking'),
('c3400000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'New Memorization',  'quran-mem-new',         'c3400000-0000-4000-c000-000000000001', '#ddd6fe', '', 'Currently being memorized'),
('c3400000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Revision',          'quran-mem-revision',    'c3400000-0000-4000-c000-000000000001', '#ddd6fe', '', 'Previously memorized, under revision'),
('c3400000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Solid',             'quran-mem-solid',       'c3400000-0000-4000-c000-000000000001', '#ddd6fe', '', 'Well-memorized and solid');

-- ============================================================================
-- SPANISH — Tags
-- ============================================================================
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c4000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Part of Speech',    'es-pos',                'c0000000-0000-4000-c000-000000000004', '#dc2626', '', 'Spanish parts of speech'),
('c4000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Sustantivo (Noun)', 'es-pos-sustantivo',     'c4000000-0000-4000-c000-000000000001', '#dc2626', '', 'Nouns'),
('c4000000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Verbo (Verb)',      'es-pos-verbo',          'c4000000-0000-4000-c000-000000000001', '#dc2626', '', 'Verbs'),
('c4000000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Adjetivo (Adj)',    'es-pos-adjetivo',       'c4000000-0000-4000-c000-000000000001', '#dc2626', '', 'Adjectives'),
('c4000000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Adverbio (Adverb)', 'es-pos-adverbio',       'c4000000-0000-4000-c000-000000000001', '#dc2626', '', 'Adverbs'),
('c4000000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Expression',        'es-pos-expression',     'c4000000-0000-4000-c000-000000000001', '#dc2626', '', 'Idiomatic expressions');

-- SPANISH — Level Tags (CEFR)
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c4100000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'CEFR Level',        'es-cefr',               'c0000000-0000-4000-c000-000000000004', '#ef4444', '', 'CEFR proficiency levels'),
('c4100000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'A1',                'es-cefr-a1',            'c4100000-0000-4000-c000-000000000001', '#ef4444', '', 'A1 Beginner'),
('c4100000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'A2',                'es-cefr-a2',            'c4100000-0000-4000-c000-000000000001', '#ef4444', '', 'A2 Elementary'),
('c4100000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'B1',                'es-cefr-b1',            'c4100000-0000-4000-c000-000000000001', '#ef4444', '', 'B1 Intermediate'),
('c4100000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'B2',                'es-cefr-b2',            'c4100000-0000-4000-c000-000000000001', '#ef4444', '', 'B2 Upper Intermediate'),
('c4100000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'C1',                'es-cefr-c1',            'c4100000-0000-4000-c000-000000000001', '#ef4444', '', 'C1 Advanced');

-- SPANISH — Grammar Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c4200000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Grammar',           'es-grammar',            'c0000000-0000-4000-c000-000000000004', '#f87171', '', 'Spanish grammar topics'),
('c4200000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Present Tense',     'es-gram-presente',      'c4200000-0000-4000-c000-000000000001', '#f87171', '', 'Presente de indicativo'),
('c4200000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Preterite',         'es-gram-preterito',     'c4200000-0000-4000-c000-000000000001', '#f87171', '', 'Preterito indefinido'),
('c4200000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Imperfect',         'es-gram-imperfecto',    'c4200000-0000-4000-c000-000000000001', '#f87171', '', 'Preterito imperfecto'),
('c4200000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Subjunctive',       'es-gram-subjuntivo',    'c4200000-0000-4000-c000-000000000001', '#f87171', '', 'Modo subjuntivo'),
('c4200000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Ser vs Estar',      'es-gram-ser-estar',     'c4200000-0000-4000-c000-000000000001', '#f87171', '', 'Ser versus Estar usage'),
('c4200000-0000-4000-c000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'Por vs Para',       'es-gram-por-para',      'c4200000-0000-4000-c000-000000000001', '#f87171', '', 'Por versus Para usage'),
('c4200000-0000-4000-c000-000000000008', 'a0000000-0000-4000-a000-000000000001', 'Irregular Verbs',   'es-gram-irregular',     'c4200000-0000-4000-c000-000000000001', '#f87171', '', 'Irregular verb conjugations');

-- SPANISH — Topic Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c4300000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Topics',            'es-topics',             'c0000000-0000-4000-c000-000000000004', '#fca5a5', '', 'Spanish thematic groupings'),
('c4300000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Travel',            'es-topic-travel',       'c4300000-0000-4000-c000-000000000001', '#fca5a5', '', 'Travel vocabulary'),
('c4300000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Food & Cooking',    'es-topic-food',         'c4300000-0000-4000-c000-000000000001', '#fca5a5', '', 'Food and cooking vocabulary'),
('c4300000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Health',            'es-topic-health',       'c4300000-0000-4000-c000-000000000001', '#fca5a5', '', 'Health and body vocabulary'),
('c4300000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Business',          'es-topic-business',     'c4300000-0000-4000-c000-000000000001', '#fca5a5', '', 'Business Spanish'),
('c4300000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Culture',           'es-topic-culture',      'c4300000-0000-4000-c000-000000000001', '#fca5a5', '', 'Culture and society');

-- ============================================================================
-- ENGLISH — Tags
-- ============================================================================
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c5000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Part of Speech',    'en-pos',                'c0000000-0000-4000-c000-000000000005', '#2563eb', '', 'English parts of speech'),
('c5000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Noun',              'en-pos-noun',           'c5000000-0000-4000-c000-000000000001', '#2563eb', '', 'Nouns'),
('c5000000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Verb',              'en-pos-verb',           'c5000000-0000-4000-c000-000000000001', '#2563eb', '', 'Verbs'),
('c5000000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Adjective',         'en-pos-adjective',      'c5000000-0000-4000-c000-000000000001', '#2563eb', '', 'Adjectives'),
('c5000000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Adverb',            'en-pos-adverb',         'c5000000-0000-4000-c000-000000000001', '#2563eb', '', 'Adverbs'),
('c5000000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Idiom',             'en-pos-idiom',          'c5000000-0000-4000-c000-000000000001', '#2563eb', '', 'Idiomatic expressions'),
('c5000000-0000-4000-c000-000000000007', 'a0000000-0000-4000-a000-000000000001', 'Phrasal Verb',      'en-pos-phrasal-verb',   'c5000000-0000-4000-c000-000000000001', '#2563eb', '', 'Phrasal verbs');

-- ENGLISH — Register Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c5100000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Register',          'en-register',           'c0000000-0000-4000-c000-000000000005', '#3b82f6', '', 'Language register / formality'),
('c5100000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Formal',            'en-register-formal',    'c5100000-0000-4000-c000-000000000001', '#3b82f6', '', 'Formal register'),
('c5100000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Informal',          'en-register-informal',  'c5100000-0000-4000-c000-000000000001', '#3b82f6', '', 'Informal register'),
('c5100000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Academic',          'en-register-academic',  'c5100000-0000-4000-c000-000000000001', '#3b82f6', '', 'Academic / scholarly register'),
('c5100000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Literary',          'en-register-literary',  'c5100000-0000-4000-c000-000000000001', '#3b82f6', '', 'Literary / archaic register');

-- ENGLISH — Etymology Origin Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c5200000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Etymology Origin',  'en-etymology',          'c0000000-0000-4000-c000-000000000005', '#60a5fa', '', 'Word origin language'),
('c5200000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Latin',             'en-etym-latin',         'c5200000-0000-4000-c000-000000000001', '#60a5fa', '', 'Latin origin'),
('c5200000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Greek',             'en-etym-greek',         'c5200000-0000-4000-c000-000000000001', '#60a5fa', '', 'Greek origin'),
('c5200000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'French',            'en-etym-french',        'c5200000-0000-4000-c000-000000000001', '#60a5fa', '', 'French / Norman origin'),
('c5200000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Germanic',          'en-etym-germanic',      'c5200000-0000-4000-c000-000000000001', '#60a5fa', '', 'Germanic / Old English origin'),
('c5200000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Arabic',            'en-etym-arabic',        'c5200000-0000-4000-c000-000000000001', '#60a5fa', '', 'Arabic origin');

-- ENGLISH — Source Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c5300000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Source',            'en-source',             'c0000000-0000-4000-c000-000000000005', '#93c5fd', '', 'Learning material source'),
('c5300000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'GRE',               'en-source-gre',         'c5300000-0000-4000-c000-000000000001', '#93c5fd', '', 'GRE vocabulary'),
('c5300000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'SAT',               'en-source-sat',         'c5300000-0000-4000-c000-000000000001', '#93c5fd', '', 'SAT vocabulary'),
('c5300000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'IELTS',             'en-source-ielts',       'c5300000-0000-4000-c000-000000000001', '#93c5fd', '', 'IELTS vocabulary'),
('c5300000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Reading',           'en-source-reading',     'c5300000-0000-4000-c000-000000000001', '#93c5fd', '', 'Words from reading / books'),
('c5300000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Podcast',           'en-source-podcast',     'c5300000-0000-4000-c000-000000000001', '#93c5fd', '', 'Words from podcasts');

-- ENGLISH — Topic Tags
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c5400000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Topics',            'en-topics',             'c0000000-0000-4000-c000-000000000005', '#bfdbfe', '', 'English thematic groupings'),
('c5400000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Science',           'en-topic-science',      'c5400000-0000-4000-c000-000000000001', '#bfdbfe', '', 'Scientific terminology'),
('c5400000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Technology',        'en-topic-technology',   'c5400000-0000-4000-c000-000000000001', '#bfdbfe', '', 'Technology vocabulary'),
('c5400000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Philosophy',        'en-topic-philosophy',   'c5400000-0000-4000-c000-000000000001', '#bfdbfe', '', 'Philosophy vocabulary'),
('c5400000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Law',               'en-topic-law',          'c5400000-0000-4000-c000-000000000001', '#bfdbfe', '', 'Legal vocabulary'),
('c5400000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'Medicine',          'en-topic-medicine',     'c5400000-0000-4000-c000-000000000001', '#bfdbfe', '', 'Medical vocabulary');

-- ============================================================================
-- CROSS-LANGUAGE UTILITY TAGS
-- ============================================================================
INSERT INTO tags (id, user_id, name, slug, parent_id, color, icon, description) VALUES
('c9000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Leech',             'leech',                 NULL, '#ef4444', '', 'Cards that have been flagged as leeches'),
('c9000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'Favorite',          'favorite',              NULL, '#f59e0b', '', 'Personally important or interesting cards'),
('c9000000-0000-4000-c000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'Needs Audio',       'needs-audio',           NULL, '#6366f1', '', 'Cards that still need audio recordings'),
('c9000000-0000-4000-c000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'Needs Review',      'needs-review',          NULL, '#8b5cf6', '', 'Cards needing content review or correction'),
('c9000000-0000-4000-c000-000000000005', 'a0000000-0000-4000-a000-000000000001', 'Cognate',           'cognate',               NULL, '#0891b2', '', 'Words that are cognates across languages'),
('c9000000-0000-4000-c000-000000000006', 'a0000000-0000-4000-a000-000000000001', 'False Friend',      'false-friend',          NULL, '#dc2626', '', 'Words that look similar across languages but differ in meaning');

COMMIT;
