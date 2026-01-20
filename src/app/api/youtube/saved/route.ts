import { NextResponse } from 'next/server';
import ytpl from '@distube/ytpl';

import type { SavedVideo } from '@/features/saved/types';
import { SAVED_CACHE_LIMIT_BYTES } from '@/features/saved/db/schema';

const PLAYLIST_ID = process.env.YOUTUBE_SAVED_PLAYLIST_ID;

const mapPlaylistItem = (item: {
  id: string;
  title: string;
  url: string;
  shortUrl?: string;
  duration?: string | null;
  bestThumbnail?: { url?: string | null } | null;
  thumbnail?: string | null;
  author?: { name?: string | null } | null;
}) => {
  const now = new Date().toISOString();
  return {
    id: item.id,
    title: item.title,
    url: item.shortUrl || item.url,
    duration: item.duration ?? null,
    channel: item.author?.name ?? null,
    thumbnailUrl: item.bestThumbnail?.url ?? item.thumbnail ?? null,
    addedAt: now,
  } satisfies SavedVideo;
};

/**
 * Fetch the "Saved" YouTube playlist for the authenticated account.
 * The playlist ID must be provided via environment variable.
 */
export async function GET() {
  if (!PLAYLIST_ID) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing YOUTUBE_SAVED_PLAYLIST_ID environment variable.',
      },
      { status: 500 },
    );
  }

  try {
    const playlist = await ytpl(PLAYLIST_ID, { limit: 200 });
    const items = playlist.items.map(mapPlaylistItem);

    return NextResponse.json({
      success: true,
      items,
      playlistTitle: playlist.title,
      cacheLimitBytes: SAVED_CACHE_LIMIT_BYTES,
    });
  } catch (error) {
    console.error('Failed to fetch saved playlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch saved playlist.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
