/**
 * Sequential Ayah Memorization Service
 *
 * Manages the sequential memorization workflow for Quran study. Unlike standard
 * flashcard review (which uses spaced repetition to reorder cards), Quran
 * memorization follows the natural order of ayahs within each surah.
 *
 * Features:
 *   - Sequential progression through ayahs in surah order
 *   - Per-surah and per-juz progress tracking
 *   - Integration with the unified Classical Arabic / Quran language track
 *   - Complete metadata for all 114 surahs
 *
 * Spec references: Section 2.3 (sequential memorization mode).
 */

import type {
  AyahCard,
  AyahData,
  AyahMemorizationStatus,
  JuzProgress,
  MemorizationProgress,
  SurahMetadata,
} from './types';

// ---------------------------------------------------------------------------
// Complete Surah Data — All 114 Surahs
// ---------------------------------------------------------------------------
// Ayah counts, juz mapping (starting juz), and makki/madani classification
// sourced from standard Quran metadata (Hafs an Asim mushaf).
// ---------------------------------------------------------------------------

export const SURAH_DATA: SurahMetadata[] = [
  { number: 1,   name: 'Al-Fatihah',       arabicName: 'الفاتحة',        ayahCount: 7,    juz: 1,  revelation: 'makki' },
  { number: 2,   name: 'Al-Baqarah',       arabicName: 'البقرة',         ayahCount: 286,  juz: 1,  revelation: 'madani' },
  { number: 3,   name: 'Aal-Imran',        arabicName: 'آل عمران',       ayahCount: 200,  juz: 3,  revelation: 'madani' },
  { number: 4,   name: 'An-Nisa',          arabicName: 'النساء',         ayahCount: 176,  juz: 4,  revelation: 'madani' },
  { number: 5,   name: 'Al-Ma\'idah',      arabicName: 'المائدة',        ayahCount: 120,  juz: 6,  revelation: 'madani' },
  { number: 6,   name: 'Al-An\'am',        arabicName: 'الأنعام',        ayahCount: 165,  juz: 7,  revelation: 'makki' },
  { number: 7,   name: 'Al-A\'raf',        arabicName: 'الأعراف',        ayahCount: 206,  juz: 8,  revelation: 'makki' },
  { number: 8,   name: 'Al-Anfal',         arabicName: 'الأنفال',        ayahCount: 75,   juz: 9,  revelation: 'madani' },
  { number: 9,   name: 'At-Tawbah',        arabicName: 'التوبة',         ayahCount: 129,  juz: 10, revelation: 'madani' },
  { number: 10,  name: 'Yunus',            arabicName: 'يونس',           ayahCount: 109,  juz: 11, revelation: 'makki' },
  { number: 11,  name: 'Hud',              arabicName: 'هود',            ayahCount: 123,  juz: 11, revelation: 'makki' },
  { number: 12,  name: 'Yusuf',            arabicName: 'يوسف',           ayahCount: 111,  juz: 12, revelation: 'makki' },
  { number: 13,  name: 'Ar-Ra\'d',         arabicName: 'الرعد',          ayahCount: 43,   juz: 13, revelation: 'madani' },
  { number: 14,  name: 'Ibrahim',          arabicName: 'إبراهيم',        ayahCount: 52,   juz: 13, revelation: 'makki' },
  { number: 15,  name: 'Al-Hijr',          arabicName: 'الحجر',          ayahCount: 99,   juz: 14, revelation: 'makki' },
  { number: 16,  name: 'An-Nahl',          arabicName: 'النحل',          ayahCount: 128,  juz: 14, revelation: 'makki' },
  { number: 17,  name: 'Al-Isra',          arabicName: 'الإسراء',        ayahCount: 111,  juz: 15, revelation: 'makki' },
  { number: 18,  name: 'Al-Kahf',          arabicName: 'الكهف',          ayahCount: 110,  juz: 15, revelation: 'makki' },
  { number: 19,  name: 'Maryam',           arabicName: 'مريم',           ayahCount: 98,   juz: 16, revelation: 'makki' },
  { number: 20,  name: 'Taha',             arabicName: 'طه',             ayahCount: 135,  juz: 16, revelation: 'makki' },
  { number: 21,  name: 'Al-Anbiya',        arabicName: 'الأنبياء',       ayahCount: 112,  juz: 17, revelation: 'makki' },
  { number: 22,  name: 'Al-Hajj',          arabicName: 'الحج',           ayahCount: 78,   juz: 17, revelation: 'madani' },
  { number: 23,  name: 'Al-Mu\'minun',     arabicName: 'المؤمنون',       ayahCount: 118,  juz: 18, revelation: 'makki' },
  { number: 24,  name: 'An-Nur',           arabicName: 'النور',          ayahCount: 64,   juz: 18, revelation: 'madani' },
  { number: 25,  name: 'Al-Furqan',        arabicName: 'الفرقان',        ayahCount: 77,   juz: 18, revelation: 'makki' },
  { number: 26,  name: 'Ash-Shu\'ara',     arabicName: 'الشعراء',        ayahCount: 227,  juz: 19, revelation: 'makki' },
  { number: 27,  name: 'An-Naml',          arabicName: 'النمل',          ayahCount: 93,   juz: 19, revelation: 'makki' },
  { number: 28,  name: 'Al-Qasas',         arabicName: 'القصص',          ayahCount: 88,   juz: 20, revelation: 'makki' },
  { number: 29,  name: 'Al-Ankabut',       arabicName: 'العنكبوت',       ayahCount: 69,   juz: 20, revelation: 'makki' },
  { number: 30,  name: 'Ar-Rum',           arabicName: 'الروم',          ayahCount: 60,   juz: 21, revelation: 'makki' },
  { number: 31,  name: 'Luqman',           arabicName: 'لقمان',          ayahCount: 34,   juz: 21, revelation: 'makki' },
  { number: 32,  name: 'As-Sajdah',        arabicName: 'السجدة',         ayahCount: 30,   juz: 21, revelation: 'makki' },
  { number: 33,  name: 'Al-Ahzab',         arabicName: 'الأحزاب',        ayahCount: 73,   juz: 21, revelation: 'madani' },
  { number: 34,  name: 'Saba',             arabicName: 'سبأ',            ayahCount: 54,   juz: 22, revelation: 'makki' },
  { number: 35,  name: 'Fatir',            arabicName: 'فاطر',           ayahCount: 45,   juz: 22, revelation: 'makki' },
  { number: 36,  name: 'Ya-Sin',           arabicName: 'يس',             ayahCount: 83,   juz: 22, revelation: 'makki' },
  { number: 37,  name: 'As-Saffat',        arabicName: 'الصافات',        ayahCount: 182,  juz: 23, revelation: 'makki' },
  { number: 38,  name: 'Sad',              arabicName: 'ص',              ayahCount: 88,   juz: 23, revelation: 'makki' },
  { number: 39,  name: 'Az-Zumar',         arabicName: 'الزمر',          ayahCount: 75,   juz: 23, revelation: 'makki' },
  { number: 40,  name: 'Ghafir',           arabicName: 'غافر',           ayahCount: 85,   juz: 24, revelation: 'makki' },
  { number: 41,  name: 'Fussilat',         arabicName: 'فصلت',           ayahCount: 54,   juz: 24, revelation: 'makki' },
  { number: 42,  name: 'Ash-Shura',        arabicName: 'الشورى',         ayahCount: 53,   juz: 25, revelation: 'makki' },
  { number: 43,  name: 'Az-Zukhruf',       arabicName: 'الزخرف',         ayahCount: 89,   juz: 25, revelation: 'makki' },
  { number: 44,  name: 'Ad-Dukhan',        arabicName: 'الدخان',         ayahCount: 59,   juz: 25, revelation: 'makki' },
  { number: 45,  name: 'Al-Jathiyah',      arabicName: 'الجاثية',        ayahCount: 37,   juz: 25, revelation: 'makki' },
  { number: 46,  name: 'Al-Ahqaf',         arabicName: 'الأحقاف',        ayahCount: 35,   juz: 26, revelation: 'makki' },
  { number: 47,  name: 'Muhammad',         arabicName: 'محمد',           ayahCount: 38,   juz: 26, revelation: 'madani' },
  { number: 48,  name: 'Al-Fath',          arabicName: 'الفتح',          ayahCount: 29,   juz: 26, revelation: 'madani' },
  { number: 49,  name: 'Al-Hujurat',       arabicName: 'الحجرات',        ayahCount: 18,   juz: 26, revelation: 'madani' },
  { number: 50,  name: 'Qaf',              arabicName: 'ق',              ayahCount: 45,   juz: 26, revelation: 'makki' },
  { number: 51,  name: 'Adh-Dhariyat',     arabicName: 'الذاريات',       ayahCount: 60,   juz: 26, revelation: 'makki' },
  { number: 52,  name: 'At-Tur',           arabicName: 'الطور',          ayahCount: 49,   juz: 27, revelation: 'makki' },
  { number: 53,  name: 'An-Najm',          arabicName: 'النجم',          ayahCount: 62,   juz: 27, revelation: 'makki' },
  { number: 54,  name: 'Al-Qamar',         arabicName: 'القمر',          ayahCount: 55,   juz: 27, revelation: 'makki' },
  { number: 55,  name: 'Ar-Rahman',        arabicName: 'الرحمن',         ayahCount: 78,   juz: 27, revelation: 'madani' },
  { number: 56,  name: 'Al-Waqi\'ah',      arabicName: 'الواقعة',        ayahCount: 96,   juz: 27, revelation: 'makki' },
  { number: 57,  name: 'Al-Hadid',         arabicName: 'الحديد',         ayahCount: 29,   juz: 27, revelation: 'madani' },
  { number: 58,  name: 'Al-Mujadilah',     arabicName: 'المجادلة',       ayahCount: 22,   juz: 28, revelation: 'madani' },
  { number: 59,  name: 'Al-Hashr',         arabicName: 'الحشر',          ayahCount: 24,   juz: 28, revelation: 'madani' },
  { number: 60,  name: 'Al-Mumtahanah',    arabicName: 'الممتحنة',       ayahCount: 13,   juz: 28, revelation: 'madani' },
  { number: 61,  name: 'As-Saff',          arabicName: 'الصف',           ayahCount: 14,   juz: 28, revelation: 'madani' },
  { number: 62,  name: 'Al-Jumu\'ah',      arabicName: 'الجمعة',         ayahCount: 11,   juz: 28, revelation: 'madani' },
  { number: 63,  name: 'Al-Munafiqun',     arabicName: 'المنافقون',      ayahCount: 11,   juz: 28, revelation: 'madani' },
  { number: 64,  name: 'At-Taghabun',      arabicName: 'التغابن',        ayahCount: 18,   juz: 28, revelation: 'madani' },
  { number: 65,  name: 'At-Talaq',         arabicName: 'الطلاق',         ayahCount: 12,   juz: 28, revelation: 'madani' },
  { number: 66,  name: 'At-Tahrim',        arabicName: 'التحريم',        ayahCount: 12,   juz: 28, revelation: 'madani' },
  { number: 67,  name: 'Al-Mulk',          arabicName: 'الملك',          ayahCount: 30,   juz: 29, revelation: 'makki' },
  { number: 68,  name: 'Al-Qalam',         arabicName: 'القلم',          ayahCount: 52,   juz: 29, revelation: 'makki' },
  { number: 69,  name: 'Al-Haqqah',        arabicName: 'الحاقة',         ayahCount: 52,   juz: 29, revelation: 'makki' },
  { number: 70,  name: 'Al-Ma\'arij',      arabicName: 'المعارج',        ayahCount: 44,   juz: 29, revelation: 'makki' },
  { number: 71,  name: 'Nuh',              arabicName: 'نوح',            ayahCount: 28,   juz: 29, revelation: 'makki' },
  { number: 72,  name: 'Al-Jinn',          arabicName: 'الجن',           ayahCount: 28,   juz: 29, revelation: 'makki' },
  { number: 73,  name: 'Al-Muzzammil',     arabicName: 'المزمل',         ayahCount: 20,   juz: 29, revelation: 'makki' },
  { number: 74,  name: 'Al-Muddaththir',   arabicName: 'المدثر',         ayahCount: 56,   juz: 29, revelation: 'makki' },
  { number: 75,  name: 'Al-Qiyamah',       arabicName: 'القيامة',        ayahCount: 40,   juz: 29, revelation: 'makki' },
  { number: 76,  name: 'Al-Insan',         arabicName: 'الإنسان',        ayahCount: 31,   juz: 29, revelation: 'madani' },
  { number: 77,  name: 'Al-Mursalat',      arabicName: 'المرسلات',       ayahCount: 50,   juz: 29, revelation: 'makki' },
  { number: 78,  name: 'An-Naba',          arabicName: 'النبأ',          ayahCount: 40,   juz: 30, revelation: 'makki' },
  { number: 79,  name: 'An-Nazi\'at',      arabicName: 'النازعات',       ayahCount: 46,   juz: 30, revelation: 'makki' },
  { number: 80,  name: 'Abasa',            arabicName: 'عبس',            ayahCount: 42,   juz: 30, revelation: 'makki' },
  { number: 81,  name: 'At-Takwir',        arabicName: 'التكوير',        ayahCount: 29,   juz: 30, revelation: 'makki' },
  { number: 82,  name: 'Al-Infitar',       arabicName: 'الانفطار',       ayahCount: 19,   juz: 30, revelation: 'makki' },
  { number: 83,  name: 'Al-Mutaffifin',    arabicName: 'المطففين',       ayahCount: 36,   juz: 30, revelation: 'makki' },
  { number: 84,  name: 'Al-Inshiqaq',      arabicName: 'الانشقاق',       ayahCount: 25,   juz: 30, revelation: 'makki' },
  { number: 85,  name: 'Al-Buruj',         arabicName: 'البروج',         ayahCount: 22,   juz: 30, revelation: 'makki' },
  { number: 86,  name: 'At-Tariq',         arabicName: 'الطارق',         ayahCount: 17,   juz: 30, revelation: 'makki' },
  { number: 87,  name: 'Al-A\'la',         arabicName: 'الأعلى',         ayahCount: 19,   juz: 30, revelation: 'makki' },
  { number: 88,  name: 'Al-Ghashiyah',     arabicName: 'الغاشية',        ayahCount: 26,   juz: 30, revelation: 'makki' },
  { number: 89,  name: 'Al-Fajr',          arabicName: 'الفجر',          ayahCount: 30,   juz: 30, revelation: 'makki' },
  { number: 90,  name: 'Al-Balad',         arabicName: 'البلد',          ayahCount: 20,   juz: 30, revelation: 'makki' },
  { number: 91,  name: 'Ash-Shams',        arabicName: 'الشمس',          ayahCount: 15,   juz: 30, revelation: 'makki' },
  { number: 92,  name: 'Al-Layl',          arabicName: 'الليل',          ayahCount: 21,   juz: 30, revelation: 'makki' },
  { number: 93,  name: 'Ad-Duha',          arabicName: 'الضحى',          ayahCount: 11,   juz: 30, revelation: 'makki' },
  { number: 94,  name: 'Ash-Sharh',        arabicName: 'الشرح',          ayahCount: 8,    juz: 30, revelation: 'makki' },
  { number: 95,  name: 'At-Tin',           arabicName: 'التين',          ayahCount: 8,    juz: 30, revelation: 'makki' },
  { number: 96,  name: 'Al-Alaq',          arabicName: 'العلق',          ayahCount: 19,   juz: 30, revelation: 'makki' },
  { number: 97,  name: 'Al-Qadr',          arabicName: 'القدر',          ayahCount: 5,    juz: 30, revelation: 'makki' },
  { number: 98,  name: 'Al-Bayyinah',      arabicName: 'البينة',         ayahCount: 8,    juz: 30, revelation: 'madani' },
  { number: 99,  name: 'Az-Zalzalah',      arabicName: 'الزلزلة',        ayahCount: 8,    juz: 30, revelation: 'madani' },
  { number: 100, name: 'Al-Adiyat',        arabicName: 'العاديات',       ayahCount: 11,   juz: 30, revelation: 'makki' },
  { number: 101, name: 'Al-Qari\'ah',      arabicName: 'القارعة',        ayahCount: 11,   juz: 30, revelation: 'makki' },
  { number: 102, name: 'At-Takathur',      arabicName: 'التكاثر',        ayahCount: 8,    juz: 30, revelation: 'makki' },
  { number: 103, name: 'Al-Asr',           arabicName: 'العصر',          ayahCount: 3,    juz: 30, revelation: 'makki' },
  { number: 104, name: 'Al-Humazah',       arabicName: 'الهمزة',         ayahCount: 9,    juz: 30, revelation: 'makki' },
  { number: 105, name: 'Al-Fil',           arabicName: 'الفيل',          ayahCount: 5,    juz: 30, revelation: 'makki' },
  { number: 106, name: 'Quraysh',          arabicName: 'قريش',           ayahCount: 4,    juz: 30, revelation: 'makki' },
  { number: 107, name: 'Al-Ma\'un',        arabicName: 'الماعون',        ayahCount: 7,    juz: 30, revelation: 'makki' },
  { number: 108, name: 'Al-Kawthar',       arabicName: 'الكوثر',         ayahCount: 3,    juz: 30, revelation: 'makki' },
  { number: 109, name: 'Al-Kafirun',       arabicName: 'الكافرون',       ayahCount: 6,    juz: 30, revelation: 'makki' },
  { number: 110, name: 'An-Nasr',          arabicName: 'النصر',          ayahCount: 3,    juz: 30, revelation: 'madani' },
  { number: 111, name: 'Al-Masad',         arabicName: 'المسد',          ayahCount: 5,    juz: 30, revelation: 'makki' },
  { number: 112, name: 'Al-Ikhlas',        arabicName: 'الإخلاص',        ayahCount: 4,    juz: 30, revelation: 'makki' },
  { number: 113, name: 'Al-Falaq',         arabicName: 'الفلق',          ayahCount: 5,    juz: 30, revelation: 'makki' },
  { number: 114, name: 'An-Nas',           arabicName: 'الناس',          ayahCount: 6,    juz: 30, revelation: 'makki' },
];

