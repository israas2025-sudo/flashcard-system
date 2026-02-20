/**
 * Psychology Module -- Barrel Export
 *
 * This module implements evidence-based psychological principles to improve
 * user engagement, retention, and learning outcomes in the flashcard system.
 *
 * Components:
 *   - Endowed Progress: Pre-seeds cards to create initial momentum (Nunes & Dreze, 2006)
 *   - Bonus Cards: Variable ratio reinforcement via random XP bonuses (Ferster & Skinner, 1957)
 *   - Insight Cards: Science-backed learning facts shown during sessions (Bjork & Bjork, 2011)
 *   - Daily Goals: Goal setting with adaptive adjustments (Locke & Latham, 2002)
 *   - Weekly Review: Structured reflection ritual for self-regulated learning (Zimmerman, 2002)
 */

// Endowed Progress Effect
export {
  EndowedProgressService,
  ENDOWED_CARD_COUNT,
  type EndowedProgressResult,
} from './endowed-progress';

// Variable Ratio Reinforcement (Bonus Cards)
export {
  BonusCardService,
  type CardReference,
  type BonusSelectionResult,
  type CardXPResult,
} from './bonus-cards';

// Psychology Insight Cards
export {
  InsightCardService,
  type InsightCategory,
  type InsightFact,
  type SessionInsightContext,
} from './insight-cards';

// Daily Goal Tracking
export {
  DailyGoalService,
  type DailyGoal,
  type DailyProgress,
  type StreakBonus,
  type AdaptiveGoalSuggestion,
} from './daily-goal';

// Weekly Review Ritual
export {
  WeeklyReviewService,
  type WeeklyStats,
  type CardPerformance,
  type LanguageBreakdown,
  type WeeklyRecommendation,
  type WeeklyReport,
} from './weekly-review';
