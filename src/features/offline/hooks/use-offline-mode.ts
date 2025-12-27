"use client";

import { useState, useEffect, useCallback } from 'react';
import { getOfflineMode, setOfflineMode as setOfflineModeDB, isOnline } from '../offline-mode';
import {
  clearAllVideos,
  putVideos,
  getAllPendingMutations,
  deletePendingMutation,
  getMetadata,
  setMetadata,
  estimateCacheSize,
} from '../db/client';
import type { VideoOffline } from '../schemas';

const OFFLINE_CACHE_PAYLOAD_VERSION = 2;

/**
 * Sync cache - fetch videos from server and store in IndexedDB
 */
async function syncCache(): Promise<{ videosUpdated: number; timestamp: number }> {
  console.log('[syncCache] Fetching videos from server (this may take a while for slow connections)...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

  try {
    const response = await fetch('/api/offline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cache' }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[syncCache] Server error:', errorText);
      throw new Error(`Failed to fetch videos (status ${response.status}): ${errorText}`);
    }

    const { videos, timestamp, totalAvailable } = await response.json();
    console.log(`[syncCache] Received ${videos.length} videos from server (${totalAvailable} total available)`);

    if (!videos || videos.length === 0) {
      console.warn('[syncCache] WARNING: No videos received from server!');
      console.warn('[syncCache] This could be due to:');
      console.warn('  - No videos in database');
      console.warn('  - Network timeout (slow connection)');
      console.warn('  - Server error during fetch');

      // Still update metadata to show sync attempt
      await setMetadata('lastSync', timestamp);
      return { videosUpdated: 0, timestamp };
    }

    // Clear old videos and store new ones
    console.log('[syncCache] Clearing old cached videos...');
    await clearAllVideos();

    console.log('[syncCache] Storing new videos in IndexedDB...');
    await putVideos(videos as VideoOffline[]);

    // Update metadata
    await setMetadata('lastSync', timestamp);
    await setMetadata('offlineCachePayloadVersion', OFFLINE_CACHE_PAYLOAD_VERSION);
    const cacheSize = await estimateCacheSize();
    await setMetadata('totalCacheSize', cacheSize);

    console.log(`[syncCache] Successfully stored ${videos.length} videos in IndexedDB (cache size: ${Math.round(cacheSize / 1024 / 1024)} MB)`);

    return { videosUpdated: videos.length, timestamp };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[syncCache] Sync timed out after 2 minutes. Connection too slow.');
      throw new Error('Sync timed out - connection too slow. Try again with a faster connection.');
    }

    throw error;
  }
}

interface SyncError {
  mutationId: string;
  error: string;
}

/**
 * Sync mutations - send pending changes to server
 */
async function syncMutations(): Promise<{ synced: number; errors: SyncError[] }> {
  console.log('[syncMutations] Fetching pending mutations...');

  const mutations = await getAllPendingMutations();
  console.log(`[syncMutations] Found ${mutations.length} pending mutations`);

  if (mutations.length === 0) {
    return { synced: 0, errors: [] };
  }

  const response = await fetch('/api/offline/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mutations', mutations }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to sync mutations: ${errorText}`);
  }

  const { synced, errors } = await response.json();
  console.log(`[syncMutations] Synced ${synced}/${mutations.length} mutations`);

  // Remove successfully synced mutations from queue
  // (failures remain for retry)
  for (const mutation of mutations) {
    const failed = errors.some((e: SyncError) => e.mutationId === mutation.id);
    if (!failed) {
      await deletePendingMutation(mutation.id);
    }
  }

  return { synced, errors };
}

/**
 * Full sync - mutations first, then cache
 */
async function fullSync() {
  console.log('[fullSync] Starting full sync...');

  // 1. Sync mutations first
  const mutationResult = await syncMutations();

  // 2. Refresh cache
  const cacheResult = await syncCache();

  return {
    videosUpdated: cacheResult.videosUpdated,
    mutationsSynced: mutationResult.synced,
    errors: mutationResult.errors,
    lastSyncTime: cacheResult.timestamp,
  };
}

export function useOfflineMode() {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnlineStatus, setIsOnlineStatus] = useState(true);

  // Load initial offline mode state
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const enabled = await getOfflineMode();
      if (cancelled) return;

      setIsOfflineMode(enabled);
      const onlineNow = isOnline();
      setIsOnlineStatus(onlineNow);

      if (!enabled || !onlineNow) return;

      const payloadVersion = await getMetadata<number>('offlineCachePayloadVersion');
      if (cancelled) return;

      if (payloadVersion !== OFFLINE_CACHE_PAYLOAD_VERSION) {
        console.log(
          `[useOfflineMode] Offline cache payload version mismatch (${payloadVersion ?? 'none'} -> ${OFFLINE_CACHE_PAYLOAD_VERSION}), resyncing...`,
        );
        try {
          await syncCache();
        } catch (error) {
          console.error('[useOfflineMode] Auto resync failed:', error);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[useOfflineMode] Browser went online');
      setIsOnlineStatus(true);

      // Trigger sync if offline mode enabled
      if (isOfflineMode) {
        console.log('[useOfflineMode] Syncing pending mutations...');
        try {
          await syncMutations();
        } catch (error) {
          console.error('[useOfflineMode] Sync failed:', error);
        }
      }
    };

    const handleOffline = () => {
      console.log('[useOfflineMode] Browser went offline');
      setIsOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOfflineMode]);

  const toggleOffline = useCallback(async () => {
    const newState = !isOfflineMode;
    await setOfflineModeDB(newState);
    setIsOfflineMode(newState);

    if (newState) {
      // Trigger initial cache sync
      console.log('[useOfflineMode] Offline mode enabled, syncing cache...');
      syncCache().catch(error => {
        console.error('[useOfflineMode] Initial cache sync failed:', error);
      });
    }
  }, [isOfflineMode]);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      console.log('[useOfflineMode] Starting full sync...');
      const result = await fullSync();
      console.log('[useOfflineMode] Sync completed successfully:', result);
      return result;
    } catch (error) {
      console.error('[useOfflineMode] Sync failed:', error);
      // Show user-friendly error
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isOfflineMode,
    isOnline: isOnlineStatus,
    isSyncing,
    toggleOffline,
    syncNow,
  };
}
