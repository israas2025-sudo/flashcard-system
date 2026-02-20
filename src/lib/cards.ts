/**
 * Card loader — imports real card data from JSON files and transforms
 * each format into a unified StudyCard interface for the study page.
 */

import arabicRaw from "../../cards/arabic_unified.json";
import spanishRaw from "../../cards/spanish.json";
import egyptianRaw from "../../cards/egyptian_arabic.json";
import quranRaw from "../../cards/quran.json";

// ---------------------------------------------------------------------------
// Unified StudyCard interface used by the study page
// ---------------------------------------------------------------------------

export interface StudyCard {
  id: string;
  front: string;
  back: string;
  transliteration?: string;
  language: "arabic" | "quran" | "spanish" | "egyptian";
  deck: string;
  noteType: string;
  audioUrl?: string;
  subtab?: "msa" | "quran";
  exampleSentence?: string;
  exampleTranslation?: string;
  root?: string;
  partOfSpeech?: string;
  notes?: string;
  surahNumber?: number;
  ayahNumber?: number;
  tags?: string[];
  intervals: {
    again: string;
    hard: string;
    good: string;
    easy: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map topic:: tags to readable deck names */
function topicToDeck(tags: string[]): string {
  const topicMap: Record<string, string> = {
    "topic::food-drink": "Food",
    "topic::kitchen": "Food",
    "topic::travel": "Travel",
    "topic::home": "Household",
    "topic::family": "Family",
    "topic::body": "Body",
    "topic::health": "Health",
    "topic::money-business": "Shopping",
    "topic::clothing": "Clothing",
    "topic::education": "Education",
    "topic::religion": "Religion",
    "topic::nature": "Nature",
    "topic::emotions": "Emotions",
    "topic::actions-daily": "Vocabulary",
    "topic::greetings": "Greetings",
    "topic::animals": "Nature",
    "topic::agriculture": "Nature",
    "topic::legal-islamic": "Religion",
    "topic::warfare": "Vocabulary",
    "topic::sports": "Sports",
  };

  for (const tag of tags) {
    if (topicMap[tag]) return topicMap[tag];
  }
  return "Vocabulary";
}

/** Get surah deck name from tags */
function surahDeck(tags: string[]): string {
  const surahMap: Record<string, string> = {
    "surah::al-fatiha": "Al-Fatiha",
    "surah::al-baqarah": "Al-Baqarah",
    "surah::aal-imran": "Aal-Imran",
    "surah::an-nisa": "An-Nisa",
    "surah::al-maida": "Al-Maida",
    "surah::al-anam": "Al-Anam",
    "surah::al-araf": "Al-Araf",
    "surah::al-anfal": "Al-Anfal",
    "surah::at-tawbah": "At-Tawbah",
    "surah::yunus": "Yunus",
    "surah::hud": "Hud",
    "surah::yusuf": "Yusuf",
    "surah::ar-rad": "Ar-Rad",
    "surah::ibrahim": "Ibrahim",
    "surah::al-hijr": "Al-Hijr",
    "surah::an-nahl": "An-Nahl",
    "surah::al-isra": "Al-Isra",
    "surah::al-kahf": "Al-Kahf",
    "surah::maryam": "Maryam",
    "surah::taha": "Taha",
    "surah::al-anbiya": "Al-Anbiya",
    "surah::al-hajj": "Al-Hajj",
    "surah::an-nur": "An-Nur",
    "surah::al-furqan": "Al-Furqan",
    "surah::an-naml": "An-Naml",
    "surah::al-ahzab": "Al-Ahzab",
    "surah::yasin": "Ya-Sin",
    "surah::az-zumar": "Az-Zumar",
    "surah::ghafir": "Ghafir",
    "surah::ar-rahman": "Ar-Rahman",
    "surah::al-waqiah": "Al-Waqiah",
    "surah::al-hadid": "Al-Hadid",
    "surah::al-hashr": "Al-Hashr",
    "surah::al-mulk": "Al-Mulk",
    "surah::nuh": "Nuh",
    "surah::al-muddaththir": "Al-Muddaththir",
    "surah::al-qiyamah": "Al-Qiyamah",
    "surah::an-naba": "An-Naba",
    "surah::an-naziat": "An-Naziat",
    "surah::abasa": "Abasa",
    "surah::at-takwir": "At-Takwir",
    "surah::al-infitar": "Al-Infitar",
    "surah::al-mutaffifin": "Al-Mutaffifin",
    "surah::al-inshiqaq": "Al-Inshiqaq",
    "surah::al-buruj": "Al-Buruj",
    "surah::at-tariq": "At-Tariq",
    "surah::al-ala": "Al-A'la",
    "surah::al-ghashiyah": "Al-Ghashiyah",
    "surah::al-fajr": "Al-Fajr",
    "surah::al-balad": "Al-Balad",
    "surah::ash-shams": "Ash-Shams",
    "surah::al-lail": "Al-Lail",
    "surah::ad-duha": "Ad-Duha",
    "surah::ash-sharh": "Ash-Sharh",
    "surah::at-tin": "At-Tin",
    "surah::al-alaq": "Al-Alaq",
    "surah::al-qadr": "Al-Qadr",
    "surah::al-bayyinah": "Al-Bayyinah",
    "surah::az-zalzalah": "Az-Zalzalah",
    "surah::al-adiyat": "Al-Adiyat",
    "surah::al-qariah": "Al-Qari'ah",
    "surah::at-takathur": "At-Takathur",
    "surah::al-asr": "Al-Asr",
    "surah::al-humazah": "Al-Humazah",
    "surah::al-fil": "Al-Fil",
    "surah::quraysh": "Quraysh",
    "surah::al-maun": "Al-Ma'un",
    "surah::al-kawthar": "Al-Kawthar",
    "surah::al-kafirun": "Al-Kafirun",
    "surah::an-nasr": "An-Nasr",
    "surah::al-masad": "Al-Masad",
    "surah::al-ikhlas": "Al-Ikhlas",
    "surah::al-falaq": "Al-Falaq",
    "surah::an-nas": "An-Nas",
  };

  for (const tag of tags) {
    if (surahMap[tag]) return surahMap[tag];
  }
  return "Vocabulary";
}

/** Default intervals based on difficulty */
function getIntervals(difficulty?: string) {
  if (difficulty === "advanced" || difficulty === "intermediate") {
    return { again: "1m", hard: "6m", good: "10m", easy: "4d" };
  }
  return { again: "1m", hard: "6m", good: "1d", easy: "4d" };
}

// ---------------------------------------------------------------------------
// Transform Arabic MSA/Quran cards
// ---------------------------------------------------------------------------

interface ArabicRawCard {
  id: number;
  arabic_word: string;
  transliteration?: string;
  root_letters: string;
  morphological_pattern: string;
  english_meaning: string;
  part_of_speech: string;
  example_sentence_ar: string;
  example_sentence_en: string;
  plural_form: string | null;
  tags: string[];
  status: string;
  flag: number;
}

function transformArabicCards(raw: ArabicRawCard[]): StudyCard[] {
  return raw
    .filter((c) => c.status === "active")
    .map((c) => {
      const isQuranVocab = c.tags.some((t) => t === "quran::vocabulary");
      const deckSubject = isQuranVocab ? surahDeck(c.tags) : topicToDeck(c.tags);
      const deckPath = isQuranVocab
        ? `Arabic::Quran::${deckSubject}`
        : `Arabic::MSA::${deckSubject}`;

      const noteParts: string[] = [];
      if (c.morphological_pattern) noteParts.push(`Pattern: ${c.morphological_pattern}`);
      if (c.plural_form) noteParts.push(`Plural: ${c.plural_form}`);

      return {
        id: `ar-${c.id}`,
        front: c.arabic_word,
        back: c.english_meaning,
        transliteration: c.transliteration || undefined,
        language: "arabic" as const,
        subtab: isQuranVocab ? ("quran" as const) : ("msa" as const),
        deck: deckPath,
        noteType: isQuranVocab ? "quran-vocab" : "arabic-vocab",
        root: c.root_letters || undefined,
        partOfSpeech: c.part_of_speech || undefined,
        exampleSentence: c.example_sentence_ar || undefined,
        exampleTranslation: c.example_sentence_en || undefined,
        notes: noteParts.length > 0 ? noteParts.join(". ") : undefined,
        tags: c.tags,
        intervals: getIntervals(
          c.tags.find((t) => t.startsWith("level::"))?.replace("level::", "")
        ),
      };
    });
}

// ---------------------------------------------------------------------------
// Transform Quran ayah cards
// ---------------------------------------------------------------------------

interface QuranRawCard {
  id: number;
  ayah_text: string;
  surah_name: string;
  surah_number: number;
  ayah_number: number;
  juz_number: number;
  english_translation: string;
  transliteration?: string;
  key_vocabulary: Array<{ word: string; meaning: string }>;
  theme: string;
  tajweed_notes: string;
  tags: string[];
  status: string;
  flag: number;
  revelation: string;
}

function transformQuranCards(raw: QuranRawCard[]): StudyCard[] {
  return raw
    .filter((c) => c.status === "active")
    .map((c) => {
      const surahClean = c.surah_name.split(" - ")[1] || c.surah_name;
      const vocabStr = c.key_vocabulary
        .map((v) => `${v.word} = ${v.meaning}`)
        .join(" | ");

      const noteParts: string[] = [];
      noteParts.push(`${c.surah_name}, Ayah ${c.ayah_number}`);
      if (c.theme) noteParts.push(c.theme);
      if (c.tajweed_notes) noteParts.push(`Tajweed: ${c.tajweed_notes}`);

      return {
        id: `qr-${c.id}`,
        front: c.ayah_text,
        back: c.english_translation,
        transliteration: c.transliteration || undefined,
        language: "arabic" as const,
        subtab: "quran" as const,
        deck: `Arabic::Quran::${surahClean}`,
        noteType: "quran-ayah",
        surahNumber: c.surah_number,
        ayahNumber: c.ayah_number,
        exampleSentence: vocabStr || undefined,
        exampleTranslation: "Key vocabulary",
        notes: noteParts.join(". "),
        tags: c.tags,
        intervals: { again: "1m", hard: "6m", good: "1d", easy: "4d" },
      };
    });
}

// ---------------------------------------------------------------------------
// Transform Spanish cards
// ---------------------------------------------------------------------------

interface SpanishRawCard {
  id: string;
  front: string;
  back: string;
  part_of_speech: string;
  gender: string | null;
  example_es: string;
  example_en: string;
  difficulty: string;
  frequency_rank: number;
  sort_position: number;
  cefr_level: string;
  tags: string[];
  conjugation_hint?: string;
  collocations?: string[];
}

function transformSpanishCards(raw: SpanishRawCard[]): StudyCard[] {
  return raw.map((c) => {
    const themeTag = c.tags.find((t) => t.startsWith("theme:"));
    const theme = themeTag ? themeTag.replace("theme:", "") : "Vocabulary";
    const deckName = theme.charAt(0).toUpperCase() + theme.slice(1);

    const noteParts: string[] = [];
    if (c.conjugation_hint) noteParts.push(c.conjugation_hint);
    if (c.gender) noteParts.push(`Gender: ${c.gender}`);
    if (c.collocations && c.collocations.length > 0) {
      noteParts.push(`Common: ${c.collocations.join(", ")}`);
    }

    return {
      id: c.id,
      front: c.front,
      back: c.back,
      language: "spanish" as const,
      deck: `Spanish::${deckName}`,
      noteType: "spanish-vocab",
      partOfSpeech: c.part_of_speech || undefined,
      exampleSentence: c.example_es || undefined,
      exampleTranslation: c.example_en || undefined,
      notes: noteParts.length > 0 ? noteParts.join(". ") : undefined,
      tags: c.tags,
      intervals: getIntervals(c.difficulty),
    };
  });
}

// ---------------------------------------------------------------------------
// Transform Egyptian Arabic cards
// ---------------------------------------------------------------------------

interface EgyptianRawCard {
  id: string;
  front: string;
  back: string;
  transliteration: string;
  fusha_equivalent: string;
  part_of_speech: string;
  usage_context: string;
  example_eg: string;
  example_en: string;
  difficulty: string;
  frequency_rank: number;
  sort_position: number;
  tags: string[];
  topic_tags: string[];
}

function transformEgyptianCards(raw: EgyptianRawCard[]): StudyCard[] {
  return raw.map((c) => {
    const topic = c.topic_tags?.[0] || "Basics";
    const deckName = topic.charAt(0).toUpperCase() + topic.slice(1);

    const noteParts: string[] = [];
    if (c.fusha_equivalent) noteParts.push(`MSA: ${c.fusha_equivalent}`);

    return {
      id: c.id,
      front: c.front,
      back: c.back,
      transliteration: c.transliteration || undefined,
      language: "egyptian" as const,
      deck: `Egyptian::${deckName}`,
      noteType: "egyptian-vocab",
      partOfSpeech: c.part_of_speech || undefined,
      exampleSentence: c.example_eg || undefined,
      exampleTranslation: c.example_en || undefined,
      notes: noteParts.length > 0 ? noteParts.join(". ") : undefined,
      tags: c.tags,
      intervals: getIntervals(c.difficulty),
    };
  });
}

// ---------------------------------------------------------------------------
// Export all cards combined
// ---------------------------------------------------------------------------

export const arabicCards = transformArabicCards(arabicRaw as ArabicRawCard[]);
export const quranAyahCards = transformQuranCards(quranRaw as QuranRawCard[]);
export const spanishCards = transformSpanishCards(spanishRaw as SpanishRawCard[]);
export const egyptianCards = transformEgyptianCards(egyptianRaw as EgyptianRawCard[]);

export const allStudyCards: StudyCard[] = [
  ...arabicCards,
  ...quranAyahCards,
  ...spanishCards,
  ...egyptianCards,
];
