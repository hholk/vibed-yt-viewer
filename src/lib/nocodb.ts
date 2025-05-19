import axios from 'axios';
import { z } from 'zod';

const videoCache = new Map<string, Promise<Video | null>>();

const nocoDBAttachmentSchema = z.object({
  url: z.string().url(),
  id: z.string().optional(),
  title: z.string().optional().nullable(),
  mimetype: z.string().optional(),
  size: z.number().optional(),
  thumbnails: z.record(z.object({ signedUrl: z.string().url().optional() })).optional().nullable(),
  signedUrl: z.string().url().optional(),
}).passthrough();
export type NocoDBAttachment = z.infer<typeof nocoDBAttachmentSchema>;

const emptyObjectToNull = (val: unknown) => (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length === 0 ? null : val);

const stringToArrayOrNullPreprocessor = (val: unknown): string[] | null => {
  if (typeof val === 'string') {
    if (val.trim() === '') return []; 
    return val.split('\n').map(s => s.trim()).filter(s => s !== '');
  }
  if (Array.isArray(val)) { 
    return val as string[]; 
  }
  if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) { 
    return [];
  }
  return null; 
};

const stringToLinkedRecordArrayPreprocessor = (val: unknown): Array<{ Id?: any; Title?: string | null; name?: string | null }> | null => {
  if (typeof val === 'string') {
    if (val.trim() === '') return [];
    return val.split('\n').map(s => s.trim()).filter(s => s !== '').map(itemTitle => ({ Title: itemTitle, name: itemTitle }));
  }
  if (Array.isArray(val)) { 
    return val;
  }
  if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) { 
    return [];
  }
  return null;
};

const linkedRecordItemSchema = z.object({
  Id: z.any().optional(), 
  Title: z.string().optional().nullable(), 
  name: z.string().optional().nullable(),  
  
}).passthrough();