/**
 * Juz boundaries — maps juz number to the surah:ayah where it starts.
 * Used for juz-based progress tracking and navigation.
 */
export const JUZ_BOUNDARIES: Record<number, { surah: number; ayah: number }> = {
  1:  { surah: 1,  ayah: 1 },
  2:  { surah: 2,  ayah: 142 },
  3:  { surah: 2,  ayah: 253 },
  4:  { surah: 3,  ayah: 93 },
  5:  { surah: 4,  ayah: 24 },
  6:  { surah: 4,  ayah: 148 },
  7:  { surah: 5,  ayah: 82 },
  8:  { surah: 6,  ayah: 111 },
  9:  { surah: 7,  ayah: 88 },
  10: { surah: 8,  ayah: 41 },
  11: { surah: 9,  ayah: 93 },
  12: { surah: 11, ayah: 6 },
  13: { surah: 12, ayah: 53 },
  14: { surah: 15, ayah: 1 },
  15: { surah: 17, ayah: 1 },
  16: { surah: 18, ayah: 75 },
  17: { surah: 21, ayah: 1 },
  18: { surah: 23, ayah: 1 },
  19: { surah: 25, ayah: 21 },
  20: { surah: 27, ayah: 56 },
  21: { surah: 29, ayah: 46 },
  22: { surah: 33, ayah: 31 },
  23: { surah: 36, ayah: 28 },
  24: { surah: 39, ayah: 32 },
  25: { surah: 41, ayah: 47 },
  26: { surah: 46, ayah: 1 },
  27: { surah: 51, ayah: 31 },
  28: { surah: 58, ayah: 1 },
  29: { surah: 67, ayah: 1 },
  30: { surah: 78, ayah: 1 },
};

