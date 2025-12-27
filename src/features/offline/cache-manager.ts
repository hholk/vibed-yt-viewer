import { fetchAllVideos } from '@/features/videos/api/video-service';
import { videoOfflineSchema, type VideoOffline, type SyncResult } from './schemas';
import {
  putVideos,
  getVideosByPublishedAt,
  clearAllVideos,
  estimateCacheSize,
  getVideoCount,
  setMetadata,
  getMetadata,
  deleteVideo as deleteVideoFromDB,
} from './db/client';
import { STORAGE_LIMITS } from './db/schema';

/**
 * Felder die für Offline-Modus geladen werden
 * (Alle außer Transkripte)
 */
function getOfflineFields(): string[] {
  return [
    // IDs
    'Id',
    'VideoID',
    'URL',

    // Basic Info
    'Title',
    'Description',
    'Channel',
    'ThumbHigh',
    'OriginalTitle',
    'OriginalChannel',

    // Dates
    'PublishedAt',
    'CreatedAt',
    'UpdatedAt',
    'CompletionDate',
    'DueDate',

    // User Data
    'ImportanceRating',
    'PersonalComment',
    'Notes',
    'Watched',
    'Archived',
    'Private',
    'Status',
    'Priority',

    // Metadata
    'Duration',
    'Language',
    'Source',
    'Speaker',
    'VideoGenre',
    'MainTopic',

    // Technical
    'FileFormat',
    'FileSize',
    'Resolution',
    'FrameRate',
    'BitRate',
    'Subtitles',

    // Content (summaries only, NO transcripts)
    'TLDR',
    'MainSummary',
    'ActionableAdvice',
    'DetailedNarrativeFlow',
    'MemorableQuotes',
    'MemorableTakeaways',
    'KeyExamples',
    'BookMediaRecommendations',
    'RelatedURLs',

    // Categorization
    'Hashtags',
    'Tags',
    'Categories',
    'TopicsDiscussed',
    'Mood',
    'Sentiment',
    'SentimentReason',

    // Entities
    'Persons',
    'Companies',
    'Indicators',
    'Trends',
    'Locations',
    'Events',
    'Products',
    'Speakers',
    'InvestableAssets',
    'TickerSymbol',
    'Institutions',
    'EventsFairs',
    'DOIs',
    'PrimarySources',
    'TechnicalTerms',
    'KeyNumbersData',

    // Other
    'Task',
    'Project',
    'AssignedTo',
    'Prompt',
  ];
}

/**
 * Cache Thumbnails
 *
 * Cached die Thumbnails aller Videos im Service Worker Cache
 */
