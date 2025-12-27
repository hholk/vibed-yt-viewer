// Service Worker for YouTube Video Viewer PWA - Offline Mode
importScripts('/idb.min.js');

const CACHE_STATIC = 'yt-viewer-static-v20';
const CACHE_API = 'yt-viewer-api-v20';
const CACHE_IMAGES = 'yt-viewer-images-v20';

const DB_NAME = 'yt-viewer-offline';
const DB_VERSION = 1;

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '0.0.0.0';

// Don't pre-cache HTML pages - they will be cached on first fetch
const urlsToCache = [];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== CACHE_STATIC &&
              cacheName !== CACHE_API &&
              cacheName !== CACHE_IMAGES
            );
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Allow YouTube thumbnails (cross-origin)
  const isYouTubeThumbnail = url.hostname.includes('ytimg.com') ||
                              url.hostname.includes('ggpht.com') ||
                              url.hostname.includes('googleusercontent.com');

  if (isYouTubeThumbnail) {
    console.log('[SW] Caching YouTube thumbnail:', url.href);
    event.respondWith(handleImageRequest(event.request));
    return;
  }

  // Skip other cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Development/localhost: avoid caching Next.js build artifacts to prevent chunk mismatches.
  if (IS_LOCALHOST && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  console.log('[SW] Fetch:', url.pathname, url.search, 'Accept:', event.request.headers.get('accept')?.substring(0, 50));

  // API Routes: Network-First with offline fallback
  if (url.pathname.startsWith('/api/')) {
    // Special handling for /api/videos - use IndexedDB when offline
    if (url.pathname === '/api/videos') {
      event.respondWith(handleVideoAPIRequest(event.request));
    } else if (url.pathname.match(/^\/api\/videos\/[^\/]+\/details$/)) {
      // Handle individual video detail requests
      event.respondWith(handleVideoDetailRequest(event.request));
    } else {
      event.respondWith(handleAPIRequest(event.request));
    }
    return;
  }

  // Next.js optimized images: Cache-First
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(handleImageRequest(event.request));
    return;
  }

  // Images: Cache-First
  if (url.pathname.match(/\.(jpg|jpeg|png|webp|svg|gif|ico)$/i)) {
    event.respondWith(handleImageRequest(event.request));
    return;
  }

  // Static assets & pages: Network-First for HTML, Cache-First for others
  event.respondWith(handleStaticRequest(event.request));
});

/**
 * Handle /api/videos Requests - Network-First with IndexedDB Fallback
 */
