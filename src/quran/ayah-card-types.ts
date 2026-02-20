/**
 * Quran-Specific Card Template Types
 *
 * Implements all 6 Quran card templates from the spec (Section 2.3). Each
 * template generates a different study card from the same AyahData input,
 * providing multiple angles of review for comprehensive memorization.
 *
 * Card Types:
 *   1. AyahCompletion      — cloze deletion on portions of the ayah
 *   2. TranslationMatching — show Arabic, recall the meaning
 *   3. SurahIdentification — show ayah text, identify which surah
 *   4. VocabularyInContext  — highlight a word in the ayah, define it
 *   5. TajweedIdentification — highlight a tajweed rule, name it
 *   6. SequentialRecall     — show previous ayah, recall the next one
 *
 * Each template provides:
 *   - generateFront(ayahData) — HTML for the question side
 *   - generateBack(ayahData)  — HTML for the answer side
 *   - getHint(ayahData)       — optional hint text
 */

import type {
  AyahData,
  QuranCard,
  QuranCardType,
  GeneratedQuranCards,
  TajweedAnnotation,
} from './types';
import { TajweedService, TAJWEED_COLORS } from './tajweed-system';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate a stable card ID from ayah data and card type.
 */
function cardId(ayahData: AyahData, type: QuranCardType): string {
  return `quran-${type}-${ayahData.surahNumber}-${ayahData.ayahNumber}`;
}

/**
 * Surah reference string: "Surah Al-Fatihah (1:7)"
 */
function surahRef(ayahData: AyahData): string {
  return `Surah ${ayahData.surahName} (${ayahData.surahNumber}:${ayahData.ayahNumber})`;
}

/**
 * Arabic surah reference: "سورة الفاتحة ﴿٧﴾"
 */
function arabicRef(ayahData: AyahData): string {
  return `سورة ${ayahData.surahArabicName} ﴿${toArabicNumeral(ayahData.ayahNumber)}﴾`;
}

/**
 * Convert a number to Eastern Arabic numerals.
 */
function toArabicNumeral(num: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map((d) => arabicDigits[parseInt(d, 10)] ?? d)
    .join('');
}

/**
 * Split Arabic text into words, preserving diacritics with their base letters.
 */
function splitArabicWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

// ---------------------------------------------------------------------------
// 1. AyahCompletion — Cloze Deletion
// ---------------------------------------------------------------------------

export class AyahCompletionTemplate {
  /**
   * Generate the front (question) side: ayah with a portion blanked out.
   * Hides a contiguous section of ~30-50% of the ayah's words.
   */
  generateFront(ayahData: AyahData): string {
    const words = splitArabicWords(ayahData.arabicText);
    if (words.length === 0) return '';

    // Determine which words to hide (middle section, roughly 30-50%)
    const hideCount = Math.max(1, Math.ceil(words.length * 0.4));
    const startHide = Math.max(0, Math.floor((words.length - hideCount) / 2));
    const endHide = startHide + hideCount;

    const parts: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i >= startHide && i < endHide) {
        parts.push('<span class="cloze cloze-blank">[...]</span>');
        // Only add the blank marker once for the whole hidden section
        if (i === startHide && hideCount > 1) {
          // Skip to end of hidden section
          i = endHide - 1;
          continue;
        }
      } else {
        parts.push(`<span class="ayah-word">${escapeHtml(words[i])}</span>`);
      }
    }

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">${parts.join(' ')}</div>
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
        <div class="prompt" style="margin-top: 16px; font-style: italic; color: #8b7355; direction: ltr; text-align: center;">
          Complete the missing portion of this ayah
        </div>
      </div>
    `;
  }

  /**
   * Generate the back (answer) side: full ayah with the hidden portion highlighted.
   */
  generateBack(ayahData: AyahData): string {
    const words = splitArabicWords(ayahData.arabicText);
    const hideCount = Math.max(1, Math.ceil(words.length * 0.4));
    const startHide = Math.max(0, Math.floor((words.length - hideCount) / 2));
    const endHide = startHide + hideCount;

    const parts: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i >= startHide && i < endHide) {
        parts.push(`<span class="cloze cloze-active">${escapeHtml(words[i])}</span>`);
      } else {
        parts.push(`<span class="ayah-word">${escapeHtml(words[i])}</span>`);
      }
    }

    const translation = ayahData.translations['en'] || '';

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">${parts.join(' ')}</div>
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
        ${translation ? `<div class="translation">${escapeHtml(translation)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Get a hint: first letter of the hidden words.
   */
  getHint(ayahData: AyahData): string {
    const words = splitArabicWords(ayahData.arabicText);
    const hideCount = Math.max(1, Math.ceil(words.length * 0.4));
    const startHide = Math.max(0, Math.floor((words.length - hideCount) / 2));

    if (startHide < words.length) {
      const firstHiddenWord = words[startHide];
      return `Starts with: ${firstHiddenWord.charAt(0)}...`;
    }
    return '';
  }
}

