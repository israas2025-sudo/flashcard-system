/**
 * Pronunciation Module
 *
 * Provides pronunciation recording, amplitude envelope waveform comparison,
 * and progress tracking for the multilingual flashcard application.
 * Supports any language without requiring speech-to-text capabilities.
 */

export { PronunciationService } from './pronunciation-service';

export type {
  PronunciationRecording,
  WaveformComparisonResult,
  PronunciationProgress,
} from './types';
