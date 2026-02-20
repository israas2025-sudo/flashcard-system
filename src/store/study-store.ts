import { create } from "zustand";

interface SessionStats {
  cardsReviewed: number;
  correctCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  streakDays: number;
  timeSpentSeconds: number;
  xpEarned: number;
}

interface StudyState {
  // Session state
  currentIndex: number;
  totalCards: number;
  isFlipped: boolean;
  isPaused: boolean;
  isSessionComplete: boolean;
  sessionStartTime: number | null;

  // Session stats
  sessionStats: SessionStats;

  // Actions
  startSession: (totalCards: number) => void;
  flipCard: () => void;
  rateCard: (rating: "again" | "hard" | "good" | "easy") => void;
  skipCard: () => void;
  togglePause: () => void;
  resetSession: () => void;
}

const initialStats: SessionStats = {
  cardsReviewed: 0,
  correctCount: 0,
  againCount: 0,
  hardCount: 0,
  goodCount: 0,
  easyCount: 0,
  streakDays: 5,
  timeSpentSeconds: 0,
  xpEarned: 0,
};

export const useStudyStore = create<StudyState>((set, get) => ({
  currentIndex: 0,
  totalCards: 0,
  isFlipped: false,
  isPaused: false,
  isSessionComplete: false,
  sessionStartTime: null,
  sessionStats: { ...initialStats },

  startSession: (totalCards: number) => {
    set({
      currentIndex: 0,
      totalCards,
      isFlipped: false,
      isPaused: false,
      isSessionComplete: false,
      sessionStartTime: Date.now(),
      sessionStats: { ...initialStats },
    });
  },

  flipCard: () => {
    const { isFlipped, isPaused } = get();
    if (isFlipped || isPaused) return;
    set({ isFlipped: true });
  },

  rateCard: (rating: "again" | "hard" | "good" | "easy") => {
    const { currentIndex, totalCards, isFlipped, isPaused, sessionStats, sessionStartTime } = get();
    if (!isFlipped || isPaused) return;

    const newStats = { ...sessionStats };
    newStats.cardsReviewed += 1;

    // XP calculation: again=2, hard=5, good=10, easy=15
    const xpMap: Record<string, number> = {
      again: 2,
      hard: 5,
      good: 10,
      easy: 15,
    };
    newStats.xpEarned += xpMap[rating];

    switch (rating) {
      case "again":
        newStats.againCount += 1;
        break;
      case "hard":
        newStats.hardCount += 1;
        break;
      case "good":
        newStats.goodCount += 1;
        newStats.correctCount += 1;
        break;
      case "easy":
        newStats.easyCount += 1;
        newStats.correctCount += 1;
        break;
    }

    // Calculate time spent
    if (sessionStartTime) {
      newStats.timeSpentSeconds = Math.floor(
        (Date.now() - sessionStartTime) / 1000
      );
    }

    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= totalCards;

    set({
      sessionStats: newStats,
      currentIndex: isComplete ? currentIndex : nextIndex,
      isFlipped: false,
      isSessionComplete: isComplete,
    });
  },

  skipCard: () => {
    const { currentIndex, totalCards, isPaused } = get();
    if (isPaused) return;

    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= totalCards;

    set({
      currentIndex: isComplete ? currentIndex : nextIndex,
      isFlipped: false,
      isSessionComplete: isComplete,
    });
  },

  togglePause: () => {
    set((state) => ({ isPaused: !state.isPaused }));
  },

  resetSession: () => {
    set({
      currentIndex: 0,
      isFlipped: false,
      isPaused: false,
      isSessionComplete: false,
      sessionStartTime: Date.now(),
      sessionStats: { ...initialStats },
    });
  },
}));
