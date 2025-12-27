/**
 * Mutations Queue
 *
 * Speichert Offline-Änderungen (Update/Delete) für späteren Sync
 */

import {
  addPendingMutation,
  getAllPendingMutations,
  deletePendingMutation,
  getPendingMutationsCount,
} from './db/client';
import type { PendingMutation } from './schemas';

/**
 * Queue a mutation for later sync
 */
export async function queueMutation(
  mutation: Omit<PendingMutation, 'id' | 'retryCount' | 'error'>
): Promise<void> {
  const id = generateMutationId();

  const fullMutation: PendingMutation = {
    id,
    retryCount: 0,
    ...mutation,
  };

  console.log(`[MutationsQueue] Queued mutation ${id}:`, fullMutation.type);
  await addPendingMutation(fullMutation);
}

/**
 * Get all pending mutations
 */
export async function getPendingMutations(): Promise<PendingMutation[]> {
  return getAllPendingMutations();
}

/**
 * Remove a mutation from queue
 */
export async function removeMutation(id: string): Promise<void> {
  console.log(`[MutationsQueue] Removed mutation ${id}`);
  await deletePendingMutation(id);
}

/**
 * Get count of pending mutations
 */
export async function getPendingCount(): Promise<number> {
  return getPendingMutationsCount();
}

/**
 * Generate unique mutation ID
 */
function generateMutationId(): string {
  return `mutation_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
