/**
 * sound-manager.ts -- Programmatic sound effect synthesis using the Web Audio API.
 *
 * All sounds are generated at runtime using oscillators, gain envelopes, and
 * filters -- no external audio files are required. This keeps the bundle size
 * minimal while providing responsive, low-latency audio feedback.
 *
 * Sound Design Philosophy:
 * - Card interactions use short, subtle sounds that do not distract
 * - Positive feedback (correct, celebration) uses warm, ascending tones
 * - Negative feedback (incorrect) is muted and non-punishing
 * - Milestone/level-up sounds are longer and more resonant to mark the moment
 * - All sounds use natural-sounding timbres (sine + triangle blends)
 *
 * The manager is safe to instantiate in SSR environments -- it will
 * silently no-op if the Web Audio API is unavailable.
 */

import type { SoundConfig } from './types';

// ---------------------------------------------------------------------------
// Musical Constants
// ---------------------------------------------------------------------------

/**
 * Equal-temperament note frequencies (Hz) for the 4th octave.
 * Used for constructing melodic sound effects.
 */
const NOTE = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
} as const;

// ---------------------------------------------------------------------------
// SoundManager
// ---------------------------------------------------------------------------

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private initialized: boolean = false;

  constructor() {
    // Defer AudioContext creation to first user interaction
    // (required by browser autoplay policies)
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * Initialize the AudioContext. Must be called from a user gesture handler
   * (click, keypress, etc.) to comply with browser autoplay policies.
   *
   * Safe to call multiple times -- subsequent calls are no-ops.
   */
  async preloadAll(): Promise<void> {
    if (this.initialized) return;

    try {
      if (typeof AudioContext !== 'undefined') {
        this.audioContext = new AudioContext();
      } else if (typeof (window as any).webkitAudioContext !== 'undefined') {
        this.audioContext = new (window as any).webkitAudioContext();
      }
      this.initialized = true;
    } catch {
      // Web Audio API not available (SSR, old browser, etc.)
      this.audioContext = null;
      this.initialized = true;
    }
  }

  // -------------------------------------------------------------------------
  // Sound Effects
  // -------------------------------------------------------------------------

  /**
   * Play a soft mechanical tick when a card is flipped.
   *
   * Uses a very short burst of filtered white noise to simulate
   * the tactile click of a physical flashcard being turned over.
   */
  playCardFlip(): void {
    if (!this.canPlay()) return;
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Short noise burst through a bandpass filter
    const bufferSize = ctx.sampleRate * 0.03; // 30ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;

    const gain = this.createGain(ctx, now);
    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.05);
  }

  /**
   * Play a rising marimba-like C-E dyad when a card is answered correctly.
   *
   * Two sine oscillators at C4 and E4 (major third) with a quick attack
   * and moderate decay, producing a warm, affirming sound.
   */
  playCorrect(): void {
    if (!this.canPlay()) return;
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // C4 note
    this.playTone(ctx, now, NOTE.C4, 0.25, 0.0, {
      attack: 0.005,
      decay: 0.15,
      sustain: 0.1,
      release: 0.1,
    });

    // E4 note (slight delay for arpeggio feel)
    this.playTone(ctx, now, NOTE.E4, 0.2, 0.04, {
      attack: 0.005,
      decay: 0.15,
      sustain: 0.08,
      release: 0.1,
    });
  }

  /**
   * Play a muted thud when a card is answered incorrectly.
   *
   * A low-frequency tone with heavy filtering and fast decay.
   * Designed to be informative without being discouraging.
   */
  playIncorrect(): void {
    if (!this.canPlay()) return;
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 1;

    const gain = this.createGain(ctx, now);
    gain.gain.setValueAtTime(0.25 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Play a three-note ascending C-E-G chime for session completion.
   *
   * A major triad arpeggio with bell-like timbres (sine + quiet triangle
   * harmonic) and gentle reverb-like tail.
   */
  playCelebration(): void {
    if (!this.canPlay()) return;
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const notes = [NOTE.C4, NOTE.E4, NOTE.G4];
    const delays = [0, 0.1, 0.2];
    const envelope = {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.15,
      release: 0.3,
    };

    notes.forEach((freq, i) => {
      // Fundamental (sine)
      this.playTone(ctx, now, freq, 0.2, delays[i], envelope);
      // Harmonic (triangle, one octave up, quieter)
      this.playTone(ctx, now, freq * 2, 0.08, delays[i], {
        ...envelope,
        decay: 0.2,
      }, 'triangle');
    });
  }

  /**
   * Play a longer resonant tone for streak milestones.
   *
   * A sustained, slowly evolving chord (C major with added 9th) that
   * fades gently. The extended duration marks this as a significant moment.
   */
  playMilestone(): void {
    if (!this.canPlay()) return;
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const chordNotes = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.D5];
    const envelope = {
      attack: 0.05,
      decay: 0.8,
      sustain: 0.2,
      release: 0.5,
    };

    chordNotes.forEach((freq, i) => {
      const amplitude = 0.15 - i * 0.02;
      this.playTone(ctx, now, freq, amplitude, i * 0.06, envelope);
      // Soft octave harmonic
      this.playTone(ctx, now, freq * 2, amplitude * 0.2, i * 0.06, {
        ...envelope,
        decay: 0.5,
      }, 'triangle');
    });
  }

  /**
   * Play an ascending arpeggio for leveling up.
   *
   * Five notes ascending through C major (C-E-G-C5-E5) with increasing
   * brightness, culminating in a sustained high note.
   */
  playLevelUp(): void {
    if (!this.canPlay()) return;
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const notes = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5];
    const delays = [0, 0.08, 0.16, 0.24, 0.35];

    notes.forEach((freq, i) => {
      const isLast = i === notes.length - 1;
      const envelope = isLast
        ? { attack: 0.01, decay: 0.6, sustain: 0.3, release: 0.4 }
        : { attack: 0.005, decay: 0.12, sustain: 0.05, release: 0.08 };
      const amplitude = isLast ? 0.25 : 0.15 + i * 0.02;

      this.playTone(ctx, now, freq, amplitude, delays[i], envelope);

      if (isLast) {
        // Add shimmer to the final note
        this.playTone(ctx, now, freq * 2, amplitude * 0.15, delays[i] + 0.02, {
          attack: 0.02,
          decay: 0.4,
          sustain: 0.1,
          release: 0.3,
        }, 'triangle');
        this.playTone(ctx, now, freq * 3, amplitude * 0.05, delays[i] + 0.03, {
          attack: 0.03,
          decay: 0.3,
          sustain: 0.05,
          release: 0.2,
        }, 'sine');
      }
    });
  }

  /**
   * Play a gentle chime notification for achievement unlocks.
   *
   * Two-note descending bell tone (G5 -> E5) with a bright, clear timbre
   * and a gentle decay. Designed to be attention-getting without being
   * intrusive.
   */
  playAchievement(): void {
    if (!this.canPlay()) return;
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // High bell tone
    this.playTone(ctx, now, NOTE.G5, 0.2, 0, {
      attack: 0.002,
      decay: 0.4,
      sustain: 0.1,
      release: 0.3,
    });

    // Second note (E5)
    this.playTone(ctx, now, NOTE.E5, 0.18, 0.15, {
      attack: 0.002,
      decay: 0.5,
      sustain: 0.15,
      release: 0.35,
    });

    // Subtle harmonic shimmer
    this.playTone(ctx, now, NOTE.G5 * 2, 0.04, 0, {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.02,
      release: 0.15,
    }, 'triangle');

    this.playTone(ctx, now, NOTE.E5 * 2, 0.03, 0.15, {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.02,
      release: 0.15,
    }, 'triangle');
  }

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  /**
   * Enable or disable all sound effects.
   *
   * @param enabled - Whether sounds should play.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set the global volume level.
   *
   * @param volume - Volume in the range [0, 1].
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get the current sound configuration.
   */
  getConfig(): SoundConfig {
    return {
      enabled: this.enabled,
      volume: this.volume,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Check whether sound can currently be played.
   * Returns false if disabled, muted, or AudioContext is unavailable.
   */
  private canPlay(): boolean {
    if (!this.enabled || this.volume <= 0 || !this.audioContext) return false;

    // Resume suspended context (happens after tab becomes inactive)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext.state !== 'closed';
  }

  /**
   * Create a GainNode connected to the destination.
   */
  private createGain(ctx: AudioContext, _time: number): GainNode {
    return ctx.createGain();
  }

  /**
   * Play a single tone with an ADSR envelope.
   *
   * @param ctx - The AudioContext.
   * @param baseTime - The reference time (usually ctx.currentTime).
   * @param frequency - The pitch in Hz.
   * @param amplitude - Peak amplitude (will be scaled by global volume).
   * @param delay - Delay in seconds from baseTime.
   * @param envelope - ADSR envelope timings in seconds.
   * @param waveform - Oscillator waveform type (default: 'sine').
   */
  private playTone(
    ctx: AudioContext,
    baseTime: number,
    frequency: number,
    amplitude: number,
    delay: number,
    envelope: { attack: number; decay: number; sustain: number; release: number },
    waveform: OscillatorType = 'sine'
  ): void {
    const startTime = baseTime + delay;
    const scaledAmplitude = amplitude * this.volume;
    const { attack, decay, sustain, release } = envelope;
    const totalDuration = attack + decay + release;

    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, startTime);

    const gain = ctx.createGain();

    // ADSR envelope
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(scaledAmplitude, startTime + attack);
    gain.gain.linearRampToValueAtTime(
      scaledAmplitude * sustain,
      startTime + attack + decay
    );
    gain.gain.linearRampToValueAtTime(0.001, startTime + totalDuration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + totalDuration + 0.01);
  }
}
