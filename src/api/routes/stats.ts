// @ts-nocheck
/**
 * Statistics Routes
 *
 * Aggregated study statistics, forecasts, streaks, and per-card history.
 *
 * Routes:
 * - GET /api/stats/daily?days=30         — Cards reviewed per day
 * - GET /api/stats/forecast              — Review forecast (upcoming days)
 * - GET /api/stats/card-states           — Card state breakdown
 * - GET /api/stats/streak                — Current streak information
 * - GET /api/stats/card/:id/history      — Per-card review history
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../db/connection';
import { ApiError, validateUUID, parseIntParam } from '../server';

export const statsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/stats/daily — Cards reviewed per day
// ---------------------------------------------------------------------------

statsRouter.get(
  '/daily',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseIntParam(req.query.days as string, 30, 'days');
      const deckId = req.query.deckId as string | undefined;

      if (days < 1 || days > 365) {
        throw ApiError.badRequest('days must be between 1 and 365');
      }

      const conditions: string[] = [
        `rl.reviewed_at >= NOW() - $1::int * INTERVAL '1 day'`,
      ];
      const params: unknown[] = [days];
      let paramIndex = 2;

      if (deckId) {
        validateUUID(deckId, 'deckId');
        conditions.push(`c.deck_id = $${paramIndex}`);
        params.push(deckId);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const result = await query(
        `SELECT
          DATE(rl.reviewed_at) as date,
          COUNT(*) as total_reviews,
          COUNT(*) FILTER (WHERE rl.rating = 1) as again_count,
          COUNT(*) FILTER (WHERE rl.rating = 2) as hard_count,
          COUNT(*) FILTER (WHERE rl.rating = 3) as good_count,
          COUNT(*) FILTER (WHERE rl.rating = 4) as easy_count,
          COUNT(DISTINCT rl.card_id) as unique_cards,
          ROUND(AVG(rl.time_spent_ms)::numeric, 0) as avg_time_ms,
          SUM(rl.time_spent_ms) as total_time_ms,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE rl.rating >= 2)::numeric / COUNT(*)::numeric, 4)
            ELSE 0
          END as accuracy
        FROM review_logs rl
        INNER JOIN cards c ON rl.card_id = c.id
        WHERE ${whereClause}
        GROUP BY DATE(rl.reviewed_at)
        ORDER BY date DESC`,
        params
      );

      // Fill in missing dates with zeros
      const dailyData: Record<string, unknown>[] = [];
      const existingDates = new Set(
        result.rows.map((r: { date: string }) => r.date)
      );

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const existing = result.rows.find(
          (r: { date: string }) =>
            new Date(r.date).toISOString().split('T')[0] === dateStr
        );

        if (existing) {
          dailyData.push({
            date: dateStr,
            totalReviews: parseInt(existing.total_reviews) || 0,
            againCount: parseInt(existing.again_count) || 0,
            hardCount: parseInt(existing.hard_count) || 0,
            goodCount: parseInt(existing.good_count) || 0,
            easyCount: parseInt(existing.easy_count) || 0,
            uniqueCards: parseInt(existing.unique_cards) || 0,
            avgTimeMs: parseInt(existing.avg_time_ms) || 0,
            totalTimeMs: parseInt(existing.total_time_ms) || 0,
            accuracy: parseFloat(existing.accuracy) || 0,
          });
        } else {
          dailyData.push({
            date: dateStr,
            totalReviews: 0,
            againCount: 0,
            hardCount: 0,
            goodCount: 0,
            easyCount: 0,
            uniqueCards: 0,
            avgTimeMs: 0,
            totalTimeMs: 0,
            accuracy: 0,
          });
        }
      }

      res.json({ data: { daily: dailyData, days } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/stats/forecast — Review forecast
// ---------------------------------------------------------------------------

statsRouter.get(
  '/forecast',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseIntParam(req.query.days as string, 30, 'days');
      const deckId = req.query.deckId as string | undefined;

      if (days < 1 || days > 90) {
        throw ApiError.badRequest('days must be between 1 and 90');
      }

      let deckCondition = '';
      const params: unknown[] = [days];
      let paramIndex = 2;

      if (deckId) {
        validateUUID(deckId, 'deckId');
        deckCondition = `AND c.deck_id = $${paramIndex}`;
        params.push(deckId);
        paramIndex++;
      }

      const result = await query(
        `SELECT
          DATE(c.due) as date,
          COUNT(*) FILTER (WHERE c.queue = 2) as review_count,
          COUNT(*) FILTER (WHERE c.queue IN (1, 3)) as learning_count,
          COUNT(*) FILTER (WHERE c.queue = 0) as new_count,
          COUNT(*) as total_count
        FROM cards c
        WHERE c.due >= CURRENT_DATE
          AND c.due < CURRENT_DATE + $1::int * INTERVAL '1 day'
          AND NOT c.suspended
          AND NOT c.buried
          ${deckCondition}
        GROUP BY DATE(c.due)
        ORDER BY date`,
        params
      );

      // Fill in days
      const forecast: Record<string, unknown>[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const existing = result.rows.find(
          (r: { date: string }) =>
            new Date(r.date).toISOString().split('T')[0] === dateStr
        );

        if (existing) {
          forecast.push({
            date: dateStr,
            reviewCount: parseInt(existing.review_count) || 0,
            learningCount: parseInt(existing.learning_count) || 0,
            newCount: parseInt(existing.new_count) || 0,
            totalCount: parseInt(existing.total_count) || 0,
          });
        } else {
          forecast.push({
            date: dateStr,
            reviewCount: 0,
            learningCount: 0,
            newCount: 0,
            totalCount: 0,
          });
        }
      }

      // Compute cumulative backlog
      let cumulative = 0;
      for (const day of forecast) {
        cumulative += day.totalCount as number;
        (day as Record<string, unknown>).cumulativeCount = cumulative;
      }

      res.json({ data: { forecast, days } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/stats/card-states — Card state breakdown
// ---------------------------------------------------------------------------

statsRouter.get(
  '/card-states',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deckId = req.query.deckId as string | undefined;

      let deckCondition = '';
      const params: unknown[] = [];

      if (deckId) {
        validateUUID(deckId, 'deckId');
        deckCondition = `WHERE c.deck_id IN (
          WITH RECURSIVE deck_tree AS (
            SELECT id FROM decks WHERE id = $1
            UNION ALL
            SELECT d.id FROM decks d
            INNER JOIN deck_tree dt ON d.parent_id = dt.id
          )
          SELECT id FROM deck_tree
        )`;
        params.push(deckId);
      }

      const result = await query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE c.queue = 0 AND NOT c.suspended AND NOT c.buried) as new_active,
          COUNT(*) FILTER (WHERE c.queue = 1 AND NOT c.suspended AND NOT c.buried) as learning,
          COUNT(*) FILTER (WHERE c.queue = 2 AND NOT c.suspended AND NOT c.buried) as review,
          COUNT(*) FILTER (WHERE c.queue = 3 AND NOT c.suspended AND NOT c.buried) as relearning,
          COUNT(*) FILTER (WHERE c.suspended) as suspended,
          COUNT(*) FILTER (WHERE c.buried AND NOT c.suspended) as buried,
          COUNT(*) FILTER (WHERE c.queue = 2 AND c.scheduled_days >= 21 AND NOT c.suspended AND NOT c.buried) as mature,
          COUNT(*) FILTER (WHERE c.queue = 2 AND c.scheduled_days < 21 AND NOT c.suspended AND NOT c.buried) as young,
          COUNT(*) FILTER (WHERE c.due <= NOW() AND NOT c.suspended AND NOT c.buried) as due_now
        FROM cards c
        ${deckCondition}`,
        params
      );

      const stats = result.rows[0];

      res.json({
        data: {
          total: parseInt(stats.total) || 0,
          newActive: parseInt(stats.new_active) || 0,
          learning: parseInt(stats.learning) || 0,
          review: parseInt(stats.review) || 0,
          relearning: parseInt(stats.relearning) || 0,
          suspended: parseInt(stats.suspended) || 0,
          buried: parseInt(stats.buried) || 0,
          mature: parseInt(stats.mature) || 0,
          young: parseInt(stats.young) || 0,
          dueNow: parseInt(stats.due_now) || 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/stats/streak — Streak information
// ---------------------------------------------------------------------------

statsRouter.get(
  '/streak',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Get all unique review dates, ordered descending
      const result = await query(
        `SELECT DISTINCT DATE(reviewed_at) as review_date
         FROM review_logs
         ORDER BY review_date DESC
         LIMIT 365`
      );

      const reviewDates = result.rows.map(
        (r: { review_date: string }) =>
          new Date(r.review_date).toISOString().split('T')[0]
      );

      // Calculate current streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split('T')[0];

      // Check if studied today or yesterday (streak can still be active)
      let checkDate = today;
      if (reviewDates.length > 0 && reviewDates[0] !== today) {
        if (reviewDates[0] === yesterday) {
          checkDate = yesterday;
        } else {
          // Streak is broken
          currentStreak = 0;
        }
      }

      if (reviewDates.length > 0 && (reviewDates[0] === today || reviewDates[0] === yesterday)) {
        // Count consecutive days backward
        const dateSet = new Set(reviewDates);
        let d = new Date(checkDate);

        while (dateSet.has(d.toISOString().split('T')[0])) {
          currentStreak++;
          d = new Date(d.getTime() - 86400000);
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;

      for (let i = 0; i < reviewDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const currentDate = new Date(reviewDates[i]);
          const previousDate = new Date(reviewDates[i - 1]);
          const diffDays =
            (previousDate.getTime() - currentDate.getTime()) / 86400000;

          if (Math.abs(diffDays - 1) < 0.01) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      // Get total review days
      const totalDays = reviewDates.length;

      // Studied today?
      const studiedToday = reviewDates.length > 0 && reviewDates[0] === today;

      // Today's review count
      const todayResult = await query(
        `SELECT COUNT(*) as count FROM review_logs
         WHERE DATE(reviewed_at) = CURRENT_DATE`
      );
      const todayCount = parseInt(todayResult.rows[0].count) || 0;

      res.json({
        data: {
          currentStreak,
          longestStreak,
          totalDays,
          studiedToday,
          todayReviewCount: todayCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/stats/card/:id/history — Per-card review history
// ---------------------------------------------------------------------------

statsRouter.get(
  '/card/:id/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      validateUUID(id, 'id');

      // Verify card exists
      const cardResult = await query('SELECT * FROM cards WHERE id = $1', [id]);
      if (cardResult.rowCount === 0) {
        throw ApiError.notFound('Card');
      }
      const card = cardResult.rows[0];

      // Fetch all review logs for this card
      const logsResult = await query(
        `SELECT
          rl.*,
          rl.scheduling_snapshot_before as snapshot_before,
          rl.scheduling_snapshot_after as snapshot_after
        FROM review_logs rl
        WHERE rl.card_id = $1
        ORDER BY rl.reviewed_at ASC`,
        [id]
      );

      // Compute statistics from review history
      const logs = logsResult.rows;
      const totalReviews = logs.length;

      let againCount = 0;
      let hardCount = 0;
      let goodCount = 0;
      let easyCount = 0;
      let totalTimeMs = 0;
      let lapseCount = 0;

      for (const log of logs) {
        switch (log.rating) {
          case 1: againCount++; lapseCount++; break;
          case 2: hardCount++; break;
          case 3: goodCount++; break;
          case 4: easyCount++; break;
        }
        totalTimeMs += parseInt(log.time_spent_ms) || 0;
      }

      const accuracy =
        totalReviews > 0 ? (totalReviews - againCount) / totalReviews : 0;
      const avgTimeMs =
        totalReviews > 0 ? Math.round(totalTimeMs / totalReviews) : 0;

      // Stability history (for graphing)
      const stabilityHistory = logs.map((log: Record<string, unknown>) => {
        const snapshot = typeof log.snapshot_after === 'string'
          ? JSON.parse(log.snapshot_after as string)
          : log.snapshot_after;
        return {
          date: log.reviewed_at,
          stability: snapshot?.stability || 0,
          difficulty: snapshot?.difficulty || 0,
          rating: log.rating,
        };
      });

      res.json({
        data: {
          card,
          reviews: logs,
          summary: {
            totalReviews,
            againCount,
            hardCount,
            goodCount,
            easyCount,
            lapseCount,
            accuracy: Math.round(accuracy * 10000) / 10000,
            totalTimeMs,
            avgTimeMs,
            firstReview: logs.length > 0 ? logs[0].reviewed_at : null,
            lastReview:
              logs.length > 0 ? logs[logs.length - 1].reviewed_at : null,
          },
          stabilityHistory,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
