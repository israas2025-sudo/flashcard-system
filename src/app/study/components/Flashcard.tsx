"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, BookOpen } from "lucide-react";
import { useSound } from "@/hooks/useSound";

interface FlashcardProps {
  front: string;
  back: string;
  transliteration?: string;
  language: "arabic" | "quran" | "spanish" | "egyptian";
  noteType: string;
  audioUrl?: string;
  isFlipped: boolean;
  onFlip: () => void;
  exampleSentence?: string;
  exampleTranslation?: string;
  root?: string;
  partOfSpeech?: string;
  notes?: string;
  surahNumber?: number;
  ayahNumber?: number;
}

const languageStyles: Record<
  string,
  { textClass: string; bgAccent: string; fontClass: string; isRTL: boolean; ttsLang: string }
> = {
  arabic: {
    textClass: "text-arabic-600 dark:text-arabic-400",
    bgAccent: "bg-arabic-50 dark:bg-arabic-950/30",
    fontClass: "arabic-text",
    isRTL: true,
    ttsLang: "ar-SA",
  },
  quran: {
    textClass: "text-quran-600 dark:text-quran-400",
    bgAccent: "bg-quran-50 dark:bg-quran-950/30",
    fontClass: "quran-text",
    isRTL: true,
    ttsLang: "ar-SA",
  },
  spanish: {
    textClass: "text-spanish-600 dark:text-spanish-400",
    bgAccent: "bg-spanish-50 dark:bg-spanish-950/30",
    fontClass: "",
    isRTL: false,
    ttsLang: "es-ES",
  },
  egyptian: {
    textClass: "text-egyptian-600 dark:text-egyptian-400",
    bgAccent: "bg-egyptian-50 dark:bg-egyptian-950/30",
    fontClass: "arabic-text",
    isRTL: true,
    ttsLang: "ar-EG",
  },
};

const languageLabels: Record<string, string> = {
  arabic: "Arabic (MSA / Quran)",
  quran: "Quranic Arabic",
  spanish: "Spanish",
  egyptian: "Egyptian Arabic",
};

