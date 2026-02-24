/**
 * Centralized language card counts and display metadata.
 * Used by the dashboard and study page to show real data.
 */

import {
  arabicCards,
  quranAyahCards,
  spanishCards,
  egyptianCards,
  type StudyCard,
} from "./cards";
import type { LanguageId } from "@/store/user-preferences-store";

// ---------------------------------------------------------------------------
// Display metadata per language
// ---------------------------------------------------------------------------

export interface LanguageDisplay {
  id: LanguageId;
  name: string;
  color: "arabic" | "quran" | "egyptian" | "spanish";
  accent: string;
  gradientFrom: string;
  gradientTo: string;
}

export const LANGUAGE_DISPLAY: Record<LanguageId, LanguageDisplay> = {
  arabic: {
    id: "arabic",
    name: "Arabic",
    color: "arabic",
    accent: "#F59E0B",
    gradientFrom: "#F59E0B",
    gradientTo: "#D97706",
  },
  quran: {
    id: "quran",
    name: "Quranic Arabic",
    color: "quran",
    accent: "#14B8A6",
    gradientFrom: "#14B8A6",
    gradientTo: "#0D9488",
  },
  egyptian: {
    id: "egyptian",
    name: "Egyptian Arabic",
    color: "egyptian",
    accent: "#8B5CF6",
    gradientFrom: "#8B5CF6",
    gradientTo: "#7C3AED",
  },
  spanish: {
    id: "spanish",
    name: "Spanish",
    color: "spanish",
    accent: "#F97316",
    gradientFrom: "#F97316",
    gradientTo: "#EA580C",
  },
};

// ---------------------------------------------------------------------------
// Card retrieval per language
// ---------------------------------------------------------------------------

export function getCardsForLanguage(id: LanguageId): StudyCard[] {
  switch (id) {
    case "arabic":
      // Arabic now includes both MSA and Quranic cards (merged)
      return [...arabicCards, ...quranAyahCards];
    case "quran":
      // Keep for backward compat — same as arabic
      return [...arabicCards, ...quranAyahCards];
    case "egyptian":
      return egyptianCards;
    case "spanish":
      return spanishCards;
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Card counts — computed once from actual data
// ---------------------------------------------------------------------------

export const LANGUAGE_CARD_COUNTS: Record<LanguageId, number> = {
  arabic: getCardsForLanguage("arabic").length,
  quran: getCardsForLanguage("quran").length,
  egyptian: getCardsForLanguage("egyptian").length,
  spanish: getCardsForLanguage("spanish").length,
};

// ---------------------------------------------------------------------------
// Helper to map language ID used in review-store
// Both MSA and Quran reviews are logged as language "arabic" in review-store.
// ---------------------------------------------------------------------------

export function getReviewStoreLanguageId(id: LanguageId): string {
  // review-store uses "arabic" for both MSA and Quran
  if (id === "quran") return "arabic";
  return id;
}