export const videoSchema = z.object({
  Id: z.number().int(),
  VideoID: z.string(),
  URL: z.string().url().optional().nullable(),
  ThumbHigh: z.preprocess(
    (val) => {
      
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null && typeof val[0].url === 'string') {
        try {
          
          const parsedUrl = new URL(val[0].url);
          if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            return val[0].url; 
          }
          return null; 
        } catch (e) {
          
          return null; 
        }
      }
      
      return null;
    },
    z.string().url().nullable() 
  ),
  Title: z.string(),
  Channel: z.string().optional().nullable().default(null),
  Description: z.string().optional().nullable().default(null),
  ImportanceRating: z.number().int().min(1).max(5).optional().nullable().default(null),
  PersonalComment: z.string().optional().nullable().default(null),
  CreatedAt: z.coerce.date().optional().nullable().default(null),
  UpdatedAt: z.coerce.date().optional().nullable().default(null),
  PublishedAt: z.coerce.date().optional().nullable().default(null),
  Tags: z.preprocess(emptyObjectToNull, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Categories: z.preprocess(emptyObjectToNull, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  CompletionDate: z.coerce.date().optional().nullable().default(null),
  FullTranscript: z.string().optional().nullable().default(null),
  ActionableAdvice: z.string().optional().nullable().default(null),
  Archived: z.boolean().optional().nullable().default(null),
  AssignedTo: z.union([linkedRecordItemSchema, z.string()]).optional().nullable().default(null),
  BitRate: z.string().optional().nullable().default(null),
  TLDR: z.string().optional().nullable().default(null),
  Task: z.string().optional().nullable().default(null),
  MainSummary: z.string().optional().nullable().default(null),
  Mood: z.preprocess(emptyObjectToNull, z.array(z.string()).nullable().default([]).optional()),
  DetailedNarrativeFlow: z.string().optional().nullable().default(null),
  DueDate: z.coerce.date().optional().nullable().default(null),
  Duration: z.number().optional().nullable().default(null),
  MemorableQuotes: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),
  MemorableTakeaways: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),
  
  Notes: z.string().optional().nullable().default(null),
  Watched: z.boolean().optional().nullable().default(null),
  OriginalTitle: z.string().optional().nullable().default(null),
  OriginalChannel: z.string().optional().nullable().default(null),
  
  Indicators: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Trends: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Locations: z.preprocess(emptyObjectToNull, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Events: z.preprocess(emptyObjectToNull, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  FileFormat: z.string().optional().nullable().default(null),
  FileSize: z.string().optional().nullable().default(null),
  FrameRate: z.number().optional().nullable().default(null),
  Hashtags: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),
  Language: z.string().optional().nullable().default(null),
  MainTopic: z.string().optional().nullable().default(null),
  Priority: z.string().optional().nullable().default(null),
  Private: z.boolean().optional().nullable().default(null),
  Products: z.preprocess(emptyObjectToNull, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Project: z.string().optional().nullable().default(null),
  Resolution: z.string().optional().nullable().default(null),
  Source: z.string().optional().nullable().default(null),
  TopicsDiscussed: z.preprocess(emptyObjectToNull, z.array(z.string()).nullable().default([]).optional()),
  Speaker: z.string().optional().nullable().default(null),
  Status: z.string().optional().nullable().default(null),
  Subtitles: z.union([z.boolean(), z.preprocess(emptyObjectToNull, z.array(z.string()))]).optional().nullable().default(null),
  Speakers: z.preprocess(emptyObjectToNull, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Transcript: z.string().optional().nullable().default(null), 

  
  KeyNumbersData: z.unknown().optional().nullable().default(null), 
  KeyExamples: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),
  BookMediaRecommendations: z.preprocess(emptyObjectToNull, z.array(z.string()).nullable().default([]).optional()),
  RelatedURLs: z.preprocess(emptyObjectToNull, z.array(z.string().url()).nullable().default([]).optional()),
  VideoGenre: z.string().optional().nullable().default(null),
  Persons: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Companies: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  InvestableAssets: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),
  TickerSymbol: z.string().optional().nullable().default(null), 
  Institutions: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  EventsFairs: z.preprocess(emptyObjectToNull, z.array(z.string()).nullable().default([]).optional()),
  DOIs: z.preprocess(emptyObjectToNull, z.array(z.string()).nullable().default([]).optional()),
  PrimarySources: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),
  
  Sentiment: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().nullable().default(null)
  ).optional(),
  SentimentReason: z.string().optional().nullable().default(null),
  TechnicalTerms: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),

  Prompt: z.string().optional().nullable().default(null), 
  
  nc___: z.unknown().optional(),
  __nc_evolve_to_text__: z.unknown().optional(),
  "Created By": z.string().optional().nullable(),
  "Updated By": z.string().optional().nullable(),
}).catchall(z.unknown()).describe('videoSchema_detailed'); 
export type Video = z.infer<typeof videoSchema>;

export const videoListItemSchema = z.object({
  Id: z.number().int(),
  Title: z.string(),
  ThumbHigh: z.preprocess(
    (val) => {
      if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0].url === 'string') {
        return val[0].url;
      }
      if (typeof val === 'string') { 
        return val;
      }
      return null;
    },
    z.string().url().nullable()
  ), 
  Channel: z.string().optional().nullable(),
  VideoID: z.string(), 
}).describe('videoListItemSchema_grid');
export type VideoListItem = z.infer<typeof videoListItemSchema>;

const pageInfoSchema = z.object({
  totalRows: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  isFirstPage: z.boolean().optional(),
  isLastPage: z.boolean(),
  hasNextPage: z.boolean().optional(),
  hasPreviousPage: z.boolean().optional(),
});
export type PageInfo = z.infer<typeof pageInfoSchema>;

const createNocoDBResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  list: z.array(itemSchema),
  pageInfo: pageInfoSchema,
});

export type NocoDBResponse<T> = {
  list: T[];
  pageInfo: PageInfo;
};

const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

const DEFAULT_PAGE_SIZE = 25;