export function Flashcard({
  front,
  back,
  transliteration,
  language,
  noteType,
  audioUrl,
  isFlipped,
  onFlip,
  exampleSentence,
  exampleTranslation,
  root,
  partOfSpeech,
  notes,
  surahNumber,
  ayahNumber,
}: FlashcardProps) {
  const style = languageStyles[language] || languageStyles.arabic;
  const { playSound } = useSound();
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const recitationRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoPlayed = useRef(false);

  // Preload voices — Chrome loads them asynchronously
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {});
        return;
      }

      // Use Web Speech API for TTS
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = style.ttsLang;
        utterance.rate = 0.85;
        utterance.pitch = 1;

        // Use preloaded voices, fall back to fresh fetch
        const voices = voicesRef.current.length > 0
          ? voicesRef.current
          : window.speechSynthesis.getVoices();
        const langPrefix = style.ttsLang.split("-")[0];
        const matchingVoice = voices.find(
          (v) => v.lang === style.ttsLang || v.lang.startsWith(langPrefix)
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        window.speechSynthesis.speak(utterance);
      }

      playSound("tick");
    },
    [audioUrl, style.ttsLang, playSound]
  );

  // Play recitation helper (non-event version for auto-play)
  const playRecitationAuto = useCallback(() => {
    if (!surahNumber || !ayahNumber) return;
    if (recitationRef.current) {
      recitationRef.current.pause();
      recitationRef.current = null;
    }
    const surahStr = String(surahNumber).padStart(3, "0");
    const ayahStr = String(ayahNumber).padStart(3, "0");
    const url = `https://everyayah.com/data/Alafasy_128kbps/${surahStr}${ayahStr}.mp3`;
    const audio = new Audio(url);
    recitationRef.current = audio;
    audio.play().catch(() => {});
  }, [surahNumber, ayahNumber]);

  // Auto-play when a new card mounts (front side)
  useEffect(() => {
    hasAutoPlayed.current = false;
    const isQA = noteType === "quran-ayah" && surahNumber && ayahNumber;
    const timer = setTimeout(() => {
      if (!hasAutoPlayed.current) {
        hasAutoPlayed.current = true;
        if (isQA) {
          playRecitationAuto();
        } else {
          speakText(front);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front]);

  // Auto-play TTS when card flips to back
  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => speakText(front), 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped]);

  // Cleanup recitation audio on unmount
  useEffect(() => {
    return () => {
      if (recitationRef.current) {
        recitationRef.current.pause();
        recitationRef.current = null;
      }
    };
  }, []);

  // Quran recitation via EveryAyah.com (Mishary Rashid Alafasy)
  const playRecitation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!surahNumber || !ayahNumber) return;

    // Stop any existing recitation
    if (recitationRef.current) {
      recitationRef.current.pause();
      recitationRef.current = null;
    }

    const surahStr = String(surahNumber).padStart(3, "0");
    const ayahStr = String(ayahNumber).padStart(3, "0");
    const url = `https://everyayah.com/data/Alafasy_128kbps/${surahStr}${ayahStr}.mp3`;

    const audio = new Audio(url);
    recitationRef.current = audio;
    audio.play().catch(() => {});
    playSound("tick");
  }, [surahNumber, ayahNumber, playSound]);

  const handleAudioPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakText(front);
  };

  const handleSentencePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (exampleSentence) speakText(exampleSentence);
  };

  const isQuranAyah = noteType === "quran-ayah" && surahNumber && ayahNumber;
  const showSentenceButton = !!exampleSentence && noteType !== "quran-ayah";
  const showTransliteration = !!transliteration;
  const showAudioButton = language === "arabic" || language === "quran" || language === "egyptian" || language === "spanish" || !!audioUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl"
    >
      <div
        className="flashcard-container cursor-pointer"
        onClick={!isFlipped ? onFlip : undefined}
        style={{ minHeight: "60vh" }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="preserve-3d relative w-full"
          style={{ minHeight: "60vh" }}
        >
          {/* Front face */}
          <div
            className={`flashcard-face absolute inset-0 rounded-[16px] bg-[var(--surface-0)] ${
              isFlipped ? "pointer-events-none" : ""
            }`}
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Frosted glass edge effect */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            <div className="flex flex-col items-center justify-center h-full p-8">
              {/* Language badge - subtle dot + muted label */}
              <div className="flex items-center gap-1.5 mb-8">
                <div className={`w-2 h-2 rounded-full ${style.textClass.includes('arabic') ? 'bg-arabic-500' : style.textClass.includes('quran') ? 'bg-quran-500' : style.textClass.includes('spanish') ? 'bg-spanish-500' : 'bg-egyptian-500'}`} />
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  {languageLabels[language]}
                </span>
              </div>

              {/* Front content */}
              <div
                className={`text-center ${style.isRTL ? "direction-rtl" : ""}`}
                dir={style.isRTL ? "rtl" : "ltr"}
              >
                <p
                  className={`text-3xl font-semibold text-[var(--text-primary)] ${style.fontClass}`}
                >
                  {front}
                </p>
              </div>

              {/* Transliteration */}
              {showTransliteration && (
                <p className="mt-3 text-lg text-[var(--text-secondary)] italic font-light">
                  {transliteration}
                </p>
              )}

              {/* Audio buttons */}
              <div className="flex items-center gap-3 mt-6">
                {showAudioButton && (
                  <button
                    onClick={handleAudioPlay}
                    className="p-3 rounded-full hover:bg-[var(--surface-2)] transition-colors group"
                    aria-label="Play pronunciation"
                  >
                    <Volume2
                      className={`w-5 h-5 ${style.textClass} group-hover:scale-110 transition-transform`}
                    />
                  </button>
                )}
                {isQuranAyah && (
                  <button
                    onClick={playRecitation}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-quran-50 dark:hover:bg-quran-950/30 transition-colors border border-quran-200 dark:border-quran-800"
                    aria-label="Play Quran recitation"
                  >
                    <Volume2 className="w-4 h-4 text-quran-500" />
                    <span className="text-xs font-medium text-quran-600 dark:text-quran-400">
                      Alafasy
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Back face */}
          <div
            className="flashcard-face absolute inset-0 rounded-[16px] bg-[var(--surface-0)]"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>

            <div className="flex flex-col h-full p-8 overflow-y-auto">
              {/* Top: Front text at reduced opacity */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`text-center mb-1 ${style.isRTL ? "direction-rtl" : ""}`}
                dir={style.isRTL ? "rtl" : "ltr"}
              >
                <p
                  className={`text-lg text-[var(--text-secondary)] ${style.fontClass}`}
                >
                  {front}
                </p>
              </motion.div>

              {/* Transliteration on back too */}
              {showTransliteration && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm text-[var(--text-tertiary)] italic text-center mb-3"
                >
                  {transliteration}
                </motion.p>
              )}

              {/* Divider */}
              <div className="w-12 h-px bg-[var(--surface-3)] mx-auto mb-4" />

              {/* Main answer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-center mb-4"
              >
                <p className="text-2xl font-medium text-[var(--text-primary)]">
                  {back}
                </p>
              </motion.div>

              {/* Metadata row (part of speech, root) */}
              {(partOfSpeech || root) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center justify-center gap-3 mb-5"
                >
                  {partOfSpeech && (
                    <span className="text-xs px-2 py-1 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] font-medium">
                      {partOfSpeech}
                    </span>
                  )}
                  {root && (
                    <span className="text-xs px-2 py-1 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      Root: <span className={`font-semibold ${style.fontClass}`} dir={style.isRTL ? "rtl" : "ltr"}>{root}</span>
                    </span>
                  )}
                </motion.div>
              )}

              {/* Example sentence */}
              {exampleSentence && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[var(--surface-1)] rounded-xl p-4 mb-4 border border-[var(--surface-3)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Example</span>
                    </div>
                    {showSentenceButton && (
                      <button
                        onClick={handleSentencePlay}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                        aria-label="Hear sentence"
                      >
                        <Volume2 className={`w-3 h-3 ${style.textClass}`} />
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)]">Hear sentence</span>
                      </button>
                    )}
                  </div>
                  <p
                    className={`text-base text-[var(--text-primary)] leading-relaxed ${style.fontClass}`}
                    dir={style.isRTL ? "rtl" : "ltr"}
                  >
                    {exampleSentence}
                  </p>
                  {exampleTranslation && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1.5 italic">
                      {exampleTranslation}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Notes */}
              {notes && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-center"
                >
                  <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                    {notes}
                  </p>
                </motion.div>
              )}

              {/* Spacer + Audio buttons */}
              <div className="flex-1" />
              <div className="flex items-center justify-center gap-3 mt-4">
                {showAudioButton && (
                  <button
                    onClick={handleAudioPlay}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors border border-[var(--surface-3)]"
                    aria-label="Play pronunciation"
                  >
                    <Volume2 className={`w-4 h-4 ${style.textClass}`} />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Hear word
                    </span>
                  </button>
                )}
                {isQuranAyah && (
                  <button
                    onClick={playRecitation}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-quran-50 dark:hover:bg-quran-950/30 transition-colors border border-quran-200 dark:border-quran-800"
                    aria-label="Play Quran recitation"
                  >
                    <Volume2 className="w-4 h-4 text-quran-500" />
                    <span className="text-xs font-medium text-quran-600 dark:text-quran-400">
                      Hear recitation
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
