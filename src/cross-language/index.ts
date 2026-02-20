/**
 * index.ts -- Public API barrel for the cross-language features subsystem.
 *
 * Re-exports all services and types for Arabic root linking,
 * Fusha-Ammiya bridging, and cross-language study scheduling.
 */

// Services
export { RootLinkingService } from './root-linking';
export { FushaAmmiyaBridge } from './fusha-ammiya-bridge';
export { SmartScheduler } from './smart-scheduler';

// Extended interfaces from root-linking
export type {
  RootLinkResult,
  VocabCard,
  FormattedRootLink,
} from './root-linking';

// Extended interfaces from smart-scheduler
export type {
  PlannedSession,
  SessionStudyPlan,
} from './smart-scheduler';

// Types
export type {
  QuranReference,
  ClassicalArabicCard,
  EgyptianArabicCard,
  RootLink,
  RootIndexEntry,
  BridgeInfo,
  LanguagePriority,
  StudyPlan,
  StudyPlanCard,
  LanguageDistributionEntry,
} from './types';
