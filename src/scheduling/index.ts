/**
 * index.ts -- Barrel export for the scheduling module.
 *
 * Re-exports all public types, classes, functions, and constants from the
 * scheduling subsystem so consumers can import from a single entry point:
 *
 * ```typescript
 * import {
 *   Scheduler,
 *   StudySession,
 *   Rating,
 *   CardState,
 *   schedule,
 *   DEFAULT_FSRS_PARAMETERS,
 * } from './scheduling';
 * ```
 */

// ---------------------------------------------------------------------------
// Types & interfaces
// ---------------------------------------------------------------------------

export {
  // Enums
  Rating,
  CardState,
  CardStatus,

  // FSRS types
  FSRSParameters,
  CardSchedulingData,
  ScheduledCard,
  SchedulingResult,

  // SM-2 types
  SM2Parameters,
  SM2CardData,
  SM2ScheduledCard,
  SM2SchedulingResult,

  // Card model
  Card,
  ReviewLog,

  // Session types
  SessionProgress,
  SessionSummary,

  // Statistics
  StudyStats,

  // State machine types
  StateTransition,
  StepConfig,
} from './types';

// ---------------------------------------------------------------------------
// FSRS-5 algorithm
// ---------------------------------------------------------------------------

export {
  // Core functions
  initDifficulty,
  initStability,
  retrievability,
  nextDifficulty,
  nextStability,
  nextStabilityAfterSuccess,
  nextStabilityAfterFailure,
  nextInterval,
  fuzzInterval,
  shortTermStability,
  schedule,
  createEmptyCard,

  // Default parameters
  DEFAULT_FSRS_WEIGHTS,
  DEFAULT_FSRS_PARAMETERS,
} from './fsrs';

// ---------------------------------------------------------------------------
// SM-2 algorithm
// ---------------------------------------------------------------------------

export {
  // Core functions
  nextEaseFactor,
  nextReviewInterval,
  nextStepIndex,
  shouldGraduate,
  stepDelayMinutes,
  scheduleSM2,
  createEmptySM2Card,

  // Default parameters
  DEFAULT_SM2_PARAMETERS,
} from './sm2';

// ---------------------------------------------------------------------------
// Card state machine
// ---------------------------------------------------------------------------

export {
  CardStateMachine,
  DEFAULT_STEP_CONFIG,
  createStepConfig,
  statePriority,
  stateLabel,
  statusLabel,
} from './card-states';

export type { TransitionResult } from './card-states';

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export { Scheduler } from './scheduler';

export type { CardStore, DeckStatsRaw } from './scheduler';

// ---------------------------------------------------------------------------
// Study session
// ---------------------------------------------------------------------------

export {
  StudySession,
  DEFAULT_SESSION_CONFIG,
} from './study-session';

export type { StudySessionConfig } from './study-session';
