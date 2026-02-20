// @ts-nocheck
/**
 * Gamification Routes
 *
 * XP and leveling, streaks, achievements, and leaderboard endpoints.
 * All routes require authentication.
 *
 * Routes:
 * - GET  /api/gamification/xp           — Get user's XP and level
 * - GET  /api/gamification/streak       — Get streak info
 * - GET  /api/gamification/achievements — Get all achievements (earned + locked)
 * - POST /api/gamification/streak/freeze — Use a streak freeze
 * - GET  /api/gamification/leaderboard  — Optional weekly XP leaderboard
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../db/connection';
import { ApiError, parseIntParam } from '../server';
import { authMiddleware } from '../../auth/middleware';
import { AuthService } from '../../auth/auth-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weeklyXP: number;
  level: number;
}

// ---------------------------------------------------------------------------
// Router Factory
// ---------------------------------------------------------------------------

/**
 * Create the gamification router.
 *
 * @param authService - The AuthService instance for token verification.
 * @returns Express Router with all gamification endpoints mounted.
 */
export function createGamificationRouter(authService: AuthService): Router {
  const router = Router();
  const requireAuth = authMiddleware(authService);

  // All gamification routes require authentication
  router.use(requireAuth);

  // -------------------------------------------------------------------------
  // GET /xp — Get user's XP and level
  // -------------------------------------------------------------------------

  router.get(
    '/xp',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Fetch user's XP and level from the users table
        const userResult = await query(
          `SELECT
             u.id,
             COALESCE(u.total_xp, 0) as total_xp,
             COALESCE(u.level, 0) as level
           FROM users u
           WHERE u.id = $1`,
          [req.userId]
        );

        if (userResult.rowCount === 0) {
          throw ApiError.notFound('User');
        }

        const user = userResult.rows[0];
        const totalXP = parseInt(user.total_xp) || 0;
        const level = parseInt(user.level) || 0;

        // Calculate level progress
        const xpForCurrentLevel = calculateXPForLevel(level);
        const xpForNextLevel = calculateXPForLevel(level + 1);
        const xpIntoCurrentLevel = totalXP - xpForCurrentLevel;
        const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
        const progressPercent =
          xpNeededForNextLevel > 0
            ? Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNextLevel) * 100))
            : 100;

        // Get XP earned today
        const todayResult = await query(
          `SELECT COALESCE(SUM(xp_earned), 0) as today_xp
           FROM xp_logs
           WHERE user_id = $1
             AND created_at >= CURRENT_DATE`,
          [req.userId]
        );
        const todayXP = parseInt(todayResult.rows[0]?.today_xp) || 0;

        // Get XP earned this week
        const weekResult = await query(
          `SELECT COALESCE(SUM(xp_earned), 0) as week_xp
           FROM xp_logs
           WHERE user_id = $1
             AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
          [req.userId]
        );
        const weekXP = parseInt(weekResult.rows[0]?.week_xp) || 0;

        res.json({
          data: {
            totalXP,
            level,
            xpForCurrentLevel,
            xpForNextLevel,
            progressPercent,
            todayXP,
            weekXP,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /streak — Get streak info
  // -------------------------------------------------------------------------

  router.get(
    '/streak',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Fetch streak data
        const streakResult = await query(
          `SELECT
             COALESCE(us.current_streak, 0) as current_streak,
             COALESCE(us.longest_streak, 0) as longest_streak,
             COALESCE(us.freezes_available, 0) as freezes_available,
             us.last_study_date
           FROM user_streaks us
           WHERE us.user_id = $1`,
          [req.userId]
        );

        if (streakResult.rowCount === 0) {
          // No streak record yet
          res.json({
            data: {
              currentStreak: 0,
              longestStreak: 0,
              freezesAvailable: 0,
              lastStudyDate: null,
              flameState: 'small' as const,
              nextMilestone: 7,
              daysUntilNextMilestone: 7,
              studiedToday: false,
            },
          });
          return;
        }

        const streak = streakResult.rows[0];
        const currentStreak = parseInt(streak.current_streak) || 0;
        const longestStreak = parseInt(streak.longest_streak) || 0;
        const freezesAvailable = parseInt(streak.freezes_available) || 0;
        const lastStudyDate = streak.last_study_date;

        // Determine flame state based on streak length
        let flameState: 'small' | 'medium' | 'large' = 'small';
        if (currentStreak >= 30) flameState = 'large';
        else if (currentStreak >= 7) flameState = 'medium';

        // Calculate next milestone
        const milestones = [7, 14, 30, 60, 90, 180, 365];
        const nextMilestone =
          milestones.find((m) => m > currentStreak) || currentStreak + 30;
        const daysUntilNextMilestone = nextMilestone - currentStreak;

        // Check if studied today
        const today = new Date().toISOString().split('T')[0];
        const studiedToday = lastStudyDate
          ? new Date(lastStudyDate).toISOString().split('T')[0] === today
          : false;

        res.json({
          data: {
            currentStreak,
            longestStreak,
            freezesAvailable,
            lastStudyDate,
            flameState,
            nextMilestone,
            daysUntilNextMilestone,
            studiedToday,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /achievements — Get all achievements (earned + locked)
  // -------------------------------------------------------------------------

  router.get(
    '/achievements',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Fetch all achievement definitions with user's earned status
        const result = await query(
          `SELECT
             ad.id,
             ad.name,
             ad.description,
             ad.icon,
             ad.hidden,
             ad.category,
             ad.condition_type,
             ad.condition_value,
             ua.earned_at,
             CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned,
             COALESCE(ua.progress, 0) as progress
           FROM achievement_definitions ad
           LEFT JOIN user_achievements ua
             ON ad.id = ua.achievement_id AND ua.user_id = $1
           ORDER BY
             CASE WHEN ua.earned_at IS NOT NULL THEN 0 ELSE 1 END,
             ua.earned_at DESC NULLS LAST,
             ad.id ASC`,
          [req.userId]
        );

        const achievements = result.rows.map((row: Record<string, unknown>) => ({
          id: row.id,
          name: row.name,
          description: row.hidden && !row.earned ? 'Hidden achievement' : row.description,
          icon: row.hidden && !row.earned ? 'lock' : row.icon,
          category: row.category,
          earned: row.earned,
          earnedAt: row.earned_at || null,
          progress: parseFloat(row.progress as string) || 0,
          hidden: row.hidden,
        }));

        const earnedCount = achievements.filter(
          (a: { earned: boolean }) => a.earned
        ).length;

        res.json({
          data: {
            achievements,
            summary: {
              total: achievements.length,
              earned: earnedCount,
              locked: achievements.length - earnedCount,
              completionPercent:
                achievements.length > 0
                  ? Math.round((earnedCount / achievements.length) * 100)
                  : 0,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /streak/freeze — Use a streak freeze
  // -------------------------------------------------------------------------

  router.post(
    '/streak/freeze',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Fetch current streak data
        const streakResult = await query(
          `SELECT * FROM user_streaks WHERE user_id = $1`,
          [req.userId]
        );

        if (streakResult.rowCount === 0) {
          throw ApiError.badRequest('No streak data found. Start studying to build a streak.');
        }

        const streak = streakResult.rows[0];
        const freezesAvailable = parseInt(streak.freezes_available) || 0;

        if (freezesAvailable <= 0) {
          throw ApiError.badRequest(
            'No streak freezes available. Earn freezes by maintaining a 7-day streak.'
          );
        }

        // Check if the streak is actually at risk (last study date was yesterday or earlier)
        const today = new Date().toISOString().split('T')[0];
        const lastStudyDate = streak.last_study_date
          ? new Date(streak.last_study_date).toISOString().split('T')[0]
          : null;

        if (lastStudyDate === today) {
          throw ApiError.badRequest(
            'You already studied today. A streak freeze is not needed.'
          );
        }

        // Use the freeze
        const updateResult = await query(
          `UPDATE user_streaks
           SET freezes_available = freezes_available - 1,
               last_study_date = CURRENT_DATE,
               freeze_used_dates = COALESCE(freeze_used_dates, '[]'::jsonb) || to_jsonb($2::text)
           WHERE user_id = $1
           RETURNING *`,
          [req.userId, today]
        );

        const updated = updateResult.rows[0];

        res.json({
          data: {
            message: 'Streak freeze applied successfully',
            currentStreak: parseInt(updated.current_streak) || 0,
            freezesRemaining: parseInt(updated.freezes_available) || 0,
            freezeUsedDate: today,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /leaderboard — Optional weekly XP leaderboard
  // -------------------------------------------------------------------------

  router.get(
    '/leaderboard',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = parseIntParam(req.query.limit as string, 20, 'limit');
        if (limit < 1 || limit > 100) {
          throw ApiError.badRequest('limit must be between 1 and 100');
        }

        const period = (req.query.period as string) || 'weekly';
        const validPeriods = ['daily', 'weekly', 'monthly', 'all_time'];
        if (!validPeriods.includes(period)) {
          throw ApiError.badRequest(
            `period must be one of: ${validPeriods.join(', ')}`
          );
        }

        let dateFilter: string;
        switch (period) {
          case 'daily':
            dateFilter = 'xl.created_at >= CURRENT_DATE';
            break;
          case 'weekly':
            dateFilter = "xl.created_at >= DATE_TRUNC('week', CURRENT_DATE)";
            break;
          case 'monthly':
            dateFilter = "xl.created_at >= DATE_TRUNC('month', CURRENT_DATE)";
            break;
          case 'all_time':
          default:
            dateFilter = '1=1';
            break;
        }

        // Get leaderboard
        const leaderboardResult = await query(
          `SELECT
             u.id as user_id,
             u.display_name,
             u.avatar_url,
             COALESCE(SUM(xl.xp_earned), 0) as period_xp,
             COALESCE(u.level, 0) as level,
             ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(xl.xp_earned), 0) DESC) as rank
           FROM users u
           LEFT JOIN xp_logs xl ON u.id = xl.user_id AND ${dateFilter}
           GROUP BY u.id, u.display_name, u.avatar_url, u.level
           HAVING COALESCE(SUM(xl.xp_earned), 0) > 0
           ORDER BY period_xp DESC
           LIMIT $1`,
          [limit]
        );

        // Get current user's rank
        const userRankResult = await query(
          `WITH ranked AS (
             SELECT
               u.id,
               COALESCE(SUM(xl.xp_earned), 0) as period_xp,
               ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(xl.xp_earned), 0) DESC) as rank
             FROM users u
             LEFT JOIN xp_logs xl ON u.id = xl.user_id AND ${dateFilter}
             GROUP BY u.id
             HAVING COALESCE(SUM(xl.xp_earned), 0) > 0
           )
           SELECT rank, period_xp FROM ranked WHERE id = $1`,
          [req.userId]
        );

        const entries: LeaderboardEntry[] = leaderboardResult.rows.map(
          (row: Record<string, unknown>) => ({
            rank: parseInt(row.rank as string) || 0,
            userId: row.user_id as string,
            displayName: row.display_name as string,
            avatarUrl: (row.avatar_url as string) || null,
            weeklyXP: parseInt(row.period_xp as string) || 0,
            level: parseInt(row.level as string) || 0,
          })
        );

        const userRank = userRankResult.rowCount !== 0
          ? {
              rank: parseInt(userRankResult.rows[0].rank) || 0,
              periodXP: parseInt(userRankResult.rows[0].period_xp) || 0,
            }
          : null;

        res.json({
          data: {
            period,
            leaderboard: entries,
            userRank,
            totalParticipants: entries.length,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the total XP required to reach a given level.
 *
 * Uses a polynomial curve: each level requires increasingly more XP.
 * Level 0 = 0 XP, Level 1 = 100 XP, Level 2 = 300 XP, etc.
 */
function calculateXPForLevel(level: number): number {
  if (level <= 0) return 0;
  // Sum of (100 * i) for i = 1..level => 100 * level * (level + 1) / 2
  return 50 * level * (level + 1);
}
