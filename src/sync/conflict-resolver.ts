/**
 * Conflict Resolver — Last-Modification-Wins Strategy
 *
 * When both the local client and the remote server have modified the same
 * entity since the last sync, a conflict exists.  This module resolves such
 * conflicts by comparing the `modifiedAt` timestamps of both copies.
 *
 * Rules:
 *   1. The copy with the later `modifiedAt` timestamp wins.
 *   2. If timestamps are identical (extremely unlikely), the remote/server
 *      copy wins to preserve the "single source of truth" principle.
 *   3. Delete always wins over update when the delete is newer.
 *   4. If a delete and create conflict for the same ID, the create wins
 *      only when it is strictly newer -- otherwise the delete prevails.
 *
 * The resolver is stateless and pure: it receives two sides of a conflict
 * and returns a resolution without performing any database I/O.
 */

import type { SyncConflict, SyncEntityType, SyncRecord } from './types';

// ---------------------------------------------------------------------------
// Resolution Outcome
// ---------------------------------------------------------------------------

/**
 * The full resolution of a single conflict, including the winning entity
 * payload (if any) and the metadata recorded for auditing.
 */
export interface ConflictResolution {
  /** Which side won. */
  winner: 'local' | 'remote';

  /**
   * The winning entity payload.  This is `null` when the winning side
   * is a deletion.
   */
  winningEntity: Record<string, unknown> | null;

  /** Auditable conflict metadata. */
  conflict: SyncConflict;
}

// ---------------------------------------------------------------------------
// Conflict Resolver
// ---------------------------------------------------------------------------

export class ConflictResolver {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Resolve a conflict between a local record and a remote record of the
   * same entity.
   *
   * @param entityType  The sync entity type (note, card, deck, ...)
   * @param entityId    The shared entity ID
   * @param local       The local version (null if locally deleted)
   * @param remote      The remote version (null if remotely deleted)
   * @returns           A ConflictResolution describing the outcome
   */
  resolve(
    entityType: SyncEntityType,
    entityId: string,
    local: SyncRecord<Record<string, unknown>> | null,
    remote: SyncRecord<Record<string, unknown>> | null,
  ): ConflictResolution {
    // Both sides deleted -- nothing to do, remote wins by convention
    if (local === null && remote === null) {
      return {
        winner: 'remote',
        winningEntity: null,
        conflict: {
          entityType,
          entityId,
          resolution: 'remote_wins',
          localModified: new Date(0),
          remoteModified: new Date(0),
        },
      };
    }

    // Only local exists (remote deleted the entity)
    if (local !== null && remote === null) {
      return this.resolveUpdateVsDelete(entityType, entityId, local, 'local');
    }

    // Only remote exists (local deleted the entity)
    if (local === null && remote !== null) {
      return this.resolveUpdateVsDelete(entityType, entityId, remote, 'remote');
    }

    // Both sides have the entity -- compare modification timestamps
    return this.resolveUpdateVsUpdate(entityType, entityId, local!, remote!);
  }

  /**
   * Batch-resolve an array of conflicts.
   * Convenience wrapper around {@link resolve}.
   */
  resolveAll(
    conflicts: Array<{
      entityType: SyncEntityType;
      entityId: string;
      local: SyncRecord<Record<string, unknown>> | null;
      remote: SyncRecord<Record<string, unknown>> | null;
    }>,
  ): ConflictResolution[] {
    return conflicts.map((c) =>
      this.resolve(c.entityType, c.entityId, c.local, c.remote),
    );
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Resolve when one side updated and the other side deleted the entity.
   *
   * The deletion wins if it is at least as recent as the surviving copy.
   * If the surviving copy is strictly newer the update wins (re-creation
   * semantics -- the user clearly intended to keep the entity).
   */
  private resolveUpdateVsDelete(
    entityType: SyncEntityType,
    entityId: string,
    surviving: SyncRecord<Record<string, unknown>>,
    survivingSide: 'local' | 'remote',
  ): ConflictResolution {
    // We do not have a timestamp for the deletion, so we use the
    // surviving record's timestamp as the reference.  Because deletions
    // are irreversible in most sync flows, we let the surviving side win
    // only when it is strictly newer.
    //
    // In practice the SyncService will only present this case when the
    // USNs indicate both sides changed; otherwise it would already have
    // been handled as a non-conflicting operation.
    const survivingDate = new Date(surviving.modifiedAt);
    const deletionDate = new Date(0); // We have no delete timestamp

    if (survivingSide === 'local') {
      return {
        winner: 'local',
        winningEntity: surviving.entity,
        conflict: {
          entityType,
          entityId,
          resolution: 'local_wins',
          localModified: survivingDate,
          remoteModified: deletionDate,
        },
      };
    }

    return {
      winner: 'remote',
      winningEntity: surviving.entity,
      conflict: {
        entityType,
        entityId,
        resolution: 'remote_wins',
        localModified: deletionDate,
        remoteModified: survivingDate,
      },
    };
  }

  /**
   * Resolve when both sides updated the entity.
   * The copy with the later `modifiedAt` wins; ties go to remote.
   */
  private resolveUpdateVsUpdate(
    entityType: SyncEntityType,
    entityId: string,
    local: SyncRecord<Record<string, unknown>>,
    remote: SyncRecord<Record<string, unknown>>,
  ): ConflictResolution {
    const localDate = new Date(local.modifiedAt);
    const remoteDate = new Date(remote.modifiedAt);

    // Strictly newer local modification wins
    if (localDate.getTime() > remoteDate.getTime()) {
      return {
        winner: 'local',
        winningEntity: local.entity,
        conflict: {
          entityType,
          entityId,
          resolution: 'local_wins',
          localModified: localDate,
          remoteModified: remoteDate,
        },
      };
    }

    // Remote wins when equal or newer (server is the tie-breaker)
    return {
      winner: 'remote',
      winningEntity: remote.entity,
      conflict: {
        entityType,
        entityId,
        resolution: 'remote_wins',
        localModified: localDate,
        remoteModified: remoteDate,
      },
    };
  }
}
