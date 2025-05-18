import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { z } from 'zod';
import { videoSchema, type Video, type NocoDBResponse, type NocoDBAttachment, type PageInfo } from './nocodb'; // Statically import types and videoSchema value
import * as NocoDB from './nocodb'; // Import all exports for dynamic assignment

// Declare functions here, will be assigned in beforeEach after mocks are set up
let fetchVideos: typeof NocoDB.fetchVideos;
let fetchAllVideos: typeof NocoDB.fetchAllVideos;

// Helper function to create a test video
const createTestVideo = (overrides: Partial<Video> = {}): Video => {
  const baseVideo = {
    Id: 1,
    VideoID: 'test1',
    URL: 'https://example.com/video1',
    ThumbHigh: 'https://example.com/thumb1.jpg',
    Title: 'Test Video 1',
    Channel: 'Test Channel',
    Description: 'Test Description',
    ImportanceRating: 3,
    PersonalComment: 'Test Comment',
    CreatedAt: new Date('2024-01-01T00:00:00.000Z'),
    UpdatedAt: new Date('2024-01-01T00:00:00.000Z'),
    PublishedAt: new Date('2024-01-01T00:00:00.000Z'),
    Tags: [],
    Categories: [],
    CompletionDate: null,
    FullTranscript: 'Test transcript',
    ActionableAdvice: 'Test advice',
    Archived: false,
    AssignedTo: null,
    BitRate: null,
    TLDR: 'Test TLDR',
    Task: null,
    MainSummary: 'Test summary',
    Mood: [],
    DetailedNarrativeFlow: 'Test narrative',
    DueDate: null,
    Duration: 300,
    MemorableQuotes: [],
    MemorableTakeaways: [],
    Notes: null,
    Watched: false,
    OriginalTitle: 'Test Original Title',
    OriginalChannel: 'Test Original Channel',
    Indicators: [],
    Trends: [],
    Locations: [],
    Events: [],
    FileFormat: null,
    FileSize: null,
    FrameRate: null,
    Hashtags: [],
    Language: 'en',
    MainTopic: 'Test Topic',
    Priority: 'medium',
    Private: false,
    Products: [],
    Project: null,
    Resolution: '1080p',
    Source: 'youtube',
    TopicsDiscussed: [],
    Speaker: 'Test Speaker',
    Status: 'active',
    Subtitles: false,
    Speakers: [],
    Transcript: 'Test transcript',
    KeyNumbersData: null,
    KeyExamples: [],
    BookMediaRecommendations: [],
    RelatedURLs: [],
    VideoGenre: 'education',
    Persons: [],
    Companies: [],
    InvestableAssets: [],
    TickerSymbol: 'TEST',
    Institutions: [],
    EventsFairs: [],
    DOIs: [],
    PrimarySources: [],
    Sentiment: 0.5,
    SentimentReason: 'Test reason',
    TechnicalTerms: [],
    Prompt: 'Test prompt',
    nc___: {},
    __nc_evolve_to_text__: {},
    'Created By': 'test@example.com',
    'Updated By': 'test@example.com',
  };
  
  // Apply overrides while ensuring types match
  return {
    ...baseVideo,
    ...overrides,
    // Ensure dates are Date objects
    CreatedAt: overrides.CreatedAt ? new Date(overrides.CreatedAt) : baseVideo.CreatedAt,
    UpdatedAt: overrides.UpdatedAt ? new Date(overrides.UpdatedAt) : baseVideo.UpdatedAt,
    PublishedAt: overrides.PublishedAt ? new Date(overrides.PublishedAt) : baseVideo.PublishedAt,
  } as Video;
};

