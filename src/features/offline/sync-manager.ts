import { updateVideo, deleteVideo } from '@/features/videos/api/mutations';
import { syncOfflineCache } from './cache-manager';
import {
  getAllPendingMutations,
  deletePendingMutation,
  updatePendingMutation,
  setMetadata,
} from './db/client';
import type { PendingMutation, SyncResult } from './schemas';

interface SyncError {
  type: 'network' | 'conflict' | 'validation' | 'not_found';
  mutationId: string;
  message: string;
  error: unknown;
}

/**
 * Full Sync
 *
 * 1. Sync pending mutations
 * 2. Refresh cached videos from server
 */
export async function fullSync(): Promise<SyncResult> {
  console.log('[SyncManager] Starting full sync...');

  const startTime = Date.now();
  const errors: SyncError[] = [];

  // 1. Sync pending mutations first
  console.log('[SyncManager] Syncing pending mutations...');
  const mutationResult = await syncPendingMutations();
  errors.push(...mutationResult.errors);

  // 2. Refresh cached videos from server
  console.log('[SyncManager] Refreshing offline cache...');
  const cacheResult = await syncOfflineCache();

  // 3. Update metadata
  const syncTime = Date.now();
  await setMetadata('lastSync', syncTime);

  const result: SyncResult = {
    videosUpdated: cacheResult.videosUpdated,
    mutationsSynced: mutationResult.synced,
    errors: errors as unknown[],
    lastSyncTime: syncTime,
  };

  const duration = Date.now() - startTime;
  console.log(`[SyncManager] Full sync completed in ${duration}ms`);

  return result;
}

/**
 * Sync Pending Mutations
 *
 * Versucht alle pending mutations zu syncen
 */
export async function syncPendingMutations(): Promise<{
  synced: number;
  errors: SyncError[];
}> {
  console.log('[SyncManager] Syncing pending mutations...');

  const mutations = await getAllPendingMutations();
  console.log(`[SyncManager] Found ${mutations.length} pending mutations`);

  if (mutations.length === 0) {
    return { synced: 0, errors: [] };
  }

  const errors: SyncError[] = [];
  let synced = 0;

  for (const mutation of mutations) {
    try {
      await executeMutation(mutation);
      await deletePendingMutation(mutation.id);
      synced++;
      console.log(`[SyncManager] Synced mutation ${mutation.id} (${mutation.type})`);
    } catch (error) {
      const syncError = await handleSyncError(error, mutation);
      errors.push(syncError);
      console.error(`[SyncManager] Failed to sync mutation ${mutation.id}:`, error);
    }
  }

  console.log(`[SyncManager] Synced ${synced}/${mutations.length} mutations`);

  return { synced, errors };
}

/**
 * Execute Mutation
 */
async function executeMutation(mutation: PendingMutation): Promise<void> {
  if (mutation.type === 'UPDATE') {
    if (!mutation.data) {
      throw new Error('UPDATE mutation missing data');
    }
    await updateVideo(mutation.videoId, mutation.data);
  } else if (mutation.type === 'DELETE') {
    await deleteVideo(mutation.videoId);
  } else {
    throw new Error(`Unknown mutation type: ${mutation.type}`);
  }
}

/**
 * Handle Sync Error
 *
 * Error-Types:
 * - network: Retry später
 * - not_found: Video wurde gelöscht, remove from queue
 * - conflict: Server-Version gewinnt (Last-Write-Wins)
 * - validation: Invalid data, remove from queue
 */
async function handleSyncError(
  error: unknown,
  mutation: PendingMutation
): Promise<SyncError> {
  let errorType: SyncError['type'] = 'network';
  let message = 'Unknown error';

  if (error instanceof Error) {
    message = error.message;

    // Check for specific error types
    if ('status' in error) {
      const status = (error as { status: number }).status;

      if (status === 404) {
        errorType = 'not_found';
        await deletePendingMutation(mutation.id);
        console.log(`[SyncManager] Mutation ${mutation.id} removed (404 Not Found)`);
      } else if (status === 409) {
        errorType = 'conflict';
        // Last-Write-Wins: Remove local mutation
        await deletePendingMutation(mutation.id);
        console.log(`[SyncManager] Mutation ${mutation.id} removed (conflict)`);
      } else if (status === 422) {
        errorType = 'validation';
        await deletePendingMutation(mutation.id);
        console.log(`[SyncManager] Mutation ${mutation.id} removed (validation error)`);
      }
    }
  }

  // Network errors: Increment retry count
  if (errorType === 'network') {
    const updated: PendingMutation = {
      ...mutation,
      retryCount: mutation.retryCount + 1,
      error: message,
    };

    // Max 5 retries
    if (updated.retryCount >= 5) {
      console.warn(`[SyncManager] Mutation ${mutation.id} failed after 5 retries, removing`);
      await deletePendingMutation(mutation.id);
    } else {
      await updatePendingMutation(updated);
    }
  }

  return {
    type: errorType,
    mutationId: mutation.id,
    message,
    error,
  };
}

/**
 * Get Pending Mutations Count
 */
export async function getPendingMutationsCount(): Promise<number> {
  const mutations = await getAllPendingMutations();
  return mutations.length;
}
