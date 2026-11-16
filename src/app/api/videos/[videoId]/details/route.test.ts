import { beforeEach, describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/features/videos/api/nocodb', () => ({
  fetchVideoByVideoId: vi.fn(), fetchAllVideos: vi.fn(),
  getVideoNavigationData: vi.fn(), getSimpleNavigationData: vi.fn(), videoListItemSchema: { shape: { Id: {}, VideoID: {}, Title: {}, Channel: {} } },
}));
import { fetchVideoByVideoId, fetchAllVideos, getVideoNavigationData } from '@/features/videos/api/nocodb';
import { GET } from './route';
const videos = [
  { Id: 1, VideoID: 'a', Title: 'A', Channel: '100%' },
  { Id: 2, VideoID: 'b', Title: 'B', Channel: 'other' },
  { Id: 3, VideoID: 'c', Title: 'C', Channel: '100%' },
];
beforeEach(() => { vi.resetAllMocks(); });
async function request(id: string, query: string) {
  vi.mocked(fetchVideoByVideoId).mockResolvedValue(videos.find(v => v.VideoID === id) as never);
  vi.mocked(fetchAllVideos).mockResolvedValue(videos as never);
  return (await GET(new NextRequest(`http://localhost/api/videos/${id}/details?${query}`), { params: { videoId: id } })).json();
}
describe('filtered navigation', () => {
  it('skips nonmatching records and preserves sort', async () => {
    const result = await request('a', 'f=channel:100%25&sort=Title');
    expect(result.previousVideo).toBeNull();
    expect(result.nextVideo).toEqual({ Id: 'c', Title: 'C' });
    expect(fetchAllVideos).toHaveBeenCalledWith(expect.objectContaining({ sort: 'Title' }));
    expect(getVideoNavigationData).not.toHaveBeenCalled();
  });
  it('never falls back to unfiltered neighbors at an edge or for a nonmatch', async () => {
    const end = await request('c', 'f=channel:100%25');
    expect(end.nextVideo).toBeNull();
    expect(end.previousVideo?.Id).toBe('a');
    const outside = await request('b', 'f=channel:100%25');
    expect(outside.previousVideo).toBeNull();
    expect(outside.nextVideo).toBeNull();
  });
  it('retains original navigation when no valid filters are present', async () => {
    vi.mocked(getVideoNavigationData).mockResolvedValue({ previousVideoData: null, nextVideoData: { Id: 'b', Title: 'B' } });
    const result = await request('a', 'f=__proto__:x&sort=-Title');
    expect(result.nextVideo.Id).toBe('b');
    expect(getVideoNavigationData).toHaveBeenCalledWith('a', '-Title');
    expect(fetchAllVideos).not.toHaveBeenCalled();
  });
});
