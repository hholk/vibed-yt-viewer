import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockAxiosCreate = vi.fn(() => ({
  get: mockGet,
  patch: mockPatch,
  delete: mockDelete,
}));

vi.mock('axios', () => {
  const axiosModule = {
    create: mockAxiosCreate,
    isAxiosError: (error: unknown): error is { isAxiosError: true; response?: { status?: number; data?: unknown }; config?: { url?: string } } =>
      typeof error === 'object' && error !== null && (error as { isAxiosError?: boolean }).isAxiosError === true,
  };
  return {
    default: axiosModule,
    create: mockAxiosCreate,
    isAxiosError: axiosModule.isAxiosError,
  };
});

const cacheStore = new Map<string, unknown>();
const mockGetFromCache = vi.fn((key: string) => (cacheStore.has(key) ? cacheStore.get(key) ?? null : null));
const mockSetInCache = vi.fn((key: string, value: unknown) => {
  cacheStore.set(key, value);
});
const mockDeleteFromCache = vi.fn((key: string) => {
  cacheStore.delete(key);
});

vi.mock('./cache', () => ({
  getFromCache: mockGetFromCache,
  setInCache: mockSetInCache,
  deleteFromCache: mockDeleteFromCache,
}));

const ORIGINAL_ENV = { ...process.env };

async function loadClient() {
  return import('./nocodb');
}

