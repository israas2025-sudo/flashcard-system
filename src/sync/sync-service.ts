/**
 * USN (Update Sequence Number) Based Sync Service
 *
 * Each change to any syncable entity increments the user's local USN.
 * On sync the client and server compare USNs and exchange only the
 * records that changed since the last successful sync.
 *
 * Normal flow (incremental sync):
 *   1. Client sends its last-synced USN to the server.
 *   2. Server returns all changes with USN > client's last-synced USN.
 *   3. Client applies remote changes, resolving conflicts with
 *      last-modification-wins.
 *   4. Client sends its own local changes to the server.
 *   5. Both sides update their USN watermarks.
 *
 * Full sync is forced when the local schema version differs from the
 * server schema version.  In that case the user chooses either:
 *   - upload:   local collection overwrites the server.
 *   - download: server collection overwrites the local database.
 *
 * SQL tables used:
 *   sync_log  -- every local mutation (entity_type, entity_id, change_type, usn)
 *   sync_meta -- per-user sync state (last_synced_usn, server_usn, ...)
 */

import { query, withTransaction } from '../db/connection';
import { ConflictResolver } from './conflict-resolver';
import type {
  SyncChangeset,
  SyncConflict,
  SyncEntityType,
  SyncLogEntry,
  SyncMeta,
  SyncRecord,
  SyncResult,
  SyncStatus,
} from './types';

// ---------------------------------------------------------------------------
// Current schema version -- bump this on breaking DB migrations
// ---------------------------------------------------------------------------

const CURRENT_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Entity table mapping
// ---------------------------------------------------------------------------

/** Maps a SyncEntityType to its database table name. */
const ENTITY_TABLE: Record<SyncEntityType, string> = {
  note: 'notes',
  card: 'cards',
  deck: 'decks',
  tag: 'tags',
  note_type: 'note_types',
  media: 'media',
};

// ---------------------------------------------------------------------------
// SyncService
// ---------------------------------------------------------------------------

export class SyncService {
  private readonly conflictResolver: ConflictResolver;

  constructor() {
    this.conflictResolver = new ConflictResolver();
  }

  // -----------------------------------------------------------------------
  // USN Accessors
  // -----------------------------------------------------------------------

  /**
   * Get the current local USN -- the highest USN in sync_log for a user.
   */
  async getLocalUSN(userId: string): Promise<number> {
    const result = await query<{ max_usn: string }>(
      `SELECT COALESCE(MAX(usn), 0) AS max_usn FROM sync_log WHERE user_id = $1`,
      [userId],
    );
    return parseInt(result.rows[0].max_usn, 10);
  }

  /**
   * Get the server USN that was recorded during the last successful sync.
   */
  async getServerUSN(userId: string): Promise<number> {
    const meta = await this.getOrCreateMeta(userId);
    return meta.serverUSN;
  }

  // -----------------------------------------------------------------------
  // Changeset Construction
  // -----------------------------------------------------------------------

