/**
 * Sync System Type Definitions
 *
 * Types for the USN (Update Sequence Number) based cloud sync system.
 * Each user-initiated change increments a local USN. On sync the client
 * and server compare USNs and exchange only the changed records.
 *
 * Conflict resolution follows a last-modification-wins strategy.
 * A full sync (one-way upload or download) is forced whenever the
 * database schema version changes.
 */

// ---------------------------------------------------------------------------
// Entity Types
// ---------------------------------------------------------------------------

/**
 * The set of entity types that participate in sync.
 */
export type SyncEntityType = 'note' | 'card' | 'deck' | 'tag' | 'note_type' | 'media';

// ---------------------------------------------------------------------------
// Sync Log Entry
// ---------------------------------------------------------------------------

/**
 * A single row in the sync_log table.
 * Records one mutation that must eventually be sent to the server.
 */
export interface SyncLogEntry {
  /** Primary key (UUID). */
  id: string;

  /** The user who made the change. */
  userId: string;

  /** Which entity type was changed. */
  entityType: SyncEntityType;

  /** The ID of the changed entity. */
  entityId: string;

  /** The kind of mutation. */
  changeType: 'create' | 'update' | 'delete';

  /** The local USN assigned to this change. */
  usn: number;

  /** When the change was recorded. */
  modifiedAt: Date;
}

// ---------------------------------------------------------------------------
// Sync Meta (per-user sync state)
// ---------------------------------------------------------------------------

/**
 * Persisted per-user metadata that tracks the sync state.
 * Stored in the `sync_meta` table (one row per user).
 */
export interface SyncMeta {
  /** The user this metadata belongs to. */
  userId: string;

  /** The highest USN that has been synced with the server. */
  lastSyncedUSN: number;

  /** The server USN at the time of the last successful sync. */
  serverUSN: number;

  /** Timestamp of the last successful sync (null if never synced). */
  lastSyncAt: Date | null;

  /** The schema version that was active during the last sync. */
  schemaVersion: number;

  /** Whether a sync is currently in progress. */
  isSyncing: boolean;
}

// ---------------------------------------------------------------------------
// Sync Record
// ---------------------------------------------------------------------------

/**
 * A single entity wrapped with its sync metadata.
 * Used inside a SyncChangeset to carry an entity and its USN.
 */
export interface SyncRecord<T> {
  /** The entity payload. */
  entity: T;

  /** The USN at which this entity was modified. */
  usn: number;

  /** Whether the entity was created or updated (deletes go in deletedIds). */
  changeType: 'create' | 'update';

  /** When the entity was last modified. */
  modifiedAt: Date;
}

// ---------------------------------------------------------------------------
// Sync Changeset
// ---------------------------------------------------------------------------

/**
 * A bundle of changes to be sent to or received from the server.
 * Contains all entity types in separate arrays, plus a list of
 * deleted entity references.
 *
 * The generic parameters are intentionally left as `any` compatible
 * so that this file does not need to import domain types.  The
 * service layer narrows the types when building and applying changesets.
 */
export interface SyncChangeset {
  /** The USN watermark of this changeset. */
  usn: number;

  /** Changed notes. */
  notes: SyncRecord<Record<string, unknown>>[];

  /** Changed cards. */
  cards: SyncRecord<Record<string, unknown>>[];

  /** Changed decks. */
  decks: SyncRecord<Record<string, unknown>>[];

  /** Changed tags. */
  tags: SyncRecord<Record<string, unknown>>[];

  /** Changed note types. */
  noteTypes: SyncRecord<Record<string, unknown>>[];

  /** IDs of deleted entities. */
  deletedIds: { entityType: SyncEntityType; entityId: string }[];
}

// ---------------------------------------------------------------------------
// Sync Conflict
// ---------------------------------------------------------------------------

/**
 * Describes a single conflict encountered during sync and how it was resolved.
 */
export interface SyncConflict {
  /** The type of entity that conflicted. */
  entityType: SyncEntityType;

  /** The ID of the conflicting entity. */
  entityId: string;

  /** Which side won the conflict. */
  resolution: 'local_wins' | 'remote_wins';

  /** When the local copy was last modified. */
  localModified: Date;

  /** When the remote copy was last modified. */
  remoteModified: Date;
}

// ---------------------------------------------------------------------------
// Sync Result
// ---------------------------------------------------------------------------

/**
 * The outcome of a sync operation (incremental or full).
 */
export interface SyncResult {
  /** Whether the sync completed without fatal errors. */
  success: boolean;

  /** Number of changes sent from local to server. */
  sentChanges: number;

  /** Number of changes received from server and applied locally. */
  receivedChanges: number;

  /** List of conflicts encountered (all resolved). */
  conflicts: SyncConflict[];

  /** The new local USN after the sync completes. */
  newUSN: number;
}

// ---------------------------------------------------------------------------
// Sync Status (UI-facing)
// ---------------------------------------------------------------------------

/**
 * A lightweight status object designed for display in the UI.
 */
export interface SyncStatus {
  /** Timestamp of the last successful sync, or null if never synced. */
  lastSyncAt: Date | null;

  /** Current local USN. */
  localUSN: number;

  /** Last-known server USN. */
  serverUSN: number;

  /** Number of local changes not yet synced. */
  pendingChanges: number;

  /** Whether a sync is currently running. */
  isSyncing: boolean;
}

// ---------------------------------------------------------------------------
// SQL Schema
// ---------------------------------------------------------------------------

/**
 * The SQL DDL statements required by the sync system.
 * Execute these during database setup / migration.
 */
export const SYNC_SCHEMA_SQL = `
-- =========================================================================
-- sync_log: tracks every local mutation for incremental sync
-- =========================================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type   VARCHAR(20) NOT NULL,
  entity_id     UUID        NOT NULL,
  change_type   VARCHAR(10) NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  usn           INTEGER     NOT NULL,
  modified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user_usn
  ON sync_log(user_id, usn);

CREATE INDEX IF NOT EXISTS idx_sync_log_user_entity
  ON sync_log(user_id, entity_type, entity_id);

-- =========================================================================
-- sync_meta: per-user sync state bookkeeping
-- =========================================================================
CREATE TABLE IF NOT EXISTS sync_meta (
  user_id         UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_synced_usn INTEGER     NOT NULL DEFAULT 0,
  server_usn      INTEGER     NOT NULL DEFAULT 0,
  last_sync_at    TIMESTAMPTZ DEFAULT NULL,
  schema_version  INTEGER     NOT NULL DEFAULT 1,
  is_syncing      BOOLEAN     NOT NULL DEFAULT FALSE
);
`;
