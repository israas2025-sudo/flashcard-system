/**
 * Quran-Specific Types
 *
 * Type definitions for the Quran memorization and study features within the
 * unified Classical Arabic / Quran language track. Quran cards share the same
 * language track but expose additional capabilities such as tajweed annotation,
 * sequential memorization, and ayah-level card templates.
 *
 * Spec references: Section 2.3 (Quran card templates), Section 2.6 (tajweed).
 */

// ---------------------------------------------------------------------------
// Tajweed Types
// ---------------------------------------------------------------------------

/**
 * All recognized tajweed rules.
 *
 * These map 1-to-1 to CSS classes (.tajweed-{rule}) and color assignments.
 */
export type TajweedRule =
  | 'idgham'
  | 'ikhfa'
  | 'iqlab'
  | 'izhar'
  | 'qalqalah'
  | 'madd-natural'
  | 'madd-connected'
  | 'madd-separate'
  | 'ghunnah'
  | 'noon-saakinah'
  | 'meem-saakinah'
  | 'laam-shamsiyyah'
  | 'laam-qamariyyah';

/**
 * A single tajweed annotation marking a rule occurrence within an ayah's text.
 * Character indices refer to positions in the raw Arabic string.
 */
export interface TajweedAnnotation {
  /** The tajweed rule identified at this position. */
  rule: TajweedRule;
  /** Start character index (inclusive) in the Arabic text. */
  startChar: number;
  /** End character index (exclusive) in the Arabic text. */
  endChar: number;
}

/**
 * Detailed description of a tajweed rule detection result, including the
 * human-readable explanation used in flashcard backs and tooltips.
 */
export interface TajweedDetection {
  /** The tajweed rule identified. */
  rule: TajweedRule;
  /** Start character index (inclusive). */
  startIndex: number;
  /** End character index (exclusive). */
  endIndex: number;
  /** Human-readable description of why this rule applies here. */
  description: string;
}

/**
 * Full explanation of a tajweed rule for the reference panel and card backs.
 */
export interface TajweedExplanation {
  /** English transliterated name. */
  name: string;
  /** Arabic name of the rule. */
  arabicName: string;
  /** Detailed description of the rule. */
  description: string;
  /** Example Arabic text demonstrating the rule. */
  example: string;
}

// ---------------------------------------------------------------------------
// Ayah / Quran Data Types
// ---------------------------------------------------------------------------

/**
 * Revelation period classification.
 */
export type RevelationType = 'makki' | 'madani';

/**
 * Full data for a single ayah (verse), used to generate all 6 Quran card types.
 */
export interface AyahData {
  /** Surah number (1-114). */
  surahNumber: number;
  /** English transliterated surah name. */
  surahName: string;
  /** Arabic surah name. */
  surahArabicName: string;
  /** Ayah number within the surah. */
  ayahNumber: number;
  /** Full Arabic text of the ayah in Uthmani script. */
  arabicText: string;
  /** Translations keyed by language code (e.g., 'en', 'fr', 'ur'). */
  translations: Record<string, string>;
  /** Optional tafsir (exegesis) text. */
  tafsir?: string;
  /** Root words (trilateral roots) found in this ayah. */
  rootWords: string[];
  /** Thematic tags for this ayah. */
  themes: string[];
  /** Juz (part) number (1-30). */
  juz: number;
  /** Makki or Madani classification. */
  revelation: RevelationType;
  /** Tajweed rule annotations for this ayah's text. */
  tajweedRules: TajweedAnnotation[];
}

/**
 * A card representation of a single ayah for the sequential memorization flow.
 */
export interface AyahCard {
  /** Unique card identifier. */
  id: string;
  /** The full ayah data. */
  ayahData: AyahData;
  /** Current memorization status. */
  status: AyahMemorizationStatus;
  /** Number of times this ayah has been reviewed. */
  reviewCount: number;
  /** Last review timestamp, if any. */
  lastReviewedAt?: Date;
}

export type AyahMemorizationStatus = 'not-started' | 'in-progress' | 'memorized';

// ---------------------------------------------------------------------------
// Memorization Progress Types
// ---------------------------------------------------------------------------

/**
 * Memorization progress for a single surah.
 */
export interface MemorizationProgress {
  /** Surah number (1-114). */
  surahNumber: number;
  /** English transliterated surah name. */
  surahName: string;
  /** Total ayahs in the surah. */
  totalAyahs: number;
  /** Number of ayahs marked as memorized. */
  memorized: number;
  /** Number of ayahs currently being learned. */
  inProgress: number;
  /** Number of ayahs not yet started. */
  notStarted: number;
}

/**
 * Memorization progress for a juz (part).
 */
export interface JuzProgress {
  /** Juz number (1-30). */
  juzNumber: number;
  /** Surahs (or partial surahs) included in this juz. */
  surahs: {
    surahNumber: number;
    surahName: string;
    ayahRange: { start: number; end: number };
    memorized: number;
    total: number;
  }[];
  /** Total ayahs in the juz. */
  totalAyahs: number;
  /** Total memorized ayahs in the juz. */
  memorized: number;
  /** Percentage of juz memorized. */
  percentage: number;
}

// ---------------------------------------------------------------------------
// Surah Metadata
// ---------------------------------------------------------------------------

/**
 * Static metadata for a surah. The full SURAH_DATA array lives in
 * sequential-memorization.ts and contains all 114 entries.
 */
export interface SurahMetadata {
  /** Surah number (1-114). */
  number: number;
  /** English transliterated name. */
  name: string;
  /** Arabic name. */
  arabicName: string;
  /** Total number of ayahs. */
  ayahCount: number;
  /** Starting juz number. */
  juz: number;
  /** Makki or Madani. */
  revelation: RevelationType;
}

// ---------------------------------------------------------------------------
// Card Template Types
// ---------------------------------------------------------------------------

/**
 * The 6 Quran-specific card template types from the spec (Section 2.3).
 */
export type QuranCardType =
  | 'ayah-completion'
  | 'translation-matching'
  | 'surah-identification'
  | 'vocabulary-in-context'
  | 'tajweed-identification'
  | 'sequential-recall';

/**
 * A generated Quran flashcard with front/back content and optional hint.
 */
export interface QuranCard {
  /** Unique card identifier. */
  id: string;
  /** Which of the 6 card types this is. */
  type: QuranCardType;
  /** HTML content for the card front. */
  front: string;
  /** HTML content for the card back. */
  back: string;
  /** Optional hint text. */
  hint?: string;
  /** Source ayah data. */
  source: AyahData;
}

/**
 * Result of the QuranCardGenerator: one ayah produces up to 6 cards.
 */
export interface GeneratedQuranCards {
  /** Source ayah data. */
  ayahData: AyahData;
  /** All generated cards. */
  cards: QuranCard[];
}
