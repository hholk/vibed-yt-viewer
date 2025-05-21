/**
 * NocoDB API Client for YouTube Viewer Application
 * 
 * This module provides functions to interact with the NocoDB API, including:
 * - Fetching video lists with sorting and pagination
 * - Fetching individual video details by ID
 * - Updating video metadata (ratings, comments, etc.)
 * - Data validation using Zod schemas
 */

import axios from 'axios';
import { z } from 'zod';
import { mockVideos } from './mockData';

/**
 * In-memory cache for video data to prevent redundant API calls
 * Key: Video ID (string)
 * Value: Promise resolving to Video object or null if not found
 */
const videoCache = new Map<string, Promise<Video | null>>();

/**
 * Schema for NocoDB attachment objects
 * Represents file attachments in NocoDB records (e.g., thumbnails, documents)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _nocoDBAttachmentSchema = z.object({
  url: z.string().url(),
  id: z.string().optional(),
  title: z.string().optional().nullable(),
  mimetype: z.string().optional(),
  size: z.number().optional(),
  thumbnails: z.record(z.object({ signedUrl: z.string().url().optional() })).optional().nullable(),
  signedUrl: z.string().url().optional(),
}).passthrough();
export type NocoDBAttachment = z.infer<typeof _nocoDBAttachmentSchema>;

/**
 * Transforms empty objects to null for cleaner data handling
 * @param val - The value to check
 * @returns The original value or null if it's an empty object
 */
const emptyObjectToNull = (val: unknown) => (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length === 0 ? null : val);

/**
 * Preprocessor that converts string values to arrays, handling various input formats
 * - Converts newline-separated strings to arrays of strings
 * - Returns empty array for empty strings or empty objects
 * - Returns null for invalid inputs
 * 
 * @param val - The value to process (string, array, or object)
 * @returns Array of strings or null if input is invalid
 */
const stringToArrayOrNullPreprocessor = (val: unknown): string[] | null => {
  if (typeof val === 'string') {
    if (val.trim() === '') return [];
    // Split by comma, as per user requirement for fields like InvestableAssets
    return val.split(',').map(s => s.trim()).filter(s => s !== '');
  }
  if (Array.isArray(val)) { 
    // If it's already an array, filter out non-strings or empty strings
    return val.filter(item => typeof item === 'string').map(s => (s as string).trim()).filter(s => s !== '');
  }
  if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) { 
    return []; // Handle empty object as empty array
  }
  return null; // For other types or truly null/undefined, return null
};

/**
 * Preprocessor for linked record fields in NocoDB
 * Converts various input formats to an array of linked record items
 * 
 * @param val - Input value (string, array, or object)
 * @returns Array of linked record items or null if input is invalid
 */
const stringToLinkedRecordArrayPreprocessor = (val: unknown): Array<{ Id?: number | string; Title?: string | null; name?: string | null }> | null => {
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

/**
 * Schema for linked record items in NocoDB
 * Represents a reference to another record in the database
 */
const linkedRecordItemSchema = z.object({
  Id: z.union([z.number(), z.string()]).optional(), 
  Title: z.string().optional().nullable(), 
  name: z.string().optional().nullable(),  
  
}).passthrough();

/**
 * Comprehensive schema for video records from NocoDB
 * Includes all possible fields that might be returned by the API
 * Uses preprocessors to handle various data formats and ensure type safety
 */
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
        } catch {
          
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
  ImportanceRating: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (val === '') return null;

      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          return num;
        }
        return null; 
      }
      if (typeof val === 'number') {
        return val;
      }
      return null;
    },
    z.number().int().min(1).max(5).optional().nullable().default(null)
  ),
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

  
  KeyNumbersData: z.string().optional().nullable().default(null), 
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

/**
 * Lightweight schema for video list items
 * Contains only the fields needed for displaying videos in a grid/list view
 * Optimized for performance by excluding unnecessary fields
 */
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