export async function updateVideo(
  recordId: number,
  data: Partial<z.infer<typeof videoSchema>>,
  ncProjectIdParam?: string,
  ncTableNameParam?: string
): Promise<Video> {
  const currentNcUrl = process.env.NEXT_PUBLIC_NC_URL;
  const currentNcToken = process.env.NEXT_PUBLIC_NC_TOKEN;
  const tableName = ncTableNameParam || process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = ncProjectIdParam || process.env.NEXT_PUBLIC_NOCODB_PROJECT_ID || 'phk8vxq6f1ev08h';

  if (!currentNcUrl || !currentNcToken) {
    throw new Error('NocoDB URL or token is not configured. Please check your environment variables.');
  }

  try {
    
    const client = axios.create({
      baseURL: currentNcUrl,
      headers: {
        'Content-Type': 'application/json',
        'xc-token': currentNcToken,
      },
    });

    const response = await client.patch(
      `/api/v1/db/data/noco/${projectId}/${tableName}/${recordId}`,
      data
    );

    
    const parsed = videoSchema.safeParse(response.data);
    if (!parsed.success) {
      console.error('NocoDB API response validation failed:', parsed.error);
      throw new Error('Received invalid data format from NocoDB');
    }

    return parsed.data;
  } catch (error: any) {
    console.error(`Error updating video record ${recordId}:`, error.response?.data || error.message);
    throw new Error(`Failed to update video record: ${error.message}`);
  }
}

interface FetchVideosOptions<T extends z.ZodTypeAny> {
  sort?: string;
  limit?: number;
  page?: number;
  fields?: string[];
  schema?: T;
  
  ncProjectId?: string;
  ncTableName?: string;
}

export async function fetchVideos<T extends z.ZodTypeAny = typeof videoSchema>(
  options?: FetchVideosOptions<T>
): Promise<{ videos: z.infer<T>[]; pageInfo: PageInfo }> {
  const currentNcUrl = process.env.NEXT_PUBLIC_NC_URL;
  const currentNcToken = process.env.NEXT_PUBLIC_NC_TOKEN;
  const tableName = options?.ncTableName || process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = options?.ncProjectId || process.env.NEXT_PUBLIC_NOCODB_PROJECT_ID || 'phk8vxq6f1ev08h';

  if (!currentNcUrl || !currentNcToken) {
    console.error('NocoDB URL or Token is not configured.');
    throw new Error('NocoDB credentials not configured.');
  }

  const limit = options?.limit || DEFAULT_PAGE_SIZE;
  const page = options?.page || 1;
  const offset = (page - 1) * limit;
  const schemaToUse = options?.schema || videoSchema; 
  const responseSchema = createNocoDBResponseSchema(schemaToUse);

  const params: Record<string, any> = {
    limit: limit,
    offset: offset,
    shuffle: 0,
  };

  if (options?.sort) {
    params.sort = options.sort;
  }

  if (options?.fields && options.fields.length > 0) {
    params.fields = options.fields.join(',');
  } 

  try {
    const response = await apiClient.get(
      `${currentNcUrl}/api/v1/db/data/noco/${projectId}/${tableName}`,
      {
        headers: { 'xc-token': currentNcToken },
        params: params,
      }
    );

    const parsedResponse = responseSchema.safeParse(response.data);

    if (!parsedResponse.success) {
      console.error(`Failed to parse NocoDB response (Page: ${page}, Limit: ${limit}, Fields: ${params.fields || 'all'}, Schema: ${schemaToUse.description || 'videoSchema'}):`, parsedResponse.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
      
      throw new Error(`Failed to parse NocoDB API response for page ${page}.`);
    }
    return { videos: parsedResponse.data.list as z.infer<T>[], pageInfo: parsedResponse.data.pageInfo };

  } catch (error: any) {
    const requestUrl = error.config?.url || 'URL not available';
    console.error(`Error fetching videos (Page ${page}, Limit ${limit}) from URL: ${requestUrl}:`, error.response?.data || error.message);
    if (error.message.startsWith('Failed to parse NocoDB API response')) {
        throw error;
    }
    throw new Error(`Failed to fetch videos from NocoDB (page ${page}, limit ${limit}): ${error.message}`);
  }
}

export function fetchVideoByVideoId(videoId: string, ncProjectIdParam?: string, ncTableNameParam?: string): Promise<Video | null> {
  
  if (videoCache.has(videoId)) {
    return videoCache.get(videoId)!;
  }

  const currentNcUrl = process.env.NEXT_PUBLIC_NC_URL;
  const currentNcToken = process.env.NEXT_PUBLIC_NC_TOKEN;
  const tableName = ncTableNameParam || process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = ncProjectIdParam || process.env.NEXT_PUBLIC_NOCODB_PROJECT_ID || 'phk8vxq6f1ev08h';

  if (!currentNcUrl || !currentNcToken) {
    console.error('NocoDB URL or Token is not configured for fetchVideoByVideoId.');
    throw new Error('NocoDB credentials not configured.');
  }

  
  const fetchPromise = (async () => {
    try {
      const response = await apiClient.get(
        `${currentNcUrl}/api/v1/db/data/noco/${projectId}/${tableName}/find-one`,
        {
          headers: { 'xc-token': currentNcToken },
          params: { 
            where: `(VideoID,eq,${videoId})`,
          },
        }
      );

      
      console.log(`[fetchVideoByVideoId - ${videoId}] Raw NocoDB response data:`, JSON.stringify(response.data, null, 2));

      if (!response.data || Object.keys(response.data).length === 0) {
        console.warn(`[fetchVideoByVideoId - ${videoId}] No data returned from NocoDB or data is empty object.`);
        return null; 
      }

      const parsedVideo = videoSchema.safeParse(response.data);

      if (!parsedVideo.success) {
        console.error(`[fetchVideoByVideoId - ${videoId}] Failed to parse NocoDB response. Issues:`, parsedVideo.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
        console.error(`[fetchVideoByVideoId - ${videoId}] Problematic NocoDB data for find-one (VideoID: ${videoId}):`, JSON.stringify(response.data, null, 2));
        throw new Error(`Failed to parse NocoDB API response for VideoID ${videoId}.`);
      }
      return parsedVideo.data;
    } catch (error: any) {
      
      videoCache.delete(videoId);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`Video with VideoID ${videoId} not found in NocoDB (404).`);
        return null;
      }
      console.error(`Error fetching video by VideoID ${videoId}:`, error.response?.data || error.message);
      if (error.message.startsWith('Failed to parse NocoDB API response')) {
        throw error;
      }
      throw new Error(`Failed to fetch video (VideoID: ${videoId}) from NocoDB: ${error.message}`);
    }
  })();

  
  videoCache.set(videoId, fetchPromise);
  
  
  return fetchPromise;
}