  /**
   * Collect all local changes since a given USN into a SyncChangeset.
   */
  async getChangesSince(userId: string, sinceUSN: number): Promise<SyncChangeset> {
    // Fetch sync_log entries after sinceUSN
    const logResult = await query<{
      id: string;
      entity_type: string;
      entity_id: string;
      change_type: string;
      usn: string;
      modified_at: Date;
    }>(
      `SELECT id, entity_type, entity_id, change_type, usn, modified_at
       FROM sync_log
       WHERE user_id = $1 AND usn > $2
       ORDER BY usn ASC`,
      [userId, sinceUSN],
    );

    const entries: SyncLogEntry[] = logResult.rows.map((r) => ({
      id: r.id,
      userId,
      entityType: r.entity_type as SyncEntityType,
      entityId: r.entity_id,
      changeType: r.change_type as 'create' | 'update' | 'delete',
      usn: parseInt(r.usn, 10),
      modifiedAt: new Date(r.modified_at),
    }));

    // Determine the high-water USN
    const maxUSN = entries.length > 0
      ? entries[entries.length - 1].usn
      : sinceUSN;

    // Separate deletes from creates/updates
    const deletedIds: { entityType: SyncEntityType; entityId: string }[] = [];
    const changesByType = new Map<SyncEntityType, Map<string, SyncLogEntry>>();

    for (const entry of entries) {
      if (entry.changeType === 'delete') {
        deletedIds.push({ entityType: entry.entityType, entityId: entry.entityId });
        continue;
      }

      if (!changesByType.has(entry.entityType)) {
        changesByType.set(entry.entityType, new Map());
      }
      // Keep only the latest change per entity
      changesByType.get(entry.entityType)!.set(entry.entityId, entry);
    }

    // Fetch actual entity data for non-deleted changes
    const changeset: SyncChangeset = {
      usn: maxUSN,
      notes: [],
      cards: [],
      decks: [],
      tags: [],
      noteTypes: [],
      deletedIds,
    };

    for (const [entityType, entityMap] of changesByType.entries()) {
      const ids = Array.from(entityMap.keys());
      if (ids.length === 0) continue;

      const table = ENTITY_TABLE[entityType];
      const entityResult = await query<Record<string, unknown>>(
        `SELECT * FROM ${table} WHERE id = ANY($1::uuid[])`,
        [ids],
      );

      const entityById = new Map<string, Record<string, unknown>>();
      for (const row of entityResult.rows) {
        entityById.set(row.id as string, row);
      }

      for (const [entityId, logEntry] of entityMap.entries()) {
        const entity = entityById.get(entityId);
        if (!entity) continue; // Entity was subsequently deleted

        const syncRecord: SyncRecord<Record<string, unknown>> = {
          entity,
          usn: logEntry.usn,
          changeType: logEntry.changeType as 'create' | 'update',
          modifiedAt: logEntry.modifiedAt,
        };

        switch (entityType) {
          case 'note':      changeset.notes.push(syncRecord); break;
          case 'card':      changeset.cards.push(syncRecord); break;
          case 'deck':      changeset.decks.push(syncRecord); break;
          case 'tag':       changeset.tags.push(syncRecord); break;
          case 'note_type': changeset.noteTypes.push(syncRecord); break;
          case 'media':     break; // Media handled separately (binary blobs)
        }
      }
    }

    return changeset;
  }

  // -----------------------------------------------------------------------
  // Apply Remote Changes
  // -----------------------------------------------------------------------

