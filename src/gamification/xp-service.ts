/**
 * xp-service.ts -- Experience point calculation, level progression, and
 * cosmetic unlock management.
 *
 * The XP system uses a power-curve leveling formula that provides frequent
 * early levels (to maintain initial momentum) while spacing later levels
 * further apart (to give long-term learners a sustained sense of progress).
 *
 * Level formula:  level = floor((xp / 50) ^ (1 / 1.5))
 * Inverse:        xp = 50 * (level ^ 1.5)
 *
 * Cosmetics are purely visual rewards that unlock at specific levels.
 * They never affect scheduling or study mechanics.
 */

import { pool } from '../db/connection';
import type {
  Rating,
  LevelProgress,
  CosmeticUnlock,
  XPAwardResult,
  SessionBonusResult,
  SessionSummary,
} from './types';

// ---------------------------------------------------------------------------
// XP Reward Constants
// ---------------------------------------------------------------------------

/**
 * Base XP awarded per review, indexed by the rating given.
 *
 * Higher-quality recalls earn more XP, but even an "again" press
 * earns points -- the act of showing up and engaging is always rewarded.
 */
export const XP_REWARDS: Record<Rating, number> = {
  again: 10,
  hard: 15,
  good: 20,
  easy: 30,
} as const;

/**
 * Multipliers applied to session totals when certain conditions are met.
 *
 * Multipliers stack additively on the base XP, not multiplicatively with
 * each other. For example, a session earning 200 base XP with both
 * perfectSession and routineBonus would receive:
 *   200 * (1.5 - 1) + 200 * (1.25 - 1) = 100 + 50 = 150 bonus XP.
 *
 * This prevents runaway XP inflation while still feeling rewarding.
 */
export const XP_MULTIPLIERS = {
  /** No "again" presses in the entire session. */
  perfectSession: 1.5,

  /** All due cards reviewed for the day. */
  allDueCompleted: 2.0,

  /** Studying within the first hour of the user's usual study time. */
  routineBonus: 1.25,
} as const;

// ---------------------------------------------------------------------------
// Cosmetic Unlocks Catalog
// ---------------------------------------------------------------------------

/**
 * Complete catalog of cosmetic unlocks, ordered by level.
 *
 * The unlock cadence is designed so that:
 * - Levels 1-5:  unlocks every level (rapid early gratification)
 * - Levels 5-15: unlocks every 2-3 levels (sustained engagement)
 * - Levels 15+:  unlocks every 5 levels (prestige / rarity)
 */
const COSMETIC_CATALOG: CosmeticUnlock[] = [
  { type: 'accent_color', name: 'Indigo Accent', description: 'A deep indigo accent color for your interface', unlockedAtLevel: 1 },
  { type: 'card_theme', name: 'Parchment', description: 'Warm parchment-textured card background', unlockedAtLevel: 2 },
  { type: 'accent_color', name: 'Emerald Accent', description: 'A rich emerald green accent', unlockedAtLevel: 3 },
  { type: 'dashboard_widget', name: 'Weekly Heatmap', description: 'Activity heatmap on your dashboard', unlockedAtLevel: 4 },
  { type: 'card_theme', name: 'Midnight', description: 'Dark card theme with subtle blue undertones', unlockedAtLevel: 5 },
  { type: 'accent_color', name: 'Amber Accent', description: 'Warm amber accent color', unlockedAtLevel: 7 },
  { type: 'dashboard_widget', name: 'Accuracy Trend', description: 'Rolling 30-day accuracy trend chart', unlockedAtLevel: 8 },
  { type: 'card_theme', name: 'Calligraphy', description: 'Card theme with Arabic calligraphy borders', unlockedAtLevel: 10 },
  { type: 'accent_color', name: 'Ruby Accent', description: 'Deep ruby red accent', unlockedAtLevel: 12 },
  { type: 'dashboard_widget', name: 'Language Balance', description: 'Pie chart showing study time per language', unlockedAtLevel: 13 },
  { type: 'card_theme', name: 'Arabesque', description: 'Geometric arabesque pattern card borders', unlockedAtLevel: 15 },
  { type: 'accent_color', name: 'Sapphire Accent', description: 'Royal sapphire blue accent', unlockedAtLevel: 18 },
  { type: 'dashboard_widget', name: 'Forecast Widget', description: 'Upcoming review load forecast on dashboard', unlockedAtLevel: 20 },
  { type: 'card_theme', name: 'Scholar', description: 'Classic scholarly theme with serif typography', unlockedAtLevel: 25 },
  { type: 'accent_color', name: 'Gold Accent', description: 'Prestigious gold accent for dedicated scholars', unlockedAtLevel: 30 },
  { type: 'dashboard_widget', name: 'Root Network', description: 'Interactive Arabic root word network graph', unlockedAtLevel: 35 },
  { type: 'card_theme', name: 'Illuminated', description: 'Medieval manuscript-inspired illuminated borders', unlockedAtLevel: 40 },
  { type: 'accent_color', name: 'Obsidian Accent', description: 'Sleek obsidian accent for the truly dedicated', unlockedAtLevel: 50 },
];

