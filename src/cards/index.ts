/**
 * Cards Module — Barrel Export
 *
 * Re-exports all card management services and types from a single entry point.
 *
 * Usage:
 *   import {
 *     CardManagementService,
 *     TimerService,
 *     AudioService,
 *     UndoService,
 *     type CardInfo,
 *     type LeechResult,
 *     type UndoEntry,
 *   } from '../cards';
 */

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export { CardManagementService } from './card-management';
export { TimerService } from './timer-service';
export { AudioService } from './audio-service';
export { UndoService } from './undo-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  // Card Info (Section 1.10)
  CardInfo,
  PreviousCardInfo,

  // Leech (Section 1.6)
  LeechResult,

  // Undo (Section 1.10)
  UndoEntry,
  UndoResult,

  // Core models
  Note,
  Card,
  CopyNoteResult,

  // Audio
  AudioConfig,
  RecordingState,

  // Timer
  TimerDisplay,
} from './types';
