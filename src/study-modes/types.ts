/**
 * types.ts -- Shared types for all study modes in the flashcard system.
 *
 * Defines the study mode enum, per-mode configuration interfaces,
 * quiz options, answer checking, TTS, scenario generation, and
 * the unified StudyModeSession contract.
 */

import { Rating, Card, CardSchedulingData } from '@/scheduling/types';

// ---------------------------------------------------------------------------
// Study Mode Enum & Metadata
// ---------------------------------------------------------------------------

export enum StudyMode {
  StandardReview = 'standard-review',
  Quiz = 'quiz',
  Listening = 'listening',
  Writing = 'writing',
  SpeedRound = 'speed-round',
  Conversation = 'conversation',
}

export interface StudyModeInfo {
  id: StudyMode;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  accentColor: string; // Tailwind color class
  accentBg: string; // Background color class
  recommendedUse: string;
  shortcut: string; // Keyboard shortcut to enter mode
}

export const STUDY_MODES: StudyModeInfo[] = [
  {
    id: StudyMode.StandardReview,
    name: 'Standard Review',
    description: 'Classic spaced repetition with flip cards and FSRS scheduling.',
    icon: 'Layers',
    accentColor: 'text-primary-500',
    accentBg: 'bg-primary-50 dark:bg-primary-950/40',
    recommendedUse: 'Daily review sessions to maintain long-term retention',
    shortcut: '1',
  },
  {
    id: StudyMode.Quiz,
    name: 'Quiz Mode',
    description: 'Multiple-choice questions generated from your cards.',
    icon: 'ListChecks',
    accentColor: 'text-quran-500',
    accentBg: 'bg-quran-50 dark:bg-quran-950/40',
    recommendedUse: 'Test recognition and eliminate confusion between similar words',
    shortcut: '2',
  },
  {
    id: StudyMode.Listening,
    name: 'Listening Mode',
    description: 'Audio-first study. Hear the word, then identify or type it.',
    icon: 'Headphones',
    accentColor: 'text-arabic-500',
    accentBg: 'bg-arabic-50 dark:bg-arabic-950/40',
    recommendedUse: 'Improve pronunciation and listening comprehension',
    shortcut: '3',
  },
  {
    id: StudyMode.Writing,
    name: 'Writing Mode',
    description: 'Type the answer in the target language. Character-level feedback.',
    icon: 'PenLine',
    accentColor: 'text-spanish-500',
    accentBg: 'bg-spanish-50 dark:bg-spanish-950/40',
    recommendedUse: 'Practice spelling, diacritics, and active recall',
    shortcut: '4',
  },
  {
    id: StudyMode.SpeedRound,
    name: 'Speed Round',
    description: 'Race the clock! Quick binary judgments under time pressure.',
    icon: 'Zap',
    accentColor: 'text-red-500',
    accentBg: 'bg-red-50 dark:bg-red-950/40',
    recommendedUse: 'Build automaticity and fast recall for mature cards',
    shortcut: '5',
  },
  {
    id: StudyMode.Conversation,
    name: 'Conversation Mode',
    description: 'Build sentences from vocabulary in real-world scenarios.',
    icon: 'MessageCircle',
    accentColor: 'text-egyptian-500',
    accentBg: 'bg-egyptian-50 dark:bg-egyptian-950/40',
    recommendedUse: 'Practice using words in context and sentence construction',
    shortcut: '6',
  },
];

// ---------------------------------------------------------------------------
// Quiz Mode Types
// ---------------------------------------------------------------------------

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  cardId: string;
}

export interface QuizState {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  correctCount: number;
  incorrectCount: number;
  selectedOptionId: string | null;
  isAnswered: boolean;
  options: QuizOption[];
}

// ---------------------------------------------------------------------------
// Listening Mode Types
// ---------------------------------------------------------------------------

export type TTSLanguage = 'ar' | 'ar-EG' | 'es' | 'es-MX' | 'en' | 'en-US' | 'en-GB';

export interface ListeningState {
  isPlaying: boolean;
  isRevealed: boolean;
  userInput: string;
  playCount: number;
}

// ---------------------------------------------------------------------------
// Writing Mode Types
// ---------------------------------------------------------------------------

export interface CheckOptions {
  ignoreDiacritics?: boolean;
  ignoreCase?: boolean;
  closeThreshold?: number; // Levenshtein distance threshold for "close" match
}

export interface CheckResult {
  isCorrect: boolean;
  isClose: boolean;
  accuracy: number; // 0-1
  diff: DiffResult[];
  suggestedRating: Rating;
}

export interface DiffResult {
  char: string;
  status: 'correct' | 'wrong' | 'missing' | 'extra';
}

export interface WritingState {
  userAnswer: string;
  isSubmitted: boolean;
  checkResult: CheckResult | null;
}

// ---------------------------------------------------------------------------
// Speed Round Types
// ---------------------------------------------------------------------------

export type SpeedTimerDuration = 3 | 5 | 10;

export interface SpeedRoundConfig {
  timerSeconds: SpeedTimerDuration;
}

export interface SpeedRoundState {
  timeRemaining: number;
  isTimerRunning: boolean;
  correctStreak: number;
  longestStreak: number;
  cardsPerMinute: number;
  totalResponseTimeMs: number;
  responseTimes: number[];
}

export interface SpeedRoundStats {
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  avgResponseTimeMs: number;
  cardsPerMinute: number;
  longestStreak: number;
  accuracy: number;
}

// ---------------------------------------------------------------------------
// Conversation Mode Types
// ---------------------------------------------------------------------------

export interface Scenario {
  prompt: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  modelAnswer: string;
  modelAnswerTranslation: string;
  requiredVocabulary: string[];
}

export interface WordBankItem {
  id: string;
  word: string;
  translation: string;
  cardId: string;
  isUsed: boolean;
}

export interface ConversationState {
  scenario: Scenario | null;
  wordBank: WordBankItem[];
  builtSentence: string[];
  isRevealed: boolean;
  selfRating: Rating | null;
}

// ---------------------------------------------------------------------------
// Card Info (for swipe-down panel)
// ---------------------------------------------------------------------------

export interface CardInfoData {
  cardId: string;
  createdAt: Date;
  totalReviews: number;
  currentInterval: number;
  stability: number;
  difficulty: number;
  lapsesCount: number;
  tags: string[];
  reviewHistory: ReviewHistoryEntry[];
}

export interface ReviewHistoryEntry {
  date: Date;
  rating: Rating;
  intervalAfter: number;
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

export interface UndoAction {
  cardId: string;
  previousScheduling: CardSchedulingData;
  previousDue: Date;
  rating: Rating;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Study Mode Session (unified interface)
// ---------------------------------------------------------------------------

export interface StudyModeSession {
  mode: StudyMode;
  deckId: string;
  cards: Card[];
  currentIndex: number;
  startedAt: Date;
  isComplete: boolean;
}
