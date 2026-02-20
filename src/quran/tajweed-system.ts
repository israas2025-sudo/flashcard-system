/**
 * Tajweed Rule Detection and Color Coding System
 *
 * Implements actual tajweed rule detection for Arabic Quranic text. This system
 * identifies occurrences of the core tajweed rules and produces annotated HTML
 * with CSS classes for color-coded rendering.
 *
 * Supported rule categories:
 *   1. Noon Saakinah / Tanween rules: Idgham, Ikhfa, Iqlab, Izhar
 *   2. Meem Saakinah rules: Ikhfa Shafawi, Idgham Shafawi, Izhar Shafawi
 *   3. Qalqalah: letters  ق ط ب ج د  when saakin
 *   4. Madd: Natural (2 counts), Connected (4-5), Separated (4-5)
 *   5. Ghunnah: nasalization held for 2 counts
 *   6. Laam rules: Shamsiyyah and Qamariyyah
 *
 * Spec references: Section 2.6 (tajweed color coding).
 */

import type { TajweedRule, TajweedDetection, TajweedExplanation } from './types';

// ---------------------------------------------------------------------------
// Color Mapping
// ---------------------------------------------------------------------------

/**
 * Standard tajweed color assignments. These match the CSS classes defined in
 * quran.css and follow widely-used mushaf color conventions.
 */
export const TAJWEED_COLORS: Record<TajweedRule, string> = {
  'idgham':           '#22c55e', // green  — merging
  'ikhfa':            '#3b82f6', // blue   — concealment
  'iqlab':            '#8b5cf6', // purple — conversion
  'izhar':            '#f97316', // orange — clear pronunciation
  'qalqalah':         '#ef4444', // red    — echoing bounce
  'madd-natural':     '#06b6d4', // cyan   — natural elongation
  'madd-connected':   '#0891b2', // dark cyan — connected madd
  'madd-separate':    '#0e7490', // teal   — separated madd
  'ghunnah':          '#d946ef', // fuchsia — nasalization
  'noon-saakinah':    '#f59e0b', // amber  — noon at rest
  'meem-saakinah':    '#10b981', // emerald — meem at rest
  'laam-shamsiyyah':  '#e11d48', // rose   — sun letters assimilation
  'laam-qamariyyah':  '#6366f1', // indigo — moon letters (clear laam)
};

// ---------------------------------------------------------------------------
// Arabic Character Constants
// ---------------------------------------------------------------------------

/** Noon with sukoon or tanween indicators. */
const NOON = '\u0646';           // ن
const SUKOON = '\u0652';         // ْ
const TANWEEN_FATH = '\u064B';   // ً
const TANWEEN_DAMM = '\u064C';   // ٌ
const TANWEEN_KASR = '\u064D';   // ٍ
const SHADDA = '\u0651';         // ّ

/** Meem. */
const MEEM = '\u0645';           // م

/** Ba. */
const BA = '\u0628';             // ب

/** Alif (plain). */
const ALIF = '\u0627';           // ا
const ALIF_MADDA = '\u0622';     // آ

/** Waw and Ya (madd letters). */
const WAW = '\u0648';            // و
const YA = '\u064A';             // ي

/** Diacritics for vowels. */
const FATHA = '\u064E';          // َ
const DAMMA = '\u064F';          // ُ
const KASRA = '\u0650';          // ِ

/** Laam. */
const LAAM = '\u0644';           // ل

/** Definite article alif-laam. */
const ALIF_LAM = '\u0627\u0644'; // ال

/** Qalqalah letters: ق ط ب ج د */
const QALQALAH_LETTERS = [
  '\u0642', // ق qaf
  '\u0637', // ط ta
  '\u0628', // ب ba
  '\u062C', // ج jim
  '\u062F', // د dal
];

/**
 * Idgham letters: ي ر م ل و ن  (yarmaloon)
 * Split into two groups:
 *   - With ghunnah: ي ن م و
 *   - Without ghunnah: ر ل
 */
const IDGHAM_WITH_GHUNNAH = [
  '\u064A', // ي ya
  '\u0646', // ن noon
  '\u0645', // م meem
  '\u0648', // و waw
];