// ---------------------------------------------------------------------------
// In-memory Storage (would be replaced by database in production)
// ---------------------------------------------------------------------------

interface UserSurahState {
  /** Surah number. */
  surahNumber: number;
  /** Map of ayah number to its card. */
  ayahs: Map<number, AyahCard>;
  /** Whether memorization has been started for this surah. */
  started: boolean;
  /** Timestamp when memorization started. */
  startedAt?: Date;
}

/**
 * In-memory store keyed by `${userId}:${surahNumber}`.
 * In production this would be backed by a database.
 */
const userStates = new Map<string, UserSurahState>();

function stateKey(userId: string, surahNumber: number): string {
  return `${userId}:${surahNumber}`;
}

function getUserState(userId: string, surahNumber: number): UserSurahState | undefined {
  return userStates.get(stateKey(userId, surahNumber));
}

function setUserState(userId: string, surahNumber: number, state: UserSurahState): void {
  userStates.set(stateKey(userId, surahNumber), state);
}

// ---------------------------------------------------------------------------
// Helper: generate a unique card ID
// ---------------------------------------------------------------------------

let cardIdCounter = 0;

function generateCardId(surahNumber: number, ayahNumber: number): string {
  cardIdCounter++;
  return `quran-${surahNumber}-${ayahNumber}-${cardIdCounter}`;
}

