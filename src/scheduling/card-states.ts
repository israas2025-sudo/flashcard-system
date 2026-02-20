/**
 * card-states.ts -- Card state machine for the scheduling system.
 *
 * Manages the lifecycle transitions of flashcards through the spaced-
 * repetition pipeline.  Every card occupies exactly one scheduling state
 * at any time, and transitions are triggered by user ratings or
 * administrative actions (bury, suspend, unbury, resume).
 *
 * State diagram:
 *
 *   +---------+  first review   +-----------+  graduate   +--------+
 *   |   New   | --------------> | Learning  | ----------> | Review |
 *   +---------+                 +-----------+             +--------+
 *                                     ^                     |    ^
 *                                     |                     |    |
 *                                     | re-graduate         |    |
 *                                     |                     |    |
 *                                +-----------+    lapse     |    |
 *                                | Relearning| <-----------+    |
 *                                +-----------+ ----------------+
 *
 *   Any state can be overridden to Buried (daily) or Suspended (indefinite).
 *
 * Learning steps:
 *   Cards in Learning or Relearning advance through a configurable list
 *   of intra-day step durations (e.g. [1m, 10m]).  When the final step
 *   is completed with Good or Easy, the card graduates to Review.
 */

import {
  Rating,
  CardState,
  CardStatus,
  StepConfig,
  CardSchedulingData,
  Card,
} from './types';

// ---------------------------------------------------------------------------
// Default step configuration
// ---------------------------------------------------------------------------

/** Default step configuration matching typical Anki settings. */
export const DEFAULT_STEP_CONFIG: StepConfig = {
  learningSteps: [1, 10],          // 1 minute, then 10 minutes
  relearningSteps: [10],           // 10 minutes
  graduatingInterval: 1,           // 1 day when graduating from learning
  easyGraduatingInterval: 4,      // 4 days when pressing Easy on a learning card
};

// ---------------------------------------------------------------------------
// CardStateMachine
// ---------------------------------------------------------------------------

/**
 * Encapsulates the state transition logic for flashcards.
 *
 * This class is stateless -- it computes the next state and step index
 * given the current state and a user action, without mutating any card
 * objects.
 */
export class CardStateMachine {
  private readonly config: StepConfig;

  /**
   * Create a new state machine with the given step configuration.
   *
   * @param config - Step durations and graduating intervals.
   */
  constructor(config: StepConfig = DEFAULT_STEP_CONFIG) {
    this.config = config;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Determine the next scheduling state after a review rating.
   *
   * @param currentState - The card's current scheduling state.
   * @param rating       - The user's rating.
   * @param stepIndex    - The card's current step index (relevant for
   *                       Learning / Relearning).
   * @returns An object with the new state, step index, and whether the card
   *          graduated or lapsed.
   */
  transition(
    currentState: CardState,
    rating: Rating,
    stepIndex: number = 0,
  ): TransitionResult {
    switch (currentState) {
      case CardState.New:
        return this.transitionFromNew(rating);
      case CardState.Learning:
        return this.transitionFromLearning(rating, stepIndex);
      case CardState.Review:
        return this.transitionFromReview(rating);
      case CardState.Relearning:
        return this.transitionFromRelearning(rating, stepIndex);
    }
  }

  /**
   * Get the delay in minutes for the current step, or null if the card
   * is not in a step-based state.
   *
   * @param state     - Current card state.
   * @param stepIndex - Current step index.
   * @returns Delay in minutes, or null if no step applies.
   */
  getStepDelayMinutes(state: CardState, stepIndex: number): number | null {
    const steps = this.getSteps(state);
    if (steps === null || stepIndex < 0 || stepIndex >= steps.length) {
      return null;
    }
    return steps[stepIndex];
  }

  /**
   * Check whether a card in the given state and step should graduate to Review.
   *
   * @param state     - Current card state.
   * @param stepIndex - Current step index.
   * @returns True if the card has completed all steps.
   */
  isGraduating(state: CardState, stepIndex: number): boolean {
    const steps = this.getSteps(state);
    if (steps === null) return false;
    return stepIndex >= steps.length;
  }

  /**
   * Return the graduating interval in days based on the rating.
   *
   * @param rating - Rating that caused graduation.
   * @returns Interval in days.
   */
  getGraduatingInterval(rating: Rating): number {
    return rating === Rating.Easy
      ? this.config.easyGraduatingInterval
      : this.config.graduatingInterval;
  }

  /**
   * Determine the appropriate CardStatus action for burying or suspending.
   *
   * @param action - 'bury' for daily skip, 'suspend' for indefinite pause.
   * @returns The new CardStatus.
   */
  static applyStatusOverride(action: 'bury' | 'suspend'): CardStatus {
    return action === 'bury' ? CardStatus.Buried : CardStatus.Suspended;
  }

