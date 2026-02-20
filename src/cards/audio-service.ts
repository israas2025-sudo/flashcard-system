/**
 * Audio Service
 *
 * Implements the audio playback and recording features described in
 * Section 1.10 of the flashcard system specification.
 *
 * Features:
 * - Play audio from a URL (for [sound:...] tags in card fields)
 * - Auto-play audio when a card is shown
 * - Replay the last played audio
 * - Stop current playback
 * - Record user's voice for pronunciation practice
 * - Play back user recordings
 * - Save and retrieve recordings per card
 *
 * This service operates entirely on the client side using the Web Audio
 * API and MediaRecorder API. Recordings are stored in-memory as Blobs
 * keyed by card ID.
 */

import type { AudioConfig, RecordingState } from './types';

export class AudioService {
  /** The HTML audio element used for playback. */
  private audioElement: HTMLAudioElement | null = null;

  /** The URL of the last played audio, for replay support. */
  private lastPlayedUrl: string | null = null;

  /** Current recording state. */
  private recordingState: RecordingState = {
    isRecording: false,
    recorder: null,
    chunks: [],
  };

  /** Map of card ID to recorded audio Blob. */
  private recordings: Map<string, Blob> = new Map();

  /** Audio configuration. */
  private config: AudioConfig = {
    autoPlay: true,
    playbackRate: 1.0,
  };

  /** The active MediaStream (needed for cleanup after recording). */
  private activeStream: MediaStream | null = null;

  /**
   * Play audio from a URL.
   *
   * Stops any currently playing audio first, then plays the new audio.
   * When auto-play is enabled, this is called automatically when a card
   * containing [sound:...] tags is shown.
   *
   * @param audioUrl - The URL of the audio file to play.
   * @returns A promise that resolves when playback starts.
   * @throws Error if the audio cannot be loaded or played.
   */
  async play(audioUrl: string): Promise<void> {
    // Stop any existing playback
    this.stop();

    this.audioElement = new Audio(audioUrl);
    this.audioElement.playbackRate = this.config.playbackRate;
    this.lastPlayedUrl = audioUrl;

    try {
      await this.audioElement.play();
    } catch (error) {
      // Browser may block autoplay; this is expected in some contexts
      const message =
        error instanceof Error ? error.message : 'Unknown playback error';
      throw new Error(`Failed to play audio: ${message}`);
    }
  }

  /**
   * Replay the last played audio.
   *
   * If no audio has been played yet in this session, this is a no-op.
   * The audio is rewound to the beginning before playing.
   */
  replay(): void {
    if (!this.audioElement || !this.lastPlayedUrl) return;

    this.audioElement.currentTime = 0;
    this.audioElement.playbackRate = this.config.playbackRate;
    this.audioElement.play().catch(() => {
      // Silently handle autoplay restrictions on replay
    });
  }

  /**
   * Stop current audio playback.
   *
   * Pauses the audio element and resets its position. Safe to call
   * even if nothing is currently playing.
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  /**
   * Check if audio is currently playing.
   *
   * @returns `true` if audio is actively playing.
   */
  isPlaying(): boolean {
    if (!this.audioElement) return false;
    return !this.audioElement.paused && !this.audioElement.ended;
  }

