"use client";

import { useState, useEffect } from 'react';
import { getVideoCount, estimateCacheSize, getMetadata, getPendingMutationsCount } from '../db/client';

interface OfflineStats {
  cachedVideos: number;
  cacheSizeMB: number;
  lastSync: Date | null;
  pendingMutations: number;
  isLoading: boolean;
}

export function useOfflineStats() {
  const [stats, setStats] = useState<OfflineStats>({
    cachedVideos: 0,
    cacheSizeMB: 0,
    lastSync: null,
    pendingMutations: 0,
    isLoading: true,
  });

  const loadStats = async () => {
    try {
      const [cacheStats, pendingCount] = await Promise.all([
        (async () => {
          const count = await getVideoCount();
          const size = await estimateCacheSize();
          const lastSync = await getMetadata<number>('lastSync');
          return {
            cachedVideos: count,
            cacheSizeBytes: size,
            cacheSizeMB: Math.round(size / 1024 / 1024),
            lastSync: lastSync ? new Date(lastSync) : null,
          };
        })(),
        getPendingMutationsCount(),
      ]);

      setStats({
        cachedVideos: cacheStats.cachedVideos,
        cacheSizeMB: cacheStats.cacheSizeMB,
        lastSync: cacheStats.lastSync,
        pendingMutations: pendingCount,
        isLoading: false,
      });
    } catch (error) {
      console.error('[useOfflineStats] Failed to load stats:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    loadStats();

    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);

    return () => clearInterval(interval);
  }, []);

  return { ...stats, refresh: loadStats };
}