  /**
   * Restore a card from buried or suspended to active.
   *
   * @param currentStatus - The card's current status.
   * @returns CardStatus.Active if the card was overridden, or the same status
   *          if it was already active.
   */
  static restoreStatus(currentStatus: CardStatus): CardStatus {
    return CardStatus.Active;
  }

  /**
   * Check whether a card is currently active (not buried or suspended).
   *
   * @param status - The card's current status.
   * @returns True if active.
   */
  static isActive(status: CardStatus): boolean {
    return status === CardStatus.Active;
  }

  /**
   * Check whether a card is eligible for study right now.
   *
   * A card is eligible if it is active, its due date is in the past or now,
   * and it is not in a terminal state override.
   *
   * @param card - The full card record.
   * @param now  - Current date/time.
   * @returns True if the card should be shown to the user.
   */
  static isEligibleForStudy(card: Card, now: Date = new Date()): boolean {
    if (card.status !== CardStatus.Active) return false;
    return card.due.getTime() <= now.getTime();
  }

  // -----------------------------------------------------------------------
  // State-specific transition logic
  // -----------------------------------------------------------------------

  /**
   * Transition from the New state.
   *
   * Any rating moves the card into Learning at step 0, except:
   *   - Good with only one learning step: graduate immediately.
   *   - Easy: always graduate immediately.
   */
  private transitionFromNew(rating: Rating): TransitionResult {
    const steps = this.config.learningSteps;

    if (rating === Rating.Easy) {
      return {
        state: CardState.Review,
        stepIndex: 0,
        graduated: true,
        lapsed: false,
        delayMinutes: null,
        intervalDays: this.config.easyGraduatingInterval,
      };
    }

    if (rating === Rating.Good && steps.length <= 1) {
      // Only one step and Good -> graduate
      return {
        state: CardState.Review,
        stepIndex: 0,
        graduated: true,
        lapsed: false,
        delayMinutes: null,
        intervalDays: this.config.graduatingInterval,
      };
    }

    // Enter Learning at step 0 (Again, Hard) or step 1 (Good)
    const stepIdx = rating === Rating.Good ? Math.min(1, steps.length - 1) : 0;

    return {
      state: CardState.Learning,
      stepIndex: stepIdx,
      graduated: false,
      lapsed: false,
      delayMinutes: steps[stepIdx] ?? 1,
      intervalDays: null,
    };
  }

  /**
   * Transition from the Learning state.
   *
   * - Again: reset to step 0.
   * - Hard:  repeat current step.
   * - Good:  advance to next step; graduate if past the end.
   * - Easy:  graduate immediately.
   */
  private transitionFromLearning(rating: Rating, stepIndex: number): TransitionResult {
    const steps = this.config.learningSteps;

    if (rating === Rating.Easy) {
      return {
        state: CardState.Review,
        stepIndex: 0,
        graduated: true,
        lapsed: false,
        delayMinutes: null,
        intervalDays: this.config.easyGraduatingInterval,
      };
    }

    let newStep: number;
    switch (rating) {
      case Rating.Again:
        newStep = 0;
        break;
      case Rating.Hard:
        newStep = stepIndex; // repeat
        break;
      case Rating.Good:
        newStep = stepIndex + 1;
        break;
      default:
        newStep = stepIndex;
    }

    // Check for graduation
    if (newStep >= steps.length) {
      return {
        state: CardState.Review,
        stepIndex: 0,
        graduated: true,
        lapsed: false,
        delayMinutes: null,
        intervalDays: this.config.graduatingInterval,
      };
    }

    return {
      state: CardState.Learning,
      stepIndex: newStep,
      graduated: false,
      lapsed: false,
      delayMinutes: steps[newStep] ?? 1,
      intervalDays: null,
    };
  }

  /**
   * Transition from the Review state.
   *
   * - Again: lapse -> enter Relearning at step 0.
   * - Hard / Good / Easy: remain in Review with an updated interval.
   */
  private transitionFromReview(rating: Rating): TransitionResult {
    if (rating === Rating.Again) {
      const steps = this.config.relearningSteps;
      return {
        state: CardState.Relearning,
        stepIndex: 0,
        graduated: false,
        lapsed: true,
        delayMinutes: steps[0] ?? 10,
        intervalDays: null,
      };
    }

    // Success: stay in Review (interval determined by the algorithm)
    return {
      state: CardState.Review,
      stepIndex: 0,
      graduated: false,
      lapsed: false,
      delayMinutes: null,
      intervalDays: null, // computed by FSRS or SM-2
    };
  }