// ---------------------------------------------------------------------------
// SequentialMemorizationService
// ---------------------------------------------------------------------------

export class SequentialMemorizationService {
  /**
   * Start memorization of a surah. Creates AyahCard entries for every ayah
   * in the surah, all in 'not-started' status.
   *
   * If memorization is already started for this surah, this is a no-op.
   *
   * @param userId - The user's unique identifier
   * @param surahNumber - Surah number (1-114)
   */
  async startSurahMemorization(userId: string, surahNumber: number): Promise<void> {
    const existing = getUserState(userId, surahNumber);
    if (existing?.started) return;

    const surah = this.getSurahMetadata(surahNumber);
    if (!surah) {
      throw new Error(`Invalid surah number: ${surahNumber}`);
    }

    const ayahs = new Map<number, AyahCard>();

    for (let ayahNum = 1; ayahNum <= surah.ayahCount; ayahNum++) {
      const card: AyahCard = {
        id: generateCardId(surahNumber, ayahNum),
        ayahData: {
          surahNumber,
          surahName: surah.name,
          surahArabicName: surah.arabicName,
          ayahNumber: ayahNum,
          arabicText: '', // To be populated from Quran text data source
          translations: {},
          rootWords: [],
          themes: [],
          juz: this.getJuzForAyah(surahNumber, ayahNum),
          revelation: surah.revelation,
          tajweedRules: [],
        },
        status: 'not-started',
        reviewCount: 0,
      };
      ayahs.set(ayahNum, card);
    }

    setUserState(userId, surahNumber, {
      surahNumber,
      ayahs,
      started: true,
      startedAt: new Date(),
    });
  }

