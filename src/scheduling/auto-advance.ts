/**
 * auto-advance.ts -- Timed auto-progression through cards.
 *
 * Implements the Auto Advance feature from Anki (Section 1.10), which
 * allows automatic card progression during passive review sessions.
 *
 * Two timers can be configured:
 *   1. **Show answer timer:** automatically reveals the answer after N seconds.
 *   2. **Auto-rate timer:** automatically rates the card after M additional
 *      seconds (as either "Good" or "Hard").
 *
 * This is useful for passive review scenarios such as reviewing while
 * commuting, exercising, or doing chores -- situations where the user
 * can read but not interact with buttons easily.
 *
 * The service itself manages configuration only. The actual timer logic
 * lives in the UI layer, which reads the config and sets up the timers.
 * An {@link AutoAdvanceTimer} helper class is provided for UI integration.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Configuration for auto-advance behavior.
 */
export interface AutoAdvanceConfig {
  /** Whether auto-advance is enabled. */
  enabled: boolean;

  /**
   * Seconds to wait before automatically showing the answer.
   * 0 = manual flip only (auto-advance disabled for this phase).
   */
  showAnswerAfterSeconds: number;

  /**
   * Seconds to wait (after answer is shown) before automatically rating.
   * 0 = manual rating only (auto-advance disabled for this phase).
   */
  autoRateAfterSeconds: number;

  /**
   * What rating to automatically apply.
   * - 'good': Rate as Good (3) -- recommended for passive review.
   * - 'hard': Rate as Hard (2) -- conservative, for cards you're less sure about.
   */
  autoRating: 'good' | 'hard';

  /**
   * If true, auto-advance waits for any audio playback to complete before
   * starting the timer. Useful for language learning cards with pronunciation.
   */
  waitForAudio: boolean;
}

/**
 * Persistence interface for auto-advance configuration.
 */
export interface AutoAdvanceStore {
  /** Get the auto-advance config for a user. */
  getAutoAdvanceConfig(userId: string): Promise<AutoAdvanceConfig | null>;

  /** Save the auto-advance config for a user. */
  setAutoAdvanceConfig(userId: string, config: AutoAdvanceConfig): Promise<void>;
}

/**
 * Events emitted by the AutoAdvanceTimer.
 */
export type AutoAdvanceEvent =
  | { type: 'show_answer' }
  | { type: 'auto_rate'; rating: 'good' | 'hard' }
  | { type: 'timer_tick'; phase: 'question' | 'answer'; remainingSeconds: number }
  | { type: 'cancelled' };

/**
 * Listener callback for auto-advance events.
 */
export type AutoAdvanceListener = (event: AutoAdvanceEvent) => void;

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Default config: auto-advance disabled. */
export const DEFAULT_AUTO_ADVANCE_CONFIG: AutoAdvanceConfig = {
  enabled: false,
  showAnswerAfterSeconds: 0,
  autoRateAfterSeconds: 0,
  autoRating: 'good',
  waitForAudio: false,
};

// ---------------------------------------------------------------------------
// AutoAdvanceService
// ---------------------------------------------------------------------------

/**
 * Service for managing auto-advance configuration.
 *
 * This service handles reading and writing the configuration. The actual
 * timer execution is handled by {@link AutoAdvanceTimer}.
 */
export class AutoAdvanceService {
  private readonly store: AutoAdvanceStore | null;

  /** In-memory fallback when no store is provided. */
  private inMemoryConfigs: Map<string, AutoAdvanceConfig> = new Map();

  constructor(store?: AutoAdvanceStore) {
    this.store = store ?? null;
  }

  /**
   * Get the auto-advance configuration for a user.
   *
   * @param userId - User identifier.
   * @returns The user's auto-advance config, or defaults if not set.
   */
  async getConfig(userId: string): Promise<AutoAdvanceConfig> {
    if (this.store) {
      const config = await this.store.getAutoAdvanceConfig(userId);
      return config ?? DEFAULT_AUTO_ADVANCE_CONFIG;
    }
    return this.inMemoryConfigs.get(userId) ?? DEFAULT_AUTO_ADVANCE_CONFIG;
  }

  /**
   * Set the auto-advance configuration for a user.
   *
   * @param userId - User identifier.
   * @param config - The configuration to save.
   */
  async setConfig(userId: string, config: AutoAdvanceConfig): Promise<void> {
    // Validate
    const validated: AutoAdvanceConfig = {
      enabled: config.enabled,
      showAnswerAfterSeconds: Math.max(0, Math.round(config.showAnswerAfterSeconds)),
      autoRateAfterSeconds: Math.max(0, Math.round(config.autoRateAfterSeconds)),
      autoRating: config.autoRating === 'hard' ? 'hard' : 'good',
      waitForAudio: config.waitForAudio,
    };

    if (this.store) {
      await this.store.setAutoAdvanceConfig(userId, validated);
    } else {
      this.inMemoryConfigs.set(userId, validated);
    }
  }
}

// ---------------------------------------------------------------------------
// AutoAdvanceTimer
// ---------------------------------------------------------------------------

