/**
 * Shared preset definitions and tag mapping for Smart Study.
 * Used by both the study-presets page and the study page.
 */

import { type StudyCard } from "./cards";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StateFilter {
  includeNew: boolean;
  includeReview: boolean;
  includeLearning: boolean;
}

export interface StudyPreset {
  id: string;
  userId: string;
  name: string;
  tagFilter: string[];
  deckFilter: string[];
  stateFilter: StateFilter;
  isPinned: boolean;
  cardCount?: number;
  isBuiltIn?: boolean;
  createdAt: string;
}

export interface TagOption {
  id: string;
  name: string;
  color: string;
  slug: string;
}

export interface DeckOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Tag definitions
// ---------------------------------------------------------------------------

export const defaultTags: TagOption[] = [
  // Quranic / Islamic
  { id: "t-quran", name: "Quran", color: "#14B8A6", slug: "quran" },
  { id: "t-quran-fatiha", name: "Al-Fatiha", color: "#14B8A6", slug: "quran-fatiha" },
  { id: "t-quran-baqarah", name: "Al-Baqarah", color: "#14B8A6", slug: "quran-baqarah" },
  { id: "t-quran-imran", name: "Aal-Imran", color: "#14B8A6", slug: "quran-imran" },
  { id: "t-quran-yusuf", name: "Yusuf", color: "#14B8A6", slug: "quran-yusuf" },
  { id: "t-quran-kahf", name: "Al-Kahf", color: "#14B8A6", slug: "quran-kahf" },
  { id: "t-quran-rahman", name: "Ar-Rahman", color: "#14B8A6", slug: "quran-rahman" },
  { id: "t-quran-mulk", name: "Al-Mulk", color: "#14B8A6", slug: "quran-mulk" },
  { id: "t-quran-juz30", name: "Juz 30", color: "#14B8A6", slug: "quran-juz30" },
  { id: "t-quran-yasin", name: "Ya-Sin", color: "#14B8A6", slug: "quran-yasin" },
  { id: "t-quran-naba", name: "An-Naba", color: "#14B8A6", slug: "quran-naba" },
  { id: "t-quran-duha", name: "Ad-Duha", color: "#14B8A6", slug: "quran-duha" },
  { id: "t-quran-sharh", name: "Ash-Sharh", color: "#14B8A6", slug: "quran-sharh" },
  { id: "t-quran-alaq", name: "Al-Alaq", color: "#14B8A6", slug: "quran-alaq" },
  { id: "t-quran-qadr", name: "Al-Qadr", color: "#14B8A6", slug: "quran-qadr" },
  { id: "t-quran-ikhlas", name: "Al-Ikhlas", color: "#14B8A6", slug: "quran-ikhlas" },
  { id: "t-quran-falaq", name: "Al-Falaq", color: "#14B8A6", slug: "quran-falaq" },
  { id: "t-quran-nas", name: "An-Nas", color: "#14B8A6", slug: "quran-nas" },
  { id: "t-quran-kafirun", name: "Al-Kafirun", color: "#14B8A6", slug: "quran-kafirun" },
  { id: "t-quran-kawthar", name: "Al-Kawthar", color: "#14B8A6", slug: "quran-kawthar" },
  { id: "t-quran-asr", name: "Al-Asr", color: "#14B8A6", slug: "quran-asr" },
  { id: "t-quran-fajr", name: "Al-Fajr", color: "#14B8A6", slug: "quran-fajr" },
  { id: "t-quran-shams", name: "Ash-Shams", color: "#14B8A6", slug: "quran-shams" },
  { id: "t-quran-lail", name: "Al-Lail", color: "#14B8A6", slug: "quran-lail" },
  { id: "t-quran-tin", name: "At-Tin", color: "#14B8A6", slug: "quran-tin" },
  // Subject tags
  { id: "t-greetings", name: "Greetings", color: "#8B5CF6", slug: "greetings" },
  { id: "t-food", name: "Food & Cooking", color: "#F97316", slug: "food" },
  { id: "t-travel", name: "Travel", color: "#3B82F6", slug: "travel" },
  { id: "t-household", name: "Household", color: "#10B981", slug: "household" },
  { id: "t-shopping", name: "Shopping & Money", color: "#EAB308", slug: "shopping" },
  { id: "t-family", name: "Family", color: "#EC4899", slug: "family" },
  { id: "t-body", name: "Body & Health", color: "#EF4444", slug: "body" },
  { id: "t-education", name: "Education", color: "#6366F1", slug: "education" },
  { id: "t-nature", name: "Nature & Weather", color: "#22C55E", slug: "nature" },
  { id: "t-work", name: "Work & Office", color: "#64748B", slug: "work" },
  { id: "t-emotions", name: "Emotions", color: "#F43F5E", slug: "emotions" },
  { id: "t-religion", name: "Religion & Prayer", color: "#14B8A6", slug: "religion" },
  { id: "t-sports", name: "Sports & Exercise", color: "#06B6D4", slug: "sports" },
  { id: "t-clothing", name: "Clothing", color: "#A855F7", slug: "clothing" },
  { id: "t-numbers", name: "Numbers & Time", color: "#F59E0B", slug: "numbers" },
  { id: "t-directions", name: "Directions", color: "#0EA5E9", slug: "directions" },
  // Frequency
  { id: "t-freq100", name: "Top 100", color: "#EF4444", slug: "freq-top-100" },
  { id: "t-freq500", name: "Top 500", color: "#F97316", slug: "freq-top-500" },
];

