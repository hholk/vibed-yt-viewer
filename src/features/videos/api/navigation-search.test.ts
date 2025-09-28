import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getVideoNavigationDataWithSearchContext } from '../src/features/videos/api/nocodb';

// Mock the dependencies
vi.mock('../src/features/videos/api/nocodb', async () => {
  const actual = await vi.importActual('../src/features/videos/api/nocodb');
  return {
    ...actual,
    getNocoDBConfig: vi.fn(() => ({
      url: 'http://localhost:8080',
      token: 'test-token',
      tableId: 'test-table-id'
    })),
    getFromCache: vi.fn(() => null),
    setInCache: vi.fn(),
    logDevEvent: vi.fn(),
    logDevError: vi.fn()
  };
});

describe('Search-aware Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty navigation data when no search context is provided', async () => {
    const result = await getVideoNavigationDataWithSearchContext('test-video-id', undefined, undefined);

    expect(result).toEqual({
      previousVideoData: null,
      nextVideoData: null
    });
  });

  it('should return empty navigation data when video is not found', async () => {
    const result = await getVideoNavigationDataWithSearchContext('non-existent-video-id', 'test query', ['title']);

    expect(result).toEqual({
      previousVideoData: null,
      nextVideoData: null
    });
  });

  it('should handle search context properly', async () => {
    // This test would require mocking the API responses
    // For now, we'll just test the function signature and basic error handling
    const result = await getVideoNavigationDataWithSearchContext('test-video-id', 'test query', ['title']);

    expect(result).toHaveProperty('previousVideoData');
    expect(result).toHaveProperty('nextVideoData');
    expect(result.previousVideoData).toBeNull();
    expect(result.nextVideoData).toBeNull();
  });
});
