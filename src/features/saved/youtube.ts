import type { SavedPlaylistItem } from './types';

type PlaylistItemResponse = {
  nextPageToken?: string;
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
      resourceId?: {
        videoId?: string;
      };
      playlistId?: string;
    };
  }>;
};

type BuildUrlOptions = {
  apiKey: string;
  playlistId: string;
  pageToken?: string;
  maxResults?: number;
};

// Build the YouTube Data API URL in one place so we can test it easily.
export function buildPlaylistItemsUrl({
  apiKey,
  playlistId,
  pageToken,
  maxResults = 50,
}: BuildUrlOptions) {
  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('playlistId', playlistId);
  url.searchParams.set('key', apiKey);

  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  return url.toString();
}

// Convert the API response into the smaller shape the UI needs.
export function mapPlaylistResponse(
  response: PlaylistItemResponse,
  fallbackPlaylistId: string,
): { items: SavedPlaylistItem[]; nextPageToken?: string } {
  const items =
    response.items?.map((item) => {
      const snippet = item.snippet;
      const thumbnails = snippet?.thumbnails;
      const thumbnailUrl =
        thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url || null;

      return {
        id: item.id ?? '',
        videoId: snippet?.resourceId?.videoId ?? '',
        title: snippet?.title ?? 'Untitled video',
        channelTitle: snippet?.channelTitle ?? 'Unknown channel',
        thumbnailUrl,
        publishedAt: snippet?.publishedAt ?? null,
        playlistId: snippet?.playlistId ?? fallbackPlaylistId,
      };
    }) ?? [];

  return { items, nextPageToken: response.nextPageToken };
}