async function cacheThumbnails(videos: VideoOffline[]): Promise<void> {
  console.log('[CacheManager] Starting thumbnail caching...');

  const thumbnailUrls = videos
    .map(v => v.ThumbHigh)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  console.log(`[CacheManager] Found ${thumbnailUrls.length} thumbnails to cache`);

  let cached = 0;
  let failed = 0;

  for (const url of thumbnailUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        // Service Worker will cache this automatically
        cached++;
        if (cached % 100 === 0) {
          console.log(`[CacheManager] Cached ${cached}/${thumbnailUrls.length} thumbnails`);
        }
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  console.log(`[CacheManager] Thumbnail caching complete: ${cached} cached, ${failed} failed`);
}

/**
 * Sync Offline Cache
 *
 * Lädt die neuesten 2000 Videos (nach PublishedAt) von NocoDB
 * und speichert sie in IndexedDB.
 */
export async function syncOfflineCache(): Promise<SyncResult> {
  const startTime = Date.now();
  console.log('[CacheManager] Starting offline cache sync...');

  try {
    // Lade neueste 2000 Videos (ohne Transkripte)
    console.log('[CacheManager] Fetching newest videos from NocoDB...');

    const allVideos = await fetchAllVideos({
      sort: '-PublishedAt', // Neueste zuerst
      fields: getOfflineFields(),
      schema: videoOfflineSchema,
    });

    // Begrenzen auf MAX_VIDEOS (neueste 2000)
    const videos = allVideos.slice(0, STORAGE_LIMITS.MAX_VIDEOS);

    console.log(`[CacheManager] Fetched ${allVideos.length} videos, keeping newest ${videos.length}`);

    // Clear alte Videos
    await clearAllVideos();

    // Speichere neue Videos
    console.log('[CacheManager] Storing videos in IndexedDB...');
    await putVideos(videos);

    // Check Cache-Größe
    const cacheSize = await estimateCacheSize();
    const cacheSizeMB = Math.round(cacheSize / 1024 / 1024);
    console.log(`[CacheManager] Cache size: ${cacheSizeMB} MB`);

    // Eviction falls zu groß
    if (cacheSizeMB > STORAGE_LIMITS.TARGET_SIZE_MB) {
      console.warn(`[CacheManager] Cache exceeds target (${cacheSizeMB} > ${STORAGE_LIMITS.TARGET_SIZE_MB} MB), evicting...`);
      await evictOldestVideos(STORAGE_LIMITS.TARGET_SIZE_MB * 1024 * 1024);
    }

    // Cache thumbnails in background
    cacheThumbnails(videos).catch((err: unknown) =>
      console.warn('[CacheManager] Thumbnail caching failed:', err)
    );

    // Update metadata
    const syncTime = Date.now();
    await setMetadata('lastSync', syncTime);
    await setMetadata('totalCacheSize', cacheSize);

    const result: SyncResult = {
      videosUpdated: videos.length,
      mutationsSynced: 0,
      errors: [],
      lastSyncTime: syncTime,
    };

    const duration = Date.now() - startTime;
    console.log(`[CacheManager] Sync completed in ${duration}ms`);

    return result;
  } catch (error) {
    console.error('[CacheManager] Sync failed:', error);
    throw error;
  }
}

/**
 * Get Cached Videos
 *
 * Für Offline-Suche und -Anzeige
 */
export async function getCachedVideos(options?: {
  limit?: number;
  offset?: number;
}): Promise<VideoOffline[]> {
  const videos = await getVideosByPublishedAt();

  if (options?.offset || options?.limit) {
    const start = options.offset ?? 0;
    const end = options.limit ? start + options.limit : undefined;
    return videos.slice(start, end);
  }

  return videos;
}

/**
 * Calculate Cache Size
 */
export async function calculateCacheSize(): Promise<number> {
  return estimateCacheSize();
}

/**
 * Calculate Cache Size in MB
 */
export async function calculateCacheSizeMB(): Promise<number> {
  const bytes = await estimateCacheSize();
  return Math.round(bytes / 1024 / 1024);
}

/**
 * Evict Oldest Videos (LRU)
 *
 * Entfernt älteste Videos (nach PublishedAt) bis Zielgröße erreicht ist
 */
export async function evictOldestVideos(targetSizeBytes: number): Promise<void> {
  console.log(`[CacheManager] Evicting videos to reach target size: ${Math.round(targetSizeBytes / 1024 / 1024)} MB`);

  let currentSize = await estimateCacheSize();
  const videos = await getVideosByPublishedAt();

  // Sortiere nach PublishedAt ASC (älteste zuerst)
  const oldestFirst = [...videos].reverse();

  let evicted = 0;
  for (const video of oldestFirst) {
    if (currentSize <= targetSizeBytes) {
      break;
    }

    // Lösche Video
    await deleteVideoFromDB(video.Id);
    evicted++;

    // Re-calculate size
    currentSize = await estimateCacheSize();
  }

  console.log(`[CacheManager] Evicted ${evicted} videos. New size: ${Math.round(currentSize / 1024 / 1024)} MB`);
}

/**
 * Get Cache Stats
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

/**
 * Clear Cache
 */
export async function clearCache(): Promise<void> {
  console.log('[CacheManager] Clearing cache...');
  await clearAllVideos();
  await setMetadata('lastSync', null);
  await setMetadata('totalCacheSize', 0);
  console.log('[CacheManager] Cache cleared');
}