// This should match the unexported YT_FIELDS_PRIMARY_STRING in nocodb.ts
// Ideally, YT_FIELDS_PRIMARY_STRING would be exported from nocodb.ts and imported here.
// This should match YT_FIELDS_PRIMARY_STRING in nocodb.ts
const YT_FIELDS_PRIMARY_STRING_FOR_TESTS =
  'Id,VideoID,URL,ThumbHigh,Title,Channel,Description,ImportanceRating,PersonalComment,CreatedAt,UpdatedAt,PublishedAt,Tags,Categories,FullTranscript,ActionableAdvice,NarrativeFlow,TLDR,MainSummary,Transcript';

// Mock axios globally for this test suite
vi.mock('axios');
const mockedAxiosModule = vi.mocked(axios, true);

const mockAxiosInstanceGet = vi.fn();
const mockCreatedAxiosInstance = {
  get: mockAxiosInstanceGet,
  defaults: { headers: { common: {} } },
  interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } }
};

// Helper function to create a NocoDB attachment array
const createNocoAttachment = (url: string | null): NocoDBAttachment[] | null => {
  if (!url) return null;
  return [{ url, id: 'test-id', title: 'test-title.jpg', mimetype: 'image/jpeg', size: 12345, signedUrl: url, thumbnails: {} }];
};

// Common mock raw video data structures
const mockVideo1 = createTestVideo({
  Id: 1,
  VideoID: 'vid1',
  URL: 'https://youtube.com/watch?v=vid1',
  ThumbHigh: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
  Title: 'Video Title 1',
  Channel: 'Channel 1',
  Description: 'Test Description 1',
  ImportanceRating: 5,
  PersonalComment: 'Test Comment 1',
  CreatedAt: '2023-01-01T00:00:00.000Z',
  UpdatedAt: '2023-01-01T01:00:00.000Z',
  PublishedAt: '2023-01-01T00:00:00.000Z',
  Tags: ['tag1', 'tag2'],
  Categories: ['category1'],
  FullTranscript: 'Test transcript 1',
  ActionableAdvice: 'Test advice 1',
  DetailedNarrativeFlow: 'Test narrative 1',
  TLDR: 'Test TLDR 1',
  MainSummary: 'Test summary 1',
  ChannelURL: 'https://youtube.com/@channel1',
  Watched: false,
  Private: false,
  Archived: false,
  Summary: 'summary1',
  // Ensure all required fields are present
  CompletionDate: null,
  Notes: null,
  OriginalTitle: 'Video Title 1',
  OriginalChannel: 'Channel 1',
  Transcript: 'Test transcript 1',
  Duration: 300,
  Source: 'youtube',
  Status: 'active',
  Language: 'en',
  Priority: 'medium',
  Resolution: '1080p',
  Subtitles: false,
  Private: false,
  Archived: false,
  Watched: false,
  Sentiment: 0.5,
  SentimentReason: 'Test reason',
  VideoGenre: 'education',
  TickerSymbol: 'TEST',
  'Created By': 'test@example.com',
  'Updated By': 'test@example.com'
});

const mockVideo2 = createTestVideo({
  ...mockVideo1,
  Id: 2,
  VideoID: 'vid2',
  URL: 'https://youtube.com/watch?v=vid2',
  ThumbHigh: 'https://i.ytimg.com/vi/vid2/hqdefault.jpg',
  Title: 'Video Title 2',
  Channel: 'Channel 2',
  CreatedAt: '2023-01-02T00:00:00.000Z',
  UpdatedAt: '2023-01-02T01:00:00.000Z',
  Watched: true,
  // Ensure all required fields are present
  Description: 'Test Description 2',
  PersonalComment: 'Test Comment 2',
  PublishedAt: '2023-01-02T00:00:00.000Z',
  Tags: ['tag3', 'tag4'],
  Categories: ['category2'],
  FullTranscript: 'Test transcript 2',
  ActionableAdvice: 'Test advice 2',
  DetailedNarrativeFlow: 'Test narrative 2',
  TLDR: 'Test TLDR 2',
  MainSummary: 'Test summary 2',
  ChannelURL: 'https://youtube.com/@channel2',
  OriginalTitle: 'Video Title 2',
  OriginalChannel: 'Channel 2',
  Transcript: 'Test transcript 2',
  Sentiment: 0.6,
  SentimentReason: 'Test reason 2'
});

