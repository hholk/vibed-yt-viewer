import type { DBSchema } from 'idb';
import type { VideoOffline, PendingMutation } from '../schemas';

/**
 * IndexedDB Schema für Offline-Funktionalität
 *
 * Stores:
 * - videos: Cached videos (max 2000, neueste nach PublishedAt)
 * - pendingMutations: Offline-Änderungen die noch sync'd werden müssen
 * - metadata: App-Metadaten (offlineMode flag, lastSync, etc.)
 */
export interface OfflineDBSchema extends DBSchema {
  videos: {
    key: number; // Video.Id
    value: VideoOffline;
    indexes: {
      'by-videoId': string; // VideoID für Lookup
      'by-publishedAt': Date; // Für Sortierung (neueste zuerst)
      'by-createdAt': Date; // Alternative Sortierung
    };
  };
  pendingMutations: {
    key: string; // UUID
    value: PendingMutation;
    indexes: {
      'by-timestamp': number; // Sortierung nach Zeit
      'by-videoId': number; // Lookup nach Video
    };
  };
  metadata: {
    key: string; // 'offlineModeEnabled', 'lastSync', 'totalCacheSize'
    value: unknown;
  };
}

export const DB_NAME = 'yt-viewer-offline';
export const DB_VERSION = 1;

/**
 * Storage Limits
 */
export const STORAGE_LIMITS = {
  MAX_SIZE_MB: 40,
  TARGET_SIZE_MB: 35, // Buffer für neue Videos
  MAX_VIDEOS: 2000, // Increased from 200 (200 videos = ~1.4 MB, so 2000 ≈ 14 MB fits well under 40 MB)
} as const;
