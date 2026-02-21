import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewLog {
  id: string;
  cardId: string;
  language: string;
  rating: "again" | "hard" | "good" | "easy";
  timestamp: number; // ms since epoch
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  cardsReviewed: number;
  correctCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  timeSpentMinutes: number;
  languages: Record<string, number>; // language -> review count
}

interface ReviewStoreState {
  // All review logs (persisted)
  reviewLogs: ReviewLog[];

  // Streak tracking
  lastStudyDate: string | null; // YYYY-MM-DD
  streakDays: number;
  longestStreak: number;

  // Session timing
  sessionStartTime: number | null;

  // Actions
  logReview: (cardId: string, language: string, rating: "again" | "hard" | "good" | "easy") => void;
  startSessionTimer: () => void;
  endSessionTimer: () => void;

  // Computed helpers (call these from components)
  getTodayStats: () => DailyStats;
  getStatsForDate: (date: string) => DailyStats;
  getStatsForPeriod: (days: number) => DailyStats[];
  getLanguageStats: (language: string) => { reviewed: number; correct: number; accuracy: number };
  getTodayLanguageReviews: (language: string) => number;
  getTodayAccuracy: () => number;
  getWeekTotal: () => number;
  getHourlyBreakdown: () => { hour: number; reviewCount: number; averageAccuracy: number }[];
  getStreakCalendarData: (days: number) => { date: string; value: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

function isCorrect(rating: string): boolean {
  return rating === "good" || rating === "easy";
}

function buildDailyStats(logs: ReviewLog[], date: string, timeMinutes: number = 0): DailyStats {
  const dayLogs = logs.filter(
    (l) => new Date(l.timestamp).toISOString().split("T")[0] === date
  );

  const languages: Record<string, number> = {};
  let againCount = 0;
  let hardCount = 0;
  let goodCount = 0;
  let easyCount = 0;

  for (const log of dayLogs) {
    languages[log.language] = (languages[log.language] || 0) + 1;
    switch (log.rating) {
      case "again": againCount++; break;
      case "hard": hardCount++; break;
      case "good": goodCount++; break;
      case "easy": easyCount++; break;
    }
  }

  return {
    date,
    cardsReviewed: dayLogs.length,
    correctCount: goodCount + easyCount,
    againCount,
    hardCount,
    goodCount,
    easyCount,
    timeSpentMinutes: timeMinutes,
    languages,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReviewStore = create<ReviewStoreState>()(
  persist(
    (set, get) => ({
      reviewLogs: [],
      lastStudyDate: null,
      streakDays: 0,
      longestStreak: 0,
      sessionStartTime: null,

      logReview: (cardId, language, rating) => {
        const now = Date.now();
        const today = todayStr();
        const log: ReviewLog = {
          id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
          cardId,
          language,
          rating,
          timestamp: now,
        };

        const { lastStudyDate, streakDays, longestStreak } = get();

        // Streak logic
        let newStreak = streakDays;
        let newLongest = longestStreak;

        if (lastStudyDate !== today) {
          const yesterday = daysAgo(1);
          if (lastStudyDate === yesterday) {
            // Consecutive day — extend streak
            newStreak = streakDays + 1;
          } else if (lastStudyDate === null || lastStudyDate < yesterday) {
            // Streak broken — reset to 1
            newStreak = 1;
          }
          newLongest = Math.max(newLongest, newStreak);
        }

        set((state) => ({
          reviewLogs: [...state.reviewLogs, log],
          lastStudyDate: today,
          streakDays: newStreak,
          longestStreak: newLongest,
        }));
      },

      startSessionTimer: () => {
        set({ sessionStartTime: Date.now() });
      },

      endSessionTimer: () => {
        set({ sessionStartTime: null });
      },

      getTodayStats: () => {
        const { reviewLogs } = get();
        return buildDailyStats(reviewLogs, todayStr());
      },

      getStatsForDate: (date) => {
        const { reviewLogs } = get();
        return buildDailyStats(reviewLogs, date);
      },

      getStatsForPeriod: (days) => {
        const { reviewLogs } = get();
        const result: DailyStats[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = daysAgo(i);
          result.push(buildDailyStats(reviewLogs, date));
        }
        return result;
      },

      getLanguageStats: (language) => {
        const { reviewLogs } = get();
        const langLogs = reviewLogs.filter((l) => l.language === language);
        const correct = langLogs.filter((l) => isCorrect(l.rating)).length;
        return {
          reviewed: langLogs.length,
          correct,
          accuracy: langLogs.length > 0 ? Math.round((correct / langLogs.length) * 100) : 0,
        };
      },

      getTodayLanguageReviews: (language) => {
        const { reviewLogs } = get();
        const today = todayStr();
        return reviewLogs.filter(
          (l) =>
            l.language === language &&
            new Date(l.timestamp).toISOString().split("T")[0] === today
        ).length;
      },

      getTodayAccuracy: () => {
        const { reviewLogs } = get();
        const today = todayStr();
        const todayLogs = reviewLogs.filter(
          (l) => new Date(l.timestamp).toISOString().split("T")[0] === today
        );
        if (todayLogs.length === 0) return 0;
        const correct = todayLogs.filter((l) => isCorrect(l.rating)).length;
        return Math.round((correct / todayLogs.length) * 100);
      },

      getWeekTotal: () => {
        const { reviewLogs } = get();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return reviewLogs.filter((l) => l.timestamp >= weekAgo).length;
      },

      getHourlyBreakdown: () => {
        const { reviewLogs } = get();
        const hours = Array.from({ length: 24 }, (_, hour) => {
          const hourLogs = reviewLogs.filter(
            (l) => new Date(l.timestamp).getHours() === hour
          );
          const correct = hourLogs.filter((l) => isCorrect(l.rating)).length;
          return {
            hour,
            reviewCount: hourLogs.length,
            averageAccuracy:
              hourLogs.length > 0
                ? Math.round((correct / hourLogs.length) * 100)
                : 0,
          };
        });
        return hours;
      },

      getStreakCalendarData: (days) => {
        const { reviewLogs } = get();
        const result: { date: string; value: number }[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = daysAgo(i);
          const count = reviewLogs.filter(
            (l) => new Date(l.timestamp).toISOString().split("T")[0] === date
          ).length;
          result.push({ date, value: count });
        }
        return result;
      },
    }),
    {
      name: "flashcard-review-store",
      partialize: (state) => ({
        reviewLogs: state.reviewLogs,
        lastStudyDate: state.lastStudyDate,
        streakDays: state.streakDays,
        longestStreak: state.longestStreak,
      }),
    }
  )
);