  /**
   * Transition from the Relearning state.
   *
   * - Again: reset to step 0.
   * - Hard:  repeat current step.
   * - Good:  advance; re-graduate if past the end.
   * - Easy:  re-graduate immediately.
   */
  private transitionFromRelearning(rating: Rating, stepIndex: number): TransitionResult {
    const steps = this.config.relearningSteps;

    if (rating === Rating.Easy) {
      return {
        state: CardState.Review,
        stepIndex: 0,
        graduated: true,
        lapsed: false,
        delayMinutes: null,
        intervalDays: null, // computed by the algorithm
      };
    }

    let newStep: number;
    switch (rating) {
      case Rating.Again:
        newStep = 0;
        break;
      case Rating.Hard:
        newStep = stepIndex; // repeat
        break;
      case Rating.Good:
        newStep = stepIndex + 1;
        break;
      default:
        newStep = stepIndex;
    }

    // Check for re-graduation
    if (newStep >= steps.length) {
      return {
        state: CardState.Review,
        stepIndex: 0,
        graduated: true,
        lapsed: false,
        delayMinutes: null,
        intervalDays: null, // computed by the algorithm
      };
    }

    return {
      state: CardState.Relearning,
      stepIndex: newStep,
      graduated: false,
      lapsed: false,
      delayMinutes: steps[newStep] ?? 10,
      intervalDays: null,
    };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Return the appropriate steps array for a given state, or null if the
   * state does not use steps.
   */
  private getSteps(state: CardState): number[] | null {
    switch (state) {
      case CardState.Learning:
        return this.config.learningSteps;
      case CardState.Relearning:
        return this.config.relearningSteps;
      default:
        return null;
    }
  }
}

// ---------------------------------------------------------------------------
// TransitionResult
// ---------------------------------------------------------------------------

/**
 * The result of a state transition computation.
 */
export interface TransitionResult {
  /** The card's new scheduling state. */
  state: CardState;

  /** New step index (0 if not in a step-based state). */
  stepIndex: number;

  /** True if the card graduated (or re-graduated) in this transition. */
  graduated: boolean;

  /** True if the card lapsed in this transition (Again on Review). */
  lapsed: boolean;

  /**
   * Delay in minutes until the next intra-day step, or null if the card
   * is graduating to inter-day scheduling.
   */
  delayMinutes: number | null;

  /**
   * Inter-day interval in days if determined by the state machine (e.g.
   * graduating interval), or null if the interval should be computed by
   * the scheduling algorithm (FSRS / SM-2).
   */
  intervalDays: number | null;
}

// ---------------------------------------------------------------------------
// Convenience factories
// ---------------------------------------------------------------------------

/**
 * Create a default step configuration from simple parameters.
 *
 * @param learningSteps         - Learning step durations in minutes.
 * @param relearningSteps       - Relearning step durations in minutes.
 * @param graduatingInterval    - Days for normal graduation.
 * @param easyGraduatingInterval - Days for Easy graduation.
 * @returns A StepConfig object.
 */
export function createStepConfig(
  learningSteps: number[] = [1, 10],
  relearningSteps: number[] = [10],
  graduatingInterval: number = 1,
  easyGraduatingInterval: number = 4,
): StepConfig {
  return {
    learningSteps,
    relearningSteps,
    graduatingInterval,
    easyGraduatingInterval,
  };
}

/**
 * Determine the priority order for showing cards in a study session.
 *
 * Priority (lower number = shown sooner):
 *   1. Relearning (lapsed cards need immediate reinforcement)
 *   2. Learning   (in-progress learning should continue)
 *   3. New        (unseen cards)
 *   4. Review     (mature review cards)
 *
 * @param state - Card scheduling state.
 * @returns Priority number (1 = highest).
 */
export function statePriority(state: CardState): number {
  switch (state) {
    case CardState.Relearning:
      return 1;
    case CardState.Learning:
      return 2;
    case CardState.New:
      return 3;
    case CardState.Review:
      return 4;
  }
}

/**
 * Human-readable label for a card state.
 *
 * @param state - Card scheduling state.
 * @returns Display string.
 */
export function stateLabel(state: CardState): string {
  switch (state) {
    case CardState.New:
      return 'New';
    case CardState.Learning:
      return 'Learning';
    case CardState.Review:
      return 'Review';
    case CardState.Relearning:
      return 'Relearning';
  }
}

/**
 * Human-readable label for a card status.
 *
 * @param status - Card status.
 * @returns Display string.
 */
export function statusLabel(status: CardStatus): string {
  switch (status) {
    case CardStatus.Active:
      return 'Active';
    case CardStatus.Buried:
      return 'Buried';
    case CardStatus.Suspended:
      return 'Suspended';
  }
}
