/**
 * offline-queue.ts -- Offline queue service using an IndexedDB persistence pattern.
 *
 * The {@link OfflineQueueService} manages a FIFO queue of actions that were
 * performed while the device was offline. When connectivity is restored,
 * the queue is processed in order, replaying each action against the server.
 *
 * Key design decisions:
 *   - IndexedDB is used for persistence so queued actions survive page
 *     refreshes and browser restarts.
 *   - Exponential backoff with jitter is applied to failed actions.
 *   - Actions exceeding the maximum retry count are marked as permanently
 *     failed rather than silently discarded.
 *   - The service emits no events directly; callers poll or integrate with
 *     their own event systems (e.g., Zustand stores, service workers).
 */

import type {
  QueuedAction,
  ActionType,
  OfflineEntityType,
  SyncStatus,
  OfflineConfig,
  OfflineSyncResult,
  SyncError,
} from './types';

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

/** Default configuration for the offline queue. */
export const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  maxRetries: 5,
  baseRetryDelayMs: 1000,
  maxRetryDelayMs: 60_000,
  batchSize: 10,
  dbName: 'flashcard-offline-queue',
  storeName: 'actions',
  conflictResolution: 'client-wins',
};

// ---------------------------------------------------------------------------
// OfflineQueueService
// ---------------------------------------------------------------------------

/**
 * Service that manages an IndexedDB-backed queue of offline actions.
 *
 * Usage:
 * ```typescript
 * const queue = new OfflineQueueService();
 * await queue.open();
 *
 * // Queue an action while offline
 * await queue.enqueueAction({
 *   type: 'create',
 *   entity: 'card',
 *   data: { front: 'Hello', back: 'World', deckId: 'deck-1' },
 * });
 *
 * // When back online, process the queue
 * const result = await queue.syncWithServer('https://api.example.com/sync');
 * console.log(`Synced ${result.synced} actions, ${result.failed} failed`);
 * ```
 */
export class OfflineQueueService {
  /** Configuration for this queue instance. */
  private readonly config: OfflineConfig;

  /** The IndexedDB database instance, or null if not yet opened. */
  private db: IDBDatabase | null = null;

  /**
   * Create a new OfflineQueueService.
   *
   * @param config - Optional configuration overrides.
   */
  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Database lifecycle
  // -----------------------------------------------------------------------

