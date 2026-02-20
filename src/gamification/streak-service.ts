/**
 * streak-service.ts -- Daily study streak tracking, streak freeze management,
 * and milestone detection.
 *
 * Streaks are one of the most psychologically effective retention tools in
 * spaced repetition. This service handles:
 *
 * 1. **Streak updates** -- Incrementing the streak when a user studies on a
 *    new calendar day, handling timezone-aware date comparisons.
 *
 * 2. **Streak freezes** -- Protective tokens that prevent a streak from
 *    breaking if the user misses a single day. Earned every 7 consecutive
 *    study days, with a maximum of 3 held at once.
 *
 * 3. **Milestones** -- Predefined day counts (7, 14, 30, 60, 90, 180, 365)
 *    that trigger special celebrations in the UI.
 *
 * 4. **Flame visualization** -- A three-tier flame state that grows more
 *    intense with longer streaks, providing ambient visual feedback.
 */

import { pool } from '../db/connection';
import type { StreakInfo, StreakUpdate, StreakStatus } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Day counts at which milestone celebrations are triggered. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365] as const;

/** Maximum number of streak freezes a user can hold at once. */
const MAX_FREEZES = 3;

/** Streak freezes are earned every N consecutive days. */
const FREEZE_EARN_INTERVAL = 7;

// ---------------------------------------------------------------------------
// StreakService
// ---------------------------------------------------------------------------