// Common expected parsed video data structures
const expectedVideo1Parsed: Video = mockVideo1;
const expectedVideo2Parsed: Video = mockVideo2;

describe('NocoDB API Client - fetchVideos', () => {
  const mockTableName = 'youtubeTranscriptsTest';
  const projectId = 'phk8vxq6f1ev08h'; // This is hardcoded in nocodb.ts
  const mockBaseUrl = 'http://fake-nocodb.com';
  const mockApiUrlPath = `/api/v1/db/data/noco/${projectId}/${mockTableName}`;
  const mockToken = 'fake-token';

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env }; // Shallow copy
    process.env.NEXT_PUBLIC_NC_URL = mockBaseUrl;
    process.env.NEXT_PUBLIC_NC_TOKEN = mockToken;
    process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME = mockTableName;

    mockedAxiosModule.create.mockReturnValue(mockCreatedAxiosInstance as any);
    mockAxiosInstanceGet.mockReset();

    // Dynamically import to get fresh module with mocks
    const NocoDBModule = await import('./nocodb');
    fetchVideos = NocoDBModule.fetchVideos;
    fetchAllVideos = NocoDBModule.fetchAllVideos;
    // Mock the fetchVideos function within the dynamically imported module for fetchAllVideos tests
    vi.spyOn(NocoDBModule, 'fetchVideos');
  });

  afterEach(() => {
    process.env = originalEnv; // Restore original environment variables
    vi.resetModules();
  });

  it('should fetch and parse videos successfully (first page, default limit)', async () => {
    const mockNocoDBResponseData: { list: Array<z.input<typeof videoSchema>>; pageInfo: PageInfo } = {
      list: [mockVideo1, mockVideo2],
      pageInfo: { totalRows: 2, page: 1, pageSize: 25, isLastPage: true, isFirstPage: true, hasNextPage: false, hasPreviousPage: false }, // pageSize updated to 25 (default)
    };

    mockAxiosInstanceGet.mockResolvedValueOnce({
      data: mockNocoDBResponseData, status: 200, statusText: 'OK', headers: {}, config: { headers: new axios.AxiosHeaders() },
    });

    const result = await fetchVideos();
    expect(result.videos).toEqual([expectedVideo1Parsed, expectedVideo2Parsed]);
    expect(result.pageInfo).toEqual(mockNocoDBResponseData.pageInfo);
    expect(mockAxiosInstanceGet).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstanceGet).toHaveBeenCalledWith(
      expect.stringContaining(mockApiUrlPath),
      {
        headers: { 'xc-token': mockToken },
        params: { fields: YT_FIELDS_PRIMARY_STRING_FOR_TESTS, limit: 25, offset: 0, shuffle: 0 }, // Default limit in fetchVideos is 25
      }
    );
  });

  it('should fetch videos with a specific sort parameter', async () => {
    const mockNocoDBResponseData: { list: Array<z.input<typeof videoSchema>>; pageInfo: PageInfo } = {
      list: [mockVideo2, mockVideo1], // Example: sorted by Title descending
      pageInfo: { totalRows: 2, page: 1, pageSize: 25, isLastPage: true, isFirstPage: true, hasNextPage: false, hasPreviousPage: false }, // pageSize updated to 25 (default)
    };
    mockAxiosInstanceGet.mockResolvedValueOnce({ data: mockNocoDBResponseData, status: 200 });

    const sortOption = '-Title';
    const result = await fetchVideos({ sort: { field: 'Title', direction: 'desc' } });

    expect(result.videos).toEqual([expectedVideo2Parsed, expectedVideo1Parsed]);
    expect(mockAxiosInstanceGet).toHaveBeenCalledWith(
      expect.stringContaining(mockApiUrlPath),
      {
        headers: { 'xc-token': mockToken },
        params: { fields: YT_FIELDS_PRIMARY_STRING_FOR_TESTS, limit: 25, offset: 0, shuffle: 0, sort: sortOption }, // Default limit in fetchVideos is 25
      }
    );
  });

  it('should handle pagination: fetching a specific page with limit and page number', async () => {
    const page1Response: { list: Array<z.input<typeof videoSchema>>; pageInfo: PageInfo } = {
      list: [mockVideo1Raw],
      pageInfo: { totalRows: 2, page: 1, pageSize: 1, isLastPage: false, isFirstPage: true, hasNextPage: true, hasPreviousPage: false },
    };
    const page2Response: { list: Array<z.input<typeof videoSchema>>; pageInfo: PageInfo } = {
      list: [mockVideo2Raw],
      pageInfo: { totalRows: 2, page: 2, pageSize: 1, isLastPage: true, isFirstPage: false, hasNextPage: false, hasPreviousPage: true },
    };

    mockAxiosInstanceGet.mockResolvedValueOnce({ data: page1Response, status: 200 });
    const resultPage1 = await fetchVideos({ limit: 1, page: 1 });
    expect(resultPage1.videos).toEqual([expectedVideo1Parsed]);
    expect(resultPage1.pageInfo).toEqual(page1Response.pageInfo);
    expect(mockAxiosInstanceGet).toHaveBeenNthCalledWith(1,
      expect.stringContaining(mockApiUrlPath),
      { headers: { 'xc-token': mockToken }, params: { fields: YT_FIELDS_PRIMARY_STRING_FOR_TESTS, limit: 1, offset: 0, shuffle: 0 } }
    );

    mockAxiosInstanceGet.mockResolvedValueOnce({ data: page2Response, status: 200 });
    const resultPage2 = await fetchVideos({ 
      limit: 1, 
      page: 2 
    });
    expect(resultPage2.videos).toEqual([expectedVideo2Parsed]);
    expect(resultPage2.pageInfo).toEqual(page2Response.pageInfo);
    expect(mockAxiosInstanceGet).toHaveBeenNthCalledWith(2,
      expect.stringContaining(mockApiUrlPath),
      { headers: { 'xc-token': mockToken }, params: { fields: YT_FIELDS_PRIMARY_STRING_FOR_TESTS, limit: 1, offset: 1, shuffle: 0 } }
    );
  });
  
  it('should fetch all videos using fetchAllVideos by looping through pages', async () => {
    const internalPageSizeForFetchAll = 50; // As defined in fetchAllVideos

    // This data represents what axios.get would return for each page call initiated by fetchVideos
    const mockAxiosPage1Response: { list: Array<z.input<typeof videoSchema>>; pageInfo: PageInfo } = {
      list: [mockVideo1Raw], // Raw data, fetchVideos will parse this
      pageInfo: { totalRows: 2, page: 1, pageSize: internalPageSizeForFetchAll, isLastPage: false, isFirstPage: true, hasNextPage: true, hasPreviousPage: false },
    };
    const mockAxiosPage2Response: { list: Array<z.input<typeof videoSchema>>; pageInfo: PageInfo } = {
      list: [mockVideo2Raw], // Raw data
      pageInfo: { totalRows: 2, page: 2, pageSize: internalPageSizeForFetchAll, isLastPage: true, isFirstPage: false, hasNextPage: false, hasPreviousPage: true },
    };

    // Setup mockAxiosInstanceGet for the two calls fetchVideos will make
    mockAxiosInstanceGet
      .mockResolvedValueOnce({ data: mockAxiosPage1Response, status: 200 })
      .mockResolvedValueOnce({ data: mockAxiosPage2Response, status: 200 });

    const NocoDBModule = await import('./nocodb'); // Import the module to test fetchAllVideos
    const allVideosResult = await NocoDBModule.fetchAllVideos(); // This will call the original fetchVideos, which uses the mocked axios

    // expectedVideo1Parsed and expectedVideo2Parsed should be defined earlier in the test file
    // (they are the results of videoSchema.parse applied to mockVideo1Raw and mockVideo2Raw)
    expect(allVideosResult).toEqual([expectedVideo1Parsed, expectedVideo2Parsed]);
    expect(mockAxiosInstanceGet).toHaveBeenCalledTimes(2);

    // Optionally, check params of axios calls if needed
    // Example for the first call (page 1, limit 50)
    const NC_PROJECT_ID_FOR_TEST = process.env.NEXT_PUBLIC_NOCODB_PROJECT_ID || 'phk8vxq6f1ev08h';
    const NC_TABLE_NAME_FOR_TEST = process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME || 'youtubeTranscripts';

    expect(mockAxiosInstanceGet).toHaveBeenNthCalledWith(1,
      expect.stringContaining(`/api/v1/db/data/noco/${NC_PROJECT_ID_FOR_TEST}/${NC_TABLE_NAME_FOR_TEST}`),
      expect.objectContaining({
        params: expect.objectContaining({
          limit: internalPageSizeForFetchAll,
          offset: 0,
        }),
      })
    );
    // Example for the second call (page 2, limit 50)
    expect(mockAxiosInstanceGet).toHaveBeenNthCalledWith(2,
      expect.stringContaining(`/api/v1/db/data/noco/${NC_PROJECT_ID_FOR_TEST}/${NC_TABLE_NAME_FOR_TEST}`),
      expect.objectContaining({
        params: expect.objectContaining({
          limit: internalPageSizeForFetchAll,
          offset: internalPageSizeForFetchAll, // page 2, offset = 50
        }),
      })
    );
  });

  it('should throw an error if NEXT_PUBLIC_NC_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_NC_URL;
    await expect(fetchVideos()).rejects.toThrow('NocoDB credentials not configured.');
  });

  it('should throw an error if NEXT_PUBLIC_NC_TOKEN is missing', async () => {
    delete process.env.NEXT_PUBLIC_NC_TOKEN;
    await expect(fetchVideos()).rejects.toThrow('NocoDB credentials not configured.');
  });

  it('should throw an error if API call fails (e.g., network error)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAxiosInstanceGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchVideos()).rejects.toThrow('Failed to fetch videos from NocoDB (page 1, limit 25): Network error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching videos (page 1, limit 25):'), 'Network error');
    consoleErrorSpy.mockRestore();
  });

  it('should throw an error if API returns non-200 status', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAxiosInstanceGet.mockResolvedValueOnce({
      data: { message: 'Server error' }, status: 500, statusText: 'Internal Server Error', headers: {}, config: { headers: new axios.AxiosHeaders() },
    });

    await expect(fetchVideos()).rejects.toThrow('Failed to parse NocoDB API response for page 1.');
    // The console error for this case will show the Zod parsing failure details due to unexpected non-data response
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse NocoDB response for page 1, limit 25:'), expect.any(String));
    consoleErrorSpy.mockRestore();
  });

  it('should throw an error and log if Zod parsing fails (invalid data structure)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invalidData = {
      list: [{ Id: 'not-a-number', Title: 123 }], // Invalid types for Id and Title
      pageInfo: { totalRows: 1, page: 1, pageSize: 1, isLastPage: true }
    };
    mockAxiosInstanceGet.mockResolvedValueOnce({
      data: invalidData, status: 200, statusText: 'OK', headers: {}, config: { headers: new axios.AxiosHeaders() },
    });

    await expect(fetchVideos()).rejects.toThrow('Failed to parse NocoDB API response for page 1.');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse NocoDB response for page 1, limit 25:'), expect.any(String));
    consoleErrorSpy.mockRestore();
  });
  
  it('should correctly parse videos with null/optional fields not present in raw data', async () => {
    const mockVideoRaw3: z.input<typeof videoSchema> = {
      Id: 3,
      VideoID: 'vid3',
      Title: 'Video 3 Missing Fields',
      URL: 'https://youtube.com/watch?v=vid3', // Added: URL is mandatory as per schema & YT_FIELDS_PRIMARY_STRING
      // ThumbHigh, Channel, Description, ImportanceRating, PersonalComment, CreatedAt, UpdatedAt are not in this raw mock,
      // so they should be parsed to their default values (mostly null or transformed like ThumbHigh)
    };
    const expectedVideoWithDefaults: Video = {
      // Fields from mockVideo3Raw
      Id: 3,
      VideoID: 'vid3',
      Title: 'Video 3 Missing Fields',
      URL: 'https://youtube.com/watch?v=vid3',

      // Fields with .default(null) or equivalent transforms in videoSchema
      ThumbHigh: null,
      Channel: null,
      Description: null,
      ImportanceRating: null,
      PersonalComment: null,
      CreatedAt: null,
      UpdatedAt: null,
      PublishedAt: null,
      Tags: null,
      Categories: null,
      FullTranscript: null,
      ActionableAdvice: null,
      NarrativeFlow: null,
      TLDR: null,
      MainSummary: null,
      Transcript: null,

      // Fields with .optional() and no .default() in videoSchema (will be undefined)
      // These are all z.unknown().optional() in the current schema
      Prompt: undefined,
      Persons: undefined,
      Companies: undefined,
      InvestableAssets: undefined,
      Indicators: undefined,
      Trends: undefined,
      Hashtags: undefined,
      Institutions: undefined,
      KeyExamples: undefined,
      MemorableTakeaways: undefined,
      VideoGenre: undefined,
      Sentiment: undefined,
      PrimarySources: undefined,
      MainTopic: undefined,
      DetailedNarrativeFlow: undefined,
      KeyNumbersData: undefined,
      MemorableQuotes: undefined,
      "Book-/Media-Recommandations": undefined,
      Speaker: undefined,
      "$Ticker": undefined,
      "Events/Fairs": undefined,
      URLs: undefined,
      SentimentReason: undefined,
      TechnicalTerms: undefined,
      DOIs: undefined,
      nc___: undefined,
      __nc_evolve_to_text__: undefined,
      "Created By": undefined,
      "Updated By": undefined,
    };

    const mockResponse: NocoDBResponse<any> = {
      list: [mockVideoRaw3],
      pageInfo: { totalRows: 1, page: 1, pageSize: 50, isLastPage: true },
    };
    mockAxiosInstanceGet.mockResolvedValueOnce({ data: mockResponse, status: 200 });

    const result = await fetchVideos();
    expect(result.videos[0]).toEqual(expectedVideoWithDefaults);
  });

  it('should correctly transform ThumbHigh: array to URL, empty array to null, null to null', async () => {
    const videoWithThumbArrayRaw = { ...mockVideo1Raw, Id: 4, VideoID: 'vid4', ThumbHigh: createNocoAttachment('https://example.com/specific_url.jpg') };
    const videoWithEmptyThumbArrayRaw = { ...mockVideo1Raw, Id: 5, VideoID: 'vid5', ThumbHigh: [] as NocoDBAttachment[] }; // Empty array
    const videoWithNullThumbRaw = { ...mockVideo1Raw, Id: 6, VideoID: 'vid6', ThumbHigh: null }; // Explicitly null

    const mockResponse: NocoDBResponse<any> = {
      list: [videoWithThumbArrayRaw, videoWithEmptyThumbArrayRaw, videoWithNullThumbRaw],
      pageInfo: { totalRows: 3, page: 1, pageSize: 50, isLastPage: true },
    };
    mockAxiosInstanceGet.mockResolvedValueOnce({ data: mockResponse, status: 200 });

    const result = await fetchVideos();
    expect(result.videos[0].ThumbHigh).toBe('https://example.com/specific_url.jpg');
    expect(result.videos[1].ThumbHigh).toBeNull(); // Empty array transforms to null
    expect(result.videos[2].ThumbHigh).toBeNull(); // Null remains null
  });

});
