/**
 * achievement-service.ts -- Achievement definition catalog and evaluation engine.
 *
 * Achievements provide milestone-based recognition that complements the
 * continuous XP/level system. They are designed to:
 *
 * 1. **Celebrate breadth** -- Polyglot, language-specific milestones
 * 2. **Celebrate depth** -- Root mastery, Juz Amma completion
 * 3. **Celebrate consistency** -- Streak milestones, accuracy streaks
 * 4. **Surprise and delight** -- Hidden achievements for unusual behaviors
 *
 * The achievement checker is invoked after each study session with a
 * {@link SessionContext} containing all the data needed to evaluate every
 * condition type. This single-pass design avoids repeated database queries.
 */

import { pool } from '../db/connection';
import type {
  AchievementDefinition,
  AchievementCondition,
  AchievementUnlock,
  AchievementWithStatus,
  SessionContext,
} from './types';

// ---------------------------------------------------------------------------
// Achievement Catalog (30+ definitions)
// ---------------------------------------------------------------------------

/**
 * Complete catalog of all achievements in the system.
 *
 * Achievements are grouped thematically:
 * - Review milestones (total cards reviewed)
 * - Streak milestones (consecutive days)
 * - Language-specific milestones (cards with certain tags)
 * - Quran and Arabic root milestones
 * - Session quality achievements (accuracy, speed)
 * - Time-based hidden achievements
 * - Cross-language achievements
 * - Level milestones
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ---- Review Milestones ----
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first study session',
    icon: '\u{1F463}',
    hidden: false,
    condition: { type: 'total_reviews', count: 1 },
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Review 25 cards',
    icon: '\u{1F331}',
    hidden: false,
    condition: { type: 'total_reviews', count: 25 },
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Review 100 cards',
    icon: '\u{1F4AF}',
    hidden: false,
    condition: { type: 'total_reviews', count: 100 },
  },
  {
    id: 'five_hundred',
    name: 'Half a Thousand',
    description: 'Review 500 cards',
    icon: '\u{1F3C5}',
    hidden: false,
    condition: { type: 'total_reviews', count: 500 },
  },
  {
    id: 'thousand',
    name: 'Thousand Strong',
    description: 'Review 1,000 cards',
    icon: '\u{1F3C6}',
    hidden: false,
    condition: { type: 'total_reviews', count: 1000 },
  },
  {
    id: 'five_thousand',
    name: 'Dedicated Scholar',
    description: 'Review 5,000 cards',
    icon: '\u{1F393}',
    hidden: false,
    condition: { type: 'total_reviews', count: 5000 },
  },
  {
    id: 'ten_thousand',
    name: 'Ten Thousand Hours',
    description: 'Review 10,000 cards',
    icon: '\u{2B50}',
    hidden: false,
    condition: { type: 'total_reviews', count: 10000 },
  },

  // ---- Streak Milestones ----
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: '7-day study streak',
    icon: '\u{1F4AA}',
    hidden: false,
    condition: { type: 'streak_days', days: 7 },
  },
  {
    id: 'fortnight',
    name: 'Fortnight Focus',
    description: '14-day study streak',
    icon: '\u{26A1}',
    hidden: false,
    condition: { type: 'streak_days', days: 14 },
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: '30-day streak',
    icon: '\u{1F525}',
    hidden: false,
    condition: { type: 'streak_days', days: 30 },
  },
  {
    id: 'unbreakable',
    name: 'Unbreakable',
    description: '60-day streak',
    icon: '\u{1F48E}',
    hidden: false,
    condition: { type: 'streak_days', days: 60 },
  },
  {
    id: 'quarterly_champion',
    name: 'Quarterly Champion',
    description: '90-day streak',
    icon: '\u{1F451}',
    hidden: false,
    condition: { type: 'streak_days', days: 90 },
  },
  {
    id: 'half_year',
    name: 'Half-Year Hero',
    description: '180-day streak',
    icon: '\u{1F30D}',
    hidden: false,
    condition: { type: 'streak_days', days: 180 },
  },
  {
    id: 'year_long',
    name: 'Year of Knowledge',
    description: '365-day streak',
    icon: '\u{1F3C6}',
    hidden: false,
    condition: { type: 'streak_days', days: 365 },
  },

  // ---- Arabic & Quran ----
  {
    id: 'root_apprentice',
    name: 'Root Apprentice',
    description: 'Learn 10 Arabic root words',
    icon: '\u{1F33F}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'root::*', count: 10 },
  },
  {
    id: 'root_master',
    name: 'Root Master',
    description: 'Learn 50 Arabic root words',
    icon: '\u{1F333}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'root::*', count: 50 },
  },
  {
    id: 'root_scholar',
    name: 'Root Scholar',
    description: 'Learn 200 Arabic root words',
    icon: '\u{1F334}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'root::*', count: 200 },
  },
  {
    id: 'qari_training',
    name: 'Qari in Training',
    description: 'Review 100 Quran ayahs',
    icon: '\u{1F4D6}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'quran', count: 100 },
  },
  {
    id: 'juz_amma',
    name: 'Juz Amma Scholar',
    description: 'Review all Juz 30 cards',
    icon: '\u{2B50}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'juz::30', count: 37 },
  },
  {
    id: 'quran_devotee',
    name: 'Quran Devotee',
    description: 'Review 500 Quran ayahs',
    icon: '\u{1F54C}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'quran', count: 500 },
  },

  // ---- Language-Specific ----
  {
    id: 'spanish_starter',
    name: 'Hola!',
    description: 'Learn 25 Spanish words',
    icon: '\u{1F1EA}\u{1F1F8}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'language::spanish', count: 25 },
  },
  {
    id: 'spanish_centurion',
    name: 'Spanish Centurion',
    description: 'Learn 100 Spanish words',
    icon: '\u{1F1EA}\u{1F1F8}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'language::spanish', count: 100 },
  },
  {
    id: 'arabic_scholar',
    name: 'Arabic Scholar',
    description: 'Learn 200 Classical Arabic words',
    icon: '\u{1F4DC}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'language::classical-arabic', count: 200 },
  },
  {
    id: 'arabic_sage',
    name: 'Arabic Sage',
    description: 'Learn 500 Classical Arabic words',
    icon: '\u{1F9D9}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'language::classical-arabic', count: 500 },
  },
  {
    id: 'masri_speaker',
    name: 'Masri Speaker',
    description: 'Learn 100 Egyptian Arabic phrases',
    icon: '\u{1F1EA}\u{1F1EC}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'language::egyptian-arabic', count: 100 },
  },
  {
    id: 'masri_fluent',
    name: 'Masri Fluent',
    description: 'Learn 300 Egyptian Arabic phrases',
    icon: '\u{1F1EA}\u{1F1EC}',
    hidden: false,
    condition: { type: 'cards_with_tag', tagPattern: 'language::egyptian-arabic', count: 300 },
  },

  // ---- Session Quality ----
  {
    id: 'perfect_ten',
    name: 'Perfect Ten',
    description: 'Complete 10 perfect sessions (no "again" presses)',
    icon: '\u{1F48E}',
    hidden: false,
    condition: { type: 'perfect_sessions', count: 10 },
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: '7 consecutive days of 100% accuracy',
    icon: '\u{1F48E}',
    hidden: false,
    condition: { type: 'accuracy_streak', days: 7, minAccuracy: 1.0 },
  },
  {
    id: 'high_accuracy_month',
    name: 'Precision Month',
    description: '30 days with at least 90% accuracy',
    icon: '\u{1F3AF}',
    hidden: false,
    condition: { type: 'accuracy_streak', days: 30, minAccuracy: 0.9 },
  },

  // ---- Hidden / Surprise ----
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Study after 11 PM',
    icon: '\u{1F989}',
    hidden: true,
    condition: { type: 'time_of_day', after: 23, before: 5 },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Study before 6 AM',
    icon: '\u{1F426}',
    hidden: true,
    condition: { type: 'time_of_day', after: 4, before: 6 },
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Average <5s per card in a 20+ card session',
    icon: '\u{26A1}',
    hidden: true,
    condition: { type: 'speed', maxSecondsPerCard: 5, minCards: 20 },
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    description: 'Study 3+ languages in one day',
    icon: '\u{1F30D}',
    hidden: true,
    condition: { type: 'languages_in_day', count: 3 },
  },
  {
    id: 'hyperpolyglot',
    name: 'Hyperpolyglot',
    description: 'Study 5+ languages in one day',
    icon: '\u{1F30F}',
    hidden: true,
    condition: { type: 'languages_in_day', count: 5 },
  },

  // ---- Level Milestones ----
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '\u{2B50}',
    hidden: false,
    condition: { type: 'level_reached', level: 5 },
  },
  {
    id: 'level_10',
    name: 'Established',
    description: 'Reach level 10',
    icon: '\u{1F31F}',
    hidden: false,
    condition: { type: 'level_reached', level: 10 },
  },
  {
    id: 'level_25',
    name: 'Veteran',
    description: 'Reach level 25',
    icon: '\u{1F3C5}',
    hidden: false,
    condition: { type: 'level_reached', level: 25 },
  },
  {
    id: 'level_50',
    name: 'Grand Master',
    description: 'Reach level 50',
    icon: '\u{1F451}',
    hidden: false,
    condition: { type: 'level_reached', level: 50 },
  },
];

// ---------------------------------------------------------------------------
// AchievementService
// ---------------------------------------------------------------------------

export class AchievementService {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Check all achievements after a study session completes.
   *
   * Iterates through every achievement the user has NOT yet earned and
   * evaluates its condition against the provided session context and
   * database state. Newly earned achievements are persisted and returned.
   *
   * @param userId - The user to check achievements for.
   * @param sessionContext - Data from the completed session.
   * @returns Array of newly unlocked achievements (may be empty).
   */
  async checkAchievements(
    userId: string,
    sessionContext: SessionContext
  ): Promise<AchievementUnlock[]> {
    // Get already-earned achievement IDs
    const earnedResult = await pool.query(
      `SELECT achievement_id FROM user_achievements WHERE user_id = $1`,
      [userId]
    );
    const earnedIds = new Set(earnedResult.rows.map((r) => r.achievement_id));

    // Check each unearned achievement
    const newUnlocks: AchievementUnlock[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (earnedIds.has(achievement.id)) continue;

      const earned = await this.evaluateCondition(
        userId,
        achievement.condition,
        sessionContext
      );

      if (earned) {
        const now = new Date();
        await pool.query(
          `INSERT INTO user_achievements (user_id, achievement_id, earned_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, achievement_id) DO NOTHING`,
          [userId, achievement.id, now]
        );
        newUnlocks.push({ achievement, earnedAt: now });
      }
    }

    return newUnlocks;
  }

  /**
   * Get all achievements with earned status and progress for a user.
   *
   * Hidden achievements that have not been earned are included but
   * with their name and description redacted until earned.
   *
   * @param userId - The user to query.
   * @returns Array of all achievements with status and progress.
   */
  async getAllAchievements(userId: string): Promise<AchievementWithStatus[]> {
    const earnedResult = await pool.query(
      `SELECT achievement_id, earned_at
       FROM user_achievements
       WHERE user_id = $1`,
      [userId]
    );

    const earnedMap = new Map<string, Date>(
      earnedResult.rows.map((r) => [r.achievement_id, r.earned_at])
    );

    const results: AchievementWithStatus[] = [];

    for (const def of ACHIEVEMENTS) {
      const earnedAt = earnedMap.get(def.id) ?? null;
      const earned = earnedAt !== null;
      const progress = earned
        ? 1.0
        : await this.getProgress(userId, def.condition);

      const visibleDef = !earned && def.hidden
        ? {
            ...def,
            name: '???',
            description: 'Hidden achievement -- keep studying to discover it!',
          }
        : def;

      results.push({
        definition: visibleDef,
        earned,
        earnedAt,
        progress,
      });
    }

    return results;
  }

  /**
   * Get recently earned achievements for notification display.
   *
   * @param userId - The user to query.
   * @param limit - Maximum number of achievements to return (default: 10).
   * @returns Array of recently earned achievements, newest first.
   */
  async getRecentAchievements(
    userId: string,
    limit: number = 10
  ): Promise<AchievementUnlock[]> {
    const result = await pool.query(
      `SELECT achievement_id, earned_at
       FROM user_achievements
       WHERE user_id = $1
       ORDER BY earned_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const achievementMap = new Map(
      ACHIEVEMENTS.map((a) => [a.id, a])
    );

    return result.rows
      .map((row) => {
        const achievement = achievementMap.get(row.achievement_id);
        if (!achievement) return null;
        return { achievement, earnedAt: row.earned_at };
      })
      .filter((a): a is AchievementUnlock => a !== null);
  }

  // -------------------------------------------------------------------------
  // Condition Evaluation
  // -------------------------------------------------------------------------

  /**
   * Evaluate a single achievement condition against the current state.
   *
   * Dispatches to the appropriate evaluation method based on the
   * condition's discriminant type.
   *
   * @param userId - The user being evaluated.
   * @param condition - The achievement condition to check.
   * @param ctx - Session context with current session data.
   * @returns True if the condition is met.
   */
  private async evaluateCondition(
    userId: string,
    condition: AchievementCondition,
    ctx: SessionContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'total_reviews':
        return this.checkTotalReviews(userId, condition.count);

      case 'streak_days':
        return ctx.currentStreak >= condition.days;

      case 'perfect_sessions':
        return this.checkPerfectSessions(userId, condition.count);

      case 'cards_with_tag':
        return this.checkCardsWithTag(userId, condition.tagPattern, condition.count);

      case 'languages_in_day':
        return ctx.languagesStudied.length >= condition.count;

      case 'time_of_day':
        return this.checkTimeOfDay(ctx.hourOfDay, condition.after, condition.before);

      case 'speed':
        return (
          ctx.totalCards >= condition.minCards &&
          ctx.averageTimePerCardMs / 1000 <= condition.maxSecondsPerCard
        );

      case 'accuracy_streak':
        return this.checkAccuracyStreak(userId, condition.days, condition.minAccuracy);

      case 'level_reached':
        return ctx.currentLevel >= condition.level;

      default:
        return false;
    }
  }

  /**
   * Check if the user has reviewed at least `count` total cards.
   */
  private async checkTotalReviews(userId: string, count: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1`,
      [userId]
    );
    return result.rows[0].total >= count;
  }

  /**
   * Check if the user has completed at least `count` perfect sessions
   * (sessions with zero "again" presses).
   *
   * A "session" is approximated as a contiguous group of reviews within
   * a 2-hour window on the same day.
   */
  private async checkPerfectSessions(userId: string, count: number): Promise<boolean> {
    const result = await pool.query(
      `WITH daily_sessions AS (
         SELECT DATE(rl.reviewed_at) AS study_date,
                COUNT(*) FILTER (WHERE rl.rating = 'again') AS again_count,
                COUNT(*) AS total_count
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
         GROUP BY DATE(rl.reviewed_at)
         HAVING COUNT(*) >= 5
       )
       SELECT COUNT(*)::int AS perfect_count
       FROM daily_sessions
       WHERE again_count = 0`,
      [userId]
    );
    return result.rows[0].perfect_count >= count;
  }

  /**
   * Check if the user has reviewed at least `count` cards that have a tag
   * matching the given pattern.
   *
   * Tag patterns support `::` hierarchy separators and `*` wildcards:
   * - `quran` -- exact match on slug
   * - `root::*` -- any tag whose slug starts with `root::`
   * - `language::spanish` -- exact hierarchical match
   * - `juz::30` -- exact hierarchical match
   */
  private async checkCardsWithTag(
    userId: string,
    tagPattern: string,
    count: number
  ): Promise<boolean> {
    // Convert the tag pattern to a SQL LIKE pattern
    const sqlPattern = tagPattern.replace(/\*/g, '%');
    const isWildcard = tagPattern.includes('*');

    const result = await pool.query(
      `SELECT COUNT(DISTINCT c.id)::int AS card_count
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       JOIN note_tags nt ON n.id = nt.note_id
       JOIN tags t ON nt.tag_id = t.id
       WHERE n.user_id = $1
         AND c.reps > 0
         AND ${isWildcard ? 't.slug LIKE $2' : 't.slug = $2'}`,
      [userId, sqlPattern]
    );
    return result.rows[0].card_count >= count;
  }

  /**
   * Check if the current hour falls within the specified time-of-day range.
   *
   * Handles wrap-around (e.g., after=23, before=5 means 11 PM to 5 AM).
   */
  private checkTimeOfDay(hour: number, after: number, before: number): boolean {
    if (after < before) {
      // Normal range (e.g., 4-6)
      return hour >= after && hour < before;
    }
    // Wrap-around range (e.g., 23-5)
    return hour >= after || hour < before;
  }

  /**
   * Check if the user has maintained at least `minAccuracy` for `days`
   * consecutive days.
   *
   * Uses a window function to find the longest run of consecutive days
   * meeting the accuracy threshold.
   */
  private async checkAccuracyStreak(
    userId: string,
    days: number,
    minAccuracy: number
  ): Promise<boolean> {
    const result = await pool.query(
      `WITH daily_accuracy AS (
         SELECT DATE(rl.reviewed_at) AS study_date,
                1.0 - (COUNT(*) FILTER (WHERE rl.rating = 'again')::float
                       / NULLIF(COUNT(*), 0)) AS accuracy
         FROM review_logs rl
         JOIN cards c ON rl.card_id = c.id
         JOIN notes n ON c.note_id = n.id
         WHERE n.user_id = $1
         GROUP BY DATE(rl.reviewed_at)
         HAVING COUNT(*) >= 5
       ),
       meets_threshold AS (
         SELECT study_date,
                accuracy >= $2 AS meets,
                study_date - (ROW_NUMBER() OVER (
                  ORDER BY study_date
                ))::int * INTERVAL '1 day' AS grp
         FROM daily_accuracy
         WHERE accuracy >= $2
       ),
       streaks AS (
         SELECT COUNT(*)::int AS streak_length
         FROM meets_threshold
         GROUP BY grp
       )
       SELECT COALESCE(MAX(streak_length), 0)::int AS max_streak
       FROM streaks`,
      [userId, minAccuracy]
    );
    return result.rows[0].max_streak >= days;
  }

  /**
   * Calculate partial progress toward an achievement condition.
   *
   * Returns a value in [0, 1] representing how close the user is
   * to meeting the condition. Used for progress bars in the UI.
   */
  private async getProgress(
    userId: string,
    condition: AchievementCondition
  ): Promise<number> {
    switch (condition.type) {
      case 'total_reviews': {
        const result = await pool.query(
          `SELECT COUNT(*)::int AS total
           FROM review_logs rl
           JOIN cards c ON rl.card_id = c.id
           JOIN notes n ON c.note_id = n.id
           WHERE n.user_id = $1`,
          [userId]
        );
        return Math.min(1, result.rows[0].total / condition.count);
      }

      case 'streak_days': {
        const result = await pool.query(
          `SELECT streak_current FROM users WHERE id = $1`,
          [userId]
        );
        if (result.rows.length === 0) return 0;
        return Math.min(1, result.rows[0].streak_current / condition.days);
      }

      case 'cards_with_tag': {
        const sqlPattern = condition.tagPattern.replace(/\*/g, '%');
        const isWildcard = condition.tagPattern.includes('*');
        const result = await pool.query(
          `SELECT COUNT(DISTINCT c.id)::int AS card_count
           FROM cards c
           JOIN notes n ON c.note_id = n.id
           JOIN note_tags nt ON n.id = nt.note_id
           JOIN tags t ON nt.tag_id = t.id
           WHERE n.user_id = $1
             AND c.reps > 0
             AND ${isWildcard ? 't.slug LIKE $2' : 't.slug = $2'}`,
          [userId, sqlPattern]
        );
        return Math.min(1, result.rows[0].card_count / condition.count);
      }

      case 'perfect_sessions': {
        const result = await pool.query(
          `WITH daily_sessions AS (
             SELECT DATE(rl.reviewed_at) AS study_date,
                    COUNT(*) FILTER (WHERE rl.rating = 'again') AS again_count
             FROM review_logs rl
             JOIN cards c ON rl.card_id = c.id
             JOIN notes n ON c.note_id = n.id
             WHERE n.user_id = $1
             GROUP BY DATE(rl.reviewed_at)
             HAVING COUNT(*) >= 5
           )
           SELECT COUNT(*)::int AS perfect_count
           FROM daily_sessions
           WHERE again_count = 0`,
          [userId]
        );
        return Math.min(1, result.rows[0].perfect_count / condition.count);
      }

      case 'level_reached': {
        const result = await pool.query(
          `SELECT xp_total FROM users WHERE id = $1`,
          [userId]
        );
        if (result.rows.length === 0) return 0;
        const xp = Number(result.rows[0].xp_total);
        const level = Math.floor(Math.pow(xp / 50, 1 / 1.5));
        return Math.min(1, level / condition.level);
      }

      default:
        // Progress is not computable for time-based, speed, etc.
        return 0;
    }
  }
}
