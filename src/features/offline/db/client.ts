import { openDB, type IDBPDatabase } from 'idb';
import type { OfflineDBSchema } from './schema';
import { DB_NAME, DB_VERSION } from './schema';
import type { VideoOffline, PendingMutation } from '../schemas';
import type { HoneypotLog } from './schema';

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

/**
 * Open/Create IndexedDB Connection
 */
export async function openOfflineDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`[OfflineDB] Upgrading from v${oldVersion} to v${newVersion}`);

      // Create videos store
      if (!db.objectStoreNames.contains('videos')) {
        const videosStore = db.createObjectStore('videos', { keyPath: 'Id' });
        videosStore.createIndex('by-videoId', 'VideoID', { unique: false });
        videosStore.createIndex('by-publishedAt', 'PublishedAt', { unique: false });
        videosStore.createIndex('by-createdAt', 'CreatedAt', { unique: false });
        console.log('[OfflineDB] Created videos store with indexes');
      }

      // Create pendingMutations store
      if (!db.objectStoreNames.contains('pendingMutations')) {
        const mutationsStore = db.createObjectStore('pendingMutations', { keyPath: 'id' });
        mutationsStore.createIndex('by-timestamp', 'timestamp', { unique: false });
        mutationsStore.createIndex('by-videoId', 'videoId', { unique: false });
        console.log('[OfflineDB] Created pendingMutations store with indexes');
      }

      // Create metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
        console.log('[OfflineDB] Created metadata store');
      }

      // Create honeypotLogs store (v2)
      if (!db.objectStoreNames.contains('honeypotLogs')) {
        const logsStore = db.createObjectStore('honeypotLogs', { keyPath: 'id' });
        logsStore.createIndex('by-timestamp', 'timestamp', { unique: false });
        logsStore.createIndex('by-ip', 'ip', { unique: false });
        logsStore.createIndex('by-path', 'path', { unique: false });
        console.log('[OfflineDB] Created honeypotLogs store with indexes');
      }
    },
    blocked() {
      console.warn('[OfflineDB] Database blocked - close other tabs');
    },
    blocking() {
      console.warn('[OfflineDB] Database blocking - newer version available');
      // Close current connection to allow upgrade
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.error('[OfflineDB] Database terminated unexpectedly');
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * Videos Store Operations
 */

export async function getVideoByVideoId(videoId: string): Promise<VideoOffline | undefined> {
  const db = await openOfflineDB();
  const index = db.transaction('videos').store.index('by-videoId');
  return index.get(videoId);
}

export async function putVideo(video: VideoOffline): Promise<void> {
  const db = await openOfflineDB();
  await db.put('videos', video);
}

export async function putVideos(videos: VideoOffline[]): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction('videos', 'readwrite');
  await Promise.all([
    ...videos.map(video => tx.store.put(video)),
    tx.done,
  ]);
}

export async function deleteVideo(id: number): Promise<void> {
  const db = await openOfflineDB();
  await db.delete('videos', id);
}

export async function getAllVideos(): Promise<VideoOffline[]> {
  const db = await openOfflineDB();
  return db.getAll('videos');
}

export async function getVideosByPublishedAt(limit?: number): Promise<VideoOffline[]> {
  const db = await openOfflineDB();
  const index = db.transaction('videos').store.index('by-publishedAt');

  // Get all videos sorted by PublishedAt DESC (newest first)
  let videos = await index.getAll();

  // Sort descending (newest first) - index is ascending by default
  videos = videos.reverse();

  if (limit) {
    return videos.slice(0, limit);
  }

  return videos;
}

export async function getVideoCount(): Promise<number> {
  const db = await openOfflineDB();
  return db.count('videos');
}

export async function clearAllVideos(): Promise<void> {
  const db = await openOfflineDB();
  await db.clear('videos');
}

/**
 * Pending Mutations Store Operations
 */

export async function addPendingMutation(mutation: PendingMutation): Promise<void> {
  const db = await openOfflineDB();
  await db.add('pendingMutations', mutation);
}

export async function getPendingMutation(id: string): Promise<PendingMutation | undefined> {
  const db = await openOfflineDB();
  return db.get('pendingMutations', id);
}

export async function getAllPendingMutations(): Promise<PendingMutation[]> {
  const db = await openOfflineDB();
  const index = db.transaction('pendingMutations').store.index('by-timestamp');
  return index.getAll(); // Sorted by timestamp ascending
}

