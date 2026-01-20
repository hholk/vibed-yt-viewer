'use client';

import { useEffect, useState } from 'react';

import { SavedVideoCard } from './saved-video-card';
import type { SavedVideo } from '../types';
import {
  getCachedSavedVideos,
  getSavedCacheMetadata,
  replaceSavedVideos,
} from '../db/client';

interface SavedListResponse {
  success: boolean;
  items: SavedVideo[];
  playlistTitle?: string;
  cacheLimitBytes: number;
  error?: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const base = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, base);
  return `${value.toFixed(1)} ${units[base]}`;
};

/**
 * Fetches the "Saved" playlist and displays it with caching for offline use.
 */
export function SavedList() {
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);
  const [cacheMeta, setCacheMeta] = useState<{ totalBytes: number; updatedAt: string | null }>({
    totalBytes: 0,
    updatedAt: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadCached = async () => {
      try {
        const [cached, metadata] = await Promise.all([
          getCachedSavedVideos(),
          getSavedCacheMetadata(),
        ]);
        if (isMounted && cached.length > 0) {
          setSavedVideos(cached);
          setCacheMeta(metadata);
        }
      } catch (cacheError) {
        console.warn('Failed to load saved cache:', cacheError);
      }
    };

    const fetchSaved = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/youtube/saved');
        const data = (await response.json()) as SavedListResponse;

        if (!data.success) {
          throw new Error(data.error || 'Failed to load saved playlist.');
        }

        if (!isMounted) {
          return;
        }

        setSavedVideos(data.items);
        setPlaylistTitle(data.playlistTitle ?? 'Saved');

        const cacheResult = await replaceSavedVideos(data.items);
        setCacheMeta({
          totalBytes: cacheResult.totalBytes,
          updatedAt: new Date().toISOString(),
        });
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error.';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCached();
    void fetchSaved();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">
            {playlistTitle ?? 'Saved'} Playlist
          </h2>
          <p className="text-sm text-neutral-400">
            Cache size: {formatBytes(cacheMeta.totalBytes)} · Last updated:{' '}
            {cacheMeta.updatedAt ? new Date(cacheMeta.updatedAt).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isLoading && savedVideos.length === 0 ? (
        <p className="text-sm text-neutral-400">Loading saved videos…</p>
      ) : savedVideos.length === 0 ? (
        <p className="text-sm text-neutral-400">No saved videos found yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {savedVideos.map(video => (
            <SavedVideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