interface FetchAllVideosOptions<T extends z.ZodTypeAny> {
  sort?: string;
  fields?: string[];
  schema?: T;
  
  ncProjectId?: string;
  ncTableName?: string;
}

export async function fetchAllVideos<T extends z.ZodTypeAny = typeof videoSchema>(
  options?: FetchAllVideosOptions<T>
): Promise<z.infer<T>[]> {
  const allItems: z.infer<T>[] = [];
  let currentPage = 1;
  const pageSize = options?.fields ? 50 : DEFAULT_PAGE_SIZE; 
  let hasMorePages = true;

  const fetchOptions: FetchVideosOptions<T> = {
    sort: options?.sort,
    limit: pageSize,
    fields: options?.fields,
    schema: options?.schema || (videoSchema as unknown as T), 
    ncProjectId: options?.ncProjectId,
    ncTableName: options?.ncTableName,
  };

  while (hasMorePages) {
    try {
      const { videos: pageItems, pageInfo } = await fetchVideos<T>({ ...fetchOptions, page: currentPage });
      allItems.push(...pageItems);

      if (pageInfo.isLastPage || pageItems.length < pageSize) {
        hasMorePages = false;
      } else {
        currentPage++;
      }
    } catch (error: any) {
      console.error(`Error fetching page ${currentPage} in fetchAllVideos (Schema: ${fetchOptions.schema?.description || 'default'}):`, error.message);
      hasMorePages = false; 
      if (allItems.length === 0) { 
        throw new Error(`Failed to fetch initial items in fetchAllVideos: ${error.message}`);
      }
      console.warn(`Partial data returned due to an error fetching page ${currentPage} in fetchAllVideos. Total items fetched: ${allItems.length}`);
    }
  }
  return allItems;
}