/**
 * Schema for pagination metadata in NocoDB API responses
 */
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

/**
 * Creates a generic response schema for NocoDB API responses
 * 
 * @template T - The schema type for items in the response list
 * @param itemSchema - Zod schema for individual items in the response
 * @returns A schema for a paginated NocoDB API response
 */
const createNocoDBResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  list: z.array(itemSchema),
  pageInfo: pageInfoSchema,
});

export type NocoDBResponse<T> = {
  list: T[];
  pageInfo: PageInfo;
};

/**
 * Configured Axios instance for making requests to the NocoDB API
 * Includes default headers and will be extended with authentication
 */
const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

const DEFAULT_PAGE_SIZE = 25;

/**
 * Options for fetching videos from NocoDB.
 * @template T - The schema type for video items.
 */
type FilterOperator = {
  _eq?: string | number | boolean | null;
  _neq?: string | number | boolean | null;
  _like?: string;
  _nlike?: string;
  _in?: (string | number)[];
  _nin?: (string | number)[];
  _gt?: string | number;
  _lt?: string | number;
  _gte?: string | number;
  _lte?: string | number;
  _is?: null;
};

type WhereCondition = {
  [key: string]: string | number | boolean | null | FilterOperator;
};

type WhereClause = WhereCondition | {
  _or?: WhereCondition[];
  _and?: WhereCondition[];
};

interface FetchVideosOptions<T extends z.ZodTypeAny> {
  /**
   * Page number to fetch (1-based)
   */
  page?: number;
  /**
   * Number of items per page
   */
  limit?: number;
  /**
   * Sort order (e.g., 'Title', '-CreatedAt')
   */
  sort?: string;
  /**
   * Fields to include in the response
   */
  fields?: string[];
  /**
   * Custom schema for response validation
   */
  schema?: T;
  /**
   * Override for NocoDB project ID
   */
  ncProjectId?: string;
  /**
   * Override for NocoDB table name
   */
  ncTableName?: string;
  /**
   * Where clause for filtering
   */
  where?: WhereClause;
}

/**
 * Fetches a paginated list of videos from NocoDB
 * 
 * @template T - The schema type for video items (defaults to videoSchema)
 * @param options - Configuration options for the request
 * @returns Object containing the list of videos and pagination info
 * @throws Error if the request fails or response validation fails
 */
