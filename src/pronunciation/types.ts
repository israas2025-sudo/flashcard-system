/**
 * types.ts -- Type definitions for the pronunciation recording and comparison subsystem.
 *
 * Covers recording metadata, waveform comparison results, and per-card
 * pronunciation progress tracking. These types are shared across the
 * pronunciation service and any UI components that display pronunciation
 * feedback.
 */

// ---------------------------------------------------------------------------
// Pronunciation Recording
// ---------------------------------------------------------------------------

/**
 * A single pronunciation recording stored for a card.
 *
 * Recordings capture the user's spoken attempt at pronouncing the card's
 * target word or phrase. Each recording stores raw audio metadata and a
 * normalised amplitude envelope used for waveform comparison against a
 * reference recording.
 */
export interface PronunciationRecording {
  /** Unique identifier (UUID v4). */
  id: string;

  /** ID of the user who made this recording. */
  userId: string;

  /** ID of the card this recording is associated with. */
  cardId: string;

  /** Path or URL to the stored audio file. */
  audioUrl: string;

  /** Duration of the recording in milliseconds. */
  durationMs: number;

  /** MIME type of the audio file (e.g. 'audio/webm', 'audio/wav'). */
  mimeType: string;

  /** Size of the audio file in bytes. */
  sizeBytes: number;

  /**
   * Normalised amplitude envelope extracted from the recording.
   *
   * An array of floating-point values in [0, 1] sampled at regular intervals
   * (typically 50-100 samples per second). Used for visual waveform display
   * and for comparison against a reference envelope.
   */
  amplitudeEnvelope: number[];

  /**
   * Optional comparison score from the most recent waveform comparison.
   * Value in [0, 1] where 1 is a perfect match to the reference.
   * Null if the recording has not been compared yet.
   */
  comparisonScore: number | null;

  /** Whether this recording is marked as the user's "best attempt". */
  isBestAttempt: boolean;

  /** Timestamp when the recording was created. */
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Waveform Comparison
// ---------------------------------------------------------------------------

/**
 * Result of comparing a user's pronunciation waveform against a reference.
 *
 * The comparison algorithm uses amplitude envelope cross-correlation to
 * produce an overall similarity score, plus per-segment breakdown for
 * detailed feedback.
 */
export interface WaveformComparisonResult {
  /**
   * Overall similarity score in [0, 1].
   *
   * - 0.0 - 0.3: Poor match (significantly different rhythm/amplitude).
   * - 0.3 - 0.6: Fair match (some segments align).
   * - 0.6 - 0.8: Good match (rhythm and amplitude mostly align).
   * - 0.8 - 1.0: Excellent match (near-identical envelopes).
   */
  overallScore: number;

  /**
   * Per-segment similarity scores.
   *
   * The recording is divided into equal-length segments (typically 8-16),
   * and each segment receives its own score. This enables the UI to
   * highlight which parts of the pronunciation were accurate and which
   * need work.
   */
  segmentScores: number[];

  /**
   * Time offset (in milliseconds) of the best alignment between the
   * user recording and the reference. Positive values mean the user
   * started speaking later than the reference.
   */
  alignmentOffsetMs: number;

  /**
   * Ratio of the user's recording duration to the reference duration.
   * A value of 1.0 means identical duration. Values > 1 mean the user
   * spoke more slowly; values < 1 mean faster.
   */
  tempoRatio: number;

  /**
   * Root mean squared difference of the normalised amplitude envelopes
   * after alignment. Lower is better.
   */
  rmseDifference: number;

  /** ID of the user recording that was compared. */
  recordingId: string;

  /** ID of the reference recording or media asset used. */
  referenceId: string;
}

// ---------------------------------------------------------------------------
// Pronunciation Progress
// ---------------------------------------------------------------------------

/**
 * Aggregated pronunciation progress for a specific card.
 *
 * Tracks the user's improvement over multiple recording attempts,
 * providing motivation through visible progress metrics.
 */
export interface PronunciationProgress {
  /** ID of the card this progress relates to. */
  cardId: string;

  /** ID of the user. */
  userId: string;

  /** Total number of recording attempts for this card. */
  totalAttempts: number;

  /** The highest comparison score ever achieved for this card. */
  bestScore: number;

  /** The comparison score of the most recent attempt. */
  latestScore: number;

  /** Average comparison score across all attempts. */
  averageScore: number;

  /**
   * Score trend over the last N attempts.
   *
   * Positive values indicate improvement; negative values indicate
   * regression. Computed as (average of last 3 scores) - (average
   * of the 3 scores before that).
   */
  trend: number;

  /** Timestamp of the first recording attempt. */
  firstAttemptAt: Date;

  /** Timestamp of the most recent recording attempt. */
  lastAttemptAt: Date;
}