beforeEach(() => {
  vi.resetModules();
  cacheStore.clear();
  mockGet.mockReset();
  mockPatch.mockReset();
  mockDelete.mockReset();
  mockAxiosCreate.mockReset();
  mockGetFromCache.mockClear();
  mockSetInCache.mockClear();
  mockDeleteFromCache.mockClear();
  mockAxiosCreate.mockImplementation(() => ({
    get: mockGet,
    patch: mockPatch,
    delete: mockDelete,
  }));

  process.env = {
    ...ORIGINAL_ENV,
    NC_URL: 'http://nocodb.test',
    NC_TOKEN: 'token-123',
    NOCODB_PROJECT_ID: 'project-abc',
    NOCODB_TABLE_ID: 'table-xyz',
  };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('NocoDB client usage', () => {
  it('fetchVideos constructs the expected request and parses data', async () => {
    const responsePayload = {
      list: [
        {
          Id: 1,
          VideoID: 'vid-1',
          Title: 'Testvideo',
          ThumbHigh: [{ url: 'https://img.example/thumb.jpg' }],
        },
      ],
      pageInfo: {
        totalRows: 1,
        page: 2,
        pageSize: 10,
        isFirstPage: false,
        isLastPage: true,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };
    mockGet.mockResolvedValue({ data: responsePayload });

    const { fetchVideos } = await loadClient();

    const result = await fetchVideos({
      page: 2,
      limit: 10,
      sort: '-CreatedAt',
      fields: ['Id', 'Title'],
      tagSearchQuery: 'ai research',
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [url, options] = mockGet.mock.calls[0];
    expect(url).toBe('http://nocodb.test/api/v2/tables/table-xyz/records');
    expect(options?.headers).toEqual({ 'xc-token': 'token-123' });
    expect(options?.params).toMatchObject({
      limit: 10,
      offset: 10,
      sort: '-CreatedAt',
      fields: 'Id,Title',
    });
    expect(String(options?.params?.where)).toContain('%ai%');
    expect(String(options?.params?.where)).toContain('%research%');

    expect(result.videos).toHaveLength(1);
    expect(result.videos[0]).toMatchObject({
      Id: 1,
      Title: 'Testvideo',
      ThumbHigh: 'https://img.example/thumb.jpg',
    });
    expect(result.pageInfo.page).toBe(2);
    expect(result.pageInfo.pageSize).toBe(10);
  });

  it('fetchVideos returns empty result when the API responds with 404', async () => {
    const error = {
      isAxiosError: true as const,
      response: { status: 404 },
      config: { url: 'http://nocodb.test/api/v2/tables/table-xyz/records' },
    };
    mockGet.mockRejectedValue(error);

    const { fetchVideos } = await loadClient();
    const result = await fetchVideos({ page: 3, limit: 5 });

    expect(result.videos).toEqual([]);
    expect(result.pageInfo).toMatchObject({
      page: 3,
      pageSize: 5,
      isFirstPage: true,
      isLastPage: true,
      hasNextPage: false,
    });
  });

  it('fetchVideoByVideoId caches successful lookups', async () => {
    const responsePayload = {
      list: [
        {
          Id: 42,
          VideoID: 'cached-video',
          Title: 'Cached Result',
          ThumbHigh: [{ url: 'https://img.example/thumb.jpg' }],
        },
      ],
      pageInfo: {
        totalRows: 1,
        page: 1,
        pageSize: 1,
        isFirstPage: true,
        isLastPage: true,
      },
    };

    mockGetFromCache.mockImplementationOnce(() => null).mockImplementationOnce((key: string) => cacheStore.get(key) ?? null);
    mockGet.mockResolvedValue({ data: responsePayload });

    const { fetchVideoByVideoId } = await loadClient();

    const first = await fetchVideoByVideoId('cached-video');
    expect(first?.Id).toBe(42);
    expect(mockSetInCache).toHaveBeenCalledWith('cached-video', expect.any(Object));

    const second = await fetchVideoByVideoId('cached-video');
    expect(second?.Id).toBe(42);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('resolveNumericId resolves string based IDs via API lookup', async () => {
    const responsePayload = {
      list: [
        {
          Id: 77,
          VideoID: 'video-string',
          Title: 'Lookup Result',
          ThumbHigh: [{ url: 'https://img.example/thumb.jpg' }],
        },
      ],
      pageInfo: {
        totalRows: 1,
        page: 1,
        pageSize: 1,
        isFirstPage: true,
        isLastPage: true,
      },
    };
    mockGet.mockResolvedValue({ data: responsePayload });

    const { resolveNumericId } = await loadClient();
    const numericId = await resolveNumericId('video-string');

    expect(numericId).toBe(77);
    expect(mockGet).toHaveBeenCalled();
  });

  it('updateVideo issues a PATCH request and refreshes cache entries', async () => {
    const responsePayload = {
      Id: 55,
      VideoID: 'video-55',
      Title: 'Updated',
      ThumbHigh: [{ url: 'https://img.example/thumb.jpg' }],
    };
    mockPatch.mockResolvedValue({ data: responsePayload });

    const { updateVideo } = await loadClient();
    const updated = await updateVideo(55, { ImportanceRating: '4', Watched: true });

    expect(updated.VideoID).toBe('video-55');
    expect(mockPatch).toHaveBeenCalledWith(
      'http://nocodb.test/api/v2/tables/table-xyz/records/55',
      expect.objectContaining({ ImportanceRating: 4, Watched: true }),
      expect.objectContaining({ headers: { 'xc-token': 'token-123', 'Content-Type': 'application/json' } })
    );
    expect(mockSetInCache).toHaveBeenCalledWith('video-55', expect.any(Object));
    expect(mockSetInCache).toHaveBeenCalledWith('55', expect.any(Object));
  });

  it('deleteVideo removes cached entries and sends DELETE request', async () => {
    mockDelete.mockResolvedValue({});

    const { deleteVideo } = await loadClient();
    await deleteVideo(88);

    expect(mockDelete).toHaveBeenCalledWith(
      'http://nocodb.test/api/v2/tables/table-xyz/records/88',
      expect.objectContaining({ headers: { 'xc-token': 'token-123' } })
    );
    expect(mockDeleteFromCache).toHaveBeenCalledWith('88');
  });

  it('fetchAllVideos paginates and caches the aggregated result', async () => {
    const firstPage = {
      list: [
        {
          Id: 1,
          VideoID: 'page-1',
          Title: 'First Page',
          ThumbHigh: [{ url: 'https://img.example/thumb1.jpg' }],
        },
      ],
      pageInfo: {
        totalRows: 30,
        page: 1,
        pageSize: 25,
        isFirstPage: true,
        isLastPage: false,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };
    const secondPage = {
      list: [
        {
          Id: 2,
          VideoID: 'page-2',
          Title: 'Second Page',
          ThumbHigh: [{ url: 'https://img.example/thumb2.jpg' }],
        },
      ],
      pageInfo: {
        totalRows: 30,
        page: 2,
        pageSize: 25,
        isFirstPage: false,
        isLastPage: true,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };

    mockGet.mockResolvedValueOnce({ data: firstPage }).mockResolvedValueOnce({ data: secondPage });

    const { fetchAllVideos } = await loadClient();
    const videos = await fetchAllVideos();

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(videos).toHaveLength(2);
    expect(mockSetInCache).toHaveBeenCalledWith('{}', videos);
  });
});
