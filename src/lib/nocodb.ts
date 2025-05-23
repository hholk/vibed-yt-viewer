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

/**
 * Preprocessor for linked record fields in NocoDB
 * Converts various input formats to an array of linked record items
 * 
 * @param val - Input value (string, array, or object)
 * @returns Array of linked record items or null if input is invalid
 */
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

/**
 * Schema for linked record items in NocoDB
 * Represents a reference to another record in the database
 */
const linkedRecordItemSchema = z.object({
  Id: z.any().optional(), 
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
 * Updates a video record in NocoDB
 * 
 * @param recordId - The ID of the record to update
 * @param data - Partial video object containing fields to update
 * @param ncProjectIdParam - Optional override for NocoDB project ID
 * @param ncTableNameParam - Optional override for NocoDB table name
 * @returns The updated video record
 * @throws Error if the update fails or response validation fails
 */
/**
 * Looks up the numeric record Id in NocoDB given a VideoID string.
 * Returns the Id or throws if not found.
 */
async function getRecordIdByVideoId(
  videoId: string,
  ncProjectIdParam?: string,
  ncTableNameParam?: string
): Promise<number> {
  const video = await fetchVideoByVideoId(videoId, ncProjectIdParam, ncTableNameParam);
  if (!video || typeof video.Id !== 'number') {
    throw new Error(`No NocoDB record found for VideoID: ${videoId}`);
  }
  return video.Id;
}

/**
 * Updates a video record in NocoDB
 *
 * Accepts either a numeric recordId or a VideoID string. If a string is provided, resolves it to the numeric Id.
 */
export async function updateVideo(
  recordIdOrVideoId: number | string,
  data: Partial<z.infer<typeof videoSchema>>,
  ncProjectIdParam?: string,
  ncTableNameParam?: string
): Promise<Video> {
  /**
   * Helper to resolve a numeric ID from either a direct ID or a VideoID string
   * @param idOrVideoId - Either a numeric ID or a VideoID string
   * @param ncProjectId - Optional project ID override
   * @param ncTableName - Optional table name override
   * @returns The resolved numeric ID
   * @throws Error if the ID cannot be resolved
   */
  async function resolveNumericId(idOrVideoId: number | string, ncProjectId?: string, ncTableName?: string): Promise<number> {
    // If it's already a number, return it
    if (typeof idOrVideoId === 'number') return idOrVideoId;
    
    // Try to parse as number (in case it's a stringified number)
    const asNum = Number(idOrVideoId);
    if (!isNaN(asNum) && Number.isInteger(asNum)) return asNum;
    
    // Try to find the video by VideoID
    try {
      const video = await fetchVideoByVideoId(idOrVideoId, ncProjectId, ncTableName);
      if (!video) {
        throw new Error(`No video found with VideoID: ${idOrVideoId}`);
      }
      return video.Id;
    } catch (error: unknown) {
      console.error(`Error resolving numeric ID for ${idOrVideoId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to resolve numeric ID for ${idOrVideoId}: ${errorMessage}`);
    }
  }
  // Always use env vars for projectId and tableName if not explicitly provided
  const currentNcUrl = process.env.NEXT_PUBLIC_NC_URL;
  const currentNcToken = process.env.NEXT_PUBLIC_NC_TOKEN || process.env.NC_TOKEN;
  const projectId = ncProjectIdParam || process.env.NEXT_PUBLIC_NC_PROJECT_ID || 'phk8vxq6f1ev08h';
  const tableName = ncTableNameParam || process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME || 'youtubeTranscripts';

  // Validate required environment variables
  if (!currentNcUrl) {
    throw new Error('NEXT_PUBLIC_NC_URL is not configured');
  }
  if (!currentNcToken) {
    throw new Error('NEXT_PUBLIC_NC_TOKEN or NC_TOKEN is not configured');
  }

  // Prepare the data for the API
  const updateData = { ...data };
  
  // Ensure ImportanceRating is a number if provided
  if (updateData.ImportanceRating !== undefined) {
    const rating = Number(updateData.ImportanceRating);
    updateData.ImportanceRating = isNaN(rating) ? null : rating;
  }

  // Resolve the numeric ID first
  let numericId: number;
  try {
    numericId = await resolveNumericId(recordIdOrVideoId, projectId, tableName);
    console.log(`[updateVideo] Resolved record ID ${recordIdOrVideoId} to numeric ID:`, numericId);
  } catch (error) {
    console.error(`[updateVideo] Failed to resolve numeric ID for record ${recordIdOrVideoId}:`, error);
    throw new Error(`Could not find video with ID: ${recordIdOrVideoId}`);
  }

  // Build the URL for the PATCH request
  const url = `${currentNcUrl}/api/v1/db/data/v1/${projectId}/${tableName}/${numericId}`;
  
  console.log(`[updateVideo] PATCH to:`, url, 'with data:', updateData);
  
  try {
    const response = await apiClient.patch(
      url, 
      updateData,
      {
        headers: {
          'xc-token': currentNcToken,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Log the response for debugging
    console.log('Update response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });

    // Validate the response data
    const parsed = videoSchema.safeParse(response.data);
    if (!parsed.success) {
      console.error('NocoDB API response validation failed:', parsed.error);
      console.error('Raw response data:', response.data);
      throw new Error('Received invalid data format from NocoDB');
    }

    // Invalidate cache for this video
    if (videoCache.has(recordIdOrVideoId.toString())) {
      videoCache.delete(recordIdOrVideoId.toString());
    }
    
    // Also invalidate by VideoID if we used a VideoID
    if (typeof recordIdOrVideoId === 'string' && !/^\d+$/.test(recordIdOrVideoId)) {
      videoCache.delete(recordIdOrVideoId);
    }

    return parsed.data;
  } catch (error: any) {
    // Enhanced error logging
    let errorMessage = 'Unknown error';
    
    if (axios.isAxiosError(error)) {
      // Handle Axios errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Status: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from server';
        console.error('No response received. Request config:', error.config);
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Request setup error: ${error.message}`;
        console.error('Error message:', error.message);
      }
    } else if (error instanceof Error) {
      // Handle other Error objects
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    console.error(`Error updating video record ${recordIdOrVideoId}:`, errorMessage);
    throw new Error(`Failed to update video record: ${errorMessage}`);
  }
}

interface FetchVideosOptions<T extends z.ZodTypeAny> {
  sort?: string;
  limit?: number;
  page?: number;
  fields?: string[];
  schema?: T;
  
  /**
   * Override for NocoDB project ID
   */
  ncProjectId?: string;
  /**
   * Override for NocoDB table name
   */
  ncTableName?: string;
}

/**
 * Fetches a paginated list of videos from NocoDB
 * 
 * @template T - The schema type for video items (defaults to videoSchema)
 * @param options - Configuration options for the request
 * @returns Object containing the list of videos and pagination info
 * @throws Error if the request fails or response validation fails
 */
export async function fetchVideos<T extends z.ZodTypeAny>(
  options?: FetchVideosOptions<T>
): Promise<{ videos: z.infer<T>[]; pageInfo: PageInfo }> {
  /**
   * Get the current NocoDB URL and token from environment variables
   */
  const currentNcUrl = process.env.NEXT_PUBLIC_NC_URL;
  const currentNcToken = process.env.NEXT_PUBLIC_NC_TOKEN;
  
  /**
   * Determine the NocoDB table name and project ID to use
   */
  const tableName = options?.ncTableName || process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = options?.ncProjectId || process.env.NEXT_PUBLIC_NOCODB_PROJECT_ID || 'phk8vxq6f1ev08h';

  /**
   * Check if NocoDB credentials are configured
   */
  if (!currentNcUrl || !currentNcToken) {
    console.error('NocoDB URL or Token is not configured.');
    throw new Error('NocoDB credentials not configured.');
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
  const params: Record<string, any> = {
    limit: limit,
    offset: offset,
    shuffle: 0,
  };

  /**
   * Add sort order to the request parameters if specified
   */
  if (options?.sort) {
    params.sort = options.sort;
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
      console.error(`Failed to parse NocoDB response (Page: ${page}, Limit: ${limit}, Fields: ${params.fields || 'all'}, Schema: ${schemaToUse.description || 'video schema'}):`, parsedResponse.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
      
      throw new Error(`Failed to parse NocoDB API response for page ${page}.`);
    }
    
    /**
     * Return the parsed response data
     */
    return { videos: parsedResponse.data.list as z.infer<T>[], pageInfo: parsedResponse.data.pageInfo };

  } catch (error: any) {
    /**
     * Handle any errors that occur during the request
     */
    const requestUrl = error.config?.url || 'URL not available';
    console.error(`Error fetching videos (Page ${page}, Limit ${limit}) from URL: ${requestUrl}:`, error.response?.data || error.message);
    if (error.message.startsWith('Failed to parse NocoDB API response')) {
        throw error;
    }
    throw new Error(`Failed to fetch videos from NocoDB (page ${page}, limit ${limit}): ${error.message}`);
  }
}

/**
 * Fetches a single video by its VideoID from NocoDB
 * 
 * @param videoId - The VideoID of the video to fetch
 * @param ncProjectIdParam - Optional override for NocoDB project ID
 * @param ncTableNameParam - Optional override for NocoDB table name
 * @returns The video record or null if not found
 * @throws Error if the request fails or response validation fails
 */
export async function fetchVideoByVideoId(videoId: string, ncProjectIdParam?: string, ncTableNameParam?: string): Promise<Video | null> {
  // Check if the video is already cached
  if (videoCache.has(videoId)) {
    return videoCache.get(videoId)!;
  }

  // Get the current NocoDB URL and token from environment variables
  const currentNcUrl = process.env.NEXT_PUBLIC_NC_URL;
  const currentNcToken = process.env.NEXT_PUBLIC_NC_TOKEN;
  
  // Determine the NocoDB table name and project ID to use
  const tableName = ncTableNameParam || process.env.NEXT_PUBLIC_NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = ncProjectIdParam || process.env.NEXT_PUBLIC_NOCODB_PROJECT_ID || 'phk8vxq6f1ev08h';

  // Check if NocoDB credentials are configured
  if (!currentNcUrl || !currentNcToken) {
    console.error('NocoDB URL or Token is not configured for fetchVideoByVideoId.');
    throw new Error('NocoDB credentials not configured.');
  }

  // Make the request to NocoDB
  const fetchPromise = (async () => {
    try {
      const response = await apiClient.get(
        `${currentNcUrl}/api/v1/db/data/noco/${projectId}/${tableName}`,
        {
          headers: { 'xc-token': currentNcToken },
          params: { 
            where: `(VideoID,eq,${videoId})`,
            limit: 1
          },
        }
      );

      // Validate the response using the videoSchema
      console.log(`[fetchVideoByVideoId - ${videoId}] Raw NocoDB response data:`, JSON.stringify(response.data, null, 2));

      if (!response.data?.list || !Array.isArray(response.data.list) || response.data.list.length === 0) {
        console.warn(`[fetchVideoByVideoId - ${videoId}] No matching video found with VideoID: ${videoId}`);
        return null; 
      }

      const videoData = response.data.list[0];
      const parsedVideo = videoSchema.safeParse(videoData);

      if (!parsedVideo.success) {
        console.error(`[fetchVideoByVideoId - ${videoId}] Failed to parse NocoDB response. Issues:`, parsedVideo.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
        console.error(`[fetchVideoByVideoId - ${videoId}] Problematic NocoDB data for VideoID ${videoId}:`, JSON.stringify(videoData, null, 2));
        throw new Error(`Failed to parse NocoDB API response for VideoID ${videoId}.`);
      }
      return parsedVideo.data;
    } catch (error: any) {
      // Handle any errors that occur during the request
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

  // Cache the result
  videoCache.set(videoId, fetchPromise);
  
  // Return the result
  return fetchPromise;
}

/**
 * Options for fetching all videos from NocoDB
 * 
 * @template T - The schema type for video items (defaults to videoSchema)
 */
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
}

/**
 * Fetches all videos from NocoDB with automatic pagination
 * 
 * @template T - The schema type for video items (defaults to videoSchema)
 * @param options - Configuration options for the request
 * @returns Array of all video records
 * @throws Error if any request fails or response validation fails
 */
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
  };

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