  /**
   * Start recording the user's voice.
   *
   * Uses the MediaRecorder API to capture audio from the user's microphone.
   * The recording accumulates audio chunks which are combined into a Blob
   * when stopRecording() is called.
   *
   * @throws Error if microphone access is denied or unavailable.
   */
  async startRecording(): Promise<void> {
    if (this.recordingState.isRecording) {
      throw new Error('Recording is already in progress');
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Microphone access denied: ${message}`);
    }

    this.activeStream = stream;
    this.recordingState.chunks = [];

    const recorder = new MediaRecorder(stream, {
      mimeType: this.getSupportedMimeType(),
    });

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.recordingState.chunks.push(event.data);
      }
    };

    recorder.start(100); // Collect data every 100ms

    this.recordingState.recorder = recorder;
    this.recordingState.isRecording = true;
  }

  /**
   * Stop the current recording and return the audio as a Blob.
   *
   * Combines all accumulated audio chunks into a single Blob.
   * Also cleans up the MediaStream to release the microphone.
   *
   * @returns A promise that resolves with the recorded audio Blob.
   * @throws Error if no recording is in progress.
   */
  async stopRecording(): Promise<Blob> {
    if (!this.recordingState.isRecording || !this.recordingState.recorder) {
      throw new Error('No recording in progress');
    }

    const recorder = this.recordingState.recorder;

    return new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const mimeType = this.getSupportedMimeType();
        const blob = new Blob(this.recordingState.chunks, { type: mimeType });

        // Clean up
        this.recordingState.isRecording = false;
        this.recordingState.recorder = null;
        this.recordingState.chunks = [];

        // Release the microphone stream
        if (this.activeStream) {
          for (const track of this.activeStream.getTracks()) {
            track.stop();
          }
          this.activeStream = null;
        }

        resolve(blob);
      };

      recorder.onerror = (event: Event) => {
        this.recordingState.isRecording = false;
        this.recordingState.recorder = null;
        this.recordingState.chunks = [];

        if (this.activeStream) {
          for (const track of this.activeStream.getTracks()) {
            track.stop();
          }
          this.activeStream = null;
        }

        reject(new Error('Recording failed'));
      };

      recorder.stop();
    });
  }

  /**
   * Play back a previously saved recording for a specific card.
   *
   * @param cardId - The card whose recording to play.
   * @throws Error if no recording exists for this card.
   */
  playRecording(cardId: string): void {
    const blob = this.recordings.get(cardId);
    if (!blob) {
      throw new Error(`No recording found for card "${cardId}"`);
    }

    // Stop any current playback
    this.stop();

    const url = URL.createObjectURL(blob);
    this.audioElement = new Audio(url);
    this.audioElement.playbackRate = this.config.playbackRate;

    // Clean up the object URL when playback finishes
    this.audioElement.onended = () => {
      URL.revokeObjectURL(url);
    };

    this.audioElement.play().catch(() => {
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Save a recording for a specific card.
   *
   * Overwrites any existing recording for the same card.
   *
   * @param cardId - The card to associate the recording with.
   * @param blob   - The audio Blob to save.
   */
  saveRecording(cardId: string, blob: Blob): void {
    this.recordings.set(cardId, blob);
  }

  /**
   * Get a previously saved recording for a card.
   *
   * @param cardId - The card whose recording to retrieve.
   * @returns The audio Blob, or null if no recording exists.
   */
  getRecording(cardId: string): Blob | null {
    return this.recordings.get(cardId) || null;
  }

  /**
   * Check if a recording exists for a specific card.
   *
   * @param cardId - The card to check.
   * @returns `true` if a recording exists for this card.
   */
  hasRecording(cardId: string): boolean {
    return this.recordings.has(cardId);
  }

  /**
   * Delete a recording for a specific card.
   *
   * @param cardId - The card whose recording to delete.
   * @returns `true` if a recording was deleted, `false` if none existed.
   */
  deleteRecording(cardId: string): boolean {
    return this.recordings.delete(cardId);
  }

  /**
   * Clear all saved recordings.
   */
  clearAllRecordings(): void {
    this.recordings.clear();
  }

  /**
   * Check whether audio auto-play is enabled.
   *
   * When enabled, audio on cards is played automatically when the card
   * is first shown during review.
   *
   * @returns `true` if auto-play is enabled.
   */
  isAutoPlayEnabled(): boolean {
    return this.config.autoPlay;
  }

  /**
   * Enable or disable audio auto-play.
   *
   * @param enabled - Whether to enable auto-play.
   */
  setAutoPlay(enabled: boolean): void {
    this.config.autoPlay = enabled;
  }

  /**
   * Get the current playback rate.
   *
   * @returns The playback rate (1.0 = normal speed).
   */
  getPlaybackRate(): number {
    return this.config.playbackRate;
  }

  /**
   * Set the playback rate for audio.
   *
   * @param rate - The playback rate (0.5 = half speed, 1.0 = normal, 2.0 = double).
   * @throws Error if the rate is out of the valid range.
   */
  setPlaybackRate(rate: number): void {
    if (rate < 0.25 || rate > 4.0) {
      throw new Error(
        `Invalid playback rate: ${rate}. Must be between 0.25 and 4.0.`
      );
    }
    this.config.playbackRate = rate;

    // Apply to currently playing audio if any
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
  }

  /**
   * Check if a recording is currently in progress.
   *
   * @returns `true` if the microphone is actively recording.
   */
  isRecording(): boolean {
    return this.recordingState.isRecording;
  }

  /**
   * Clean up all resources.
   *
   * Stops any active playback and recording, releases the microphone,
   * and clears all saved recordings. Call this when the service is no
   * longer needed (e.g. when leaving the review screen).
   */
  dispose(): void {
    this.stop();

    // Stop recording if active
    if (this.recordingState.isRecording && this.recordingState.recorder) {
      this.recordingState.recorder.stop();
      this.recordingState.isRecording = false;
      this.recordingState.recorder = null;
      this.recordingState.chunks = [];
    }

    // Release microphone stream
    if (this.activeStream) {
      for (const track of this.activeStream.getTracks()) {
        track.stop();
      }
      this.activeStream = null;
    }

    // Clear recordings
    this.recordings.clear();
    this.audioElement = null;
    this.lastPlayedUrl = null;
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Determine the best supported audio MIME type for recording.
   *
   * Prefers WebM with Opus codec (good quality, small files), falls back
   * to other formats as available.
   *
   * @returns A supported MIME type string.
   */
  private getSupportedMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const mimeType of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Fallback: let the browser decide
    return '';
  }
}
