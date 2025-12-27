/**
 * Client-Safe Cache Manager Functions
 *
 * Diese Funktionen können in Client Components verwendet werden,
 * da sie nur IndexedDB nutzen (keine Server-Only Module).
 */

import {
  estimateCacheSize,
  getVideoCount,
  getMetadata,
} from './db/client';

/**
 * Get Cache Stats (Client-Safe)
 */
export async function getCacheStats() {
  const count = await getVideoCount();
  const size = await estimateCacheSize();
  const lastSync = await getMetadata<number>('lastSync');

  return {
    cachedVideos: count,
    cacheSizeBytes: size,
    cacheSizeMB: Math.round(size / 1024 / 1024),
    lastSync: lastSync ? new Date(lastSync) : null,
  };
}