/**
 * Timer helper for auto-advance behavior during a study session.
 *
 * Usage (in a UI component or study session manager):
 *
 * ```typescript
 * const timer = new AutoAdvanceTimer(config);
 *
 * timer.on((event) => {
 *   if (event.type === 'show_answer') {
 *     flipCard();
 *     timer.startAnswerPhase();
 *   } else if (event.type === 'auto_rate') {
 *     submitRating(event.rating);
 *   } else if (event.type === 'timer_tick') {
 *     updateCountdownDisplay(event.remainingSeconds);
 *   }
 * });
 *
 * // Start the question phase timer when a new card is shown
 * timer.startQuestionPhase();
 *
 * // Clean up when done
 * timer.cancel();
 * ```
 */
export class AutoAdvanceTimer {
  private readonly config: AutoAdvanceConfig;
  private listeners: AutoAdvanceListener[] = [];

  /** Currently running interval handle. */
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  /** Currently running timeout handle. */
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  /** Current phase of auto-advance. */
  private currentPhase: 'idle' | 'question' | 'answer' = 'idle';

  /** Seconds remaining in the current countdown. */
  private secondsRemaining: number = 0;

  /** Whether the timer is paused (e.g., waiting for audio). */
  private paused: boolean = false;

  constructor(config: AutoAdvanceConfig) {
    this.config = config;
  }

  /**
   * Register a listener for auto-advance events.
   *
   * @param listener - Callback function to receive events.
   * @returns A function to unsubscribe the listener.
   */
  on(listener: AutoAdvanceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Start the question phase timer.
   *
   * After `showAnswerAfterSeconds`, a 'show_answer' event is emitted.
   * Emits 'timer_tick' events every second with the countdown.
   */
  startQuestionPhase(): void {
    this.cancel();

    if (!this.config.enabled || this.config.showAnswerAfterSeconds <= 0) {
      return;
    }

    this.currentPhase = 'question';
    this.secondsRemaining = this.config.showAnswerAfterSeconds;
    this.paused = false;

    this.startCountdown(() => {
      this.emit({ type: 'show_answer' });
      this.currentPhase = 'idle';
    }, 'question');
  }

  /**
   * Start the answer phase timer.
   *
   * After `autoRateAfterSeconds`, an 'auto_rate' event is emitted with
   * the configured rating.
   */
  startAnswerPhase(): void {
    this.cancelCurrentTimer();

    if (!this.config.enabled || this.config.autoRateAfterSeconds <= 0) {
      return;
    }

    this.currentPhase = 'answer';
    this.secondsRemaining = this.config.autoRateAfterSeconds;
    this.paused = false;

    this.startCountdown(() => {
      this.emit({ type: 'auto_rate', rating: this.config.autoRating });
      this.currentPhase = 'idle';
    }, 'answer');
  }

  /**
   * Pause the current timer (e.g., while audio is playing).
   */
  pause(): void {
    if (this.currentPhase === 'idle') return;
    this.paused = true;
    this.cancelCurrentTimer();
  }

  /**
   * Resume the timer after a pause.
   */
  resume(): void {
    if (!this.paused || this.currentPhase === 'idle') return;
    this.paused = false;

    const phase = this.currentPhase;
    const callback =
      phase === 'question'
        ? () => {
            this.emit({ type: 'show_answer' });
            this.currentPhase = 'idle';
          }
        : () => {
            this.emit({ type: 'auto_rate', rating: this.config.autoRating });
            this.currentPhase = 'idle';
          };

    this.startCountdown(callback, phase);
  }

  /**
   * Notify the timer that audio playback has finished.
   *
   * If `waitForAudio` is configured, this resumes the timer.
   */
  audioFinished(): void {
    if (this.config.waitForAudio && this.paused) {
      this.resume();
    }
  }

  /**
   * Cancel all timers and reset state.
   */
  cancel(): void {
    this.cancelCurrentTimer();
    this.currentPhase = 'idle';
    this.secondsRemaining = 0;
    this.paused = false;
    this.emit({ type: 'cancelled' });
  }

  /**
   * Get the current phase and remaining seconds.
   */
  getState(): { phase: 'idle' | 'question' | 'answer'; secondsRemaining: number; paused: boolean } {
    return {
      phase: this.currentPhase,
      secondsRemaining: this.secondsRemaining,
      paused: this.paused,
    };
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private startCountdown(onComplete: () => void, phase: 'question' | 'answer'): void {
    // If waiting for audio and in the right phase, start paused
    if (this.config.waitForAudio && phase === 'question') {
      this.paused = true;
      return;
    }

    // Emit initial tick
    this.emit({
      type: 'timer_tick',
      phase,
      remainingSeconds: this.secondsRemaining,
    });

    // Set up a 1-second interval for countdown ticks
    this.timerHandle = setInterval(() => {
      if (this.paused) return;

      this.secondsRemaining--;

      if (this.secondsRemaining <= 0) {
        this.cancelCurrentTimer();
        onComplete();
      } else {
        this.emit({
          type: 'timer_tick',
          phase,
          remainingSeconds: this.secondsRemaining,
        });
      }
    }, 1000);
  }

  private cancelCurrentTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private emit(event: AutoAdvanceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to prevent timer disruption
      }
    }
  }
}
