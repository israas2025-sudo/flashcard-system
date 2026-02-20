/**
 * Sync System — Public API
 *
 * Re-exports the sync service, conflict resolver, types, and SQL schema
 * for use by the rest of the application.
 */

export { SyncService } from './sync-service';
export { ConflictResolver } from './conflict-resolver';
export type { ConflictResolution } from './conflict-resolver';
export {
  SYNC_SCHEMA_SQL,
} from './types';
export type {
  SyncEntityType,
  SyncLogEntry,
  SyncMeta,
  SyncRecord,
  SyncChangeset,
  SyncConflict,
  SyncResult,
  SyncStatus,
} from './types';