const IDGHAM_WITHOUT_GHUNNAH = [
  '\u0631', // ر ra
  '\u0644', // ل laam
];

const IDGHAM_LETTERS = [...IDGHAM_WITH_GHUNNAH, ...IDGHAM_WITHOUT_GHUNNAH];

/**
 * Ikhfa letters: 15 letters for noon saakinah ikhfa.
 * ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك
 */
const IKHFA_LETTERS = [
  '\u062A', // ت
  '\u062B', // ث
  '\u062C', // ج
  '\u062F', // د
  '\u0630', // ذ
  '\u0632', // ز
  '\u0633', // س
  '\u0634', // ش
  '\u0635', // ص
  '\u0636', // ض
  '\u0637', // ط
  '\u0638', // ظ
  '\u0641', // ف
  '\u0642', // ق
  '\u0643', // ك
];

/**
 * Izhar letters: 6 throat letters for noon saakinah izhar.
 * ء ه ع ح غ خ
 */
const IZHAR_LETTERS = [
  '\u0621', // ء hamza
  '\u0647', // ه ha
  '\u0639', // ع ain
  '\u062D', // ح ha
  '\u063A', // غ ghain
  '\u062E', // خ kha
];

/**
 * Shamsiyyah (sun) letters — laam of ال assimilates into these.
 * ت ث د ذ ر ز س ش ص ض ط ظ ل ن
 */
const SHAMS_LETTERS = [
  '\u062A', // ت
  '\u062B', // ث
  '\u062F', // د
  '\u0630', // ذ
  '\u0631', // ر
  '\u0632', // ز
  '\u0633', // س
  '\u0634', // ش
  '\u0635', // ص
  '\u0636', // ض
  '\u0637', // ط
  '\u0638', // ظ
  '\u0644', // ل
  '\u0646', // ن
];

/**
 * Qamariyyah (moon) letters — laam of ال is pronounced clearly before these.
 * ا ب ج ح خ ع غ ف ق ك م و ه ي
 */
const QAMAR_LETTERS = [
  '\u0627', // ا
  '\u0628', // ب
  '\u062C', // ج
  '\u062D', // ح
  '\u062E', // خ
  '\u0639', // ع
  '\u063A', // غ
  '\u0641', // ف
  '\u0642', // ق
  '\u0643', // ك
  '\u0645', // م
  '\u0648', // و
  '\u0647', // ه
  '\u064A', // ي
];

// ---------------------------------------------------------------------------
// Helper Utilities
// ---------------------------------------------------------------------------

/**
 * Check if a character is a diacritic (haraka/tashkeel).
 */
function isDiacritic(ch: string): boolean {
  const code = ch.charCodeAt(0);
  // Arabic diacritics range: U+064B to U+065F, plus U+0670 (superscript alif)
  return (code >= 0x064B && code <= 0x065F) || code === 0x0670;
}

/**
 * Check if a character is a tanween.
 */
function isTanween(ch: string): boolean {
  return ch === TANWEEN_FATH || ch === TANWEEN_DAMM || ch === TANWEEN_KASR;
}

/**
 * Get the base letter at a position, skipping over any preceding diacritics.
 * Returns the index of the next base letter after `pos`, or -1 if none found.
 */
function nextBaseLetter(text: string, pos: number): number {
  let i = pos;
  while (i < text.length) {
    if (!isDiacritic(text[i]) && text[i] !== ' ') {
      return i;
    }
    i++;
  }
  return -1;
}

/**
 * Check if the character at position `pos` has sukoon (is saakin).
 * A letter is saakin if:
 *   1. It is followed directly by sukoon, OR
 *   2. It has no vowel diacritic and is not the last letter (contextual sukoon)
 */
function hasSukoon(text: string, pos: number): boolean {
  // Check explicit sukoon after the letter
  for (let i = pos + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === SUKOON) return true;
    if (ch === SHADDA) return false;
    if (isDiacritic(ch)) return false; // has a vowel
    break; // next base letter
  }
  return false;
}

/**
 * Find the next base letter after position `pos`, skipping diacritics and spaces.
 */