  /**
   * Get the next ayah to memorize in a surah, along with context (previous
   * and next ayahs) for the sequential memorization UI.
   *
   * The "next ayah" is the first ayah that is not yet memorized, scanning
   * from ayah 1 forward.
   *
   * @param userId - The user's unique identifier
   * @param surahNumber - Surah number (1-114)
   * @returns The current ayah card with optional previous/next context
   */
  async getNextAyah(
    userId: string,
    surahNumber: number
  ): Promise<{
    currentAyah: AyahCard;
    previousAyah?: AyahCard;
    nextAyah?: AyahCard;
  }> {
    const state = getUserState(userId, surahNumber);
    if (!state?.started) {
      await this.startSurahMemorization(userId, surahNumber);
      return this.getNextAyah(userId, surahNumber);
    }

    const surah = this.getSurahMetadata(surahNumber)!;

    // Find the first non-memorized ayah
    let currentAyahNum = 1;
    for (let i = 1; i <= surah.ayahCount; i++) {
      const card = state.ayahs.get(i);
      if (card && card.status !== 'memorized') {
        currentAyahNum = i;
        break;
      }
      // If all memorized, wrap to the first ayah for review
      if (i === surah.ayahCount) {
        currentAyahNum = 1;
      }
    }

    const currentAyah = state.ayahs.get(currentAyahNum)!;

    // Mark current as in-progress if not already
    if (currentAyah.status === 'not-started') {
      currentAyah.status = 'in-progress';
    }

    const previousAyah = currentAyahNum > 1
      ? state.ayahs.get(currentAyahNum - 1)
      : undefined;

    const nextAyah = currentAyahNum < surah.ayahCount
      ? state.ayahs.get(currentAyahNum + 1)
      : undefined;

    return { currentAyah, previousAyah, nextAyah };
  }

