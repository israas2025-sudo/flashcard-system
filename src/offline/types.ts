/**
 * types.ts -- Type definitions for the offline queue and sync module.
 *
 * Covers queued actions, sync status tracking, offline configuration,
 * and conflict resolution strategies. These types are shared across
 * the offline queue service and any background sync workers.
 */

// ---------------------------------------------------------------------------
// Queued Action
// ---------------------------------------------------------------------------

/**
 * The type of mutation that was performed offline.
 */
export type ActionType = 'create' | 'update' | 'delete';

/**
 * The entity type that the offline action targets.
 */
export type OfflineEntityType = 'card' | 'note' | 'review';

/**
 * A single action queued for later sync when the device is offline.
 *
 * Actions are persisted in IndexedDB and processed in FIFO order
 * once connectivity is restored. Each action carries enough data
 * to replay the mutation against the server.
 */
export interface QueuedAction {
  /** Unique identifier for this queued action (UUID v4). */
  id: string;

  /** The kind of mutation: create, update, or delete. */
  type: ActionType;

  /** Which entity type this action targets. */
  entity: OfflineEntityType;

  /** The full payload needed to replay this action on the server. */
  data: Record<string, unknown>;

  /** ISO timestamp when the action was originally performed offline. */
  timestamp: string;

  /**
   * Number of times this action has been retried.
   *
   * Incremented on each failed sync attempt. Actions exceeding the
   * maximum retry count are moved to a dead-letter queue or discarded,
   * depending on the configured conflict resolution strategy.
   */
  retryCount: number;

  /** Optional error message from the last failed sync attempt. */
  lastError?: string;

  /** The status of this queued action. */
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

// ---------------------------------------------------------------------------
// Sync Status
// ---------------------------------------------------------------------------

/**
 * The current state of the offline sync pipeline.
 *
 * Displayed in the UI to inform the user whether their changes
 * have been synced, are pending, or encountered errors.
 */
export interface SyncStatus {
  /** Whether the device currently has network connectivity. */
  isOnline: boolean;

  /** Whether a sync operation is currently in progress. */
  isSyncing: boolean;

  /** Number of actions still waiting in the queue. */
  pendingActions: number;

  /** Number of actions that failed and are awaiting retry. */
  failedActions: number;

  /** ISO timestamp of the last successful sync, or null if never synced. */
  lastSyncAt: string | null;

  /** Human-readable error message if the last sync failed. */
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Offline Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration options for the offline queue and sync behaviour.
 */
export interface OfflineConfig {
  /**
   * Maximum number of retry attempts before an action is considered
   * permanently failed. Default: 5.
   */
  maxRetries: number;

  /**
   * Base delay in milliseconds between retry attempts.
   * Exponential backoff is applied: delay = baseRetryDelay * 2^retryCount.
   * Default: 1000.
   */
  baseRetryDelayMs: number;

  /**
   * Maximum delay in milliseconds between retries (cap for exponential backoff).
   * Default: 60000 (1 minute).
   */
  maxRetryDelayMs: number;

  /**
   * Number of actions to process in a single sync batch.
   * Default: 10.
   */
  batchSize: number;

  /**
   * Name of the IndexedDB database used for offline storage.
   * Default: 'flashcard-offline-queue'.
   */
  dbName: string;

  /**
   * Name of the IndexedDB object store for queued actions.
   * Default: 'actions'.
   */
  storeName: string;

  /**
   * The conflict resolution strategy to use when server and local
   * state diverge. Default: 'client-wins'.
   */
  conflictResolution: ConflictResolution;
}

// ---------------------------------------------------------------------------
// Conflict Resolution
// ---------------------------------------------------------------------------

/**
 * Strategy for resolving conflicts when offline actions clash with
 * server-side state.
 *
 * - 'client-wins': The offline action always overwrites the server state.
 *   Simple but may lose concurrent edits from other devices.
 *
 * - 'server-wins': The server state is preserved and the offline action
 *   is discarded. The user is notified of the conflict.
 *
 * - 'last-write-wins': The action with the most recent timestamp wins,
 *   regardless of whether it originated from the client or server.
 *
 * - 'manual': Conflicts are flagged for manual resolution by the user.
 *   The action stays in the queue until the user chooses a resolution.
 */
export type ConflictResolution =
  | 'client-wins'
  | 'server-wins'
  | 'last-write-wins'
  | 'manual';

// ---------------------------------------------------------------------------
// Sync Result
// ---------------------------------------------------------------------------

/**
 * Result of processing the offline queue against the server.
 */
export interface OfflineSyncResult {
  /** Number of actions successfully synced. */
  synced: number;

  /** Number of actions that failed during this sync attempt. */
  failed: number;

  /** Number of conflicts encountered. */
  conflicts: number;

  /** Number of actions still remaining in the queue. */
  remaining: number;

  /** Details of any errors encountered. */
  errors: SyncError[];
}

/**
 * Details about a single sync error.
 */
export interface SyncError {
  /** The ID of the action that failed. */
  actionId: string;

  /** Human-readable error message. */
  message: string;

  /** HTTP status code if the error came from the server. */
  statusCode?: number;

  /** Whether this error is retryable. */
  retryable: boolean;
}
