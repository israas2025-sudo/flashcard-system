import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LanguageId } from "./user-preferences-store";
import type {
  LearningPathway,
  PathwaySection,
  BenchmarkResult,
  ChatMessage,
} from "@/types/pathway";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PathwayState {
  pathways: Partial<Record<LanguageId, LearningPathway>>;
  benchmarkResults: Record<string, BenchmarkResult>; // sectionId → result
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  introPlayed: boolean;

  // Actions
  setPathway: (langId: LanguageId, pathway: LearningPathway) => void;
  updateSectionStatus: (
    langId: LanguageId,
    sectionId: string,
    status: PathwaySection["status"]
  ) => void;
  addBenchmarkResult: (result: BenchmarkResult) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setIsGenerating: (v: boolean) => void;
  setIntroPlayed: () => void;
  clearPathways: () => void;

  // Derived helpers
  getActiveSection: (langId: LanguageId) => PathwaySection | null;
  getSectionProgress: (
    langId: LanguageId
  ) => { completed: number; total: number };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePathwayStore = create<PathwayState>()(
  persist(
    (set, get) => ({
      pathways: {},
      benchmarkResults: {},
      chatHistory: [],
      isGenerating: false,
      introPlayed: false,

      setPathway: (langId, pathway) => {
        set((state) => ({
          pathways: { ...state.pathways, [langId]: pathway },
        }));
      },

      updateSectionStatus: (langId, sectionId, status) => {
        set((state) => {
          const pathway = state.pathways[langId];
          if (!pathway) return state;

          const sections = pathway.sections.map((s) =>
            s.id === sectionId ? { ...s, status } : s
          );

          // Auto-unlock next section when completing
          if (status === "completed") {
            const idx = sections.findIndex((s) => s.id === sectionId);
            if (idx >= 0 && idx < sections.length - 1) {
              const next = sections[idx + 1];
              if (next.status === "locked") {
                sections[idx + 1] = { ...next, status: "active" };
              }
            }
          }

          return {
            pathways: {
              ...state.pathways,
              [langId]: { ...pathway, sections },
            },
          };
        });
      },

      addBenchmarkResult: (result) => {
        set((state) => ({
          benchmarkResults: {
            ...state.benchmarkResults,
            [result.sectionId]: result,
          },
        }));
      },

      addChatMessage: (msg) => {
        set((state) => ({
          chatHistory: [...state.chatHistory, msg],
        }));
      },

      setIsGenerating: (v) => set({ isGenerating: v }),
      setIntroPlayed: () => set({ introPlayed: true }),

      clearPathways: () => {
        set({
          pathways: {},
          benchmarkResults: {},
          chatHistory: [],
          isGenerating: false,
          introPlayed: false,
        });
      },

      getActiveSection: (langId) => {
        const pathway = get().pathways[langId];
        if (!pathway) return null;
        return pathway.sections.find((s) => s.status === "active") ?? null;
      },

      getSectionProgress: (langId) => {
        const pathway = get().pathways[langId];
        if (!pathway) return { completed: 0, total: 0 };
        const completed = pathway.sections.filter(
          (s) => s.status === "completed"
        ).length;
        return { completed, total: pathway.sections.length };
      },
    }),
    {
      name: "zaytuna-pathway",
      partialize: (state) => ({
        pathways: state.pathways,
        benchmarkResults: state.benchmarkResults,
        chatHistory: state.chatHistory,
        introPlayed: state.introPlayed,
      }),
    }
  )
);
