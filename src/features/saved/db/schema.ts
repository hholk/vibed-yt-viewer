import type { DBSchema } from 'idb';

import type { SavedPlaylistItem } from '../types';

// This small schema keeps the "Saved" playlist data on the client so we can show it fast
// without re-fetching from the YouTube API every time.
export interface SavedPlaylistDBSchema extends DBSchema {
  playlistItems: {
    key: string; // Playlist item ID from YouTube
    value: SavedPlaylistItem;
    indexes: {
      'by-videoId': string;
      'by-publishedAt': string;
    };
  };
  metadata: {
    key: string; // 'lastSync', 'totalCacheBytes'
    value: unknown;
  };
}

export const SAVED_DB_NAME = 'yt-viewer-saved-playlist';
export const SAVED_DB_VERSION = 1;

// 5 GB cache limit to align with the product requirement.
export const SAVED_CACHE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
