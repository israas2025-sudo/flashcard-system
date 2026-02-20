/**
 * Pause/Resume Module
 *
 * Provides card suspension management for the multilingual flashcard
 * application. Supports manual pause, timed pause, skip-until-tomorrow
 * ("bury"), batch operations by tag/deck, and automatic leech detection.
 */

export { PauseService } from './pause-service';

export type {
  PausedCardInfo,
  PausedCardGroup,
  PausedBySource,
  LeechConfig,
  BatchPauseResult,
} from './types';
