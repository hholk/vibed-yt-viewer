import { describe, expect, it } from 'vitest';

import { buildPlaylistItemsUrl, mapPlaylistResponse } from './youtube';

describe('saved playlist helpers', () => {
  it('buildPlaylistItemsUrl includes required params', () => {
    const url = buildPlaylistItemsUrl({
      apiKey: 'test-key',
      playlistId: 'playlist-123',
      pageToken: 'token-1',
      maxResults: 25,
    });

    expect(url).toContain('playlistItems');
    expect(url).toContain('part=snippet');
    expect(url).toContain('maxResults=25');
    expect(url).toContain('playlistId=playlist-123');
    expect(url).toContain('pageToken=token-1');
    expect(url).toContain('key=test-key');
  });

  it('mapPlaylistResponse normalizes playlist items', () => {
    const result = mapPlaylistResponse(
      {
        nextPageToken: 'next-1',
        items: [
          {
            id: 'item-1',
            snippet: {
              title: 'Saved video',
              channelTitle: 'Channel',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: {
                high: { url: 'https://example.com/thumb.jpg' },
              },
              resourceId: { videoId: 'video-1' },
              playlistId: 'playlist-123',
            },
          },
        ],
      },
      'fallback',
    );

    expect(result.nextPageToken).toBe('next-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'item-1',
      videoId: 'video-1',
      title: 'Saved video',
      channelTitle: 'Channel',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      playlistId: 'playlist-123',
    });
  });
});