export async function fetchVideos<T extends z.ZodType = typeof videoSchema>(
  options: FetchVideosOptions<T> = {}
): Promise<{ videos: z.infer<T>[]; pageInfo: PageInfo }> {
  // Use mock data in development mode
  if (process.env.NODE_ENV === 'development') {
    const { page = 1, limit = 10 } = options;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedVideos = mockVideos.slice(start, end);
    
    return {
      videos: paginatedVideos as z.infer<T>[],
      pageInfo: {
        totalRows: mockVideos.length,
        page,
        pageSize: limit,
        isFirstPage: page === 1,
        isLastPage: end >= mockVideos.length,
      },
    };
  }
  /**
   * Get the current NocoDB URL and token from environment variables
   */
  const currentNcUrl = process.env.NC_URL;
  const currentNcToken = process.env.NC_TOKEN;
  
  /**
   * Determine the NocoDB table name and project ID to use
   */
  const tableName = options?.ncTableName || process.env.NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = options?.ncProjectId || process.env.NOCODB_PROJECT_ID || process.env.NC_PROJECT_ID || 'phk8vxq6f1ev08h';

  /**
   * Check if NocoDB credentials are configured
   */
  if (!currentNcUrl || !currentNcToken) {
    console.error('NocoDB URL (NC_URL) or Token (NC_TOKEN) is not configured for fetchVideos.');
    throw new Error('NocoDB credentials not configured. Check server environment variables.');
  }
  if (!projectId || !tableName) {
    console.error('Required NocoDB environment variables (NC_URL, NC_TOKEN, NOCODB_PROJECT_ID/NC_PROJECT_ID, NOCODB_TABLE_NAME) are not set.');
    throw new Error('NocoDB project/table details not configured. Check server environment variables.');
  }

  /**
   * Set the default page size and calculate the offset
   */
  const limit = options?.limit || DEFAULT_PAGE_SIZE;
  const page = options?.page || 1;
  const offset = (page - 1) * limit;
  
  /**
   * Determine the schema to use for response validation
   */
  const schemaToUse = (options?.schema || videoSchema) as z.ZodType;
  const responseSchema = createNocoDBResponseSchema(schemaToUse);

  /**
   * Construct the request parameters
   */
  const params: Record<string, unknown> = {
    limit: limit,
    offset: offset,
    shuffle: 0, // Default, can be overridden if NocoDB supports it differently
  };

  /**
   * Add sort order to the request parameters if specified
   */
  const MULTI_VALUE_FIELDS_FOR_LIKE_FILTER = [
    'InvestableAssets',
    'Companies',
    'Tags',
    'Hashtags',
    'Indicators',
    'Trends',
    'Persons',
    'BookMediaRecommendations',
    'TechnicalTerms',
    // Add other relevant multi-value fields here if needed
  ];

  if (options?.sort) {
    params.sort = options.sort;
  }

  // Add where clause to the request parameters if specified
  if (options?.where) {
    const convertWhereToString = (clause: WhereClause): string => {
      // Type guard to ensure clause is an object and has the _or property, and _or is an array
      if (typeof clause === 'object' && clause !== null && '_or' in clause && Array.isArray(clause._or)) {
        if (clause._or.length > 0) {
          return clause._or.map((cond: WhereCondition) => {
            const field = Object.keys(cond)[0];
            if (!field) return ''; // Should not happen with well-formed WhereCondition
            
            const filterOpObject = cond[field];
            // Ensure filterOpObject is a valid FilterOperator object
            if (typeof filterOpObject === 'object' && filterOpObject !== null && !Array.isArray(filterOpObject)) {
              const operatorKey = Object.keys(filterOpObject)[0] as keyof FilterOperator;
              if (!operatorKey) return ''; // Should not happen with well-formed FilterOperator
              
              const value = (filterOpObject as FilterOperator)[operatorKey];
              const nocoOperator = operatorKey.startsWith('_') ? operatorKey.substring(1) : operatorKey;
              
              // Basic value stringification, might need more robust escaping for complex values
              const originalValueStr = (value === null || value === undefined) ? 'null' : String(value);

              let finalOperator = nocoOperator;
              let finalValue = originalValueStr;

              // If the field is a multi-value field and the intended operation is 'eq',
              // change it to 'like' and wrap the value with wildcards.
              if (MULTI_VALUE_FIELDS_FOR_LIKE_FILTER.includes(field) && nocoOperator.toLowerCase() === 'eq') {
                finalOperator = 'like';
                // Ensure 'value' here is the raw value before it was potentially stringified as 'null'
                finalValue = `%${String(value)}%`; 
              } else if (nocoOperator.toLowerCase() === 'like') {
                // If the operator is already 'like', ensure wildcards are present if not already user-provided
                if (!String(value).includes('%')) {
                  finalValue = `%${String(value)}%`;
                }
              }

              return `(${field},${finalOperator},${finalValue})`;
            }
            return ''; // Condition field is not a FilterOperator object
          }).filter(Boolean).join('or'); // filter(Boolean) removes empty strings from malformed conditions. Use 'or' as per NocoDB docs.
        }
      }
      // TODO: Handle _and clauses or single WhereConditions if they become necessary
      return ''; 
    };

    const whereString = convertWhereToString(options.where);
    if (whereString) {
      params.where = whereString;
      console.log('[fetchVideos] NocoDB where string constructed:', whereString);
    }
  }

  /**
   * Add fields to the request parameters if specified
   */
  if (options?.fields && options.fields.length > 0) {
    params.fields = options.fields.join(',');
  } 

  try {
    /**
     * Make the request to NocoDB
     */
    const response = await apiClient.get(
      `${currentNcUrl}/api/v1/db/data/noco/${projectId}/${tableName}`,
      {
        headers: { 'xc-token': currentNcToken },
        params: params,
      }
    );

    /**
     * Validate the response using the chosen schema
     */
    const parsedResponse = responseSchema.safeParse(response.data);

    if (!parsedResponse.success) {
      console.error(`Failed to parse NocoDB response (Page: ${page}, Limit: ${limit}, Fields: ${params.fields || 'all'}, Sort: ${params.sort || 'default'}, Schema: ${schemaToUse.description || 'videoSchema'}):`, parsedResponse.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
      console.error(`Problematic NocoDB data (fetchVideos):`, JSON.stringify(response.data, null, 2));
      throw new Error(`Failed to parse NocoDB API response for page ${page}.`);
    }
    
    /**
     * Return the parsed response data
     */
    return { videos: parsedResponse.data.list as z.infer<T>[], pageInfo: parsedResponse.data.pageInfo };

  } catch (error: unknown) {
    /**
     * Handle any errors that occur during the request
     */
    let requestUrl = 'URL not available';
    let requestParams = 'Params not available';
    let responseDataMessage = 'Unknown error cause';

    if (axios.isAxiosError(error)) {
      requestUrl = error.config?.url || requestUrl;
      requestParams = error.config?.params ? JSON.stringify(error.config.params) : requestParams;
      responseDataMessage = JSON.stringify(error.response?.data) || error.message;
    } else if (error instanceof Error) {
      responseDataMessage = error.message;
    }

    console.error(`Error fetching videos (Page ${page}, Limit ${limit}) from URL: ${requestUrl} with params: ${requestParams}:`, responseDataMessage);
    if (error instanceof Error && error.message.startsWith('Failed to parse NocoDB API response')) {
        throw error;
    }
    throw new Error(`Failed to fetch videos from NocoDB (page ${page}, limit ${limit}): ${ (error instanceof Error) ? error.message : 'Unknown cause'}`);
  }
}

/**
 * Fetches a single video by its VideoID from NocoDB
 * 
 * @param videoId - The VideoID of the video to fetch
 * @param options - Configuration options for the request
 * @param forceFetch - Force a new fetch even if the video is cached
 * @returns The video record or null if not found
 * @throws Error if the request fails or response validation fails
 */
interface FetchVideoByIdOptions {
  ncProjectId?: string;
  ncTableName?: string;
}
export async function fetchVideoByVideoId(videoId: string, options?: FetchVideoByIdOptions, forceFetch = false): Promise<Video | null> {
  // Check if the video is already cached
  if (videoCache.has(videoId) && !forceFetch) {
    return videoCache.get(videoId)!;
  }

  // Get the current NocoDB URL and token from environment variables
  const currentNcUrl = process.env.NC_URL;
  const currentNcToken = process.env.NC_TOKEN;
  
  // Determine the NocoDB table name and project ID to use
  const tableName = options?.ncTableName || process.env.NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = options?.ncProjectId || process.env.NOCODB_PROJECT_ID || process.env.NC_PROJECT_ID || 'phk8vxq6f1ev08h';

  // Check if NocoDB credentials are configured
  if (!currentNcUrl || !currentNcToken) {
    console.error('NocoDB URL (NC_URL) or Token (NC_TOKEN) is not configured for fetchVideoByVideoId.');
    throw new Error('NocoDB credentials not configured. Check server environment variables.');
  }
  if (!projectId || !tableName) {
    console.error('Required NocoDB environment variables (NC_URL, NC_TOKEN, NOCODB_PROJECT_ID/NC_PROJECT_ID, NOCODB_TABLE_NAME) are not set.');
    throw new Error('NocoDB project/table details not configured. Check server environment variables.');
  }

  // Make the request to NocoDB
  const fetchPromise = (async (): Promise<Video | null> => {
    try {
      const response = await apiClient.get(
        `${currentNcUrl}/api/v1/db/data/noco/${projectId}/${tableName}/find-one`,
        {
          headers: { 'xc-token': currentNcToken },
          params: { 
            where: `(VideoID,eq,${videoId})`,
            // Consider adding fields parameter if not all fields from videoSchema are needed by default
            // fields: 'Id,VideoID,URL,ThumbHigh,Title,Channel,Duration,ViewCount,LikeCount,PublishedAt,PersonalComment,ImportanceRating'
          },
        }
      );

      // Validate the response using the videoSchema
      console.log(`[fetchVideoByVideoId - ${videoId}] Raw NocoDB response data:`, JSON.stringify(response.data, null, 2));

      if (!response.data || Object.keys(response.data).length === 0) {
        console.warn(`[fetchVideoByVideoId - ${videoId}] No data returned from NocoDB or data is empty object.`);
        videoCache.delete(videoId); // Ensure cache is cleared for empty/not found results
        return null; 
      }

      const parsedVideo = videoSchema.safeParse(response.data);

      if (!parsedVideo.success) {
        console.error(`[fetchVideoByVideoId - ${videoId}] Failed to parse NocoDB response. Issues:`, parsedVideo.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
        console.error(`[fetchVideoByVideoId - ${videoId}] Problematic NocoDB data for find-one (VideoID: ${videoId}):`, JSON.stringify(response.data, null, 2));
        videoCache.delete(videoId); // Ensure cache is cleared on parse failure
        throw new Error(`Failed to parse NocoDB API response for VideoID ${videoId}.`);
      }
      return parsedVideo.data;
    } catch (error: unknown) {
      // Handle any errors that occur during the request
      videoCache.delete(videoId);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`Video with VideoID ${videoId} not found in NocoDB (404).`);
        return null;
      }
      let errorMessage = 'Unknown error';
      if (axios.isAxiosError(error)) {
        errorMessage = JSON.stringify(error.response?.data) || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error(`Error fetching video by VideoID ${videoId}:`, errorMessage);
      if (error instanceof Error && error.message.startsWith('Failed to parse NocoDB API response')) {
        throw error;
      }
      throw new Error(`Failed to fetch video (VideoID: ${videoId}) from NocoDB: ${ (error instanceof Error) ? error.message : 'Unknown cause'}`);
    }
  })();

  // Cache the result
  videoCache.set(videoId, fetchPromise);
  
  // Return the result
  return fetchPromise;
}

// Helper Zod schema for the V2 API response structure (simplified)
// We are interested in the 'list' which contains the records, and each record is an object.
// The actual structure of a record will vary, so we use z.record(z.any())
const nocoDBV2RecordSchema = z.record(z.any()); // Each record is an object with unknown keys/values
const nocoDBV2ResponseSchema = z.object({
  list: z.array(nocoDBV2RecordSchema),
  pageInfo: z.object({
    totalRows: z.number(),
    page: z.number(),
    pageSize: z.number(),
    isFirstPage: z.boolean(),
    isLastPage: z.boolean(),
  }),
});

export async function _fetchDistinctValuesForFieldV2_SERVER_ONLY(
  fieldName: string
): Promise<string[]> {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const TABLE_ID = process.env.NOCODB_TABLE_ID;
  const tableName = process.env.NOCODB_TABLE_NAME; // For error messages

  if (!NC_URL || !NC_TOKEN || !TABLE_ID || !tableName) {
    console.error(
      'Missing NocoDB environment variables for V2 API distinct values fetch. Ensure NC_URL, NC_TOKEN, NOCODB_TABLE_ID, and NOCODB_TABLE_NAME are set.'
    );
    throw new Error(
      'NocoDB V2 API environment variables are not properly configured.'
    );
  }

  try {
    // console.log(`Fetching distinct values for field: ${fieldName} using V2 API from table ID: ${TABLE_ID}`);
    const allRecords: z.infer<typeof nocoDBV2RecordSchema>[] = [];
    let currentPage = 1;
    let isLastPage = false;
    const pageSize = 100; // NocoDB default page size for V2 API is often 20 or 25. Using 100 for potentially faster fetch if supported.

    while (!isLastPage) {
        // console.log(`Fetching page ${currentPage} for field ${fieldName}, table ${TABLE_ID}`);
        const response = await axios.get(
            `${NC_URL}/api/v2/tables/${TABLE_ID}/records`,
            {
            headers: { 'xc-token': NC_TOKEN },
            params: {
                fields: fieldName, // Attempt to fetch only the required field
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
            },
            }
        );

        const parsedData = nocoDBV2ResponseSchema.safeParse(response.data);

        if (!parsedData.success) {
            console.error(
            `Error parsing NocoDB V2 API response for field ${fieldName} (table ID: ${TABLE_ID}, page ${currentPage}):`,
            parsedData.error.errors
            );
            if (response.data && response.data.list && response.data.pageInfo) {
                console.warn("Proceeding with potentially partially parsed data due to schema mismatch while fetching distinct values.");
                allRecords.push(...response.data.list);
                isLastPage = response.data.pageInfo?.isLastPage ?? true;
            } else {
                 throw new Error(`NocoDB V2 API parsing error and no list data for field ${fieldName} (table ID: ${TABLE_ID}): ${parsedData.error.message}`);
            }
        } else {
            allRecords.push(...parsedData.data.list);
            isLastPage = parsedData.data.pageInfo.isLastPage;
        }
        currentPage++;
        if (currentPage > 200) { 
            console.warn(`Exceeded 200 pages fetch limit for distinct values from table ID ${TABLE_ID}. Breaking.`);
            break;
        }
    }

    const distinctValues = new Set<string>();

    allRecords.forEach((record) => {
      const value = record[fieldName];
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'string' && item.trim() !== '') {
              distinctValues.add(item.trim());
            } else if (item !== null && item !== undefined) { 
                distinctValues.add(String(item).trim());
            }
          });
        } else if (typeof value === 'string') {
          const items = value.split(',').map((s) => s.trim());
          items.forEach((item) => {
            if (item !== '') {
              distinctValues.add(item);
            }
          });
        } else if (value !== null && value !== undefined) { 
             distinctValues.add(String(value).trim());
        }
      }
    });
    // console.log(`Found distinct values for ${fieldName} from table ID ${TABLE_ID}:`, Array.from(distinctValues).sort());
    return Array.from(distinctValues).sort();
  } catch (error) {
    console.error(`Error fetching distinct values for field ${fieldName} from NocoDB V2 API (Table ID: ${TABLE_ID}, Table Name: ${tableName}):`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('NocoDB API V2 Error Response Status:', error.response.status);
      console.error('NocoDB API V2 Error Response Data:', JSON.stringify(error.response.data, null, 2));
        if (error.response.status === 404 && error.response.data?.msg?.toLowerCase().includes("table not found")) {
            throw new Error(`NocoDB Error: Table with ID '${TABLE_ID}' not found. Please check NOCODB_TABLE_ID in your .env file.`);
        } else if (error.response.status === 400 ) {
             const errorMsg = typeof error.response.data?.msg === 'string' ? error.response.data.msg.toLowerCase() : "";
             if (errorMsg.includes("fields") || errorMsg.includes("column") || errorMsg.includes(fieldName.toLowerCase())) {
                console.warn(`NocoDB API V2 returned an error, possibly due to the 'fields=${fieldName}' parameter or field name correctness (Table ID: ${TABLE_ID}). The API might not support restricting fields this way or the field name is incorrect.`);
                throw new Error(`NocoDB API V2 error with 'fields' parameter for field '${fieldName}' or field not found (Table ID: ${TABLE_ID}). Check API capabilities and field name.`);
             }
        }
    }
    throw new Error(
      `Failed to fetch distinct values for '${fieldName}' from NocoDB V2 (Table ID: ${TABLE_ID}, Table Name: ${tableName}). Ensure TABLE_ID is correct, NocoDB is accessible, and the field exists.`
    );
  }
}

