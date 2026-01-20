import { openDB } from 'idb';

import type { SavedPlaylistItem } from '../types';
import type { SavedPlaylistDBSchema } from './schema';
import { SAVED_DB_NAME, SAVED_DB_VERSION, SAVED_CACHE_LIMIT_BYTES } from './schema';

function estimateBytes(value: unknown) {
  // Approximate size using JSON length; good enough for a client-side budget check.
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

async function getDb() {
  return openDB<SavedPlaylistDBSchema>(SAVED_DB_NAME, SAVED_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('playlistItems')) {
        const store = db.createObjectStore('playlistItems', { keyPath: 'id' });
        store.createIndex('by-videoId', 'videoId');
        store.createIndex('by-publishedAt', 'publishedAt');
      }

      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    },
  });
}

export async function getCachedPlaylistItems() {
  const db = await getDb();
  return db.getAll('playlistItems');
}

export async function getSavedMetadata(key: string) {
  const db = await getDb();
  return db.get('metadata', key);
}

export async function cachePlaylistItems(items: SavedPlaylistItem[]) {
  const estimatedBytes = estimateBytes(items);

  if (estimatedBytes > SAVED_CACHE_LIMIT_BYTES) {
    return {
      cached: false,
      reason: 'Playlist items exceed the 5GB cache limit.',
    };
  }

  const db = await getDb();
  const tx = db.transaction(['playlistItems', 'metadata'], 'readwrite');

  const playlistStore = tx.objectStore('playlistItems');
  const metadataStore = tx.objectStore('metadata');

  await playlistStore.clear();
  await Promise.all(items.map((item) => playlistStore.put(item)));

  await metadataStore.put(estimatedBytes, 'totalCacheBytes');
  await metadataStore.put(new Date().toISOString(), 'lastSync');

  await tx.done;

  return { cached: true, estimatedBytes };
}
