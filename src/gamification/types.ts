/**
 * types.ts -- Type definitions for the gamification subsystem.
 *
 * Covers XP and leveling, streaks, achievements, session contexts,
 * and cosmetic unlocks. These types are shared across the XP service,
 * streak service, achievement service, and sound manager.
 */

// ---------------------------------------------------------------------------
// Rating (re-export compatible with scheduling types)
// ---------------------------------------------------------------------------

/** User rating for a flashcard review. */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

// ---------------------------------------------------------------------------
// XP & Leveling
// ---------------------------------------------------------------------------

/**
 * Snapshot of a user's level progression.
 */
export interface LevelProgress {
  /** Current level number (0-based). */
  currentLevel: number;

  /** Total accumulated XP across all time. */
  currentXP: number;

  /** Total XP required to reach the start of the current level. */
  xpForCurrentLevel: number;

  /** Total XP required to reach the next level. */
  xpForNextLevel: number;

  /** Percentage progress through the current level, in [0, 100]. */
  progressPercent: number;

  /** Cosmetics the user has unlocked up to their current level. */
  unlockedCosmetics: CosmeticUnlock[];
}

/**
 * A cosmetic reward unlocked at a specific level.
 *
 * Cosmetics are purely visual -- they do not affect scheduling or
 * study mechanics. This keeps the gamification layer motivational
 * without introducing pay-to-win dynamics.
 */
export interface CosmeticUnlock {
  /** Category of the cosmetic. */
  type: 'card_theme' | 'accent_color' | 'dashboard_widget';

  /** Human-readable name shown in the unlock notification. */
  name: string;

  /** Brief description of the cosmetic. */
  description: string;

  /** The level at which this cosmetic becomes available. */
  unlockedAtLevel: number;
}

/**
 * Result returned when XP is awarded for a single review action.
 */
export interface XPAwardResult {
  /** Base XP earned for this review (before multipliers). */
  xpEarned: number;

  /** User's total XP after the award. */
  totalXP: number;

  /** Level before the XP was awarded. */
  levelBefore: number;

  /** Level after the XP was awarded. */
  levelAfter: number;

  /** Whether the user leveled up as a result. */
  leveledUp: boolean;
}

/**
 * Result returned when session-completion bonuses are applied.
 */
export interface SessionBonusResult {
  /** Total bonus XP awarded. */
  bonusXP: number;

  /** Human-readable names of multipliers that were applied. */
  multipliers: string[];
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

/**
 * Full streak information for display in the UI.
 */
export interface StreakInfo {
  /** Current consecutive study day count. */
  current: number;

  /** Longest streak ever achieved by this user. */
  longest: number;

  /** Number of streak freezes currently available. */
  freezesAvailable: number;

  /** ISO date string of the last day the user studied. */
  lastStudyDate: string;

  /** Visual intensity of the flame icon. */
  flameState: 'small' | 'medium' | 'large';

  /** Next milestone day count the user is working toward. */
  nextMilestone: number;

  /** Days remaining until the next milestone. */
  daysUntilNextMilestone: number;
}

/**
 * Result of updating a streak after a study session.
 */
export interface StreakUpdate {
  /** Streak count before the update. */
  streakBefore: number;

  /** Streak count after the update. */
  streakAfter: number;

  /** Whether a streak freeze was consumed to preserve the streak. */
  frozenUsed: boolean;

  /** Milestone day count reached, or null if no milestone was hit. */
  milestoneReached: number | null;

  /** Whether a new streak freeze was earned (every 7 consecutive days). */
  freezeEarned: boolean;
}

/**
 * Current streak status returned on login check.
 */
export interface StreakStatus {
  /** Whether the streak is still active. */
  isActive: boolean;

  /** Current streak count (may be 0 if broken). */
  currentStreak: number;

  /** Whether a freeze was consumed to save the streak. */
  freezeUsed: boolean;

  /** Number of freezes remaining. */
  freezesRemaining: number;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

/**
 * Static definition of an achievement in the catalog.
 *
 * Achievement conditions use a discriminated union so that the
 * achievement checker can dispatch to the correct evaluation logic
 * for each condition type.
 */
export interface AchievementDefinition {
  /** Unique string identifier (e.g., 'first_steps'). */
  id: string;

