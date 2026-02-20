/**
 * index.ts -- Public API barrel for the gamification subsystem.
 *
 * Re-exports all services, constants, and types needed by consumers.
 */

// Services
export { XPService, XP_REWARDS, XP_MULTIPLIERS } from './xp-service';
export { StreakService, STREAK_MILESTONES } from './streak-service';
export { AchievementService, ACHIEVEMENTS } from './achievement-service';
export { SoundManager } from './sound-manager';

// Types
export type {
  Rating,
  LevelProgress,
  CosmeticUnlock,
  XPAwardResult,
  SessionBonusResult,
  StreakInfo,
  StreakUpdate,
  StreakStatus,
  AchievementDefinition,
  AchievementCondition,
  AchievementUnlock,
  AchievementWithStatus,
  SessionContext,
  SessionSummary,
  SoundConfig,
} from './types';
