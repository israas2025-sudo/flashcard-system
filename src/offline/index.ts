/**
 * index.ts -- Barrel export for the offline module.
 *
 * Re-exports all public types, classes, and constants from the offline
 * queue subsystem so consumers can import from a single entry point:
 *
 * ```typescript
 * import {
 *   OfflineQueueService,
 *   DEFAULT_OFFLINE_CONFIG,
 * } from './offline';
 * ```
 */

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export {
  OfflineQueueService,
  DEFAULT_OFFLINE_CONFIG,
} from './offline-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  QueuedAction,
  ActionType,
  OfflineEntityType,
  SyncStatus,
  OfflineConfig,
  ConflictResolution,
  OfflineSyncResult,
  SyncError,
} from './types';