export class StreakService {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Update the user's streak after completing a study session.
   *
   * Date comparison uses the user's configured day boundary (defaulting to
   * 4:00 AM local time) to determine whether two timestamps fall on the
   * "same study day." This prevents late-night sessions from counting
   * as the next day.
   *
   * If the user already studied today, the streak is unchanged.
   * If the user studied yesterday, the streak increments.
   * If the user missed more than one day:
   *   - A streak freeze is consumed if available, preserving the streak.
   *   - Otherwise the streak resets to 1.
   *
   * @param userId - The user whose streak to update.
   * @returns Details of the streak change, including milestone and freeze info.
   */
  async updateStreak(userId: string): Promise<StreakUpdate> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `SELECT streak_current, streak_longest, streak_freezes_available,
                last_study_date,
                COALESCE((settings->>'day_boundary_hour')::int, 4) AS day_boundary
         FROM users
         WHERE id = $1
         FOR UPDATE`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User "${userId}" not found`);
      }

      const user = userResult.rows[0];
      const streakBefore: number = user.streak_current;
      const longestBefore: number = user.streak_longest;
      const freezes: number = user.streak_freezes_available;
      const lastStudyDate: string | null = user.last_study_date;
      const dayBoundary: number = user.day_boundary;

      const today = this.getStudyDate(new Date(), dayBoundary);
      const lastDate = lastStudyDate
        ? this.getStudyDate(new Date(lastStudyDate + 'T12:00:00'), dayBoundary)
        : null;

      let streakAfter = streakBefore;
      let frozenUsed = false;
      let freezeEarned = false;
      let newFreezes = freezes;

      if (lastDate === today) {
        // Already studied today -- no change
        await client.query('COMMIT');
        return {
          streakBefore,
          streakAfter: streakBefore,
          frozenUsed: false,
          milestoneReached: null,
          freezeEarned: false,
        };
      }

      const daysSinceLastStudy = lastDate
        ? this.daysBetween(lastDate, today)
        : null;

      if (daysSinceLastStudy === 1) {
        // Studied yesterday -- increment streak
        streakAfter = streakBefore + 1;
      } else if (daysSinceLastStudy === 2 && freezes > 0) {
        // Missed exactly one day with a freeze available
        streakAfter = streakBefore + 1;
        frozenUsed = true;
        newFreezes = freezes - 1;
      } else {
        // Missed multiple days or no freeze -- reset
        streakAfter = 1;
      }

      // Check if a new freeze is earned (every 7 consecutive days)
      if (
        streakAfter > 0 &&
        streakAfter % FREEZE_EARN_INTERVAL === 0 &&
        newFreezes < MAX_FREEZES
      ) {
        newFreezes += 1;
        freezeEarned = true;
      }

      // Update the longest streak if needed
      const longestAfter = Math.max(longestBefore, streakAfter);

      await client.query(
        `UPDATE users
         SET streak_current = $1,
             streak_longest = $2,
             streak_freezes_available = $3,
             last_study_date = $4
         WHERE id = $5`,
        [streakAfter, longestAfter, newFreezes, today, userId]
      );

      await client.query('COMMIT');

      const milestoneReached = this.checkMilestone(streakAfter);

      return {
        streakBefore,
        streakAfter,
        frozenUsed,
        milestoneReached,
        freezeEarned,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check the user's streak status on login.
   *
   * If the user missed yesterday without studying, this method auto-consumes
   * a freeze if available. If no freeze is available and the streak would
   * have broken, the streak resets to 0 (they haven't studied today yet).
   *
   * This is called on login/app-open to ensure the UI shows accurate data
   * before the user starts a session.
   *
   * @param userId - The user to check.
   * @returns Current streak status including any freeze consumption.
   */
  async checkStreakOnLogin(userId: string): Promise<StreakStatus> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `SELECT streak_current, streak_freezes_available, last_study_date,
                COALESCE((settings->>'day_boundary_hour')::int, 4) AS day_boundary
         FROM users
         WHERE id = $1
         FOR UPDATE`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User "${userId}" not found`);
      }

      const user = userResult.rows[0];
      const streak: number = user.streak_current;
      const freezes: number = user.streak_freezes_available;
      const lastStudyDate: string | null = user.last_study_date;
      const dayBoundary: number = user.day_boundary;

      const today = this.getStudyDate(new Date(), dayBoundary);
      const lastDate = lastStudyDate
        ? this.getStudyDate(new Date(lastStudyDate + 'T12:00:00'), dayBoundary)
        : null;

      // If never studied or studied today, streak is fine
      if (!lastDate || lastDate === today) {
        await client.query('COMMIT');
        return {
          isActive: streak > 0,
          currentStreak: streak,
          freezeUsed: false,
          freezesRemaining: freezes,
        };
      }

      const daysMissed = this.daysBetween(lastDate, today);

      if (daysMissed === 1) {
        // Yesterday -- streak is still valid, user just needs to study today
        await client.query('COMMIT');
        return {
          isActive: true,
          currentStreak: streak,
          freezeUsed: false,
          freezesRemaining: freezes,
        };
      }

      if (daysMissed === 2 && freezes > 0) {
        // Missed exactly one day -- auto-consume a freeze
        await client.query(
          `UPDATE users
           SET streak_freezes_available = streak_freezes_available - 1,
               last_study_date = $1
           WHERE id = $2`,
          [this.addDays(lastDate, 1), userId]
        );
        await client.query('COMMIT');
        return {
          isActive: true,
          currentStreak: streak,
          freezeUsed: true,
          freezesRemaining: freezes - 1,
        };
      }

      // Streak is broken
      await client.query(
        `UPDATE users SET streak_current = 0 WHERE id = $1`,
        [userId]
      );
      await client.query('COMMIT');

      return {
        isActive: false,
        currentStreak: 0,
        freezeUsed: false,
        freezesRemaining: freezes,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check and potentially award a streak freeze.
   *
   * Freezes are earned every 7 consecutive study days, capped at 3.
   * This is typically called as part of {@link updateStreak} but can also
   * be invoked independently for testing or manual awards.
   *
   * @param userId - The user to check.
   * @returns True if a freeze was awarded, false otherwise.
   */
  async checkAndAwardFreeze(userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT streak_current, streak_freezes_available
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    const streak = result.rows[0].streak_current;
    const freezes = result.rows[0].streak_freezes_available;

    if (streak > 0 && streak % FREEZE_EARN_INTERVAL === 0 && freezes < MAX_FREEZES) {
      await pool.query(
        `UPDATE users
         SET streak_freezes_available = streak_freezes_available + 1
         WHERE id = $1`,
        [userId]
      );
      return true;
    }

    return false;
  }

  /**
   * Get comprehensive streak information for the UI.
   *
   * @param userId - The user to query.
   * @returns Full streak details including flame state and milestone progress.
   */
  async getStreakInfo(userId: string): Promise<StreakInfo> {
    const result = await pool.query(
      `SELECT streak_current, streak_longest, streak_freezes_available,
              last_study_date
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User "${userId}" not found`);
    }

    const user = result.rows[0];
    const current: number = user.streak_current;
    const longest: number = user.streak_longest;
    const freezesAvailable: number = user.streak_freezes_available;
    const lastStudyDate: string = user.last_study_date ?? '';

    const nextMilestone = this.getNextMilestone(current);
    const daysUntilNextMilestone = nextMilestone - current;

    return {
      current,
      longest,
      freezesAvailable,
      lastStudyDate,
      flameState: this.getFlameState(current),
      nextMilestone,
      daysUntilNextMilestone,
    };
  }

  /**
   * Determine the visual flame state based on the current streak length.
   *
   * The thresholds are chosen to provide clear visual differentiation:
   * - small:  1-6 days   -- a flickering flame, just getting started
   * - medium: 7-29 days  -- a steady flame, consistent habit forming
   * - large:  30+ days   -- a roaring flame, deep commitment
   *
   * @param streakDays - Current streak in days.
   * @returns The flame visual tier.
   */
  getFlameState(streakDays: number): 'small' | 'medium' | 'large' {
    if (streakDays >= 30) return 'large';
    if (streakDays >= 7) return 'medium';
    return 'small';
  }

  /**
   * Check whether the current streak has reached a milestone.
   *
   * @param streakDays - Current streak in days.
   * @returns The milestone number if exactly reached, or null otherwise.
   */
  checkMilestone(streakDays: number): number | null {
    if ((STREAK_MILESTONES as readonly number[]).includes(streakDays)) {
      return streakDays;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Get the next milestone day count after the current streak.
   *
   * @param currentStreak - Current streak in days.
   * @returns The next milestone, or the streak + 365 if all milestones passed.
   */
  private getNextMilestone(currentStreak: number): number {
    for (const milestone of STREAK_MILESTONES) {
      if (milestone > currentStreak) return milestone;
    }
    // Beyond all predefined milestones -- next is the next multiple of 365
    const nextYearMilestone =
      Math.ceil((currentStreak + 1) / 365) * 365;
    return nextYearMilestone;
  }

  /**
   * Compute the "study date" for a given timestamp, respecting the day
   * boundary hour.
   *
   * If the current time is before the boundary hour, the study date is
   * considered to be the previous calendar day. This ensures that a
   * late-night session at 2 AM counts as part of the previous day's
   * study, not the next.
   *
   * @param date - The timestamp to convert.
   * @param dayBoundaryHour - The hour (0-23) at which a new study day begins.
   * @returns An ISO date string (YYYY-MM-DD) representing the study date.
   */
  private getStudyDate(date: Date, dayBoundaryHour: number): string {
    const d = new Date(date);
    if (d.getHours() < dayBoundaryHour) {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split('T')[0];
  }

  /**
   * Calculate the number of days between two ISO date strings.
   *
   * @param dateA - The earlier date (YYYY-MM-DD).
   * @param dateB - The later date (YYYY-MM-DD).
   * @returns Integer number of days between the two dates.
   */
  private daysBetween(dateA: string, dateB: string): number {
    const a = new Date(dateA + 'T00:00:00');
    const b = new Date(dateB + 'T00:00:00');
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Add a number of days to an ISO date string.
   *
   * @param dateStr - Base date (YYYY-MM-DD).
   * @param days - Number of days to add.
   * @returns New ISO date string.
   */
  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