  /**
   * Mark a specific ayah as memorized.
   *
   * @param userId - The user's unique identifier
   * @param surahNumber - Surah number (1-114)
   * @param ayahNumber - Ayah number within the surah
   */
  async markAyahMemorized(
    userId: string,
    surahNumber: number,
    ayahNumber: number
  ): Promise<void> {
    const state = getUserState(userId, surahNumber);
    if (!state?.started) {
      throw new Error(`Memorization not started for surah ${surahNumber}`);
    }

    const card = state.ayahs.get(ayahNumber);
    if (!card) {
      throw new Error(`Ayah ${ayahNumber} not found in surah ${surahNumber}`);
    }

    card.status = 'memorized';
    card.reviewCount += 1;
    card.lastReviewedAt = new Date();
  }

  /**
   * Mark an ayah as still being learned (in-progress), incrementing review count.
   *
   * @param userId - The user's unique identifier
   * @param surahNumber - Surah number (1-114)
   * @param ayahNumber - Ayah number within the surah
   */
  async markAyahInProgress(
    userId: string,
    surahNumber: number,
    ayahNumber: number
  ): Promise<void> {
    const state = getUserState(userId, surahNumber);
    if (!state?.started) {
      throw new Error(`Memorization not started for surah ${surahNumber}`);
    }

    const card = state.ayahs.get(ayahNumber);
    if (!card) {
      throw new Error(`Ayah ${ayahNumber} not found in surah ${surahNumber}`);
    }

    card.status = 'in-progress';
    card.reviewCount += 1;
    card.lastReviewedAt = new Date();
  }

