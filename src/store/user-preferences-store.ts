import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LanguageId = "arabic" | "quran" | "egyptian" | "spanish";

export type Intention = "fluency" | "understanding" | "conversational";
export type Stage = "beginner" | "elementary" | "intermediate" | "advanced";

export interface LanguagePreference {
  id: LanguageId;
  level: "beginner" | "intermediate" | "advanced";
  dailyCards: number;
  selectedTopics: string[]; // topic IDs
}

interface UserPreferencesState {
  // Onboarding
  onboardingCompleted: boolean;

  // User profile
  intention: Intention | null;
  stage: Stage | null;
  dailyTimeMinutes: number; // 5, 10, 15, 20, 30, 45, 60

  // Language preferences
  languages: LanguagePreference[];

  // Computed
  dailyGoal: number; // total daily cards across all languages

  // Actions
  completeOnboarding: (params: {
    languages: LanguagePreference[];
    intention: Intention;
    stage: Stage;
    dailyTimeMinutes: number;
  }) => void;
  addLanguage: (lang: LanguagePreference) => void;
  removeLanguage: (id: LanguageId) => void;
  updateLanguage: (id: LanguageId, updates: Partial<Omit<LanguagePreference, "id">>) => void;
  resetOnboarding: () => void;
}

// ---------------------------------------------------------------------------
// Old onboarding data migration helper
// ---------------------------------------------------------------------------

function migrateOldOnboarding(): { completed: boolean; languages: LanguagePreference[] } | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("zaytuna-onboarding");
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (!data.completed || !Array.isArray(data.languages)) return null;

    const idMap: Record<string, LanguageId> = {
      msa: "arabic",
      quran: "quran",
      egyptian: "egyptian",
      spanish: "spanish",
      arabic: "arabic",
    };

    const languages: LanguagePreference[] = data.languages
      .map((l: { id: string; level?: string; dailyCards?: number }) => {
        const mappedId = idMap[l.id];
        if (!mappedId) return null;
        return {
          id: mappedId,
          level: l.level || "beginner",
          dailyCards: l.dailyCards || 20,
          selectedTopics: [], // old onboarding didn't have topics
        } as LanguagePreference;
      })
      .filter(Boolean);

    if (languages.length === 0) return null;

    // Clean up old key after migration
    localStorage.removeItem("zaytuna-onboarding");

    return { completed: true, languages };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      onboardingCompleted: false,
      intention: null,
      stage: null,
      dailyTimeMinutes: 15,
      languages: [],
      dailyGoal: 0,

      completeOnboarding: ({ languages, intention, stage, dailyTimeMinutes }) => {
        const dailyGoal = languages.reduce((sum, l) => sum + l.dailyCards, 0);
        set({
          onboardingCompleted: true,
          languages,
          intention,
          stage,
          dailyTimeMinutes,
          dailyGoal,
        });
      },

      addLanguage: (lang) => {
        const current = get().languages;
        if (current.some((l) => l.id === lang.id)) return;
        const updated = [...current, lang];
        set({
          languages: updated,
          dailyGoal: updated.reduce((sum, l) => sum + l.dailyCards, 0),
        });
      },

      removeLanguage: (id) => {
        const updated = get().languages.filter((l) => l.id !== id);
        set({
          languages: updated,
          dailyGoal: updated.reduce((sum, l) => sum + l.dailyCards, 0),
        });
      },

      updateLanguage: (id, updates) => {
        const updated = get().languages.map((l) =>
          l.id === id ? { ...l, ...updates } : l
        );
        set({
          languages: updated,
          dailyGoal: updated.reduce((sum, l) => sum + l.dailyCards, 0),
        });
      },

      resetOnboarding: () => {
        set({
          onboardingCompleted: false,
          intention: null,
          stage: null,
          dailyTimeMinutes: 15,
          languages: [],
          dailyGoal: 0,
        });
      },
    }),
    {
      name: "zaytuna-user-preferences",
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        intention: state.intention,
        stage: state.stage,
        dailyTimeMinutes: state.dailyTimeMinutes,
        languages: state.languages,
        dailyGoal: state.dailyGoal,
      }),
      onRehydrateStorage: () => (state) => {
        // Migrate old onboarding data if new store is empty
        if (state && !state.onboardingCompleted) {
          const migrated = migrateOldOnboarding();
          if (migrated) {
            state.onboardingCompleted = migrated.completed;
            state.languages = migrated.languages;
            state.dailyGoal = migrated.languages.reduce(
              (sum, l) => sum + l.dailyCards,
              0
            );
          }
        }
      },
    }
  )
);
