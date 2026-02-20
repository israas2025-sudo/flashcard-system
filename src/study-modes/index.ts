/**
 * index.ts -- Barrel export for all study mode services and types.
 */

// Types
export {
  StudyMode,
  STUDY_MODES,
  type StudyModeInfo,
  type QuizOption,
  type QuizState,
  type TTSLanguage,
  type ListeningState,
  type CheckOptions,
  type CheckResult,
  type DiffResult,
  type WritingState,
  type SpeedTimerDuration,
  type SpeedRoundConfig,
  type SpeedRoundState,
  type SpeedRoundStats,
  type Scenario,
  type WordBankItem,
  type ConversationState,
  type CardInfoData,
  type ReviewHistoryEntry,
  type UndoAction,
  type StudyModeSession,
} from './types';

// Services
export { QuizGenerator } from './quiz-generator';
export { TTSService } from './tts-service';
export { AnswerChecker } from './answer-checker';
export { ScenarioGenerator } from './scenario-generator';
