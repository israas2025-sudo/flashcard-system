/**
 * index.ts -- Public API barrel for the statistics subsystem.
 *
 * Re-exports the stats service and all related types.
 */

// Service
export { StatsService } from './stats-service';

// Types
export type {
  DailyStat,
  IntervalBucket,
  CardStateBreakdown,
  ForecastDay,
  AnswerDistribution,
  HourlyBucket,
  ReviewLogEntry,
  LanguageStat,
  DashboardSummary,
} from './types';
