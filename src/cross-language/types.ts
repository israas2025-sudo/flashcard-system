/**
 * types.ts -- Type definitions for the cross-language features subsystem.
 *
 * Covers Arabic root linking (Quran <-> Classical Arabic <-> Egyptian Arabic),
 * Fusha-Ammiya bridging, and cross-language study scheduling.
 */

// ---------------------------------------------------------------------------
// Root Linking
// ---------------------------------------------------------------------------

/**
 * A reference to a Quran ayah associated with an Arabic root.
 */
export interface QuranReference {
  /** Card ID for this ayah in the user's collection. */
  cardId: string;

  /** Surah number (1-114). */
  surah: number;

  /** Ayah number within the surah. */
  ayah: number;

  /** Surah name in Arabic. */
  surahNameAr: string;

  /** Surah name in English. */
  surahNameEn: string;

  /** The ayah text (Arabic). */
  text: string;

  /** The root letters found in this ayah. */
  rootLetters: string;

  /** The specific word in the ayah that contains the root. */
  rootWord: string;
}

/**
 * A Classical Arabic vocabulary card associated with an Arabic root.
 */
export interface ClassicalArabicCard {
  /** Card ID. */
  cardId: string;

  /** The Arabic word. */
  word: string;

  /** English translation / definition. */
  translation: string;

  /** The root letters. */
  rootLetters: string;

  /** Morphological pattern (wazn), e.g., "fa'ala", "if'aal". */
  pattern: string;

  /** Part of speech. */
  partOfSpeech: string;

  /** Current FSRS interval (days) -- indicates how well-known the word is. */
  intervalDays: number;
}

/**
 * An Egyptian Arabic card for Fusha-Ammiya bridging.
 */
export interface EgyptianArabicCard {
  /** Card ID. */
  cardId: string;

  /** The Egyptian Arabic word/phrase. */
  word: string;

  /** English translation / definition. */
  translation: string;

  /** Transliteration in Latin script. */
  transliteration: string;

  /** Current FSRS interval (days). */
  intervalDays: number;
}

/**
 * A link between cards sharing the same Arabic root.
 */
export interface RootLink {
  /** The root letters (e.g., "ك ت ب"). */
  rootLetters: string;

  /** The type of connection. */
  linkType: 'quran_ayah' | 'classical_vocab' | 'egyptian_arabic';

  /** The connected card's ID. */
  linkedCardId: string;

  /** The connected card's front content (preview). */
  linkedCardFront: string;

  /** Brief description of the relationship. */
  relationship: string;
}

/**
 * A root index entry mapping roots to their associated cards.
 */
export interface RootIndexEntry {
  /** The root letters. */
  rootLetters: string;

  /** Card IDs of Quran ayahs containing this root. */
  quranCardIds: string[];

  /** Card IDs of Classical Arabic vocab with this root. */
  classicalCardIds: string[];

  /** Card IDs of Egyptian Arabic words derived from this root. */
  egyptianCardIds: string[];

  /** Total number of cards associated with this root. */
  totalCards: number;
}

// ---------------------------------------------------------------------------
// Fusha-Ammiya Bridge
// ---------------------------------------------------------------------------

/**
 * Bridge information connecting a Fusha (Classical Arabic) word
 * to its Ammiya (Egyptian Arabic) equivalent, or vice versa.
 */
export interface BridgeInfo {
  /** The card this bridge info is attached to. */
  sourceCardId: string;

  /** Whether the source is Fusha or Ammiya. */
  sourceType: 'fusha' | 'ammiya';

  /** The equivalent card in the other register. */
  equivalentCardId: string | null;

  /** The equivalent word. */
  equivalentWord: string | null;

  /** Notes on differences (pronunciation shifts, semantic drift, etc.). */
  notes: string;

  /** Shared root letters, if applicable. */
  sharedRoot: string | null;

  /** Whether the words are cognates (same root) or different words entirely. */
  isCognate: boolean;
}

// ---------------------------------------------------------------------------
// Smart Scheduler
// ---------------------------------------------------------------------------

/**
 * Priority configuration for a language in the study plan.
 */
export interface LanguagePriority {
  /** Language identifier (e.g., 'spanish', 'classical-arabic'). */
  language: string;

  /** Priority weight (higher = more cards). */
  weight: number;

  /** Maximum consecutive cards from this language before switching. */
  maxConsecutive: number;

  /** Whether this language is currently active for study. */
  active: boolean;
}

/**
 * A daily study plan with cards organized by language and priority.
 */
export interface StudyPlan {
  /** Ordered list of cards to study. */
  cards: StudyPlanCard[];

  /** Language distribution summary. */
  languageDistribution: LanguageDistributionEntry[];

  /** Estimated total study time in minutes. */
  estimatedMinutes: number;

  /** Total cards in the plan. */
  totalCards: number;
}

/**
 * A card in the study plan with language metadata.
 */
export interface StudyPlanCard {
  /** Card ID. */
  cardId: string;

  /** Deck ID. */
  deckId: string;

  /** Language this card belongs to. */
  language: string;

  /** Card type (new, learning, review, relearning). */
  cardType: string;

  /** Whether this card is overdue. */
  isOverdue: boolean;

  /** Priority score (higher = should be studied sooner). */
  priorityScore: number;
}

/**
 * Distribution of cards by language in a study plan.
 */
export interface LanguageDistributionEntry {
  /** Language identifier. */
  language: string;

  /** Human-readable language name. */
  displayName: string;

  /** Number of cards from this language. */
  cardCount: number;

  /** Percentage of total cards. */
  percentage: number;
}