function findNextLetter(text: string, pos: number): { char: string; index: number } | null {
  let i = pos + 1;
  // Skip diacritics on current letter
  while (i < text.length && isDiacritic(text[i])) {
    i++;
  }
  // Skip spaces
  while (i < text.length && text[i] === ' ') {
    i++;
  }
  // Skip diacritics on next letter (shouldn't happen, but be safe)
  while (i < text.length && isDiacritic(text[i])) {
    i++;
  }
  if (i < text.length) {
    return { char: text[i], index: i };
  }
  return null;
}

/**
 * Get all diacritics attached to the letter at position `pos`.
 */
function getDiacritics(text: string, pos: number): string[] {
  const result: string[] = [];
  for (let i = pos + 1; i < text.length; i++) {
    if (isDiacritic(text[i])) {
      result.push(text[i]);
    } else {
      break;
    }
  }
  return result;
}

/**
 * Find the end index of a letter and all its attached diacritics.
 */
function letterEndIndex(text: string, pos: number): number {
  let i = pos + 1;
  while (i < text.length && isDiacritic(text[i])) {
    i++;
  }
  return i;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Rule Explanation Database
// ---------------------------------------------------------------------------

const TAJWEED_EXPLANATIONS: Record<TajweedRule, TajweedExplanation> = {
  'idgham': {
    name: 'Idgham',
    arabicName: 'إدغام',
    description: 'Merging/assimilation — when noon saakinah or tanween is followed by one of the letters ي ر م ل و ن (yarmaloon), the noon sound merges into the following letter. With ي ن م و there is ghunnah (nasalization); with ر ل there is no ghunnah.',
    example: 'مِن يَّعْمَلْ — the noon merges into the ya with ghunnah',
  },
  'ikhfa': {
    name: 'Ikhfa',
    arabicName: 'إخفاء',
    description: 'Concealment/hiding — when noon saakinah or tanween is followed by one of 15 specific letters, the noon sound is partially hidden with a nasal quality (ghunnah) for 2 counts. The tongue position adjusts toward the following letter.',
    example: 'مِنْ قَبْلِ — the noon is concealed before the qaf',
  },
  'iqlab': {
    name: 'Iqlab',
    arabicName: 'إقلاب',
    description: 'Conversion — when noon saakinah or tanween is followed by the letter ب (ba), the noon sound converts to a meem sound with ghunnah (nasalization) for 2 counts.',
    example: 'مِنْ بَعْدِ — the noon converts to meem sound before ba',
  },
  'izhar': {
    name: 'Izhar',
    arabicName: 'إظهار',
    description: 'Clear pronunciation — when noon saakinah or tanween is followed by one of the 6 throat letters (ء ه ع ح غ خ), the noon is pronounced clearly and distinctly without any nasalization or merging.',
    example: 'مِنْ عِنْدِ — the noon is pronounced clearly before ain',
  },
  'qalqalah': {
    name: 'Qalqalah',
    arabicName: 'قلقلة',
    description: 'Echoing/bouncing — when one of the 5 qalqalah letters (ق ط ب ج د) has sukoon, it is pronounced with a slight bouncing or echoing sound. Stronger at the end of an ayah (qalqalah kubra) than in the middle (qalqalah sughra).',
    example: 'يَخْلُقْ — the qaf at the end has strong qalqalah',
  },
  'madd-natural': {
    name: 'Madd Tabee\'i (Natural Madd)',
    arabicName: 'مد طبيعي',
    description: 'Natural elongation — a vowel letter (alif after fatha, waw after damma, ya after kasra) is held for exactly 2 counts. This is the basic madd with no cause for extension.',
    example: 'قَالَ — the alif after fatha is held for 2 counts',
  },
  'madd-connected': {
    name: 'Madd Muttasil (Connected Madd)',
    arabicName: 'مد متصل',
    description: 'Connected/obligatory prolongation — when a madd letter is followed by a hamza within the same word, the madd is held for 4-5 counts. This is obligatory (waajib).',
    example: 'جَاءَ — the alif is extended 4-5 counts before the hamza in the same word',
  },
  'madd-separate': {
    name: 'Madd Munfasil (Separated Madd)',
    arabicName: 'مد منفصل',
    description: 'Separated/permissible prolongation — when a word ends with a madd letter and the next word begins with a hamza, the madd may be held for 4-5 counts. This is permissible (jaa\'iz).',
    example: 'فِي أَنفُسِكُمْ — the ya is extended before the hamza in the next word',
  },
  'ghunnah': {
    name: 'Ghunnah',
    arabicName: 'غنّة',
    description: 'Nasalization — a nasal sound produced from the nose, held for approximately 2 counts. Occurs with noon and meem when they have shadda, and accompanies idgham with ghunnah and ikhfa.',
    example: 'إِنَّ — the noon with shadda has full ghunnah',
  },
  'noon-saakinah': {
    name: 'Noon Saakinah',
    arabicName: 'نون ساكنة',
    description: 'Noon at rest — a noon letter with sukoon (no vowel). The rules of idgham, ikhfa, iqlab, and izhar apply to noon saakinah based on the letter that follows it.',
    example: 'مِنْ — noon with sukoon',
  },
  'meem-saakinah': {
    name: 'Meem Saakinah',
    arabicName: 'ميم ساكنة',
    description: 'Meem at rest — a meem letter with sukoon. Three rules apply: ikhfa shafawi (before ba), idgham shafawi (before meem), and izhar shafawi (before all other letters).',
    example: 'تَرْمِيهِمْ بِحِجَارَةٍ — meem saakinah before ba gets ikhfa shafawi',
  },
  'laam-shamsiyyah': {
    name: 'Laam Shamsiyyah (Sun Letters)',
    arabicName: 'لام شمسية',
    description: 'Sun-letter assimilation — when the laam of the definite article (ال) precedes one of the 14 sun letters, the laam is silent and the following letter is doubled (has shadda). Named after الشمس (the sun) where the laam assimilates.',
    example: 'الشَّمْسُ — the laam is silent, the shin is doubled',
  },
  'laam-qamariyyah': {
    name: 'Laam Qamariyyah (Moon Letters)',
    arabicName: 'لام قمرية',
    description: 'Moon-letter pronunciation — when the laam of the definite article (ال) precedes one of the 14 moon letters, the laam is pronounced clearly. Named after القمر (the moon) where the laam is clear.',
    example: 'الْقَمَرِ — the laam is pronounced clearly before qaf',
  },
};

// ---------------------------------------------------------------------------
// TajweedService
// ---------------------------------------------------------------------------

export class TajweedService {
  /**
   * Detect all tajweed rules in the given Arabic text.
   *
   * Scans the text character by character, applying detection logic for each
   * rule category. Returns an array of detections sorted by start index.
   *
   * @param arabicText - The Arabic text to analyze (Uthmani or Imla'i script)
   * @returns Array of tajweed detections with positions and descriptions
   */
  detectRules(arabicText: string): TajweedDetection[] {
    const detections: TajweedDetection[] = [];

    detections.push(...this.detectNoonSaakinahRules(arabicText));
    detections.push(...this.detectMeemSaakinahRules(arabicText));
    detections.push(...this.detectQalqalah(arabicText));
    detections.push(...this.detectMaddRules(arabicText));
    detections.push(...this.detectGhunnah(arabicText));
    detections.push(...this.detectLaamRules(arabicText));

    // Sort by start index, then by rule specificity (more specific rules first)
    detections.sort((a, b) => a.startIndex - b.startIndex);

    // Remove overlapping detections, keeping the more specific one
    return this.deduplicateDetections(detections);
  }

  /**
   * Highlight tajweed rules in Arabic text by wrapping annotated segments
   * in `<span class="tajweed-{rule}">` elements.
   *
   * @param arabicText - The Arabic text to annotate
   * @returns HTML string with tajweed color-coding spans
   */
  highlightTajweed(arabicText: string): string {
    const detections = this.detectRules(arabicText);

    if (detections.length === 0) {
      return escapeHtml(arabicText);
    }

    let result = '';
    let lastIndex = 0;

    for (const detection of detections) {
      // Add any un-annotated text before this detection
      if (detection.startIndex > lastIndex) {
        result += escapeHtml(arabicText.slice(lastIndex, detection.startIndex));
      }

      // Wrap the detected segment
      const segment = arabicText.slice(detection.startIndex, detection.endIndex);
      result += `<span class="tajweed-${detection.rule}" title="${escapeHtml(detection.description)}">${escapeHtml(segment)}</span>`;

      lastIndex = Math.max(lastIndex, detection.endIndex);
    }

    // Add any remaining text
    if (lastIndex < arabicText.length) {
      result += escapeHtml(arabicText.slice(lastIndex));
    }

    return result;
  }

  /**
   * Get a full explanation of a tajweed rule.
   *
   * @param rule - The tajweed rule to explain
   * @returns Object with name, Arabic name, description, and example
   */
  getTajweedExplanation(rule: TajweedRule): TajweedExplanation {
    return TAJWEED_EXPLANATIONS[rule];
  }

  /**
   * Get all tajweed rule explanations.
   */
  getAllExplanations(): Record<TajweedRule, TajweedExplanation> {
    return { ...TAJWEED_EXPLANATIONS };
  }

  /**
   * Get the color for a tajweed rule.
   */
  getColor(rule: TajweedRule): string {
    return TAJWEED_COLORS[rule];
  }

  // -------------------------------------------------------------------------
  // Noon Saakinah / Tanween Rules
  // -------------------------------------------------------------------------

  private detectNoonSaakinahRules(text: string): TajweedDetection[] {
    const detections: TajweedDetection[] = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // Check for noon saakinah or tanween
      const isNoonSaakin = ch === NOON && hasSukoon(text, i);
      const isTanweenChar = isTanween(ch);

      if (!isNoonSaakin && !isTanweenChar) continue;

      // For tanween, the tanween diacritic is on the previous base letter
      // The start of annotation is the letter carrying the tanween
      const annotationStart = isTanweenChar ? Math.max(0, i - 1) : i;

      // Find the next letter after noon/tanween
      const searchFrom = isTanweenChar ? i : i;
      const next = findNextLetter(text, searchFrom);
      if (!next) continue;

      const nextChar = next.char;
      const annotationEnd = letterEndIndex(text, next.index);

      // Iqlab: noon saakinah/tanween before ba
      if (nextChar === BA) {
        detections.push({
          rule: 'iqlab',
          startIndex: annotationStart,
          endIndex: annotationEnd,
          description: `Iqlab: ${isNoonSaakin ? 'noon saakinah' : 'tanween'} before ba \u2014 noon sound converts to meem with ghunnah`,
        });
        continue;
      }

      // Idgham: noon saakinah/tanween before yarmaloon letters
      if (IDGHAM_LETTERS.includes(nextChar)) {
        const withGhunnah = IDGHAM_WITH_GHUNNAH.includes(nextChar);
        detections.push({
          rule: 'idgham',
          startIndex: annotationStart,
          endIndex: annotationEnd,
          description: `Idgham ${withGhunnah ? 'with ghunnah' : 'without ghunnah'}: ${isNoonSaakin ? 'noon saakinah' : 'tanween'} merges into the following letter`,
        });
        continue;
      }

      // Ikhfa: noon saakinah/tanween before the 15 ikhfa letters
      if (IKHFA_LETTERS.includes(nextChar)) {
        detections.push({
          rule: 'ikhfa',
          startIndex: annotationStart,
          endIndex: annotationEnd,
          description: `Ikhfa: ${isNoonSaakin ? 'noon saakinah' : 'tanween'} is concealed before the following letter with ghunnah`,
        });
        continue;
      }

      // Izhar: noon saakinah/tanween before throat letters
      if (IZHAR_LETTERS.includes(nextChar)) {
        detections.push({
          rule: 'izhar',
          startIndex: annotationStart,
          endIndex: annotationEnd,
          description: `Izhar: ${isNoonSaakin ? 'noon saakinah' : 'tanween'} is pronounced clearly before the throat letter`,
        });
        continue;
      }
    }

    return detections;
  }

  // -------------------------------------------------------------------------
  // Meem Saakinah Rules
  // -------------------------------------------------------------------------

  private detectMeemSaakinahRules(text: string): TajweedDetection[] {
    const detections: TajweedDetection[] = [];

    for (let i = 0; i < text.length; i++) {
      if (text[i] !== MEEM) continue;
      if (!hasSukoon(text, i)) continue;

      const next = findNextLetter(text, i);
      if (!next) continue;

      const annotationEnd = letterEndIndex(text, next.index);

      if (next.char === BA) {
        // Ikhfa Shafawi: meem saakinah before ba
        detections.push({
          rule: 'meem-saakinah',
          startIndex: i,
          endIndex: annotationEnd,
          description: 'Ikhfa Shafawi: meem saakinah before ba \u2014 meem is concealed with lip closure and ghunnah',
        });
      } else if (next.char === MEEM) {
        // Idgham Shafawi: meem saakinah before meem
        detections.push({
          rule: 'meem-saakinah',
          startIndex: i,
          endIndex: annotationEnd,
          description: 'Idgham Shafawi: meem saakinah before meem \u2014 the two meems merge with ghunnah',
        });
      }
      // Izhar Shafawi (meem saakinah before other letters) is the default —
      // no special annotation needed as the meem is simply pronounced clearly.
    }

    return detections;
  }

  // -------------------------------------------------------------------------
  // Qalqalah
  // -------------------------------------------------------------------------

  private detectQalqalah(text: string): TajweedDetection[] {
    const detections: TajweedDetection[] = [];

    for (let i = 0; i < text.length; i++) {
      if (!QALQALAH_LETTERS.includes(text[i])) continue;

      const endIdx = letterEndIndex(text, i);

      // Qalqalah occurs when the letter is saakin
      if (hasSukoon(text, i)) {
        // Determine if it's at the end of the verse (qalqalah kubra) or mid-word (sughra)
        const next = findNextLetter(text, i);
        const isEnd = !next;

        detections.push({
          rule: 'qalqalah',
          startIndex: i,
          endIndex: endIdx,
          description: `Qalqalah ${isEnd ? 'Kubra (major)' : 'Sughra (minor)'}: the letter is pronounced with a bouncing/echoing sound`,
        });
      }
    }

    return detections;
  }

  // -------------------------------------------------------------------------
  // Madd Rules
  // -------------------------------------------------------------------------

  private detectMaddRules(text: string): TajweedDetection[] {
    const detections: TajweedDetection[] = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // Check for madd letters: alif (after fatha), waw saakinah (after damma), ya saakinah (after kasra)
      let isMaddLetter = false;

      if (ch === ALIF || ch === ALIF_MADDA) {
        // Alif is always a madd letter (implicitly after fatha)
        isMaddLetter = true;
      } else if (ch === WAW && hasSukoon(text, i)) {
        // Check if preceded by damma
        const prevDiacritics = this.getPrecedingVowel(text, i);
        if (prevDiacritics === DAMMA) {
          isMaddLetter = true;
        }
      } else if (ch === YA && hasSukoon(text, i)) {
        // Check if preceded by kasra
        const prevDiacritics = this.getPrecedingVowel(text, i);
        if (prevDiacritics === KASRA) {
          isMaddLetter = true;
        }
      }

      if (!isMaddLetter) continue;

      const endIdx = letterEndIndex(text, i);

      // Check what follows the madd letter
      const next = findNextLetter(text, i);

      if (next) {
        const nextChar = next.char;
        // Check for hamza
        const isHamza = nextChar === '\u0621' || nextChar === '\u0623' ||
                        nextChar === '\u0625' || nextChar === '\u0624' ||
                        nextChar === '\u0626';

        if (isHamza) {
          // Determine if connected (same word) or separated (different word)
          const textBetween = text.slice(endIdx, next.index);
          const hasSpace = textBetween.includes(' ');

          if (hasSpace) {
            detections.push({
              rule: 'madd-separate',
              startIndex: i,
              endIndex: letterEndIndex(text, next.index),
              description: 'Madd Munfasil (Separated): madd letter at end of word followed by hamza at start of next word \u2014 extend 4-5 counts',
            });
          } else {
            detections.push({
              rule: 'madd-connected',
              startIndex: i,
              endIndex: letterEndIndex(text, next.index),
              description: 'Madd Muttasil (Connected): madd letter followed by hamza in the same word \u2014 extend 4-5 counts (obligatory)',
            });
          }
          continue;
        }
      }

      // Natural madd (no hamza or sukoon follows)
      detections.push({
        rule: 'madd-natural',
        startIndex: i,
        endIndex: endIdx,
        description: 'Madd Tabee\'i (Natural): basic elongation held for 2 counts',
      });
    }

    return detections;
  }

  /**
   * Get the vowel diacritic on the letter preceding position `pos`.
   */
  private getPrecedingVowel(text: string, pos: number): string | null {
    // Walk backward to find the previous base letter, then check its diacritics
    let j = pos - 1;
    // Skip diacritics to find the base letter
    while (j >= 0 && isDiacritic(text[j])) {
      j--;
    }
    if (j < 0) return null;

    // Now check diacritics on this base letter
    const diacritics = getDiacritics(text, j);
    for (const d of diacritics) {
      if (d === FATHA || d === DAMMA || d === KASRA) {
        return d;
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Ghunnah
  // -------------------------------------------------------------------------

  private detectGhunnah(text: string): TajweedDetection[] {
    const detections: TajweedDetection[] = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // Ghunnah occurs with noon or meem that have shadda
      if (ch !== NOON && ch !== MEEM) continue;

      const diacritics = getDiacritics(text, i);
      if (!diacritics.includes(SHADDA)) continue;

      const endIdx = letterEndIndex(text, i);

      detections.push({
        rule: 'ghunnah',
        startIndex: i,
        endIndex: endIdx,
        description: `Ghunnah: ${ch === NOON ? 'noon' : 'meem'} with shadda \u2014 nasalization held for 2 counts`,
      });
    }

    return detections;
  }

  // -------------------------------------------------------------------------
  // Laam Rules (Shamsiyyah / Qamariyyah)
  // -------------------------------------------------------------------------

  private detectLaamRules(text: string): TajweedDetection[] {
    const detections: TajweedDetection[] = [];

    for (let i = 0; i < text.length - 1; i++) {
      // Look for alif-laam pattern (definite article)
      if (text[i] !== ALIF) continue;

      // The laam should be the next base letter
      const laamIdx = nextBaseLetter(text, i + 1);
      if (laamIdx === -1 || text[laamIdx] !== LAAM) continue;

      // Check if this is preceded by nothing or a space/diacritic (confirming it's ال)
      // Simple heuristic: the alif should be at start or after a space
      if (i > 0 && text[i - 1] !== ' ' && !isDiacritic(text[i - 1])) {
        // Might be part of a word like الف — check if previous char is a connector
        // For simplicity, we accept any alif-laam sequence
      }

      // Find the letter after laam
      const afterLaam = findNextLetter(text, laamIdx);
      if (!afterLaam) continue;

      const annotationEnd = letterEndIndex(text, afterLaam.index);

      if (SHAMS_LETTERS.includes(afterLaam.char)) {
        detections.push({
          rule: 'laam-shamsiyyah',
          startIndex: i,
          endIndex: annotationEnd,
          description: 'Laam Shamsiyyah: the laam of al- is silent and the sun letter is doubled',
        });
      } else if (QAMAR_LETTERS.includes(afterLaam.char)) {
        detections.push({
          rule: 'laam-qamariyyah',
          startIndex: i,
          endIndex: annotationEnd,
          description: 'Laam Qamariyyah: the laam of al- is pronounced clearly before the moon letter',
        });
      }
    }

    return detections;
  }

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  /**
   * Remove overlapping detections, keeping the more specific rule.
   * When two detections overlap, the one with the smaller span is preferred
   * (more specific). If spans are equal, the first one wins.
   */
  private deduplicateDetections(detections: TajweedDetection[]): TajweedDetection[] {
    if (detections.length <= 1) return detections;

    const result: TajweedDetection[] = [];

    for (const detection of detections) {
      // Check if this detection overlaps with any already-accepted detection
      const overlapping = result.findIndex(
        (existing) =>
          detection.startIndex < existing.endIndex &&
          detection.endIndex > existing.startIndex
      );

      if (overlapping === -1) {
        result.push(detection);
      } else {
        // Keep the more specific (smaller span) detection
        const existing = result[overlapping];
        const existingSpan = existing.endIndex - existing.startIndex;
        const newSpan = detection.endIndex - detection.startIndex;

        if (newSpan < existingSpan) {
          result[overlapping] = detection;
        }
        // Otherwise keep existing
      }
    }

    return result;
  }
}