export async function updatePendingMutation(mutation: PendingMutation): Promise<void> {
  const db = await openOfflineDB();
  await db.put('pendingMutations', mutation);
}

export async function deletePendingMutation(id: string): Promise<void> {
  const db = await openOfflineDB();
  await db.delete('pendingMutations', id);
}

export async function getPendingMutationsCount(): Promise<number> {
  const db = await openOfflineDB();
  return db.count('pendingMutations');
}

export async function clearAllPendingMutations(): Promise<void> {
  const db = await openOfflineDB();
  await db.clear('pendingMutations');
}

/**
 * Metadata Store Operations
 */

export async function getMetadata<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openOfflineDB();
  return db.get('metadata', key) as Promise<T | undefined>;
}

export async function setMetadata<T = unknown>(key: string, value: T): Promise<void> {
  const db = await openOfflineDB();
  await db.put('metadata', value, key);
}

export async function deleteMetadata(key: string): Promise<void> {
  const db = await openOfflineDB();
  await db.delete('metadata', key);
}

export async function clearAllMetadata(): Promise<void> {
  const db = await openOfflineDB();
  await db.clear('metadata');
}

/**
 * Helper: Calculate total DB size estimate
 * Note: This is an approximation, actual IndexedDB quota usage may differ
 */
export async function estimateCacheSize(): Promise<number> {
  const db = await openOfflineDB();
  const videos = await db.getAll('videos');

  // Estimate: JSON.stringify length as rough byte count
  const totalSize = videos.reduce((sum, video) => {
    return sum + JSON.stringify(video).length;
  }, 0);

  return totalSize; // bytes
}

// Re-export types for convenience
export type { VideoOffline } from '../schemas';
export type { PendingMutation } from '../schemas';
export type { OfflineDBSchema } from './schema';

/**
 * Honeypot Logs Store Operations
 */

export async function addHoneypotLog(log: Omit<HoneypotLog, 'id'>): Promise<string> {
  const db = await openOfflineDB();
  const id = crypto.randomUUID();
  const fullLog: HoneypotLog = { ...log, id };
  await db.add('honeypotLogs', fullLog);
  return id;
}

export async function getAllHoneypotLogs(limit = 100): Promise<HoneypotLog[]> {
  const db = await openOfflineDB();
  const index = db.transaction('honeypotLogs').store.index('by-timestamp');
  const logs = await index.getAll();
  return logs.reverse().slice(0, limit); // Newest first
}

export async function getHoneypotLogsByIP(ip: string, limit = 50): Promise<HoneypotLog[]> {
  const db = await openOfflineDB();
  const index = db.transaction('honeypotLogs').store.index('by-ip');
  const logs = await index.getAll(ip);
  return logs.reverse().slice(0, limit);
}

export async function getHoneypotLogsByPath(path: string, limit = 50): Promise<HoneypotLog[]> {
  const db = await openOfflineDB();
  const index = db.transaction('honeypotLogs').store.index('by-path');
  const logs = await index.getAll(IDBKeyRange.bound([path, path + '\uffff'], open(), true));
  return logs.reverse().slice(0, limit);
}

export async function getHoneypotLogsCount(): Promise<number> {
  const db = await openOfflineDB();
  return db.count('honeypotLogs');
}

export async function getUniqueIPs(): Promise<string[]> {
  const db = await openOfflineDB();
  const logs = await db.getAll('honeypotLogs');
  const ips = new Set(logs.map(log => log.ip));
  return Array.from(ips).sort();
}

export async function clearHoneypotLogs(): Promise<void> {
  const db = await openOfflineDB();
  await db.clear('honeypotLogs');
}

export async function deleteHoneypotLog(id: string): Promise<void> {
  const db = await openOfflineDB();
  await db.delete('honeypotLogs', id);
}

export async function deleteHoneypotLogsByIP(ip: string): Promise<void> {
  const db = await openOfflineDB();
  const index = db.transaction('honeypotLogs', 'readwrite').store.index('by-ip');
  const logs = await index.getAll(ip);
  const tx = db.transaction('honeypotLogs', 'readwrite');
  await Promise.all([...logs.map(log => tx.store.delete(log.id)), tx.done]);
}