export const defaultDecks: DeckOption[] = [
  { id: "d-arabic", name: "Arabic (MSA / Quran)" },
  { id: "d-egyptian", name: "Egyptian Arabic" },
  { id: "d-spanish", name: "Spanish" },
];

// ---------------------------------------------------------------------------
// Built-in presets
// ---------------------------------------------------------------------------

export const builtInPresets: StudyPreset[] = [
  {
    id: "bi-review-due",
    userId: "system",
    name: "Review Due Cards",
    tagFilter: [],
    deckFilter: [],
    stateFilter: { includeNew: false, includeReview: true, includeLearning: true },
    isPinned: true,
    cardCount: 0,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "bi-quran-daily",
    userId: "system",
    name: "Daily Quran Review",
    tagFilter: ["t-quran"],
    deckFilter: ["d-arabic"],
    stateFilter: { includeNew: true, includeReview: true, includeLearning: true },
    isPinned: false,
    cardCount: 50,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "bi-new-vocab",
    userId: "system",
    name: "Learn New Vocabulary",
    tagFilter: [],
    deckFilter: [],
    stateFilter: { includeNew: true, includeReview: false, includeLearning: false },
    isPinned: false,
    cardCount: 20,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "bi-egyptian-basics",
    userId: "system",
    name: "Egyptian Arabic Essentials",
    tagFilter: ["t-greetings", "t-food", "t-household"],
    deckFilter: ["d-egyptian"],
    stateFilter: { includeNew: true, includeReview: true, includeLearning: true },
    isPinned: false,
    cardCount: 40,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "bi-spanish-daily",
    userId: "system",
    name: "Spanish Daily Practice",
    tagFilter: ["t-greetings", "t-food", "t-travel"],
    deckFilter: ["d-spanish"],
    stateFilter: { includeNew: true, includeReview: true, includeLearning: true },
    isPinned: false,
    cardCount: 30,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "bi-top100",
    userId: "system",
    name: "Most Frequent Words",
    tagFilter: ["t-freq100"],
    deckFilter: [],
    stateFilter: { includeNew: true, includeReview: true, includeLearning: false },
    isPinned: false,
    cardCount: 100,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "zaytuna-study-presets";

export function loadPresetsFromStorage(): StudyPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePresetsToStorage(presets: StudyPreset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// ---------------------------------------------------------------------------
// Preset lookup — find by ID from built-in + user presets
// ---------------------------------------------------------------------------

export function findPresetById(id: string): StudyPreset | null {
  const builtIn = builtInPresets.find((p) => p.id === id);
  if (builtIn) return builtIn;

  const userPresets = loadPresetsFromStorage();
  return userPresets.find((p) => p.id === id) || null;
}

// ---------------------------------------------------------------------------
// Tag ID → card tag mapping
// Maps preset tag IDs (e.g. "t-food") to the tag patterns found in card data
// (e.g. "topic::food-drink", "topic::kitchen").
// ---------------------------------------------------------------------------

const tagToCardTags: Record<string, string[]> = {
  "t-quran": ["quran::vocabulary", "quran"],
  "t-quran-fatiha": ["surah::al-fatiha"],
  "t-quran-baqarah": ["surah::al-baqarah"],
  "t-quran-imran": ["surah::aal-imran"],
  "t-quran-yusuf": ["surah::yusuf"],
  "t-quran-kahf": ["surah::al-kahf"],
  "t-quran-rahman": ["surah::ar-rahman"],
  "t-quran-mulk": ["surah::al-mulk"],
  "t-quran-juz30": ["juz::30"],
  "t-quran-yasin": ["surah::yasin"],
  "t-quran-naba": ["surah::an-naba"],
  "t-quran-duha": ["surah::ad-duha"],
  "t-quran-sharh": ["surah::ash-sharh"],
  "t-quran-alaq": ["surah::al-alaq"],
  "t-quran-qadr": ["surah::al-qadr"],
  "t-quran-ikhlas": ["surah::al-ikhlas"],
  "t-quran-falaq": ["surah::al-falaq"],
  "t-quran-nas": ["surah::an-nas"],
  "t-quran-kafirun": ["surah::al-kafirun"],
  "t-quran-kawthar": ["surah::al-kawthar"],
  "t-quran-asr": ["surah::al-asr"],
  "t-quran-fajr": ["surah::al-fajr"],
  "t-quran-shams": ["surah::ash-shams"],
  "t-quran-lail": ["surah::al-lail"],
  "t-quran-tin": ["surah::at-tin"],
  "t-greetings": ["topic::greetings", "theme:greetings"],
  "t-food": ["topic::food-drink", "topic::kitchen", "theme:food"],
  "t-travel": ["topic::travel", "theme:travel"],
  "t-household": ["topic::home", "theme:household", "theme:home"],
  "t-shopping": ["topic::money-business", "theme:shopping", "theme:money"],
  "t-family": ["topic::family", "theme:family"],
  "t-body": ["topic::body", "topic::health", "theme:body", "theme:health"],
  "t-education": ["topic::education", "theme:education"],
  "t-nature": ["topic::nature", "topic::animals", "topic::agriculture", "theme:nature"],
  "t-work": ["topic::work", "theme:work", "theme:office"],
  "t-emotions": ["topic::emotions", "theme:emotions"],
  "t-religion": ["topic::religion", "topic::legal-islamic", "theme:religion"],
  "t-sports": ["topic::sports", "theme:sports"],
  "t-clothing": ["topic::clothing", "theme:clothing"],
  "t-numbers": ["topic::numbers", "theme:numbers", "theme:time"],
  "t-directions": ["topic::directions", "theme:directions", "theme:location"],
  "t-freq100": ["freq::top-100"],
  "t-freq500": ["freq::top-500"],
};

// Deck ID → language mapping
const deckToLanguage: Record<string, string> = {
  "d-arabic": "arabic",
  "d-egyptian": "egyptian",
  "d-spanish": "spanish",
};

// ---------------------------------------------------------------------------
// Filter cards by preset
// ---------------------------------------------------------------------------

export function filterCardsByPreset(
  allCards: StudyCard[],
  preset: StudyPreset
): StudyCard[] {
  let filtered = [...allCards];

  // 1. Deck filter — filter by language
  if (preset.deckFilter.length > 0) {
    const langs = preset.deckFilter
      .map((d) => deckToLanguage[d])
      .filter(Boolean);
    if (langs.length > 0) {
      filtered = filtered.filter((c) => langs.includes(c.language));
    }
  }

  // 2. Tag filter — card must match at least ONE of the preset's tags
  if (preset.tagFilter.length > 0) {
    filtered = filtered.filter((card) => {
      const cardTags = card.tags || [];

      // For quran tag, also match cards with subtab === "quran"
      return preset.tagFilter.some((presetTagId) => {
        // Check subtab for quran-related tags
        if (presetTagId === "t-quran" && card.subtab === "quran") return true;

        const mappedPatterns = tagToCardTags[presetTagId] || [];
        return mappedPatterns.some((pattern) =>
          cardTags.some((cardTag) => cardTag === pattern || cardTag.startsWith(pattern))
        );
      });
    });
  }

  // 3. Card count limit
  if (preset.cardCount && preset.cardCount > 0) {
    filtered = filtered.slice(0, preset.cardCount);
  }

  return filtered;
}
