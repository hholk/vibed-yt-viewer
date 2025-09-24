import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/features/videos/api/nocodb', () => ({
  fetchAllVideos: vi.fn(),
  videoListItemSchema: {},
}));

import { fetchAllVideos } from '@/features/videos/api/nocodb';
import { GET } from './route';

const mockedFetchAllVideos = vi.mocked(fetchAllVideos);

describe('/api/search', () => {
  beforeEach(() => {
    mockedFetchAllVideos.mockReset();
  });

  it('should return empty results for empty query', async () => {
    mockedFetchAllVideos.mockResolvedValue([] as never);
    const request = new NextRequest('http://localhost:3000/api/search?q=');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.videos).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.query).toBe('');
  });

  it('should handle search requests correctly', async () => {
    mockedFetchAllVideos.mockResolvedValue([
      {
        Id: 1,
        Title: 'Test Video',
        Description: 'This is a test video',
        Channel: 'Test Channel',
        VideoID: 'test123',
        Hashtags: ['test', 'video'],
        Persons: [{ Title: 'John Doe' }],
        CreatedAt: new Date('2023-01-01'),
      },
    ] as never);

    // Validate that the endpoint responds with the expected shape.
    const request = new NextRequest('http://localhost:3000/api/search?q=test&categories=title,description');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('videos');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('query');
    expect(data).toHaveProperty('categories');
    expect(data).toHaveProperty('availableCategories');
  });
});