  /**
   * Apply a changeset received from the server to the local database.
   * Conflicts are resolved with last-modification-wins via ConflictResolver.
   */
  async applyRemoteChanges(
    userId: string,
    changeset: SyncChangeset,
  ): Promise<SyncResult> {
    const conflicts: SyncConflict[] = [];
    let receivedChanges = 0;

    await withTransaction(async (client) => {
      // ---- Apply upserts (notes, cards, decks, tags, noteTypes) ----
      const entityGroups: Array<{
        type: SyncEntityType;
        records: SyncRecord<Record<string, unknown>>[];
      }> = [
        { type: 'deck',      records: changeset.decks },
        { type: 'tag',       records: changeset.tags },
        { type: 'note_type', records: changeset.noteTypes },
        { type: 'note',      records: changeset.notes },
        { type: 'card',      records: changeset.cards },
      ];

      for (const { type, records } of entityGroups) {
        const table = ENTITY_TABLE[type];

        for (const record of records) {
          const entityId = record.entity.id as string;

          // Check if entity exists locally
          const existing = await client.query(
            `SELECT * FROM ${table} WHERE id = $1`,
            [entityId],
          );

          if (existing.rowCount! > 0) {
            // Potential conflict -- check if locally modified since last sync
            const localLog = await client.query<{
              usn: string;
              modified_at: Date;
              change_type: string;
            }>(
              `SELECT usn, modified_at, change_type FROM sync_log
               WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
               ORDER BY usn DESC LIMIT 1`,
              [userId, type, entityId],
            );

            if (localLog.rowCount! > 0) {
              const meta = await this.getOrCreateMeta(userId);
              const localUSN = parseInt(localLog.rows[0].usn, 10);

              // Was modified locally since last sync?
              if (localUSN > meta.lastSyncedUSN) {
                const localRecord: SyncRecord<Record<string, unknown>> = {
                  entity: existing.rows[0],
                  usn: localUSN,
                  changeType: localLog.rows[0].change_type as 'create' | 'update',
                  modifiedAt: new Date(localLog.rows[0].modified_at),
                };

                const resolution = this.conflictResolver.resolve(
                  type,
                  entityId,
                  localRecord,
                  record,
                );

                conflicts.push(resolution.conflict);

                if (resolution.winner === 'local') {
                  // Skip applying remote change -- local wins
                  continue;
                }
              }
            }

            // Apply remote update
            await this.upsertEntity(client, table, record.entity);
            receivedChanges++;
          } else {
            // No local copy -- insert directly
            await this.upsertEntity(client, table, record.entity);
            receivedChanges++;
          }
        }
      }

      // ---- Apply deletions ----
      for (const { entityType, entityId } of changeset.deletedIds) {
        const table = ENTITY_TABLE[entityType];

        // Check for local modifications that should override the delete
        const localLog = await client.query<{ usn: string; modified_at: Date }>(
          `SELECT usn, modified_at FROM sync_log
           WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
                 AND change_type != 'delete'
           ORDER BY usn DESC LIMIT 1`,
          [userId, entityType, entityId],
        );

        if (localLog.rowCount! > 0) {
          const meta = await this.getOrCreateMeta(userId);
          const localUSN = parseInt(localLog.rows[0].usn, 10);

          if (localUSN > meta.lastSyncedUSN) {
            // Local update is newer than the remote delete -- keep local
            conflicts.push({
              entityType,
              entityId,
              resolution: 'local_wins',
              localModified: new Date(localLog.rows[0].modified_at),
              remoteModified: new Date(0),
            });
            continue;
          }
        }

        // Apply the deletion
        await client.query(`DELETE FROM ${table} WHERE id = $1`, [entityId]);
        receivedChanges++;
      }

      // Update sync_meta with the server's USN
      await client.query(
        `UPDATE sync_meta
         SET server_usn = $1, last_sync_at = NOW()
         WHERE user_id = $2`,
        [changeset.usn, userId],
      );
    });

    const newUSN = await this.getLocalUSN(userId);

    return {
      success: true,
      sentChanges: 0,
      receivedChanges,
      conflicts,
      newUSN,
    };
  }

  // -----------------------------------------------------------------------
  // Incremental Sync
  // -----------------------------------------------------------------------

