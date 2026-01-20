import type { DBSchema } from 'idb';
import type { VideoOffline, PendingMutation } from '../schemas';

/**
 * IndexedDB Schema für Offline-Funktionalität
 *
 * Stores:
 * - videos: Cached videos (max 200, neueste nach PublishedAt)
 * - pendingMutations: Offline-Änderungen die noch sync'd werden müssen
 * - metadata: App-Metadaten (offlineMode flag, lastSync, etc.)
 */
export interface HoneypotLog {
  id: string; // UUID
  timestamp: Date;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
}

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
  honeypotLogs: {
    key: string; // UUID
    value: HoneypotLog;
    indexes: {
      'by-timestamp': Date; // Sortierung nach Zeit
      'by-ip': string; // Gruppierung nach IP
      'by-path': string; // Suche nach Path
    };
  };
}

export const DB_NAME = 'yt-viewer-offline';
export const DB_VERSION = 2;

/**
 * Storage Limits
 */
export const STORAGE_LIMITS = {
  MAX_SIZE_MB: 40,
  TARGET_SIZE_MB: 35, // Buffer für neue Videos
  MAX_VIDEOS: 200,
} as const;
