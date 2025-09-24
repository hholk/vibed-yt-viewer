import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/videos/api/nocodb', () => ({
  fetchVideos: vi.fn(),
  videoListItemSchema: {},
}));

import { fetchVideos, type PageInfo, type VideoListItem } from '@/features/videos/api/nocodb';

import { loadHomePageData } from './load-home-page-data';

const mockedFetchVideos = vi.mocked(fetchVideos);

describe('loadHomePageData', () => {
  beforeEach(() => {
    mockedFetchVideos.mockReset();
  });

  it('returns videos and page info on success', async () => {
    const pageInfo: PageInfo = { totalRows: 1, page: 1, pageSize: 35, isLastPage: true };
    const videos: Pick<VideoListItem, 'Id'>[] = [{ Id: 1 }];

    mockedFetchVideos.mockResolvedValue({
      videos,
      pageInfo,
    });

    const result = await loadHomePageData({ sort: '-CreatedAt' });

    expect(result.error).toBeNull();
    expect(result.videos).toHaveLength(1);
    expect(result.pageInfo?.totalRows).toBe(1);
  });

  it('returns an error message when fetching fails', async () => {
    mockedFetchVideos.mockRejectedValue(new Error('boom'));

    const result = await loadHomePageData({});

    expect(result.error).toBe('boom');
    expect(result.videos).toHaveLength(0);
    expect(result.pageInfo).toBeNull();
  });
});