  /** Display name shown to the user. */
  name: string;

  /** Description text explaining how to earn the achievement. */
  description: string;

  /** Emoji or icon identifier for the achievement badge. */
  icon: string;

  /** Whether this achievement is hidden until earned. */
  hidden: boolean;

  /** The condition that must be met to unlock this achievement. */
  condition: AchievementCondition;
}

/**
 * Discriminated union of all achievement condition types.
 *
 * Each variant specifies what data to evaluate and the threshold
 * or criteria for unlocking.
 */
export type AchievementCondition =
  | { type: 'total_reviews'; count: number }
  | { type: 'streak_days'; days: number }
  | { type: 'perfect_sessions'; count: number }
  | { type: 'cards_with_tag'; tagPattern: string; count: number }
  | { type: 'languages_in_day'; count: number }
  | { type: 'time_of_day'; after: number; before: number }
  | { type: 'speed'; maxSecondsPerCard: number; minCards: number }
  | { type: 'accuracy_streak'; days: number; minAccuracy: number }
  | { type: 'level_reached'; level: number };

/**
 * An achievement the user has earned, with the timestamp.
 */
export interface AchievementUnlock {
  /** The achievement definition. */
  achievement: AchievementDefinition;

  /** When the achievement was unlocked. */
  earnedAt: Date;
}

/**
 * An achievement definition with its earned/locked status for a specific user.
 */
export interface AchievementWithStatus {
  /** The achievement definition. */
  definition: AchievementDefinition;

  /** Whether the user has earned this achievement. */
  earned: boolean;

  /** When it was earned, or null if not yet earned. */
  earnedAt: Date | null;

  /** Progress toward the achievement, as a fraction in [0, 1]. */
  progress: number;
}

// ---------------------------------------------------------------------------
// Session Context (passed to achievement checker after each session)
// ---------------------------------------------------------------------------

/**
 * Contextual data about a completed study session, used for evaluating
 * achievement conditions.
 */
export interface SessionContext {
  /** The user who completed the session. */
  userId: string;

  /** Total number of cards reviewed in the session. */
  totalCards: number;

  /** Accuracy as a fraction in [0, 1]. */
  accuracy: number;

  /** Number of 'again' ratings in the session. */
  againCount: number;

  /** Number of 'hard' ratings. */
  hardCount: number;

  /** Number of 'good' ratings. */
  goodCount: number;

  /** Number of 'easy' ratings. */
  easyCount: number;

  /** Total session duration in milliseconds. */
  totalTimeMs: number;

  /** Average time per card in milliseconds. */
  averageTimePerCardMs: number;

  /** Current streak day count after the session. */
  currentStreak: number;

  /** Current user level after session XP. */
  currentLevel: number;

  /** Distinct language tags studied in the session. */
  languagesStudied: string[];

  /** Hour of the day (0-23) when the session occurred. */
  hourOfDay: number;

  /** Tag slugs for all cards reviewed in the session. */
  sessionTags: string[];

  /** Whether this was a perfect session (no 'again' presses). */
  isPerfectSession: boolean;

  /** Whether all due cards were completed for the day. */
  allDueCompleted: boolean;
}

/**
 * Summary of a completed study session, aligned with the scheduling
 * module's SessionSummary for cross-module compatibility.
 */
export interface SessionSummary {
  /** Total cards reviewed. */
  totalCards: number;

  /** Overall accuracy (fraction of non-Again answers). */
  accuracy: number;

  /** Count of each rating. */
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;

  /** Total review time in milliseconds. */
  totalTimeMs: number;

  /** XP earned in the session. */
  xpEarned: number;

  /** Whether the streak was updated. */
  streakUpdated: boolean;
}

// ---------------------------------------------------------------------------
// Sound Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for a single sound effect.
 */
export interface SoundConfig {
  /** Whether sound effects are enabled globally. */
  enabled: boolean;

  /** Global volume level in [0, 1]. */
  volume: number;
}
