import type { DBSchema } from 'idb';

import type { SavedVideo } from '../types';

/**
 * IndexedDB schema for the Saved playlist cache.
 * This database is separate from the offline video cache to keep concerns split.
 */
export interface SavedDBSchema extends DBSchema {
  savedVideos: {
    key: string; // YouTube video ID
    value: SavedVideo;
    indexes: {
      'by-addedAt': string;
    };
  };
  metadata: {
    key: string;
    value: unknown;
  };
}

export const SAVED_DB_NAME = 'yt-viewer-saved';
export const SAVED_DB_VERSION = 1;

// 5 GB cache cap for Saved playlist metadata + thumbnails.
export const SAVED_CACHE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
