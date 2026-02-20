-- ============================================================================
-- Seed Data: Achievement Catalog (30+ Achievements)
-- ============================================================================
-- Depends on: schema.sql (achievements table)
-- These are inserted into the reference `achievements` table.
-- When a user unlocks one, a row is added to `user_achievements`.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STREAK ACHIEVEMENTS
-- ============================================================================
INSERT INTO achievements (id, name, description, icon, xp_reward, category, sort_order) VALUES
('streak_3',         'Getting Started',       'Study for 3 days in a row',                                  'fire',        50,   'streak',  1),
('streak_7',         'Week Warrior',          'Study for 7 days in a row',                                  'fire',        100,  'streak',  2),
('streak_14',        'Two-Week Triumph',      'Study for 14 days in a row',                                 'fire',        200,  'streak',  3),
('streak_30',        'Monthly Master',        'Study for 30 days in a row',                                 'fire',        500,  'streak',  4),
('streak_60',        'Iron Will',             'Study for 60 days in a row',                                 'fire',        1000, 'streak',  5),
('streak_100',       'Century Scholar',       'Study for 100 days in a row',                                'fire',        2000, 'streak',  6),
('streak_200',       'Relentless',            'Study for 200 days in a row',                                'fire',        4000, 'streak',  7),
('streak_365',       'Year of Knowledge',     'Study every day for an entire year',                         'fire',        10000,'streak',  8);

-- ============================================================================
-- REVIEW COUNT ACHIEVEMENTS
-- ============================================================================
INSERT INTO achievements (id, name, description, icon, xp_reward, category, sort_order) VALUES
('reviews_100',      'First Hundred',         'Complete 100 total reviews',                                 'check',       50,   'reviews', 10),
('reviews_500',      'Half a Thousand',       'Complete 500 total reviews',                                 'check',       100,  'reviews', 11),
('reviews_1000',     'Thousand Cards',        'Complete 1,000 total reviews',                               'check',       250,  'reviews', 12),
('reviews_5000',     'Five Thousand Strong',  'Complete 5,000 total reviews',                               'check',       500,  'reviews', 13),
('reviews_10000',    'Ten Thousand Hours',    'Complete 10,000 total reviews',                              'check',       1000, 'reviews', 14),
('reviews_25000',    'Tireless Reviewer',     'Complete 25,000 total reviews',                              'check',       2500, 'reviews', 15),
('reviews_50000',    'Legendary Scholar',     'Complete 50,000 total reviews',                              'check',       5000, 'reviews', 16),
('reviews_100000',   'Master of Memory',      'Complete 100,000 total reviews',                             'check',       10000,'reviews', 17);

-- ============================================================================
-- CARD CREATION ACHIEVEMENTS
-- ============================================================================
INSERT INTO achievements (id, name, description, icon, xp_reward, category, sort_order) VALUES
('cards_created_10', 'Card Crafter',          'Create your first 10 cards',                                 'pencil',      25,   'creation', 20),
('cards_created_50', 'Prolific Author',       'Create 50 cards',                                            'pencil',      100,  'creation', 21),
('cards_created_100','Century Deck',          'Create 100 cards',                                           'pencil',      200,  'creation', 22),
('cards_created_500','Knowledge Architect',   'Create 500 cards',                                           'pencil',      500,  'creation', 23),
('cards_created_1000','Thousand Thoughts',    'Create 1,000 cards',                                         'pencil',      1000, 'creation', 24);

-- ============================================================================
-- LANGUAGE-SPECIFIC ACHIEVEMENTS
-- ============================================================================
INSERT INTO achievements (id, name, description, icon, xp_reward, category, sort_order) VALUES
('lang_arabic_100',  'Arabic Explorer',       'Review 100 Classical Arabic cards',                          'globe',       100,  'language', 30),
('lang_arabic_1000', 'Arabic Scholar',        'Review 1,000 Classical Arabic cards',                        'globe',       500,  'language', 31),
('lang_egyptian_100','Streets of Cairo',      'Review 100 Egyptian Arabic cards',                           'globe',       100,  'language', 32),
('lang_egyptian_500','Cairene',               'Review 500 Egyptian Arabic cards',                           'globe',       300,  'language', 33),
('lang_quran_100',   'Quran Seeker',          'Review 100 Quran cards',                                    'book',        100,  'language', 34),
('lang_quran_1000',  'Hafidh in Training',    'Review 1,000 Quran cards',                                  'book',        1000, 'language', 35),
('lang_spanish_100', 'Hola Amigo',            'Review 100 Spanish cards',                                  'globe',       100,  'language', 36),
('lang_spanish_1000','Hispanohablante',       'Review 1,000 Spanish cards',                                'globe',       500,  'language', 37),
('lang_english_100', 'Wordsmith Apprentice',  'Review 100 English cards',                                  'globe',       100,  'language', 38),
('lang_english_1000','Lexicon Master',        'Review 1,000 English cards',                                'globe',       500,  'language', 39);

-- ============================================================================
-- RETENTION / PERFORMANCE ACHIEVEMENTS
-- ============================================================================
INSERT INTO achievements (id, name, description, icon, xp_reward, category, sort_order) VALUES
('perfect_day',      'Perfect Day',           'Complete a full study session with 100% correct answers',    'star',        200,  'performance', 40),
('perfect_week',     'Flawless Week',         'Achieve 95%+ retention for 7 consecutive days',              'star',        500,  'performance', 41),
('mature_100',       'Hundred Strong',        'Have 100 cards reach mature status (interval > 21 days)',    'shield',      300,  'performance', 42),
('mature_500',       'Deep Roots',            'Have 500 cards reach mature status',                         'shield',      1000, 'performance', 43),
('mature_1000',      'Fortress of Knowledge', 'Have 1,000 cards reach mature status',                      'shield',      2000, 'performance', 44),
('zero_lapses_100',  'Photographic Memory',   'Review 100 mature cards in a row without a single lapse',   'brain',       500,  'performance', 45);

-- ============================================================================
-- SPECIAL / MILESTONE ACHIEVEMENTS
-- ============================================================================
INSERT INTO achievements (id, name, description, icon, xp_reward, category, sort_order) VALUES
('first_review',     'First Step',            'Complete your very first review',                            'sparkle',     10,   'milestone', 50),
('first_deck',       'Organized Mind',        'Create your first custom deck',                              'folder',      25,   'milestone', 51),
('first_tag',        'Tagger',                'Create your first tag',                                      'tag',         15,   'milestone', 52),
('five_languages',   'Polyglot',              'Have active cards in 5 different languages',                 'globe',       1000, 'milestone', 53),
('night_owl',        'Night Owl',             'Complete a study session after midnight',                    'moon',        50,   'milestone', 54),
('early_bird',       'Early Bird',            'Complete a study session before 6 AM',                       'sun',         50,   'milestone', 55),
('speed_demon',      'Speed Demon',           'Review 100 cards in under 10 minutes',                      'lightning',   200,  'milestone', 56),
('leech_slayer',     'Leech Slayer',          'Successfully learn a card that was previously marked as a leech', 'sword',  300,  'milestone', 57),
('comeback',         'Comeback Kid',          'Return and study after a 30+ day break',                    'rocket',      100,  'milestone', 58),
('xp_1000',          'XP Milestone: 1K',      'Earn 1,000 total XP',                                       'trophy',      0,    'milestone', 59),
('xp_10000',         'XP Milestone: 10K',     'Earn 10,000 total XP',                                      'trophy',      0,    'milestone', 60),
('xp_50000',         'XP Milestone: 50K',     'Earn 50,000 total XP',                                      'trophy',      0,    'milestone', 61);

COMMIT;
