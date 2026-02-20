/**
 * pronunciation-service.ts -- Core service for pronunciation recording,
 * waveform comparison, and progress tracking.
 *
 * All audio files are stored externally (filesystem or object storage).
 * This service manages the metadata in PostgreSQL and provides the
 * amplitude envelope comparison algorithm for pronunciation feedback.
 *
 * The waveform comparison uses normalised amplitude envelope
 * cross-correlation -- a lightweight approach that does not require
 * speech-to-text or phoneme alignment, making it suitable for any
 * language including Arabic dialects.
 */

import { pool } from '../db/connection';
import type {
  PronunciationRecording,
  WaveformComparisonResult,
  PronunciationProgress,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of segments for per-segment comparison scoring. */
const COMPARISON_SEGMENTS = 12;

/** Minimum number of amplitude samples required for comparison. */
const MIN_ENVELOPE_LENGTH = 10;

// ---------------------------------------------------------------------------
// PronunciationService
// ---------------------------------------------------------------------------

export class PronunciationService {
  // -------------------------------------------------------------------------
  // Recording CRUD
  // -------------------------------------------------------------------------

  /**
   * Save a new pronunciation recording.
   *
   * Stores the recording metadata and amplitude envelope in the database.
   * The actual audio file should already be uploaded to storage before
   * calling this method.
   *
   * @param userId   - The user who made the recording.
   * @param cardId   - The card the recording is for.
   * @param audioUrl - URL or path to the stored audio file.
   * @param durationMs - Duration in milliseconds.
   * @param mimeType - MIME type of the audio file.
   * @param sizeBytes - Size of the audio file in bytes.
   * @param amplitudeEnvelope - Normalised amplitude envelope array.
   * @returns The saved PronunciationRecording.
   */
  async saveRecording(
    userId: string,
    cardId: string,
    audioUrl: string,
    durationMs: number,
    mimeType: string,
    sizeBytes: number,
    amplitudeEnvelope: number[],
  ): Promise<PronunciationRecording> {
    const result = await pool.query(
      `INSERT INTO pronunciation_recordings
         (user_id, card_id, audio_url, duration_ms, mime_type, size_bytes,
          amplitude_envelope, is_best_attempt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING
         id,
         user_id       AS "userId",
         card_id       AS "cardId",
         audio_url     AS "audioUrl",
         duration_ms   AS "durationMs",
         mime_type     AS "mimeType",
         size_bytes    AS "sizeBytes",
         amplitude_envelope AS "amplitudeEnvelope",
         comparison_score   AS "comparisonScore",
         is_best_attempt    AS "isBestAttempt",
         created_at         AS "createdAt"`,
      [userId, cardId, audioUrl, durationMs, mimeType, sizeBytes, JSON.stringify(amplitudeEnvelope)],
    );

    return result.rows[0] as PronunciationRecording;
  }

  /**
   * Retrieve all recordings for a card by a specific user.
   *
   * Results are ordered by creation date descending (newest first).
   *
   * @param userId - The user whose recordings to retrieve.
   * @param cardId - The card to get recordings for.
   * @returns Array of PronunciationRecording objects.
   */
  async getRecordings(userId: string, cardId: string): Promise<PronunciationRecording[]> {
    const result = await pool.query(
      `SELECT
         id,
         user_id       AS "userId",
         card_id       AS "cardId",
         audio_url     AS "audioUrl",
         duration_ms   AS "durationMs",
         mime_type     AS "mimeType",
         size_bytes    AS "sizeBytes",
         amplitude_envelope AS "amplitudeEnvelope",
         comparison_score   AS "comparisonScore",
         is_best_attempt    AS "isBestAttempt",
         created_at         AS "createdAt"
       FROM pronunciation_recordings
       WHERE user_id = $1 AND card_id = $2
       ORDER BY created_at DESC`,
      [userId, cardId],
    );

    return result.rows as PronunciationRecording[];
  }

  /**
   * Delete a specific recording.
   *
   * This only removes the database record. The caller is responsible
   * for deleting the actual audio file from storage.
   *
   * @param recordingId - The recording to delete.
   * @param userId      - The user who owns the recording (for authorisation).
   * @throws Error if the recording is not found or does not belong to the user.
   */
  async deleteRecording(recordingId: string, userId: string): Promise<void> {
    const result = await pool.query(
      `DELETE FROM pronunciation_recordings
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [recordingId, userId],
    );

    if (result.rowCount === 0) {
      throw new Error(`Recording "${recordingId}" not found or access denied`);
    }
  }

  // -------------------------------------------------------------------------
  // Waveform Comparison
  // -------------------------------------------------------------------------

  /**
   * Compare a user's pronunciation recording against a reference waveform.
   *
   * The comparison algorithm:
   *   1. Resample both envelopes to the same length.
   *   2. Normalise both envelopes to [0, 1] range.
   *   3. Find the optimal alignment offset via cross-correlation.
   *   4. Compute the overall RMSE and per-segment similarity scores.
   *   5. Derive an overall similarity score from the RMSE.
   *
   * The comparison score is also persisted on the recording row for
   * quick retrieval.
   *
   * @param recordingId       - The user recording to compare.
   * @param referenceId       - The reference recording or media asset ID.
   * @param userEnvelope      - The user's amplitude envelope.
   * @param referenceEnvelope - The reference amplitude envelope.
   * @returns The comparison result with overall and per-segment scores.
   */
  async compareWaveforms(
    recordingId: string,
    referenceId: string,
    userEnvelope: number[],
    referenceEnvelope: number[],
  ): Promise<WaveformComparisonResult> {
    if (userEnvelope.length < MIN_ENVELOPE_LENGTH || referenceEnvelope.length < MIN_ENVELOPE_LENGTH) {
      throw new Error('Amplitude envelopes must contain at least 10 samples');
    }

    // Step 1: Resample both envelopes to a common length
    const targetLength = Math.max(userEnvelope.length, referenceEnvelope.length);
    const userResampled = this.resampleEnvelope(userEnvelope, targetLength);
    const refResampled = this.resampleEnvelope(referenceEnvelope, targetLength);

    // Step 2: Normalise to [0, 1]
    const userNormalised = this.normaliseEnvelope(userResampled);
    const refNormalised = this.normaliseEnvelope(refResampled);

    // Step 3: Find optimal alignment via cross-correlation
    const maxShift = Math.floor(targetLength * 0.15); // Allow up to 15% shift
    const { offset, correlation } = this.findBestAlignment(userNormalised, refNormalised, maxShift);

    // Step 4: Apply alignment and compute RMSE
    const aligned = this.applyAlignment(userNormalised, offset);
    const rmse = this.computeRMSE(aligned, refNormalised);

    // Step 5: Compute per-segment scores
    const segmentScores = this.computeSegmentScores(aligned, refNormalised, COMPARISON_SEGMENTS);

    // Step 6: Derive overall score from RMSE (0 = worst, 1 = perfect)
    // RMSE of normalised signals ranges from 0 to ~1.
    // Map: RMSE 0 -> score 1.0, RMSE 0.5 -> score ~0.25, RMSE >= 1 -> score 0
    const overallScore = Math.max(0, Math.min(1, 1 - rmse * rmse * 2));

    // Step 7: Compute tempo ratio
    const userDurationProxy = userEnvelope.length;
    const refDurationProxy = referenceEnvelope.length;
    const tempoRatio = refDurationProxy > 0 ? userDurationProxy / refDurationProxy : 1;

    // Step 8: Compute alignment offset in milliseconds (assuming ~50 samples/sec)
    const samplesPerSecond = 50;
    const alignmentOffsetMs = Math.round((offset / samplesPerSecond) * 1000);

    // Persist the score on the recording
    await pool.query(
      `UPDATE pronunciation_recordings
       SET comparison_score = $1
       WHERE id = $2`,
      [overallScore, recordingId],
    );

    // Update best attempt if this is the new highest score
    await this.updateBestAttempt(recordingId, overallScore);

    return {
      overallScore: Math.round(overallScore * 1000) / 1000,
      segmentScores,
      alignmentOffsetMs,
      tempoRatio: Math.round(tempoRatio * 100) / 100,
      rmseDifference: Math.round(rmse * 10000) / 10000,
      recordingId,
      referenceId,
    };
  }

  // -------------------------------------------------------------------------
  // Progress Tracking
  // -------------------------------------------------------------------------

  /**
   * Get the pronunciation progress summary for a specific card.
   *
   * Aggregates statistics from all recordings the user has made for the card.
   *
   * @param userId - The user whose progress to retrieve.
   * @param cardId - The card to get progress for.
   * @returns PronunciationProgress or null if no recordings exist.
   */
  async getProgress(userId: string, cardId: string): Promise<PronunciationProgress | null> {
    const result = await pool.query(
      `SELECT
         card_id                          AS "cardId",
         user_id                          AS "userId",
         COUNT(*)::int                    AS "totalAttempts",
         COALESCE(MAX(comparison_score), 0)  AS "bestScore",
         COALESCE(
           (SELECT comparison_score
            FROM pronunciation_recordings sub
            WHERE sub.user_id = pr.user_id AND sub.card_id = pr.card_id
            ORDER BY sub.created_at DESC LIMIT 1),
           0
         )                                AS "latestScore",
         COALESCE(AVG(comparison_score), 0)  AS "averageScore",
         MIN(created_at)                  AS "firstAttemptAt",
         MAX(created_at)                  AS "lastAttemptAt"
       FROM pronunciation_recordings pr
       WHERE user_id = $1 AND card_id = $2 AND comparison_score IS NOT NULL
       GROUP BY card_id, user_id`,
      [userId, cardId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Compute trend from recent scores
    const trend = await this.computeTrend(userId, cardId);

    return {
      cardId: row.cardId,
      userId: row.userId,
      totalAttempts: row.totalAttempts,
      bestScore: parseFloat(row.bestScore),
      latestScore: parseFloat(row.latestScore),
      averageScore: Math.round(parseFloat(row.averageScore) * 1000) / 1000,
      trend,
      firstAttemptAt: new Date(row.firstAttemptAt),
      lastAttemptAt: new Date(row.lastAttemptAt),
    };
  }

  // -------------------------------------------------------------------------
  // Private: Waveform Analysis Helpers
  // -------------------------------------------------------------------------

  /**
   * Resample an amplitude envelope to a target length using linear interpolation.
   */
  private resampleEnvelope(envelope: number[], targetLength: number): number[] {
    if (envelope.length === targetLength) return envelope.slice();
    if (envelope.length === 0) return new Array(targetLength).fill(0);

    const result = new Array(targetLength);
    const ratio = (envelope.length - 1) / (targetLength - 1);

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio;
      const lower = Math.floor(srcIndex);
      const upper = Math.min(lower + 1, envelope.length - 1);
      const fraction = srcIndex - lower;

      result[i] = envelope[lower] * (1 - fraction) + envelope[upper] * fraction;
    }

    return result;
  }

  /**
   * Normalise an envelope to [0, 1] range.
   */
  private normaliseEnvelope(envelope: number[]): number[] {
    let min = Infinity;
    let max = -Infinity;

    for (const v of envelope) {
      if (v < min) min = v;
      if (v > max) max = v;
    }

    const range = max - min;
    if (range <= 0) return envelope.map(() => 0);

    return envelope.map((v) => (v - min) / range);
  }

  /**
   * Find the best alignment offset between two envelopes using
   * sliding-window cross-correlation.
   *
   * @returns The offset (in samples) and the peak correlation value.
   */
  private findBestAlignment(
    user: number[],
    reference: number[],
    maxShift: number,
  ): { offset: number; correlation: number } {
    let bestOffset = 0;
    let bestCorrelation = -Infinity;
    const len = user.length;

    for (let shift = -maxShift; shift <= maxShift; shift++) {
      let sumProduct = 0;
      let count = 0;

      for (let i = 0; i < len; i++) {
        const j = i + shift;
        if (j >= 0 && j < len) {
          sumProduct += user[i] * reference[j];
          count++;
        }
      }

      const correlation = count > 0 ? sumProduct / count : 0;

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = shift;
      }
    }

    return { offset: bestOffset, correlation: bestCorrelation };
  }

  /**
   * Apply an alignment offset to an envelope by shifting samples.
   */
  private applyAlignment(envelope: number[], offset: number): number[] {
    const result = new Array(envelope.length).fill(0);

    for (let i = 0; i < envelope.length; i++) {
      const src = i + offset;
      if (src >= 0 && src < envelope.length) {
        result[i] = envelope[src];
      }
    }

    return result;
  }

  /**
   * Compute root mean squared error between two envelopes.
   */
  private computeRMSE(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 1;

    let sumSq = 0;
    for (let i = 0; i < len; i++) {
      const diff = a[i] - b[i];
      sumSq += diff * diff;
    }

    return Math.sqrt(sumSq / len);
  }

  /**
   * Compute per-segment similarity scores.
   *
   * Divides both envelopes into N equal segments and computes
   * a similarity score (1 - segmentRMSE^2) for each segment.
   */
  private computeSegmentScores(
    user: number[],
    reference: number[],
    segments: number,
  ): number[] {
    const len = Math.min(user.length, reference.length);
    const segmentSize = Math.max(1, Math.floor(len / segments));
    const scores: number[] = [];

    for (let s = 0; s < segments; s++) {
      const start = s * segmentSize;
      const end = s === segments - 1 ? len : start + segmentSize;

      let sumSq = 0;
      let count = 0;

      for (let i = start; i < end; i++) {
        const diff = user[i] - reference[i];
        sumSq += diff * diff;
        count++;
      }

      const segRmse = count > 0 ? Math.sqrt(sumSq / count) : 1;
      const score = Math.max(0, Math.min(1, 1 - segRmse * segRmse * 2));
      scores.push(Math.round(score * 1000) / 1000);
    }

    return scores;
  }

  // -------------------------------------------------------------------------
  // Private: Best Attempt and Trend
  // -------------------------------------------------------------------------

  /**
   * Update the "best attempt" flag if this recording has the highest score.
   */
  private async updateBestAttempt(recordingId: string, score: number): Promise<void> {
    // Get the recording's userId and cardId
    const recResult = await pool.query(
      `SELECT user_id, card_id FROM pronunciation_recordings WHERE id = $1`,
      [recordingId],
    );

    if (recResult.rows.length === 0) return;

    const { user_id: userId, card_id: cardId } = recResult.rows[0];

    // Check if this is the highest score
    const bestResult = await pool.query(
      `SELECT id, COALESCE(comparison_score, 0) AS score
       FROM pronunciation_recordings
       WHERE user_id = $1 AND card_id = $2
       ORDER BY comparison_score DESC NULLS LAST
       LIMIT 1`,
      [userId, cardId],
    );

    if (bestResult.rows.length === 0) return;

    const bestId = bestResult.rows[0].id;

    // Clear all best-attempt flags for this card, then set the new best
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE pronunciation_recordings
         SET is_best_attempt = FALSE
         WHERE user_id = $1 AND card_id = $2`,
        [userId, cardId],
      );

      await client.query(
        `UPDATE pronunciation_recordings
         SET is_best_attempt = TRUE
         WHERE id = $1`,
        [bestId],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Compute the score trend for a card.
   *
   * Compares the average of the last 3 scores to the average of the
   * 3 scores before that. Returns the difference.
   */
  private async computeTrend(userId: string, cardId: string): Promise<number> {
    const result = await pool.query(
      `SELECT comparison_score AS score
       FROM pronunciation_recordings
       WHERE user_id = $1 AND card_id = $2 AND comparison_score IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 6`,
      [userId, cardId],
    );

    const scores = result.rows.map((r) => parseFloat(r.score));

    if (scores.length < 4) return 0;

    const recentAvg =
      scores.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
    const previousAvg =
      scores.slice(3, 6).reduce((s, v) => s + v, 0) / Math.min(3, scores.length - 3);

    return Math.round((recentAvg - previousAvg) * 1000) / 1000;
  }
}