// ---------------------------------------------------------------------------
// XPService
// ---------------------------------------------------------------------------

export class XPService {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Award XP for a single card review.
   *
   * Looks up the base XP from {@link XP_REWARDS} for the given rating,
   * adds it to the user's total, and checks for a level-up.
   *
   * @param userId - The user receiving the XP.
   * @param rating - The rating given to the card ('again' | 'hard' | 'good' | 'easy').
   * @returns An object describing the XP earned, the total, and whether a level-up occurred.
   */
  async awardReviewXP(userId: string, rating: Rating): Promise<XPAwardResult> {
    const xpEarned = XP_REWARDS[rating];

    const result = await pool.query(
      `UPDATE users
       SET xp_total = xp_total + $1
       WHERE id = $2
       RETURNING xp_total`,
      [xpEarned, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User "${userId}" not found`);
    }

    const totalXP = Number(result.rows[0].xp_total);
    const levelBefore = this.calculateLevel(totalXP - xpEarned);
    const levelAfter = this.calculateLevel(totalXP);

    return {
      xpEarned,
      totalXP,
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
    };
  }

  /**
   * Apply session-completion bonuses on top of the base XP already earned.
   *
   * Multipliers are evaluated independently and stack additively:
   *   bonusXP = sum of (baseXP * (multiplier - 1)) for each qualifying multiplier.
   *
   * @param userId - The user to apply bonuses for.
   * @param session - Summary of the completed session.
   * @returns Total bonus XP and the names of applied multipliers.
   */
  async applySessionBonuses(
    userId: string,
    session: SessionSummary
  ): Promise<SessionBonusResult> {
    const appliedMultipliers: string[] = [];
    let bonusXP = 0;
    const baseXP = session.xpEarned;

    // Perfect session: no "again" presses
    if (session.againCount === 0 && session.totalCards > 0) {
      bonusXP += Math.round(baseXP * (XP_MULTIPLIERS.perfectSession - 1));
      appliedMultipliers.push('Perfect Session (1.5x)');
    }

    // All due cards completed for the day
    const dueRemaining = await this.getDueCardCount(userId);
    if (dueRemaining === 0) {
      bonusXP += Math.round(baseXP * (XP_MULTIPLIERS.allDueCompleted - 1));
      appliedMultipliers.push('All Due Completed (2.0x)');
    }

    // Routine bonus: studying within the user's habitual study window
    const isRoutine = await this.isWithinRoutineWindow(userId);
    if (isRoutine) {
      bonusXP += Math.round(baseXP * (XP_MULTIPLIERS.routineBonus - 1));
      appliedMultipliers.push('Study Routine (1.25x)');
    }

    // Persist the bonus XP
    if (bonusXP > 0) {
      await pool.query(
        `UPDATE users SET xp_total = xp_total + $1 WHERE id = $2`,
        [bonusXP, userId]
      );
    }

    return { bonusXP, multipliers: appliedMultipliers };
  }

  /**
   * Calculate the user's level from their total XP.
   *
   * Formula: level = floor((xp / 50) ^ (1 / 1.5))
   *
   * This produces a power curve where early levels come quickly
   * and later levels require exponentially more XP:
   *   Level 1:    50 XP
   *   Level 5:   559 XP
   *   Level 10: 1,581 XP
   *   Level 20: 4,472 XP
   *   Level 50: 17,678 XP
   *
   * @param xp - Total accumulated XP.
   * @returns The level number (0 if xp < 50).
   */
  calculateLevel(xp: number): number {
    if (xp < 50) return 0;
    return Math.floor(Math.pow(xp / 50, 1 / 1.5));
  }

  /**
   * Calculate the total XP required to reach a given level.
   *
   * Inverse of the level formula: xp = 50 * (level ^ 1.5)
   *
   * @param level - The target level.
   * @returns Total XP needed to reach the start of that level.
   */
  xpForLevel(level: number): number {
    if (level <= 0) return 0;
    return Math.round(50 * Math.pow(level, 1.5));
  }

  /**
   * Calculate the total XP required to reach the level after the given one.
   *
   * @param currentLevel - The user's current level.
   * @returns Total XP needed to reach the start of currentLevel + 1.
   */
  xpForNextLevel(currentLevel: number): number {
    return this.xpForLevel(currentLevel + 1);
  }

  /**
   * Get comprehensive level progress data for the UI.
   *
   * @param userId - The user to query.
   * @returns Level progress including XP, percentage, and unlocked cosmetics.
   */
  async getLevelProgress(userId: string): Promise<LevelProgress> {
    const result = await pool.query(
      `SELECT xp_total FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User "${userId}" not found`);
    }

    const currentXP = Number(result.rows[0].xp_total);
    const currentLevel = this.calculateLevel(currentXP);
    const xpForCurrentLevel = this.xpForLevel(currentLevel);
    const xpForNext = this.xpForNextLevel(currentLevel);
    const levelRange = xpForNext - xpForCurrentLevel;

    const progressPercent =
      levelRange > 0
        ? Math.min(
            100,
            Math.round(((currentXP - xpForCurrentLevel) / levelRange) * 100)
          )
        : 0;

    return {
      currentLevel,
      currentXP,
      xpForCurrentLevel,
      xpForNextLevel: xpForNext,
      progressPercent,
      unlockedCosmetics: this.getUnlocksUpToLevel(currentLevel),
    };
  }

  /**
   * Get all cosmetic unlocks available at or below a given level.
   *
   * @param level - The level to check against.
   * @returns Array of unlocked cosmetics, ordered by unlock level.
   */
  getUnlocksForLevel(level: number): CosmeticUnlock[] {
    return COSMETIC_CATALOG.filter((c) => c.unlockedAtLevel === level);
  }

  /**
   * Get all cosmetic unlocks available up to and including a given level.
   *
   * @param level - The maximum level to include.
   * @returns Array of all unlocked cosmetics up to the given level.
   */
  getUnlocksUpToLevel(level: number): CosmeticUnlock[] {
    return COSMETIC_CATALOG.filter((c) => c.unlockedAtLevel <= level);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Count how many cards are still due for the user today.
   *
   * @param userId - The user to check.
   * @returns Number of active cards currently due.
   */
  private async getDueCardCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.status = 'active'
         AND c.due <= NOW()`,
      [userId]
    );

    return result.rows[0].count;
  }

  /**
   * Determine whether the current time falls within the user's habitual
   * study window (first hour of their most common study time).
   *
   * Analyzes the user's review history to find the most frequent hour
   * of study, then checks if the current hour matches.
   *
   * @param userId - The user to check.
   * @returns True if studying within the routine window.
   */
  private async isWithinRoutineWindow(userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXTRACT(HOUR FROM rl.reviewed_at) AS study_hour,
              COUNT(*) AS review_count
       FROM review_logs rl
       JOIN cards c ON rl.card_id = c.id
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND rl.reviewed_at >= NOW() - INTERVAL '30 days'
       GROUP BY study_hour
       ORDER BY review_count DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    const mostCommonHour = Number(result.rows[0].study_hour);
    const currentHour = new Date().getHours();

    // Within the same hour or the next hour (one-hour window)
    return (
      currentHour === mostCommonHour ||
      currentHour === (mostCommonHour + 1) % 24
    );
  }
}