interface FetchAllVideosOptions<T extends z.ZodTypeAny> {
  /**
   * Sort order (e.g., 'Title', '-CreatedAt')
   */
  sort?: string;
  /**
   * Fields to include in the response
   */
  fields?: string[];
  /**
   * Custom schema for response validation
   */
  schema?: T;
  
  /**
   * Override for NocoDB project ID
   */
  ncProjectId?: string;
  /**
   * Override for NocoDB table name
   */
  ncTableName?: string;

  /**
   * Filter category (e.g., 'ImportanceRating', 'Channel')
   */
  filterCategory?: string;

  /**
   * Filter values for the selected category
   */
  filterValues?: string[];
}

/**
 * Fetches all videos from NocoDB with automatic pagination
 * 
 * @template T - The schema type for video items (defaults to videoSchema)
 * @param options - Configuration options for the request
 * @returns Array of all video records
 * @throws Error if any request fails or response validation fails
 */
export async function fetchDistinctValues(field: string): Promise<string[]> {
  console.log(`[fetchDistinctValues] Called for field: ${field}`);
  
  try {
    const response = await fetch(`/api/distinct-values?field=${encodeURIComponent(field)}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to fetch distinct values: ${error.error || response.statusText}`);
    }
    const values = await response.json();
    console.log(`[fetchDistinctValues] Received values for ${field}:`, values);
    return values;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[fetchDistinctValues] Error fetching distinct values for field ${field}:`, error.message);
    } else {
      console.error(`[fetchDistinctValues] An unknown error occurred while fetching distinct values for field ${field}:`, error);
    }
    throw error;
  }
}

export async function fetchAllVideos<T extends z.ZodType = typeof videoSchema>(
  options?: FetchAllVideosOptions<T>
): Promise<z.infer<T>[]> {
  /**
   * Initialize the result array
   */
  const allItems: z.infer<T>[] = [];
  
  /**
   * Initialize the current page number
   */
  let currentPage = 1;
  
  /**
   * Determine the page size to use
   */
  const pageSize = options?.fields ? 50 : DEFAULT_PAGE_SIZE; 
  
  /**
   * Initialize the flag to track if there are more pages
   */
  let hasMorePages = true;

  const fetchOptions: Omit<FetchVideosOptions<T>, 'schema'> = {
    sort: options?.sort,
    limit: pageSize,
    fields: options?.fields,
    ncProjectId: options?.ncProjectId,
    ncTableName: options?.ncTableName,
    where: options?.filterCategory && options?.filterValues && options.filterValues.length > 0
      ? {
          _or: options.filterValues.map((value: string) => ({
            [options.filterCategory as string]: {
              _eq: value
            }
          }))
        }
      : undefined
  };

  console.log('[fetchAllVideos] Fetch options:', JSON.stringify(fetchOptions, null, 2));

  while (hasMorePages) {
    try {
      // Create a properly typed schema for this fetch
      const schemaToUse = (options?.schema || videoSchema) as T;
      
      const { videos } = await fetchVideos<T>({
        ...fetchOptions,
        schema: schemaToUse,
        page: currentPage,
        limit: pageSize,
      });

      allItems.push(...videos);
      hasMorePages = videos.length === pageSize;
      currentPage++;
    } catch (error) {
      console.error(`Error fetching page ${currentPage} of videos:`, error);
      throw error;
    }
  }
  return allItems;
}