async function handleVideoAPIRequest(request) {
  // Quick check if we're online
  const isOnline = navigator.onLine;

  if (!isOnline) {
    // Offline: Go directly to IndexedDB (faster)
    console.log('[SW] Offline detected, using IndexedDB for video list...');

    const offlineModeEnabled = await getOfflineModeFromDB();

    if (offlineModeEnabled) {
      try {
        const { videos, pageInfo } = await getVideosFromIndexedDB(request);
        console.log('[SW] Serving videos from IndexedDB:', videos.length, 'total:', pageInfo.totalRows);

        return new Response(
          JSON.stringify({
            videos: videos,
            pageInfo: pageInfo,
            success: true,
            offline: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (dbError) {
        console.error('[SW] IndexedDB error:', dbError);
      }
    }

    return createOfflineErrorResponse('Videos not available offline');
  }

  // Online: Try network first
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_API);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed for /api/videos, checking IndexedDB...');

    // Network failed, try IndexedDB
    const offlineModeEnabled = await getOfflineModeFromDB();

    if (offlineModeEnabled) {
      try {
        const { videos, pageInfo } = await getVideosFromIndexedDB(request);
        console.log('[SW] Serving videos from IndexedDB:', videos.length, 'total:', pageInfo.totalRows);

        return new Response(
          JSON.stringify({
            videos: videos,
            pageInfo: pageInfo,
            success: true,
            offline: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (dbError) {
        console.error('[SW] IndexedDB error:', dbError);
      }
    }

    // Fallback to HTTP cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return createOfflineErrorResponse('Videos not available offline');
  }
}

/**
 * Handle /api/videos/[videoId]/details Requests - Network-First with IndexedDB Fallback
 */
async function handleVideoDetailRequest(request) {
  const cacheKeyRequest = new Request(request.url, { method: 'GET' });

  // Quick check if we're online
  const isOnline = navigator.onLine;

  if (!isOnline) {
    // If we have a full cached response for this exact request, prefer it.
    // This is especially useful when the IndexedDB cache only contains list fields.
    const cachedResponse = await caches.match(cacheKeyRequest);
    if (cachedResponse) {
      console.log('[SW] Serving video details from Cache API:', request.url);
      return cachedResponse;
    }

    // Offline: Go directly to IndexedDB (faster)
    console.log('[SW] Offline detected, using IndexedDB...');

    const offlineModeEnabled = await getOfflineModeFromDB();

    if (offlineModeEnabled) {
      try {
        const url = new URL(request.url);
        const videoId = url.searchParams.get('videoId');

        if (!videoId) {
          return createOfflineErrorResponse('Missing videoId parameter');
        }

        const video = await getVideoByIdFromIndexedDB(videoId);

        if (video) {
          return new Response(
            JSON.stringify({
              success: true,
              video: video,
              previousVideo: null,
              nextVideo: null,
              offline: true,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (dbError) {
        console.error('[SW] IndexedDB error:', dbError);
      }
    }

    return createOfflineErrorResponse('Video not available offline');
  }

  // Online: Try network first
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_API);
      cache.put(cacheKeyRequest, response.clone());

      // If offline mode is enabled, opportunistically enrich IndexedDB with detail payloads.
      // This keeps the offline cache up-to-date without storing transcript fields.
      const offlineModeEnabled = await getOfflineModeFromDB();
      if (offlineModeEnabled) {
        try {
          const data = await response.clone().json();
          if (data && data.video && typeof data.video === 'object') {
            const sanitizedVideo = sanitizeVideoForOffline(data.video);
            await upsertVideoInIndexedDB(sanitizedVideo);
            console.log('[SW] Enriched IndexedDB from details:', sanitizedVideo.VideoID ?? sanitizedVideo.Id);
          }
        } catch (error) {
          console.warn('[SW] Failed to enrich IndexedDB from details response:', error);
        }
      }
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, checking IndexedDB...');

    // Network failed, try IndexedDB
    const offlineModeEnabled = await getOfflineModeFromDB();

    if (offlineModeEnabled) {
      try {
        const url = new URL(request.url);
        const videoId = url.searchParams.get('videoId');

        if (!videoId) {
          return createOfflineErrorResponse('Missing videoId parameter');
        }

        const video = await getVideoByIdFromIndexedDB(videoId);

        if (video) {
          return new Response(
            JSON.stringify({
              success: true,
              video: video,
              previousVideo: null,
              nextVideo: null,
              offline: true,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (dbError) {
        console.error('[SW] IndexedDB error:', dbError);
      }
    }

    // Fallback to HTTP cache
    const cachedResponse = await caches.match(cacheKeyRequest);
    if (cachedResponse) {
      return cachedResponse;
    }

    return createOfflineErrorResponse('Video not available offline');
  }
}

/**
 * Handle other API Requests - Network-First Strategy
 */
async function handleAPIRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_API);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, checking cache:', request.url);

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // If all else fails, return offline response
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Offline - no cached data available',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle Image Requests - Cache-First Strategy
 */
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached, but update in background
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        caches.open(CACHE_IMAGES).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => {
      // Ignore network errors for background updates
    });

    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_IMAGES);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return transparent 1x1 pixel as placeholder when offline
    console.log('[SW] Image not available offline:', request.url);

    // Create a transparent 1x1 GIF
    const transparentGif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const blob = Uint8Array.from(atob(transparentGif), c => c.charCodeAt(0));

    return new Response(blob, {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'image/gif' }
    });
  }
}

/**
 * Handle Static Requests - Network-First for HTML, Cache-First for assets
 */
async function handleStaticRequest(request) {
  const url = new URL(request.url);
  const isHTMLPage = url.pathname === '/' ||
                     url.pathname === '/settings' ||
                     url.pathname.startsWith('/video/') ||
                     request.headers.get('accept')?.includes('text/html');

  // Development/localhost: never cache HTML or static assets.
  // This prevents "ChunkLoadError" when the dev server recompiles and filenames change.
  if (IS_LOCALHOST) {
    return fetch(request);
  }

  // For HTML pages: Network-First (so updates are loaded when online)
  if (isHTMLPage) {
    console.log('[SW] HTML page detected:', url.pathname, 'isHTMLPage:', isHTMLPage);

    // For video detail pages, use a generic cache key so any video HTML works for all videos
    let cacheUrl;
    let cacheRequest;

    if (url.pathname.startsWith('/video/')) {
      // Cache all video detail pages under the same key
      cacheUrl = new URL('/video/[videoId]', url.origin);
      cacheRequest = new Request(cacheUrl.toString(), {
        headers: request.headers,
        method: 'GET',
      });
      console.log('[SW] Using generic video cache key:', cacheUrl.pathname);
    } else {
      // For other pages, cache normally without query params
      cacheUrl = new URL(url.pathname, url.origin);
      cacheRequest = new Request(cacheUrl.toString(), {
        headers: request.headers,
        method: 'GET',
      });
    }

    try {
      console.log('[SW] Trying network for HTML:', url.pathname);
      const response = await fetch(request);

      // Only cache actual HTML, not RSC payload
      if (response && response.status === 200) {
        const contentType = response.headers.get('content-type');
        const isActualHTML = contentType && contentType.includes('text/html');
        const isRSCRequest = url.searchParams.has('_rsc');

        if (isActualHTML && !isRSCRequest) {
          const cache = await caches.open(CACHE_STATIC);
          cache.put(cacheRequest, response.clone());
          console.log('[SW] ✅ Cached HTML:', cacheUrl.pathname, '(original:', url.pathname + ')');
        } else {
          console.log('[SW] ⚠️ Not caching - RSC payload or wrong content-type:', contentType);
        }
      } else {
        console.log('[SW] ❌ Not caching - status:', response.status);
      }

      return response;
    } catch (error) {
      // Fallback to cache when offline
      console.log('[SW] Network failed for HTML, checking cache:', url.pathname);
      const cachedResponse = await caches.match(cacheRequest);

      if (cachedResponse) {
        console.log('[SW] Serving HTML from cache:', cacheUrl.pathname, 'for', url.pathname);
        return cachedResponse;
      }

      // If it's a video page and we don't have the generic cache, try the homepage
      if (url.pathname.startsWith('/video/')) {
        console.log('[SW] Video page not cached, trying homepage fallback...');
        const homeCache = await caches.match(new URL('/', url.origin).toString());
        if (homeCache) {
          console.log('[SW] Serving homepage HTML for video page');
          return homeCache;
        }
      }

      // If no cache available, return error message
      console.log('[SW] ❌ No HTML cache available');

      return new Response(`
        <!DOCTYPE html>
        <html lang="en" class="dark">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Offline - Cache Missing</title>
            <style>
              body {
                background: #171717;
                color: #fafafa;
                font-family: system-ui, sans-serif;
                padding: 20px;
                max-width: 600px;
                margin: 0 auto;
              }
              .error {
                background: #7f1d1d;
                border: 1px solid #991b1b;
                padding: 20px;
                border-radius: 8px;
                margin-top: 100px;
              }
              h1 { margin-top: 0; }
              ol { margin: 20px 0; padding-left: 20px; }
              li { margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>⚠️ Offline Mode Not Ready</h1>
              <p>The app hasn't been cached yet. To use offline mode:</p>
              <ol>
                <li><strong>Go ONLINE</strong></li>
                <li><strong>Visit the homepage</strong> (https://fresh2table.de/)</li>
                <li><strong>Wait for it to fully load</strong></li>
                <li><strong>Then go offline</strong></li>
              </ol>
              <p>This only needs to be done once!</p>
            </div>
          </body>
        </html>
      `, {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      });
    }
  }

  // For other static assets: Cache-First
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);

    // Return cached version if available
    const fallbackResponse = await caches.match(request);
    if (fallbackResponse) {
      return fallbackResponse;
    }

    // Return offline response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Helper Functions for IndexedDB Access
 */

/**
 * Create a consistent offline error response
 */
function createOfflineErrorResponse(message) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message || 'Offline - no cached data available',
      offline: true,
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Open IndexedDB connection
 */
async function openOfflineDB() {
  if (!self.idb || !self.idb.openDB) {
    console.error('[SW] idb library not loaded!');
    throw new Error('idb library not available');
  }

  return self.idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('videos')) {
        const videoStore = db.createObjectStore('videos', { keyPath: 'Id' });
        videoStore.createIndex('by-videoId', 'VideoID');
        videoStore.createIndex('by-publishedAt', 'PublishedAt');
        videoStore.createIndex('by-createdAt', 'CreatedAt');
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
      if (!db.objectStoreNames.contains('pendingMutations')) {
        const mutationStore = db.createObjectStore('pendingMutations', { keyPath: 'id' });
        mutationStore.createIndex('by-timestamp', 'timestamp');
        mutationStore.createIndex('by-videoId', 'videoId');
      }
    },
  });
}

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function sanitizeVideoForOffline(video) {
  const sanitized = { ...video };

  // Never store transcript fields in IndexedDB offline cache.
  delete sanitized.Transcript;
  delete sanitized.FullTranscript;

  // Normalize common date fields so our IndexedDB indexes stay consistent.
  const createdAt = normalizeDateValue(sanitized.CreatedAt);
  const updatedAt = normalizeDateValue(sanitized.UpdatedAt);
  const publishedAt = normalizeDateValue(sanitized.PublishedAt);
  const completionDate = normalizeDateValue(sanitized.CompletionDate);

  if (createdAt) sanitized.CreatedAt = createdAt;
  if (updatedAt) sanitized.UpdatedAt = updatedAt;
  if (publishedAt) sanitized.PublishedAt = publishedAt;
  if (completionDate) sanitized.CompletionDate = completionDate;

  return sanitized;
}

async function upsertVideoInIndexedDB(video) {
  if (!video || typeof video !== 'object' || typeof video.Id !== 'number') {
    return;
  }

  const db = await openOfflineDB();
  const existing = await db.get('videos', video.Id);
  const merged = existing ? { ...existing, ...video } : video;
  await db.put('videos', merged);
}

/**
 * Check if offline mode is enabled
 */
async function getOfflineModeFromDB() {
  try {
    const db = await openOfflineDB();
    const offlineMode = await db.get('metadata', 'offlineModeEnabled');
    return offlineMode === true;
  } catch (error) {
    console.error('[SW] Error checking offline mode:', error);
    return false;
  }
}

/**
 * Get a single video by VideoID from IndexedDB
 */
async function getVideoByIdFromIndexedDB(videoId) {
  try {
    const db = await openOfflineDB();

    // Get video by VideoID index
    const tx = db.transaction('videos', 'readonly');
    const index = tx.store.index('by-videoId');
    const video = await index.get(videoId);

    if (video) {
      console.log('[SW] Found video in IndexedDB:', videoId);
      console.log('[SW] Video fields:', Object.keys(video).sort());
      console.log('[SW] Video has summary fields:', {
        hasMainSummary: !!video.MainSummary,
        hasTLDR: !!video.TLDR,
        hasActionableAdvice: !!video.ActionableAdvice,
        hasDetailedNarrativeFlow: !!video.DetailedNarrativeFlow,
        hasURL: !!video.URL,
        hasMainTopic: !!video.MainTopic,
        title: video.Title,
        Id: video.Id,
        VideoID: video.VideoID
      });
      console.log('[SW] Full video object:', video);
      return video;
    }

    console.log('[SW] Video not found in IndexedDB:', videoId);
    return null;
  } catch (error) {
    console.error('[SW] Error reading video from IndexedDB:', error);
    throw error;
  }
}

/**
 * Get videos from IndexedDB
 */
async function getVideosFromIndexedDB(request) {
  try {
    const db = await openOfflineDB();

    // Get all videos sorted by CreatedAt (newest first)
    const tx = db.transaction('videos', 'readonly');
    const index = tx.store.index('by-createdAt');
    const allVideos = await index.getAll();

    // Sort descending (newest first)
    allVideos.sort((a, b) => {
      const dateA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
      const dateB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Parse query parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '35');

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedVideos = allVideos.slice(start, end);

    const totalRows = allVideos.length;
    const pageCount = Math.ceil(totalRows / limit);
    const hasNextPage = page < pageCount;

    console.log(`[SW] IndexedDB: Total ${totalRows}, page ${page}/${pageCount}, returning ${paginatedVideos.length} videos, hasNext: ${hasNextPage}`);

    return {
      videos: paginatedVideos,
      pageInfo: {
        page: page,
        totalRows: totalRows,
        pageCount: pageCount,
        isFirstPage: page === 1,
        isLastPage: !hasNextPage,
        hasNextPage: hasNextPage,
      },
    };
  } catch (error) {
    console.error('[SW] Error reading from IndexedDB:', error);
    throw error;
  }
}

console.log('[SW] Service Worker loaded');