  /**
   * Get memorization progress for one or all surahs.
   *
   * @param userId - The user's unique identifier
   * @param surahNumber - Optional surah number. If omitted, returns progress for all surahs.
   * @returns Array of progress objects (one per surah)
   */
  async getMemorizationProgress(
    userId: string,
    surahNumber?: number
  ): Promise<{
    surah: string;
    totalAyahs: number;
    memorized: number;
    inProgress: number;
    percentage: number;
  }[]> {
    const surahs = surahNumber
      ? SURAH_DATA.filter((s) => s.number === surahNumber)
      : SURAH_DATA;

    return surahs.map((surah) => {
      const state = getUserState(userId, surah.number);

      if (!state?.started) {
        return {
          surah: surah.name,
          totalAyahs: surah.ayahCount,
          memorized: 0,
          inProgress: 0,
          percentage: 0,
        };
      }

      let memorized = 0;
      let inProgress = 0;

      for (const card of state.ayahs.values()) {
        if (card.status === 'memorized') memorized++;
        else if (card.status === 'in-progress') inProgress++;
      }

      const percentage = surah.ayahCount > 0
        ? Math.round((memorized / surah.ayahCount) * 100)
        : 0;

      return {
        surah: surah.name,
        totalAyahs: surah.ayahCount,
        memorized,
        inProgress,
        percentage,
      };
    });
  }

