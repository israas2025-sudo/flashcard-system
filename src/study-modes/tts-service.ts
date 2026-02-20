/**
 * tts-service.ts -- Text-to-Speech service using the Web Speech API.
 *
 * Provides language-aware speech synthesis for Arabic (MSA and Egyptian),
 * Spanish, and English. Falls back gracefully when voices are unavailable.
 */

import { TTSLanguage } from './types';

/**
 * Map of TTSLanguage codes to BCP-47 language tags that the Web Speech API
 * uses for voice matching.
 */
const LANG_MAP: Record<TTSLanguage, string[]> = {
  'ar': ['ar-SA', 'ar'],
  'ar-EG': ['ar-EG', 'ar'],
  'es': ['es-ES', 'es'],
  'es-MX': ['es-MX', 'es-US', 'es'],
  'en': ['en-US', 'en'],
  'en-US': ['en-US', 'en'],
  'en-GB': ['en-GB', 'en'],
};

/**
 * Default speech rates per language.
 * Arabic benefits from slightly slower speech for clarity.
 */
const DEFAULT_RATES: Record<TTSLanguage, number> = {
  'ar': 0.85,
  'ar-EG': 0.85,
  'es': 0.9,
  'es-MX': 0.9,
  'en': 1.0,
  'en-US': 1.0,
  'en-GB': 1.0,
};

export class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voiceCache: Map<string, SpeechSynthesisVoice[]> = new Map();
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      // Pre-load voices (some browsers load asynchronously)
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  /**
   * Check whether TTS is available in the current environment.
   */
  isAvailable(): boolean {
    return this.synth !== null && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  /**
   * Speak the given text in the specified language.
   *
   * @param text     The text to speak.
   * @param language The target language code.
   * @param rate     Optional speech rate (0.1 - 10). Defaults per language.
   * @returns        A promise that resolves when speech finishes.
   */
  speak(text: string, language: TTSLanguage, rate?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      // Cancel any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Set language
      const langTags = LANG_MAP[language] || ['en-US'];
      utterance.lang = langTags[0];

      // Find the best voice
      const voice = this.getBestVoice(language);
      if (voice) {
        utterance.voice = voice;
      }

      // Set rate
      utterance.rate = rate ?? DEFAULT_RATES[language] ?? 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        // "interrupted" is normal when we call stop()
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`TTS error: ${event.error}`));
        }
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * Get all available voices for a given language.
   */
  getVoices(language: TTSLanguage): SpeechSynthesisVoice[] {
    if (!this.synth) return [];

    const langTags = LANG_MAP[language] || [];
    const allVoices = this.synth.getVoices();

    return allVoices.filter((voice) =>
      langTags.some((tag) => voice.lang.startsWith(tag.split('-')[0]))
    );
  }

  /**
   * Stop any currently playing speech.
   */
  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private loadVoices(): void {
    if (!this.synth) return;
    // Force voice enumeration; cache is populated on demand via getVoices()
    this.synth.getVoices();
    this.voiceCache.clear();
  }

  /**
   * Find the best available voice for a language. Prefers:
   * 1. Exact language-region match
   * 2. Same language, different region
   * 3. Any voice with matching language prefix
   */
  private getBestVoice(language: TTSLanguage): SpeechSynthesisVoice | null {
    if (!this.synth) return null;

    const cacheKey = language;
    if (this.voiceCache.has(cacheKey)) {
      const cached = this.voiceCache.get(cacheKey)!;
      return cached[0] || null;
    }

    const langTags = LANG_MAP[language] || [];
    const allVoices = this.synth.getVoices();

    // Try exact matches in preference order
    for (const tag of langTags) {
      const exact = allVoices.find((v) => v.lang === tag);
      if (exact) {
        this.voiceCache.set(cacheKey, [exact]);
        return exact;
      }
    }

    // Try prefix match
    const baseLang = langTags[0]?.split('-')[0] || '';
    const prefixMatch = allVoices.find((v) => v.lang.startsWith(baseLang));
    if (prefixMatch) {
      this.voiceCache.set(cacheKey, [prefixMatch]);
      return prefixMatch;
    }

    this.voiceCache.set(cacheKey, []);
    return null;
  }
}