// ---------------------------------------------------------------------------
// 2. TranslationMatching — Arabic to Meaning
// ---------------------------------------------------------------------------

export class TranslationMatchingTemplate {
  /**
   * Front: show the Arabic ayah, ask for the meaning.
   */
  generateFront(ayahData: AyahData): string {
    return `
      <div class="card-frame">
        <div class="ayah ayah-large" dir="rtl">${escapeHtml(ayahData.arabicText)}</div>
        <div class="surah-reference">${escapeHtml(arabicRef(ayahData))}</div>
        <div class="prompt" style="margin-top: 20px; font-style: italic; color: #8b7355; direction: ltr; text-align: center;">
          What is the meaning of this ayah?
        </div>
      </div>
    `;
  }

  /**
   * Back: show the Arabic ayah with the translation below.
   */
  generateBack(ayahData: AyahData): string {
    const translation = ayahData.translations['en'] || 'Translation not available';
    const tafsir = ayahData.tafsir;

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">${escapeHtml(ayahData.arabicText)}</div>
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
        <div class="translation">${escapeHtml(translation)}</div>
        ${tafsir ? `
          <div class="tafsir-container">
            <div class="tafsir-label">تفسير / Tafsir</div>
            <div dir="rtl">${escapeHtml(tafsir)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Hint: show thematic tags.
   */
  getHint(ayahData: AyahData): string {
    if (ayahData.themes.length > 0) {
      return `Themes: ${ayahData.themes.join(', ')}`;
    }
    return `${ayahData.revelation === 'makki' ? 'Makki' : 'Madani'} surah`;
  }
}

// ---------------------------------------------------------------------------
// 3. SurahIdentification — Identify the Source
// ---------------------------------------------------------------------------

export class SurahIdentificationTemplate {
  /**
   * Front: show the ayah text, ask which surah it's from.
   */
  generateFront(ayahData: AyahData): string {
    return `
      <div class="card-frame">
        <div class="ayah ayah-large" dir="rtl">${escapeHtml(ayahData.arabicText)}</div>
        <div class="prompt" style="margin-top: 20px; font-style: italic; color: #8b7355; direction: ltr; text-align: center;">
          Which surah is this ayah from? What is the ayah number?
        </div>
      </div>
    `;
  }

  /**
   * Back: reveal the surah name, ayah number, and additional context.
   */
  generateBack(ayahData: AyahData): string {
    const translation = ayahData.translations['en'] || '';

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">${escapeHtml(ayahData.arabicText)}</div>
        <div style="text-align: center; margin: 16px 0;">
          <div style="font-size: 24px; font-weight: 700; color: #16213e; font-family: 'Amiri', serif;" dir="rtl">
            سورة ${escapeHtml(ayahData.surahArabicName)}
          </div>
          <div style="font-size: 18px; color: #c5a55a; margin-top: 4px;">
            ${escapeHtml(ayahData.surahName)} &mdash; Ayah ${ayahData.ayahNumber}
          </div>
          <div style="font-size: 14px; color: #8b7355; margin-top: 4px;">
            Juz ${ayahData.juz} &bull; ${ayahData.revelation === 'makki' ? 'Makki' : 'Madani'}
          </div>
        </div>
        ${translation ? `<div class="translation">${escapeHtml(translation)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Hint: reveal whether the surah is Makki or Madani and the juz.
   */
  getHint(ayahData: AyahData): string {
    return `Juz ${ayahData.juz}, ${ayahData.revelation === 'makki' ? 'Makki' : 'Madani'} surah`;
  }
}

// ---------------------------------------------------------------------------
// 4. VocabularyInContext — Word Meaning in Ayah
// ---------------------------------------------------------------------------

export class VocabularyInContextTemplate {
  /**
   * Front: show the ayah with one word highlighted, ask for its meaning.
   * Selects a word that has a root word entry if available.
   */
  generateFront(ayahData: AyahData): string {
    const words = splitArabicWords(ayahData.arabicText);
    if (words.length === 0) return '';

    // Pick a word to highlight (prefer one with a root word, else pick from middle)
    const highlightIndex = this.pickWordIndex(words, ayahData);

    const parts = words.map((word, i) => {
      if (i === highlightIndex) {
        return `<span style="background-color: #fff0f0; color: #dc3545; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${escapeHtml(word)}</span>`;
      }
      return escapeHtml(word);
    });

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">${parts.join(' ')}</div>
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
        <div class="prompt" style="margin-top: 20px; font-style: italic; color: #8b7355; direction: ltr; text-align: center;">
          What does the highlighted word mean?
        </div>
      </div>
    `;
  }

  /**
   * Back: show the word with its meaning and root.
   */
  generateBack(ayahData: AyahData): string {
    const words = splitArabicWords(ayahData.arabicText);
    const highlightIndex = this.pickWordIndex(words, ayahData);
    const highlightedWord = words[highlightIndex] || '';

    const root = ayahData.rootWords.length > 0
      ? ayahData.rootWords[Math.min(highlightIndex, ayahData.rootWords.length - 1)]
      : undefined;

    const translation = ayahData.translations['en'] || '';

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">
          ${words.map((word, i) => {
            if (i === highlightIndex) {
              return `<span class="cloze cloze-active">${escapeHtml(word)}</span>`;
            }
            return escapeHtml(word);
          }).join(' ')}
        </div>
        <div style="text-align: center; margin: 20px 0; padding: 16px; background: #f9f5ec; border-radius: 8px; border: 1px solid #e8dfc8;">
          <div style="font-size: 28px; font-weight: 700; color: #16213e; font-family: 'Amiri Quran', serif;" dir="rtl">
            ${escapeHtml(highlightedWord)}
          </div>
          ${root ? `<div style="font-size: 14px; color: #8b7355; margin-top: 4px;">Root: ${escapeHtml(root)}</div>` : ''}
        </div>
        ${translation ? `<div class="translation">${escapeHtml(translation)}</div>` : ''}
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
      </div>
    `;
  }

  /**
   * Hint: show the root letters.
   */
  getHint(ayahData: AyahData): string {
    if (ayahData.rootWords.length > 0) {
      return `Root: ${ayahData.rootWords[0]}`;
    }
    return 'Look at the context of the ayah for clues';
  }

  /**
   * Pick a word index to highlight. Prefers words with root entries.
   */
  private pickWordIndex(words: string[], ayahData: AyahData): number {
    // Use a deterministic "random" based on ayah data for consistency
    const seed = ayahData.surahNumber * 1000 + ayahData.ayahNumber;

    // Filter out very short words (particles, prepositions)
    const candidates = words
      .map((word, index) => ({ word, index }))
      .filter((w) => w.word.length >= 2);

    if (candidates.length === 0) return 0;

    return candidates[seed % candidates.length].index;
  }
}

// ---------------------------------------------------------------------------
// 5. TajweedIdentification — Name the Rule
// ---------------------------------------------------------------------------

export class TajweedIdentificationTemplate {
  private tajweedService = new TajweedService();

  /**
   * Front: show the ayah with a tajweed rule highlighted, ask to name the rule.
   */
  generateFront(ayahData: AyahData): string {
    // Detect tajweed rules in the text
    const detections = this.tajweedService.detectRules(ayahData.arabicText);

    if (detections.length === 0) {
      // Fallback: just show the ayah and ask about general tajweed
      return `
        <div class="card-frame">
          <div class="ayah ayah-large" dir="rtl">${escapeHtml(ayahData.arabicText)}</div>
          <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
          <div class="prompt" style="margin-top: 20px; font-style: italic; color: #8b7355; direction: ltr; text-align: center;">
            Identify any tajweed rules in this ayah
          </div>
        </div>
      `;
    }

    // Pick one detection to quiz on (deterministic based on ayah)
    const seed = ayahData.surahNumber * 1000 + ayahData.ayahNumber;
    const targetDetection = detections[seed % detections.length];

    // Render the ayah with the target detection highlighted in yellow (neutral highlight)
    const text = ayahData.arabicText;
    let html = '';
    let lastIdx = 0;

    // Add text before the highlight
    if (targetDetection.startIndex > 0) {
      html += escapeHtml(text.slice(0, targetDetection.startIndex));
    }

    // The highlighted segment (neutral yellow, not giving away the rule)
    const segment = text.slice(targetDetection.startIndex, targetDetection.endIndex);
    html += `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 4px; border-bottom: 3px solid #f59e0b;">${escapeHtml(segment)}</span>`;

    // Add text after
    if (targetDetection.endIndex < text.length) {
      html += escapeHtml(text.slice(targetDetection.endIndex));
    }

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">${html}</div>
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
        <div class="prompt" style="margin-top: 20px; font-style: italic; color: #8b7355; direction: ltr; text-align: center;">
          What tajweed rule applies to the highlighted section?
        </div>
      </div>
    `;
  }

  /**
   * Back: reveal the tajweed rule with its name, color, and explanation.
   */
  generateBack(ayahData: AyahData): string {
    const detections = this.tajweedService.detectRules(ayahData.arabicText);

    if (detections.length === 0) {
      return `
        <div class="card-frame">
          <div class="ayah" dir="rtl">${escapeHtml(ayahData.arabicText)}</div>
          <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
          <div class="translation">No specific tajweed rules detected in this ayah.</div>
        </div>
      `;
    }

    const seed = ayahData.surahNumber * 1000 + ayahData.ayahNumber;
    const targetDetection = detections[seed % detections.length];
    const explanation = this.tajweedService.getTajweedExplanation(targetDetection.rule);
    const color = TAJWEED_COLORS[targetDetection.rule];

    // Render with the correct tajweed color
    const text = ayahData.arabicText;
    const segment = text.slice(targetDetection.startIndex, targetDetection.endIndex);

    let html = '';
    if (targetDetection.startIndex > 0) {
      html += escapeHtml(text.slice(0, targetDetection.startIndex));
    }
    html += `<span class="tajweed-${targetDetection.rule}" style="font-weight: 700;">${escapeHtml(segment)}</span>`;
    if (targetDetection.endIndex < text.length) {
      html += escapeHtml(text.slice(targetDetection.endIndex));
    }

    return `
      <div class="card-frame">
        <div class="ayah" dir="rtl">${html}</div>
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
        <div style="text-align: center; margin: 20px 0; padding: 16px; background: #f9f5ec; border-radius: 8px; border: 1px solid #e8dfc8;">
          <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="width: 16px; height: 16px; border-radius: 4px; background-color: ${color}; display: inline-block;"></span>
            <span style="font-size: 20px; font-weight: 700; color: #16213e;">
              ${escapeHtml(explanation.name)}
            </span>
          </div>
          <div style="font-size: 18px; color: #8b7355; font-family: 'Amiri', serif;" dir="rtl">
            ${escapeHtml(explanation.arabicName)}
          </div>
          <div style="font-size: 14px; color: #5a5a5a; margin-top: 8px; direction: ltr; line-height: 1.6;">
            ${escapeHtml(explanation.description)}
          </div>
          <div style="font-size: 13px; color: #8b7355; margin-top: 8px; direction: ltr;">
            ${escapeHtml(targetDetection.description)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Hint: show the color associated with the rule.
   */
  getHint(ayahData: AyahData): string {
    const detections = this.tajweedService.detectRules(ayahData.arabicText);
    if (detections.length === 0) return '';

    const seed = ayahData.surahNumber * 1000 + ayahData.ayahNumber;
    const targetDetection = detections[seed % detections.length];

    // Give a category hint without naming the exact rule
    if (['idgham', 'ikhfa', 'iqlab', 'izhar'].includes(targetDetection.rule)) {
      return 'This is a noon saakinah/tanween rule';
    }
    if (targetDetection.rule.startsWith('madd-')) {
      return 'This is a madd (elongation) rule';
    }
    if (targetDetection.rule === 'qalqalah') {
      return 'Look for one of the 5 qalqalah letters: \u0642 \u0637 \u0628 \u062C \u062F';
    }
    if (targetDetection.rule === 'ghunnah') {
      return 'This involves nasalization';
    }
    if (targetDetection.rule.startsWith('laam-')) {
      return 'This is a laam al-ta\'reef rule';
    }
    return 'Think about the interaction between consecutive letters';
  }
}

// ---------------------------------------------------------------------------
// 6. SequentialRecall — Next Ayah
// ---------------------------------------------------------------------------

export class SequentialRecallTemplate {
  /**
   * Front: show the previous ayah, ask for the next one.
   * Requires ayahData for the CURRENT ayah (the one to recall).
   * The previousAyahText parameter provides the preceding ayah's text.
   */
  generateFront(ayahData: AyahData, previousAyahText?: string): string {
    const prevText = previousAyahText || '';
    const prevAyahNum = ayahData.ayahNumber - 1;

    if (!prevText && ayahData.ayahNumber === 1) {
      // First ayah of the surah — show the surah name as prompt
      return `
        <div class="card-frame">
          <div class="bismillah" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
          <div style="text-align: center; margin: 16px 0;">
            <div style="font-size: 24px; font-weight: 700; color: #16213e; font-family: 'Amiri', serif;" dir="rtl">
              سورة ${escapeHtml(ayahData.surahArabicName)}
            </div>
            <div style="font-size: 16px; color: #c5a55a; margin-top: 4px;">
              ${escapeHtml(ayahData.surahName)}
            </div>
          </div>
          <div class="prompt" style="margin-top: 20px; font-style: italic; color: #8b7355; direction: ltr; text-align: center;">
            Recite the first ayah of this surah
          </div>
        </div>
      `;
    }

    return `
      <div class="card-frame">
        ${prevText ? `
          <div class="ayah" dir="rtl" style="opacity: 0.6; font-size: 28px;">
            ${escapeHtml(prevText)} <span class="ayah-number">${toArabicNumeral(prevAyahNum)}</span>
          </div>
          <hr />
        ` : ''}
        <div class="prompt" style="font-style: italic; color: #8b7355; direction: ltr; text-align: center; font-size: 16px;">
          What is the next ayah? (${ayahData.surahName} ${ayahData.surahNumber}:${ayahData.ayahNumber})
        </div>
      </div>
    `;
  }

  /**
   * Back: reveal the current ayah.
   */
  generateBack(ayahData: AyahData, previousAyahText?: string): string {
    const prevText = previousAyahText || '';
    const prevAyahNum = ayahData.ayahNumber - 1;
    const translation = ayahData.translations['en'] || '';

    return `
      <div class="card-frame">
        ${prevText ? `
          <div class="ayah" dir="rtl" style="opacity: 0.4; font-size: 24px;">
            ${escapeHtml(prevText)} <span class="ayah-number">${toArabicNumeral(prevAyahNum)}</span>
          </div>
          <hr />
        ` : ''}
        <div class="ayah ayah-large" dir="rtl">
          ${escapeHtml(ayahData.arabicText)} <span class="ayah-number">${toArabicNumeral(ayahData.ayahNumber)}</span>
        </div>
        <div class="surah-reference">${escapeHtml(surahRef(ayahData))}</div>
        ${translation ? `<div class="translation">${escapeHtml(translation)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Hint: show the first word of the ayah.
   */
  getHint(ayahData: AyahData): string {
    const words = splitArabicWords(ayahData.arabicText);
    if (words.length > 0) {
      return `Starts with: ${words[0]}`;
    }
    return '';
  }
}

// ---------------------------------------------------------------------------
// QuranCardGenerator — Generates All 6 Card Types from a Single Ayah
// ---------------------------------------------------------------------------

export class QuranCardGenerator {
  private ayahCompletion = new AyahCompletionTemplate();
  private translationMatching = new TranslationMatchingTemplate();
  private surahIdentification = new SurahIdentificationTemplate();
  private vocabularyInContext = new VocabularyInContextTemplate();
  private tajweedIdentification = new TajweedIdentificationTemplate();
  private sequentialRecall = new SequentialRecallTemplate();

  /**
   * Generate all applicable card types from a single ayah's data.
   *
   * Returns up to 6 cards. Some card types may be skipped if the ayah
   * doesn't have sufficient data (e.g., no translations means no
   * TranslationMatching card).
   *
   * @param ayahData - Full data for the ayah
   * @param previousAyahText - Optional text of the preceding ayah (for SequentialRecall)
   * @returns Object containing the source ayah data and all generated cards
   */
  generateAllCards(
    ayahData: AyahData,
    previousAyahText?: string
  ): GeneratedQuranCards {
    const cards: QuranCard[] = [];

    // 1. AyahCompletion — always generated if ayah has text
    if (ayahData.arabicText.length > 0) {
      cards.push({
        id: cardId(ayahData, 'ayah-completion'),
        type: 'ayah-completion',
        front: this.ayahCompletion.generateFront(ayahData),
        back: this.ayahCompletion.generateBack(ayahData),
        hint: this.ayahCompletion.getHint(ayahData),
        source: ayahData,
      });
    }

    // 2. TranslationMatching — generated if at least one translation exists
    if (Object.keys(ayahData.translations).length > 0) {
      cards.push({
        id: cardId(ayahData, 'translation-matching'),
        type: 'translation-matching',
        front: this.translationMatching.generateFront(ayahData),
        back: this.translationMatching.generateBack(ayahData),
        hint: this.translationMatching.getHint(ayahData),
        source: ayahData,
      });
    }

    // 3. SurahIdentification — always generated
    if (ayahData.arabicText.length > 0) {
      cards.push({
        id: cardId(ayahData, 'surah-identification'),
        type: 'surah-identification',
        front: this.surahIdentification.generateFront(ayahData),
        back: this.surahIdentification.generateBack(ayahData),
        hint: this.surahIdentification.getHint(ayahData),
        source: ayahData,
      });
    }

    // 4. VocabularyInContext — generated if there are root words or the ayah has multiple words
    if (splitArabicWords(ayahData.arabicText).length >= 2) {
      cards.push({
        id: cardId(ayahData, 'vocabulary-in-context'),
        type: 'vocabulary-in-context',
        front: this.vocabularyInContext.generateFront(ayahData),
        back: this.vocabularyInContext.generateBack(ayahData),
        hint: this.vocabularyInContext.getHint(ayahData),
        source: ayahData,
      });
    }

    // 5. TajweedIdentification — generated if tajweed rules can be detected
    const tajweedService = new TajweedService();
    const detections = tajweedService.detectRules(ayahData.arabicText);
    if (detections.length > 0) {
      cards.push({
        id: cardId(ayahData, 'tajweed-identification'),
        type: 'tajweed-identification',
        front: this.tajweedIdentification.generateFront(ayahData),
        back: this.tajweedIdentification.generateBack(ayahData),
        hint: this.tajweedIdentification.getHint(ayahData),
        source: ayahData,
      });
    }

    // 6. SequentialRecall — always generated (first ayah uses surah name as prompt)
    cards.push({
      id: cardId(ayahData, 'sequential-recall'),
      type: 'sequential-recall',
      front: this.sequentialRecall.generateFront(ayahData, previousAyahText),
      back: this.sequentialRecall.generateBack(ayahData, previousAyahText),
      hint: this.sequentialRecall.getHint(ayahData),
      source: ayahData,
    });

    return { ayahData, cards };
  }

  /**
   * Generate a single card type for an ayah.
   *
   * @param ayahData - Full data for the ayah
   * @param type - Which card type to generate
   * @param previousAyahText - Optional text of the preceding ayah
   * @returns The generated card, or null if the type is not applicable
   */
  generateCard(
    ayahData: AyahData,
    type: QuranCardType,
    previousAyahText?: string
  ): QuranCard | null {
    switch (type) {
      case 'ayah-completion':
        if (ayahData.arabicText.length === 0) return null;
        return {
          id: cardId(ayahData, type),
          type,
          front: this.ayahCompletion.generateFront(ayahData),
          back: this.ayahCompletion.generateBack(ayahData),
          hint: this.ayahCompletion.getHint(ayahData),
          source: ayahData,
        };

      case 'translation-matching':
        if (Object.keys(ayahData.translations).length === 0) return null;
        return {
          id: cardId(ayahData, type),
          type,
          front: this.translationMatching.generateFront(ayahData),
          back: this.translationMatching.generateBack(ayahData),
          hint: this.translationMatching.getHint(ayahData),
          source: ayahData,
        };

      case 'surah-identification':
        if (ayahData.arabicText.length === 0) return null;
        return {
          id: cardId(ayahData, type),
          type,
          front: this.surahIdentification.generateFront(ayahData),
          back: this.surahIdentification.generateBack(ayahData),
          hint: this.surahIdentification.getHint(ayahData),
          source: ayahData,
        };

      case 'vocabulary-in-context':
        if (splitArabicWords(ayahData.arabicText).length < 2) return null;
        return {
          id: cardId(ayahData, type),
          type,
          front: this.vocabularyInContext.generateFront(ayahData),
          back: this.vocabularyInContext.generateBack(ayahData),
          hint: this.vocabularyInContext.getHint(ayahData),
          source: ayahData,
        };

      case 'tajweed-identification': {
        const ts = new TajweedService();
        if (ts.detectRules(ayahData.arabicText).length === 0) return null;
        return {
          id: cardId(ayahData, type),
          type,
          front: this.tajweedIdentification.generateFront(ayahData),
          back: this.tajweedIdentification.generateBack(ayahData),
          hint: this.tajweedIdentification.getHint(ayahData),
          source: ayahData,
        };
      }

      case 'sequential-recall':
        return {
          id: cardId(ayahData, type),
          type,
          front: this.sequentialRecall.generateFront(ayahData, previousAyahText),
          back: this.sequentialRecall.generateBack(ayahData, previousAyahText),
          hint: this.sequentialRecall.getHint(ayahData),
          source: ayahData,
        };

      default:
        return null;
    }
  }
}