  /**
   * Get memorization progress for a specific juz (part).
   *
   * @param userId - The user's unique identifier
   * @param juzNumber - Juz number (1-30)
   * @returns Juz progress with per-surah breakdown
   */
  async getJuzProgress(userId: string, juzNumber: number): Promise<JuzProgress> {
    if (juzNumber < 1 || juzNumber > 30) {
      throw new Error(`Invalid juz number: ${juzNumber}. Must be 1-30.`);
    }

    const juzStart = JUZ_BOUNDARIES[juzNumber];
    const juzEnd = juzNumber < 30
      ? JUZ_BOUNDARIES[juzNumber + 1]
      : { surah: 115, ayah: 1 }; // Past the last surah

    const surahsInJuz: JuzProgress['surahs'] = [];
    let totalAyahs = 0;
    let totalMemorized = 0;

    // Find all surahs (or portions) in this juz
    for (const surah of SURAH_DATA) {
      // Determine the ayah range of this surah that falls within the juz
      let startAyah = 1;
      let endAyah = surah.ayahCount;

      // If juz starts in the middle of this surah
      if (surah.number === juzStart.surah) {
        startAyah = juzStart.ayah;
      }

      // If juz ends in the middle of this surah
      if (surah.number === juzEnd.surah) {
        endAyah = juzEnd.ayah - 1;
      }

      // Skip surahs entirely before or after this juz
      if (surah.number < juzStart.surah) continue;
      if (surah.number > juzEnd.surah) continue;
      if (surah.number === juzEnd.surah && juzEnd.ayah === 1) continue;

      const ayahRangeTotal = endAyah - startAyah + 1;
      if (ayahRangeTotal <= 0) continue;

      // Count memorized ayahs in this range
      const state = getUserState(userId, surah.number);
      let memorized = 0;

      if (state?.started) {
        for (let a = startAyah; a <= endAyah; a++) {
          const card = state.ayahs.get(a);
          if (card?.status === 'memorized') memorized++;
        }
      }

      surahsInJuz.push({
        surahNumber: surah.number,
        surahName: surah.name,
        ayahRange: { start: startAyah, end: endAyah },
        memorized,
        total: ayahRangeTotal,
      });

      totalAyahs += ayahRangeTotal;
      totalMemorized += memorized;
    }

    return {
      juzNumber,
      surahs: surahsInJuz,
      totalAyahs,
      memorized: totalMemorized,
      percentage: totalAyahs > 0 ? Math.round((totalMemorized / totalAyahs) * 100) : 0,
    };
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  /**
   * Get metadata for a specific surah.
   */
  getSurahMetadata(surahNumber: number): SurahMetadata | undefined {
    return SURAH_DATA.find((s) => s.number === surahNumber);
  }

  /**
   * Get all surah metadata.
   */
  getAllSurahs(): SurahMetadata[] {
    return [...SURAH_DATA];
  }

  /**
   * Get surahs in a specific juz.
   */
  getSurahsByJuz(juzNumber: number): SurahMetadata[] {
    return SURAH_DATA.filter((s) => s.juz === juzNumber);
  }

  /**
   * Get surahs by revelation type.
   */
  getSurahsByRevelation(type: 'makki' | 'madani'): SurahMetadata[] {
    return SURAH_DATA.filter((s) => s.revelation === type);
  }

  /**
   * Determine which juz a specific ayah belongs to.
   */
  getJuzForAyah(surahNumber: number, ayahNumber: number): number {
    let juz = 1;

    for (let j = 30; j >= 1; j--) {
      const boundary = JUZ_BOUNDARIES[j];
      if (
        surahNumber > boundary.surah ||
        (surahNumber === boundary.surah && ayahNumber >= boundary.ayah)
      ) {
        juz = j;
        break;
      }
    }

    return juz;
  }

  /**
   * Get the total number of ayahs in the entire Quran.
   */
  getTotalAyahCount(): number {
    return SURAH_DATA.reduce((sum, s) => sum + s.ayahCount, 0);
  }

  /**
   * Get the overall memorization percentage across all surahs for a user.
   */
  async getOverallProgress(userId: string): Promise<{
    totalAyahs: number;
    memorized: number;
    inProgress: number;
    percentage: number;
  }> {
    let totalMemorized = 0;
    let totalInProgress = 0;
    const totalAyahs = this.getTotalAyahCount();

    for (const surah of SURAH_DATA) {
      const state = getUserState(userId, surah.number);
      if (!state?.started) continue;

      for (const card of state.ayahs.values()) {
        if (card.status === 'memorized') totalMemorized++;
        else if (card.status === 'in-progress') totalInProgress++;
      }
    }

    return {
      totalAyahs,
      memorized: totalMemorized,
      inProgress: totalInProgress,
      percentage: totalAyahs > 0
        ? Math.round((totalMemorized / totalAyahs) * 100)
        : 0,
    };
  }

  /**
   * Reset memorization progress for a surah.
   */
  async resetSurahProgress(userId: string, surahNumber: number): Promise<void> {
    userStates.delete(stateKey(userId, surahNumber));
  }

  /**
   * Get surahs that the user has started memorizing.
   */
  async getStartedSurahs(userId: string): Promise<SurahMetadata[]> {
    const started: SurahMetadata[] = [];

    for (const surah of SURAH_DATA) {
      const state = getUserState(userId, surah.number);
      if (state?.started) {
        started.push(surah);
      }
    }

    return started;
  }
}