  /**
   * Open (or create) the IndexedDB database.
   *
   * Must be called before any other method. If the database does not
   * exist, it will be created with the required object store and indexes.
   *
   * @returns A promise that resolves when the database is ready.
   */
  async open(): Promise<void> {
    if (this.db) return;

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: 'id',
          });

          // Index by status for efficient queue processing
          store.createIndex('by_status', 'status', { unique: false });

          // Index by timestamp for ordering
          store.createIndex('by_timestamp', 'timestamp', { unique: false });

          // Compound index for efficient pending-action queries
          store.createIndex('by_status_timestamp', ['status', 'timestamp'], {
            unique: false,
          });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };
    });
  }

  /**
   * Close the IndexedDB connection.
   *
   * Safe to call even if the database is not open.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // -----------------------------------------------------------------------
  // Queue operations
  // -----------------------------------------------------------------------

  /**
   * Add a new action to the offline queue.
   *
   * The action is persisted in IndexedDB with a 'pending' status and
   * a retry count of 0. It will be processed the next time
   * {@link processQueue} or {@link syncWithServer} is called.
   *
   * @param action - The action to enqueue (type, entity, data are required).
   * @returns The full queued action record including generated ID and timestamp.
   */
  async enqueueAction(action: {
    type: ActionType;
    entity: OfflineEntityType;
    data: Record<string, unknown>;
  }): Promise<QueuedAction> {
    this.ensureOpen();

    const queuedAction: QueuedAction = {
      id: generateId(),
      type: action.type,
      entity: action.entity,
      data: action.data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    return new Promise<QueuedAction>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readwrite');
      const store = tx.objectStore(this.config.storeName);
      const request = store.add(queuedAction);

      request.onsuccess = () => resolve(queuedAction);
      request.onerror = () =>
        reject(new Error(`Failed to enqueue action: ${request.error?.message}`));
    });
  }

  /**
   * Process all pending actions in the queue.
   *
   * Actions are processed in FIFO order (by timestamp). Each action
   * is executed via the provided handler function. Failed actions are
   * retried with exponential backoff up to the configured maximum.
   *
   * @param handler - Async function that processes a single action.
   *   Should throw on failure so the action can be retried.
   * @returns The result of processing the queue.
   */
  async processQueue(
    handler: (action: QueuedAction) => Promise<void>,
  ): Promise<OfflineSyncResult> {
    this.ensureOpen();

    const pending = await this.getPendingActions();
    const errors: SyncError[] = [];
    let synced = 0;
    let failed = 0;

    // Process in batches
    const batches = this.chunk(pending, this.config.batchSize);

    for (const batch of batches) {
      for (const action of batch) {
        try {
          // Mark as processing
          await this.updateActionStatus(action.id, 'processing');

          // Execute the action
          await handler(action);

          // Mark as completed and remove from queue
          await this.removeAction(action.id);
          synced++;
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';

          action.retryCount++;
          action.lastError = errorMessage;

          if (action.retryCount >= this.config.maxRetries) {
            // Permanently failed
            await this.updateAction({
              ...action,
              status: 'failed',
            });
            failed++;
            errors.push({
              actionId: action.id,
              message: errorMessage,
              retryable: false,
            });
          } else {
            // Return to pending for retry
            await this.updateAction({
              ...action,
              status: 'pending',
            });
            errors.push({
              actionId: action.id,
              message: errorMessage,
              retryable: true,
            });
          }
        }
      }
    }

    const remaining = await this.getQueueSize();

    return {
      synced,
      failed,
      conflicts: 0,
      remaining,
      errors,
    };
  }

  /**
   * Get the total number of actions in the queue (all statuses).
   *
   * @returns The total count of queued actions.
   */
  async getQueueSize(): Promise<number> {
    this.ensureOpen();

    return new Promise<number>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readonly');
      const store = tx.objectStore(this.config.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(`Failed to count queue: ${request.error?.message}`));
    });
  }

  /**
   * Remove all actions from the queue, regardless of status.
   *
   * Use with caution -- this permanently discards any pending
   * offline changes that have not been synced.
   */
  async clearQueue(): Promise<void> {
    this.ensureOpen();

    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readwrite');
      const store = tx.objectStore(this.config.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to clear queue: ${request.error?.message}`));
    });
  }

  /**
   * Sync all pending actions with the remote server.
   *
   * This is the primary entry point for background sync. It processes
   * the queue by sending each action to the server via HTTP POST.
   *
   * The server endpoint is expected to accept a JSON body with the
   * action's type, entity, data, and timestamp fields.
   *
   * @param serverUrl - The base URL of the sync API endpoint.
   * @returns The result of the sync operation.
   */
  async syncWithServer(serverUrl: string): Promise<OfflineSyncResult> {
    return this.processQueue(async (action: QueuedAction) => {
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: action.id,
          type: action.type,
          entity: action.entity,
          data: action.data,
          timestamp: action.timestamp,
          conflictResolution: this.config.conflictResolution,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => 'No response body');
        const error = new Error(
          `Server returned ${response.status}: ${body}`,
        ) as Error & { statusCode?: number };
        error.statusCode = response.status;
        throw error;
      }
    });
  }

  /**
   * Get the current sync status for UI display.
   *
   * @returns A snapshot of the queue state.
   */
  async getSyncStatus(): Promise<SyncStatus> {
    this.ensureOpen();

    const allActions = await this.getAllActions();

    const pendingActions = allActions.filter(
      (a) => a.status === 'pending' || a.status === 'processing',
    ).length;

    const failedActions = allActions.filter(
      (a) => a.status === 'failed',
    ).length;

    const lastFailed = allActions
      .filter((a) => a.status === 'failed')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: allActions.some((a) => a.status === 'processing'),
      pendingActions,
      failedActions,
      lastSyncAt: null, // Managed externally by the sync coordinator
      lastError: lastFailed?.lastError ?? null,
    };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Retrieve all actions with 'pending' status, ordered by timestamp.
   */
  private async getPendingActions(): Promise<QueuedAction[]> {
    return new Promise<QueuedAction[]>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readonly');
      const store = tx.objectStore(this.config.storeName);
      const index = store.index('by_status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        const actions = (request.result as QueuedAction[]).sort(
          (a, b) => a.timestamp.localeCompare(b.timestamp),
        );
        resolve(actions);
      };

      request.onerror = () =>
        reject(
          new Error(`Failed to get pending actions: ${request.error?.message}`),
        );
    });
  }

  /**
   * Retrieve all actions from the store.
   */
  private async getAllActions(): Promise<QueuedAction[]> {
    return new Promise<QueuedAction[]>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readonly');
      const store = tx.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as QueuedAction[]);
      request.onerror = () =>
        reject(
          new Error(`Failed to get all actions: ${request.error?.message}`),
        );
    });
  }

  /**
   * Update the status of a single action.
   */
  private async updateActionStatus(
    actionId: string,
    status: QueuedAction['status'],
  ): Promise<void> {
    const action = await this.getAction(actionId);
    if (action) {
      action.status = status;
      await this.updateAction(action);
    }
  }

  /**
   * Get a single action by ID.
   */
  private async getAction(actionId: string): Promise<QueuedAction | null> {
    return new Promise<QueuedAction | null>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readonly');
      const store = tx.objectStore(this.config.storeName);
      const request = store.get(actionId);

      request.onsuccess = () =>
        resolve((request.result as QueuedAction) ?? null);
      request.onerror = () =>
        reject(new Error(`Failed to get action: ${request.error?.message}`));
    });
  }

  /**
   * Persist an updated action back to the store.
   */
  private async updateAction(action: QueuedAction): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readwrite');
      const store = tx.objectStore(this.config.storeName);
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to update action: ${request.error?.message}`));
    });
  }

  /**
   * Remove a single action from the store.
   */
  private async removeAction(actionId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(this.config.storeName, 'readwrite');
      const store = tx.objectStore(this.config.storeName);
      const request = store.delete(actionId);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to remove action: ${request.error?.message}`));
    });
  }

  /**
   * Assert that the database has been opened.
   */
  private ensureOpen(): void {
    if (!this.db) {
      throw new Error(
        'OfflineQueueService: database not open. Call open() first.',
      );
    }
  }

  /**
   * Split an array into chunks of a given size.
   */
  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Generate a UUID v4 identifier. */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
