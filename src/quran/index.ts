/**
 * Quran Module — Public API
 *
 * Re-exports all Quran-specific types, services, and constants for the
 * unified Classical Arabic / Quran language track.
 *
 * Usage:
 *   import { TajweedService, SURAH_DATA, QuranCardGenerator } from '@/quran';
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  TajweedRule,
  TajweedAnnotation,
  TajweedDetection,
  TajweedExplanation,
  AyahData,
  AyahCard,
  AyahMemorizationStatus,
  MemorizationProgress,
  JuzProgress,
  SurahMetadata,
  RevelationType,
  QuranCardType,
  QuranCard,
  GeneratedQuranCards,
} from './types';

// ---------------------------------------------------------------------------
// Tajweed System
// ---------------------------------------------------------------------------

export { TajweedService, TAJWEED_COLORS } from './tajweed-system';

// ---------------------------------------------------------------------------
// Sequential Memorization
// ---------------------------------------------------------------------------

export {
  SequentialMemorizationService,
  SURAH_DATA,
  JUZ_BOUNDARIES,
} from './sequential-memorization';

// ---------------------------------------------------------------------------
// Card Templates
// ---------------------------------------------------------------------------

export {
  AyahCompletionTemplate,
  TranslationMatchingTemplate,
  SurahIdentificationTemplate,
  VocabularyInContextTemplate,
  TajweedIdentificationTemplate,
  SequentialRecallTemplate,
  QuranCardGenerator,
} from './ayah-card-types';