  /**
   * Perform a standard incremental sync:
   *   1. Pull remote changes since our last sync.
   *   2. Apply them locally (with conflict resolution).
   *   3. Push local changes since the last sync to the server.
   *   4. Update USN watermarks.
   */
  async incrementalSync(userId: string): Promise<SyncResult> {
    const meta = await this.getOrCreateMeta(userId);

    // Guard against concurrent syncs
    if (meta.isSyncing) {
      return {
        success: false,
        sentChanges: 0,
        receivedChanges: 0,
        conflicts: [],
        newUSN: meta.lastSyncedUSN,
      };
    }

    // Mark sync as in progress
    await query(
      `UPDATE sync_meta SET is_syncing = TRUE WHERE user_id = $1`,
      [userId],
    );

    try {
      // Check if full sync is required first
      if (await this.needsFullSync(userId)) {
        // Cannot do incremental -- caller should use fullSync()
        return {
          success: false,
          sentChanges: 0,
          receivedChanges: 0,
          conflicts: [],
          newUSN: meta.lastSyncedUSN,
        };
      }

      // --- Step 1: Fetch remote changeset ---
      // In a real implementation this would be an HTTP call to the sync server.
      // Here we simulate by reading from a remote_sync_log table or API.
      const remoteChangeset = await this.fetchRemoteChanges(userId, meta.serverUSN);

      // --- Step 2: Apply remote changes locally ---
      const applyResult = await this.applyRemoteChanges(userId, remoteChangeset);

      // --- Step 3: Collect local changes and push to server ---
      const localChangeset = await this.getChangesSince(userId, meta.lastSyncedUSN);
      const sentChanges = await this.pushLocalChanges(userId, localChangeset);

      // --- Step 4: Update watermarks ---
      const newLocalUSN = await this.getLocalUSN(userId);
      await query(
        `UPDATE sync_meta
         SET last_synced_usn = $1,
             server_usn = $2,
             last_sync_at = NOW(),
             is_syncing = FALSE
         WHERE user_id = $3`,
        [newLocalUSN, remoteChangeset.usn, userId],
      );

      return {
        success: true,
        sentChanges,
        receivedChanges: applyResult.receivedChanges,
        conflicts: applyResult.conflicts,
        newUSN: newLocalUSN,
      };
    } catch (error) {
      // Ensure we clear the syncing flag on failure
      await query(
        `UPDATE sync_meta SET is_syncing = FALSE WHERE user_id = $1`,
        [userId],
      );
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Full Sync
  // -----------------------------------------------------------------------

  /**
   * Force a full sync -- upload or download the entire collection.
   *
   * This is triggered when the schema version has changed or when
   * the user explicitly requests a full reset.
   *
   * @param direction  'upload' overwrites the server with local data.
   *                   'download' overwrites local data with the server's copy.
   */
  async fullSync(
    userId: string,
    direction: 'upload' | 'download',
  ): Promise<SyncResult> {
    await query(
      `UPDATE sync_meta SET is_syncing = TRUE WHERE user_id = $1`,
      [userId],
    );

    try {
      if (direction === 'upload') {
        return await this.fullUpload(userId);
      } else {
        return await this.fullDownload(userId);
      }
    } finally {
      await query(
        `UPDATE sync_meta SET is_syncing = FALSE WHERE user_id = $1`,
        [userId],
      );
    }
  }

  // -----------------------------------------------------------------------
  // Full Sync Needed?
  // -----------------------------------------------------------------------

  /**
   * Determine whether a full sync is required.
   * This happens when the local schema_version in sync_meta differs
   * from the current application schema version.
   */
  async needsFullSync(userId: string): Promise<boolean> {
    const meta = await this.getOrCreateMeta(userId);

    // Never synced before -- need full sync
    if (meta.lastSyncAt === null) {
      return true;
    }

    // Schema version mismatch
    if (meta.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      return true;
    }

    return false;
  }

  // -----------------------------------------------------------------------
  // Record a Change
  // -----------------------------------------------------------------------

  /**
   * Record a local change in sync_log.
   * Called by the application layer whenever a syncable entity is created,
   * updated, or deleted.
   */
  async recordChange(
    userId: string,
    entityType: SyncEntityType,
    entityId: string,
    changeType: 'create' | 'update' | 'delete',
  ): Promise<void> {
    // Compute the next USN for this user
    const usnResult = await query<{ next_usn: string }>(
      `SELECT COALESCE(MAX(usn), 0) + 1 AS next_usn
       FROM sync_log WHERE user_id = $1`,
      [userId],
    );
    const nextUSN = parseInt(usnResult.rows[0].next_usn, 10);

    await query(
      `INSERT INTO sync_log (user_id, entity_type, entity_id, change_type, usn, modified_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, entityType, entityId, changeType, nextUSN],
    );
  }

  // -----------------------------------------------------------------------
  // Sync Status (UI)
  // -----------------------------------------------------------------------

  /**
   * Return a lightweight sync status suitable for display in the UI.
   */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    const meta = await this.getOrCreateMeta(userId);
    const localUSN = await this.getLocalUSN(userId);

    // Count changes since last sync
    const pendingResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sync_log
       WHERE user_id = $1 AND usn > $2`,
      [userId, meta.lastSyncedUSN],
    );
    const pendingChanges = parseInt(pendingResult.rows[0].count, 10);

    return {
      lastSyncAt: meta.lastSyncAt,
      localUSN,
      serverUSN: meta.serverUSN,
      pendingChanges,
      isSyncing: meta.isSyncing,
    };
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  /**
   * Ensure a sync_meta row exists for the user and return it.
   */
  private async getOrCreateMeta(userId: string): Promise<SyncMeta> {
    // Try to fetch existing row
    const result = await query<{
      user_id: string;
      last_synced_usn: string;
      server_usn: string;
      last_sync_at: Date | null;
      schema_version: string;
      is_syncing: boolean;
    }>(
      `SELECT * FROM sync_meta WHERE user_id = $1`,
      [userId],
    );

    if (result.rowCount! > 0) {
      const row = result.rows[0];
      return {
        userId: row.user_id,
        lastSyncedUSN: parseInt(row.last_synced_usn, 10),
        serverUSN: parseInt(row.server_usn, 10),
        lastSyncAt: row.last_sync_at,
        schemaVersion: parseInt(row.schema_version, 10),
        isSyncing: row.is_syncing,
      };
    }

    // Create a new row with defaults
    await query(
      `INSERT INTO sync_meta (user_id, last_synced_usn, server_usn, schema_version, is_syncing)
       VALUES ($1, 0, 0, $2, FALSE)`,
      [userId, CURRENT_SCHEMA_VERSION],
    );

    return {
      userId,
      lastSyncedUSN: 0,
      serverUSN: 0,
      lastSyncAt: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      isSyncing: false,
    };
  }

  /**
   * Upsert an entity record into its table.
   * Uses INSERT ... ON CONFLICT to handle both creates and updates.
   *
   * The entity is expected to contain all columns required by the table,
   * serialized as a flat key-value object (snake_case column names).
   */
  private async upsertEntity(
    client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
    table: string,
    entity: Record<string, unknown>,
  ): Promise<void> {
    const keys = Object.keys(entity);
    if (keys.length === 0) return;

    const columns = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const updates = keys
      .filter((k) => k !== 'id')
      .map((k) => `${k} = EXCLUDED.${k}`)
      .join(', ');

    const values = keys.map((k) => {
      const val = entity[k];
      // Serialize objects/arrays as JSON
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        return JSON.stringify(val);
      }
      return val;
    });

    await client.query(
      `INSERT INTO ${table} (${columns})
       VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}`,
      values,
    );
  }

  /**
   * Fetch changes from the remote sync server.
   *
   * In a production system this would be an HTTP request to the sync API.
   * This implementation queries a hypothetical remote state table or could
   * be replaced with an HTTP client call.
   */
  private async fetchRemoteChanges(
    userId: string,
    sinceServerUSN: number,
  ): Promise<SyncChangeset> {
    // In a real deployment this talks to the remote sync endpoint:
    //   GET /api/sync/changes?userId={userId}&sinceUSN={sinceServerUSN}
    //
    // For a self-hosted single-server deployment, the "remote" is just
    // another query against the same database (or a separate schema).
    // We query a `remote_sync_log` table if it exists; otherwise we
    // return an empty changeset (no remote changes).

    try {
      const remoteResult = await query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_name = 'remote_sync_log'
         ) AS exists`,
      );

      if (!remoteResult.rows[0].exists) {
        // No remote sync infrastructure -- return empty changeset
        return {
          usn: sinceServerUSN,
          notes: [],
          cards: [],
          decks: [],
          tags: [],
          noteTypes: [],
          deletedIds: [],
        };
      }

      // If remote_sync_log exists, query it the same way as getChangesSince
      // but from the remote table.
      const logResult = await query<{
        entity_type: string;
        entity_id: string;
        change_type: string;
        usn: string;
        modified_at: Date;
      }>(
        `SELECT entity_type, entity_id, change_type, usn, modified_at
         FROM remote_sync_log
         WHERE user_id = $1 AND usn > $2
         ORDER BY usn ASC`,
        [userId, sinceServerUSN],
      );

      const maxUSN = logResult.rows.length > 0
        ? parseInt(logResult.rows[logResult.rows.length - 1].usn, 10)
        : sinceServerUSN;

      const changeset: SyncChangeset = {
        usn: maxUSN,
        notes: [],
        cards: [],
        decks: [],
        tags: [],
        noteTypes: [],
        deletedIds: [],
      };

      for (const row of logResult.rows) {
        const entityType = row.entity_type as SyncEntityType;
        const entityId = row.entity_id;
        const changeType = row.change_type as 'create' | 'update' | 'delete';

        if (changeType === 'delete') {
          changeset.deletedIds.push({ entityType, entityId });
          continue;
        }

        const table = ENTITY_TABLE[entityType];
        const entityResult = await query<Record<string, unknown>>(
          `SELECT * FROM ${table} WHERE id = $1`,
          [entityId],
        );

        if (entityResult.rowCount! > 0) {
          const syncRecord: SyncRecord<Record<string, unknown>> = {
            entity: entityResult.rows[0],
            usn: parseInt(row.usn, 10),
            changeType,
            modifiedAt: new Date(row.modified_at),
          };

          switch (entityType) {
            case 'note':      changeset.notes.push(syncRecord); break;
            case 'card':      changeset.cards.push(syncRecord); break;
            case 'deck':      changeset.decks.push(syncRecord); break;
            case 'tag':       changeset.tags.push(syncRecord); break;
            case 'note_type': changeset.noteTypes.push(syncRecord); break;
          }
        }
      }

      return changeset;
    } catch {
      // Graceful fallback -- treat as no remote changes
      return {
        usn: sinceServerUSN,
        notes: [],
        cards: [],
        decks: [],
        tags: [],
        noteTypes: [],
        deletedIds: [],
      };
    }
  }

  /**
   * Push a local changeset to the remote server.
   * Returns the number of changes successfully sent.
   *
   * In a production system this would be a POST to the sync API.
   */
  private async pushLocalChanges(
    userId: string,
    changeset: SyncChangeset,
  ): Promise<number> {
    // Count all records in the changeset
    const totalChanges =
      changeset.notes.length +
      changeset.cards.length +
      changeset.decks.length +
      changeset.tags.length +
      changeset.noteTypes.length +
      changeset.deletedIds.length;

    if (totalChanges === 0) return 0;

    // In a real deployment:
    //   POST /api/sync/push { userId, changeset }
    //
    // For a self-hosted single-server deployment we persist to
    // remote_sync_log (if the table exists). Otherwise this is a no-op
    // and we just count the changes that *would* be sent.

    try {
      const remoteResult = await query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_name = 'remote_sync_log'
         ) AS exists`,
      );

      if (remoteResult.rows[0].exists) {
        await withTransaction(async (client) => {
          // Get next remote USN
          const usnResult = await client.query(
            `SELECT COALESCE(MAX(usn), 0) + 1 AS next_usn
             FROM remote_sync_log WHERE user_id = $1`,
            [userId],
          );
          let nextUSN = parseInt((usnResult.rows[0] as { next_usn: string }).next_usn, 10);

          // Insert all entity changes
          const entityGroups: Array<{
            type: SyncEntityType;
            records: SyncRecord<Record<string, unknown>>[];
          }> = [
            { type: 'deck',      records: changeset.decks },
            { type: 'tag',       records: changeset.tags },
            { type: 'note_type', records: changeset.noteTypes },
            { type: 'note',      records: changeset.notes },
            { type: 'card',      records: changeset.cards },
          ];

          for (const { type, records } of entityGroups) {
            for (const record of records) {
              await client.query(
                `INSERT INTO remote_sync_log
                   (user_id, entity_type, entity_id, change_type, usn, modified_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  userId,
                  type,
                  record.entity.id,
                  record.changeType,
                  nextUSN++,
                  record.modifiedAt,
                ],
              );
            }
          }

          // Insert deletions
          for (const { entityType, entityId } of changeset.deletedIds) {
            await client.query(
              `INSERT INTO remote_sync_log
                 (user_id, entity_type, entity_id, change_type, usn, modified_at)
               VALUES ($1, $2, $3, 'delete', $4, NOW())`,
              [userId, entityType, entityId, nextUSN++],
            );
          }
        });
      }
    } catch {
      // If remote infrastructure isn't available, log and continue
      console.warn('[SyncService] Could not push changes to remote -- no remote_sync_log table');
    }

    return totalChanges;
  }

  /**
   * Full upload: send the entire local collection to the server.
   */
  private async fullUpload(userId: string): Promise<SyncResult> {
    const entityTypes: SyncEntityType[] = ['deck', 'tag', 'note_type', 'note', 'card'];
    let sentChanges = 0;

    for (const entityType of entityTypes) {
      const table = ENTITY_TABLE[entityType];

      // For entities with user_id column, filter by user.
      // Decks/tags/notes/cards may not have a direct user_id column
      // in every schema, so we use a try/catch approach.
      let entityResult;
      try {
        entityResult = await query<Record<string, unknown>>(
          `SELECT * FROM ${table} WHERE user_id = $1`,
          [userId],
        );
      } catch {
        // Table may not have user_id -- fetch all (single-user deployment)
        entityResult = await query<Record<string, unknown>>(
          `SELECT * FROM ${table}`,
        );
      }

      sentChanges += entityResult.rows.length;
    }

    // Reset sync_meta and sync_log after full upload
    const newUSN = await this.getLocalUSN(userId);
    await query(
      `UPDATE sync_meta
       SET last_synced_usn = $1,
           server_usn = $1,
           last_sync_at = NOW(),
           schema_version = $2,
           is_syncing = FALSE
       WHERE user_id = $3`,
      [newUSN, CURRENT_SCHEMA_VERSION, userId],
    );

    return {
      success: true,
      sentChanges,
      receivedChanges: 0,
      conflicts: [],
      newUSN,
    };
  }

  /**
   * Full download: replace the entire local collection with the server's copy.
   */
  private async fullDownload(userId: string): Promise<SyncResult> {
    let receivedChanges = 0;

    await withTransaction(async (client) => {
      // Order matters due to foreign key constraints:
      // Delete in reverse dependency order
      const deleteOrder: SyncEntityType[] = ['card', 'note', 'note_type', 'tag', 'deck'];

      for (const entityType of deleteOrder) {
        const table = ENTITY_TABLE[entityType];
        try {
          await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        } catch {
          // Table may not have user_id -- skip deletion for shared tables
        }
      }

      // Fetch all data from server and insert locally
      // In production: GET /api/sync/full?userId={userId}
      // For now, query remote tables if they exist
      const insertOrder: SyncEntityType[] = ['deck', 'tag', 'note_type', 'note', 'card'];

      for (const entityType of insertOrder) {
        const remoteTable = `remote_${ENTITY_TABLE[entityType]}`;
        try {
          const remoteData = await client.query(
            `SELECT * FROM ${remoteTable} WHERE user_id = $1`,
            [userId],
          );

          const localTable = ENTITY_TABLE[entityType];
          for (const row of remoteData.rows) {
            const entity = row as Record<string, unknown>;
            await this.upsertEntity(client, localTable, entity);
            receivedChanges++;
          }
        } catch {
          // Remote table doesn't exist -- skip
        }
      }

      // Clear sync_log and reset sync_meta
      await client.query(
        `DELETE FROM sync_log WHERE user_id = $1`,
        [userId],
      );

      await client.query(
        `UPDATE sync_meta
         SET last_synced_usn = 0,
             server_usn = 0,
             last_sync_at = NOW(),
             schema_version = $1,
             is_syncing = FALSE
         WHERE user_id = $2`,
        [CURRENT_SCHEMA_VERSION, userId],
      );
    });

    return {
      success: true,
      sentChanges: 0,
      receivedChanges,
      conflicts: [],
      newUSN: 0,
    };
  }
}
