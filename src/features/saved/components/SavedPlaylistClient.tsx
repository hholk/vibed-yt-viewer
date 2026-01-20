"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Loader2 } from 'lucide-react';

import { cachePlaylistItems, getCachedPlaylistItems, getSavedMetadata } from '../db/client';
import type { SavedPlaylistItem } from '../types';
import { SavedVideoCard } from './SavedVideoCard';

type PlaylistResponse = {
  success: boolean;
  items: SavedPlaylistItem[];
  nextPageToken?: string;
  error?: string;
};

export function SavedPlaylistClient() {
  const [items, setItems] = useState<SavedPlaylistItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);

  const totalVideos = items.length;

  const refreshMetadata = useCallback(async () => {
    const [cachedSync, cachedBytes] = await Promise.all([
      getSavedMetadata('lastSync'),
      getSavedMetadata('totalCacheBytes'),
    ]);

    setLastSync(typeof cachedSync === 'string' ? cachedSync : null);
    setCacheBytes(typeof cachedBytes === 'number' ? cachedBytes : null);
  }, []);

  const fetchPlaylist = useCallback(
    async (append: boolean) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (append && nextPageToken) {
          params.set('pageToken', nextPageToken);
        }

        const response = await fetch(`/api/youtube/playlist?${params.toString()}`);
        const data = (await response.json()) as PlaylistResponse;

        if (!data.success) {
          setErrorMessage(data.error ?? 'Failed to load saved playlist.');
          return;
        }

        setNextPageToken(data.nextPageToken ?? null);

        setItems((prev) => {
          const nextItems = append ? [...prev, ...data.items] : data.items;
          cachePlaylistItems(nextItems).then(refreshMetadata);
          return nextItems;
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error loading playlist.');
      } finally {
        setIsLoading(false);
      }
    },
    [nextPageToken, refreshMetadata],
  );

  useEffect(() => {
    // Load cached items first so the UI shows something even before the API call finishes.
    getCachedPlaylistItems()
      .then((cached) => {
        if (cached.length > 0) {
          setItems(cached);
        }
      })
      .catch(() => {
        // Ignore cache errors; the network fetch will still run.
      })
      .finally(() => {
        refreshMetadata();
        fetchPlaylist(false);
      });
  }, [fetchPlaylist, refreshMetadata]);

  const formattedCacheSize = useMemo(() => {
    if (!cacheBytes) return '0 MB';
    const mb = cacheBytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }, [cacheBytes]);

  return (
    <div className="space-y-4">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-4 text-sm text-neutral-300 space-y-1">
          <p>
            {totalVideos} saved videos cached locally. Cache size: {formattedCacheSize}.
          </p>
          <p>Last sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}</p>
        </CardContent>
      </Card>

      {errorMessage && (
        <Card className="bg-red-950 border-red-900">
          <CardContent className="p-4 text-sm text-red-200">{errorMessage}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <SavedVideoCard key={item.id} item={item} />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          onClick={() => fetchPlaylist(true)}
          disabled={isLoading || !nextPageToken}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {nextPageToken ? 'Load More' : 'All videos loaded'}
        </Button>
      </div>
    </div>
  );
}
