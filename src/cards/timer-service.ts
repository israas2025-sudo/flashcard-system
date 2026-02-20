/**
 * Timer Service
 *
 * Implements the review timer described in Section 1.10 of the flashcard
 * system specification. Provides both an internal timer for tracking time
 * spent per card (capped at a configurable maximum for review log accuracy)
 * and an on-screen display timer for user feedback.
 *
 * Features:
 * - Start/stop timing per card review
 * - Configurable maximum time cap (prevents inflated stats from AFK)
 * - Real-time elapsed time for on-screen display
 * - Human-readable time formatting
 * - Pause/resume support (e.g. when user switches tabs)
 */

import type { TimerDisplay } from './types';

export class TimerService {
  /** Timestamp (ms) when the timer was started, or null if not running. */
  private startTime: number | null = null;

  /** Maximum tracked time in milliseconds. */
  private maxTimeMs: number;

  /** Accumulated pause time in milliseconds. */
  private pausedDurationMs: number = 0;

  /** Timestamp when the timer was last paused, or null if not paused. */
  private pausedAt: number | null = null;

  /**
   * Create a new TimerService instance.
   *
   * @param maxTimeSeconds - Maximum time in seconds to track per card.
   *   Elapsed time beyond this cap is not recorded in review logs, to
   *   prevent distorted statistics from AFK or distraction time.
   *   Default: 60 seconds.
   */
  constructor(maxTimeSeconds: number = 60) {
    this.maxTimeMs = maxTimeSeconds * 1000;
  }

  /**
   * Start timing a card review.
   *
   * If a timer was already running, it is implicitly stopped and restarted.
   * This ensures clean state when moving between cards.
   */
  start(): void {
    this.startTime = Date.now();
    this.pausedDurationMs = 0;
    this.pausedAt = null;
  }

  /**
   * Stop timing and return the elapsed time in milliseconds.
   *
   * The returned value is capped at the configured maximum time to prevent
   * inflated statistics. If the timer was not running, returns 0.
   *
   * @returns Elapsed time in milliseconds, capped at maxTimeMs.
   */
  stop(): number {
    if (this.startTime === null) return 0;

    // If currently paused, account for the pause duration up to now
    if (this.pausedAt !== null) {
      this.pausedDurationMs += Date.now() - this.pausedAt;
      this.pausedAt = null;
    }

    const elapsed = Date.now() - this.startTime - this.pausedDurationMs;
    this.startTime = null;
    this.pausedDurationMs = 0;

    return Math.min(Math.max(elapsed, 0), this.maxTimeMs);
  }

  /**
   * Get the current elapsed time in milliseconds.
   *
   * This is the uncapped value intended for on-screen display. Unlike
   * stop(), this does not cap at the maximum and does not reset the timer.
   *
   * @returns Current elapsed time in milliseconds, or 0 if not running.
   */
  getElapsed(): number {
    if (this.startTime === null) return 0;

    let pauseAdjustment = this.pausedDurationMs;
    if (this.pausedAt !== null) {
      pauseAdjustment += Date.now() - this.pausedAt;
    }

    return Math.max(Date.now() - this.startTime - pauseAdjustment, 0);
  }

  /**
   * Get a structured timer display value with formatting and cap status.
   *
   * @returns A TimerDisplay object with total ms, formatted string, and
   *   whether the configured maximum has been exceeded.
   */
  getDisplay(): TimerDisplay {
    const totalMs = this.getElapsed();
    return {
      totalMs,
      formatted: this.formatTime(totalMs),
      exceededMax: totalMs > this.maxTimeMs,
    };
  }

  /**
   * Pause the timer.
   *
   * Use this when the user navigates away (e.g. switches tabs or opens
   * a dialog). The paused duration is excluded from the final elapsed time.
   *
   * Has no effect if the timer is not running or is already paused.
   */
  pause(): void {
    if (this.startTime === null || this.pausedAt !== null) return;
    this.pausedAt = Date.now();
  }

  /**
   * Resume the timer after a pause.
   *
   * Accumulates the duration of the pause into the adjustment so it is
   * excluded from the elapsed time.
   *
   * Has no effect if the timer is not paused.
   */
  resume(): void {
    if (this.pausedAt === null) return;
    this.pausedDurationMs += Date.now() - this.pausedAt;
    this.pausedAt = null;
  }

  /**
   * Check whether the timer is currently running (started and not stopped).
   */
  isRunning(): boolean {
    return this.startTime !== null;
  }

  /**
   * Check whether the timer is currently paused.
   */
  isPaused(): boolean {
    return this.pausedAt !== null;
  }

  /**
   * Get the configured maximum time in milliseconds.
   */
  getMaxTimeMs(): number {
    return this.maxTimeMs;
  }

  /**
   * Update the maximum time cap.
   *
   * @param maxTimeSeconds - New maximum time in seconds.
   */
  setMaxTime(maxTimeSeconds: number): void {
    this.maxTimeMs = maxTimeSeconds * 1000;
  }

  /**
   * Format a duration in milliseconds to a human-readable string.
   *
   * Formats as:
   * - "0s" for zero
   * - "45s" for less than a minute
   * - "1:05" for one minute and five seconds
   * - "12:30" for twelve minutes and thirty seconds
   *
   * @param ms - Duration in milliseconds.
   * @returns Formatted time string.
   */
  formatTime(ms: number): string {
    if (ms <= 0) return '0s';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${seconds}s`;
  }
}
