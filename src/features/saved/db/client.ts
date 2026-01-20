import { openDB } from 'idb';

import type { SavedVideo } from '../types';
import {
  SAVED_CACHE_LIMIT_BYTES,
  SAVED_DB_NAME,
  SAVED_DB_VERSION,
  type SavedDBSchema,
} from './schema';

const dbPromise = openDB<SavedDBSchema>(SAVED_DB_NAME, SAVED_DB_VERSION, {
  upgrade(database) {
    const store = database.createObjectStore('savedVideos', { keyPath: 'id' });
    store.createIndex('by-addedAt', 'addedAt');

    database.createObjectStore('metadata');
  },
});

const estimateSizeBytes = (video: SavedVideo) =>
  new TextEncoder().encode(JSON.stringify(video)).length;

/**
 * Fetch saved videos from IndexedDB so we can show cached data quickly.
 */
export const getCachedSavedVideos = async () => {
  const db = await dbPromise;
  return db.getAll('savedVideos');
};

/**
 * Replace the cached saved playlist with the latest data.
 * We keep the newest items if the cache would exceed the 5 GB cap.
 */
export const replaceSavedVideos = async (videos: SavedVideo[]) => {
  const db = await dbPromise;
  const sorted = [...videos].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );

  const kept: SavedVideo[] = [];
  let totalBytes = 0;

  for (const video of sorted) {
    const size = estimateSizeBytes(video);
    if (totalBytes + size > SAVED_CACHE_LIMIT_BYTES) {
      continue;
    }

    kept.push(video);
    totalBytes += size;
  }

  const tx = db.transaction(['savedVideos', 'metadata'], 'readwrite');
  await tx.objectStore('savedVideos').clear();

  for (const video of kept) {
    await tx.objectStore('savedVideos').put(video);
  }

  await tx.objectStore('metadata').put(totalBytes, 'savedCacheBytes');
  await tx.objectStore('metadata').put(new Date().toISOString(), 'savedCacheUpdatedAt');

  await tx.done;

  return { saved: kept, totalBytes };
};

/**
 * Return the current cache metadata for UI display.
 */
export const getSavedCacheMetadata = async () => {
  const db = await dbPromise;
  const [totalBytes, updatedAt] = await Promise.all([
    db.get('metadata', 'savedCacheBytes'),
    db.get('metadata', 'savedCacheUpdatedAt'),
  ]);

  return {
    totalBytes: typeof totalBytes === 'number' ? totalBytes : 0,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : null,
  };
};
