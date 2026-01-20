import { NextResponse } from 'next/server';

import { buildPlaylistItemsUrl, mapPlaylistResponse } from '@/features/saved/youtube';

// Keep the API lightweight: fetch a page of playlist items and forward them to the client.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageToken = searchParams.get('pageToken') ?? undefined;
  const playlistId = searchParams.get('playlistId') ?? process.env.YOUTUBE_SAVED_PLAYLIST_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!playlistId || !apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing YOUTUBE_API_KEY or YOUTUBE_SAVED_PLAYLIST_ID environment variables.',
      },
      { status: 400 },
    );
  }

  const url = buildPlaylistItemsUrl({ apiKey, playlistId, pageToken });
  const response = await fetch(url);

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `YouTube API error: ${response.status} ${response.statusText}`,
      },
      { status: response.status },
    );
  }

  const data = (await response.json()) as unknown;
  const mapped = mapPlaylistResponse(data as Parameters<typeof mapPlaylistResponse>[0], playlistId);

  return NextResponse.json({
    success: true,
    items: mapped.items,
    nextPageToken: mapped.nextPageToken ?? null,
  });
}
