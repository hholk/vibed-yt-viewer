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
import { NocoDBRequestError, NocoDBValidationError } from './errors';
import { getFromCache, setInCache, deleteFromCache } from './cache';

/** Helper to format axios errors consistently */
function createRequestError(prefix: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return new NocoDBRequestError(
    `${prefix}: ${message}`,
    axios.isAxiosError(error) ? error.response?.status : undefined,
    axios.isAxiosError(error) ? error.response?.data : undefined,
  );
}

/** Resolve numeric record ID from numeric or VideoID value */
export async function resolveNumericId(
  idOrVideoId: number | string,
  ncProjectId?: string,
  ncTableId?: string,
): Promise<number> {
  console.log('[resolveNumericId] Input:', idOrVideoId, 'projectId:', ncProjectId, 'tableId:', ncTableId);
  if (typeof idOrVideoId === 'number') {
    console.log('[resolveNumericId] Input is number, returning as numeric ID:', idOrVideoId);
    return idOrVideoId;
  }
  const asNum = Number(idOrVideoId);
  if (!isNaN(asNum) && Number.isInteger(asNum)) {
    console.log('[resolveNumericId] Input is numeric string, returning as numeric ID:', asNum);
    return asNum;
  }
  const video = await fetchVideoByVideoId(String(idOrVideoId), ncProjectId, ncTableId);
  if (!video) throw new Error(`No video found with VideoID: ${idOrVideoId}`);
  console.log('[resolveNumericId] Resolved VideoID', idOrVideoId, 'to numeric ID:', video.Id);
  return video.Id;
}

// --- END resolveNumericId ---

/** Configuration options required to connect to NocoDB */
export interface NocoDBConfig {
  url: string;
  token: string;
  projectId: string;
  tableId: string; // Table ID is now required for all NocoDB v2 API operations
  sourceAlias: string; // Added sourceAlias
}

/**
 * Resolves NocoDB configuration from environment variables with optional
 * overrides. Throws if the URL or token are missing.
 */
// Returns the NocoDB configuration using ONLY the following environment variables:
// - NC_URL: URL of your NocoDB instance
// - NC_TOKEN: API token for authentication
// - NOCODB_TABLE_ID: The table name to use
// - NOCODB_PROJECT_ID: The project/database ID
// All other variable names and defaults have been removed for strictness.
export function getNocoDBConfig(overrides: Partial<NocoDBConfig> = {}): NocoDBConfig {
  // Read configuration from overrides (function arguments) or environment variables
  const url = overrides.url || process.env.NC_URL;
  const token = overrides.token || process.env.NC_TOKEN;
  const projectId = overrides.projectId || process.env.NOCODB_PROJECT_ID;
  const tableId = overrides.tableId || process.env.NOCODB_TABLE_ID;
  const sourceAlias = overrides.sourceAlias || 'noco'; // Kept for compatibility

  // Throw errors if required variables are missing
  if (!url) {
    throw new Error('NocoDB URL is not configured. Please set NC_URL in your environment.');
  }
  if (!token) {
    throw new Error('NocoDB Auth Token is not configured. Please set NC_TOKEN in your environment.');
  }
  if (!projectId) {
    throw new Error('NocoDB Project ID is not configured. Please set NOCODB_PROJECT_ID in your environment.');
  }
  if (!tableId) {
    throw new Error('NocoDB Table ID is not configured. Please set NOCODB_TABLE_ID in your environment.');
  }

  return { url, token, projectId, tableId, sourceAlias };
}


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
const stringToLinkedRecordArrayPreprocessor = (
  val: unknown,
): Array<{ Id?: number | string; Title?: string | null; name?: string | null }> | null => {
  if (typeof val === 'string') {
    if (val.trim() === '') return [];
    return val.split(',').map(s => s.trim()).filter(s => s !== '').map(itemTitle => ({ Title: itemTitle, name: itemTitle }));
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
  Id: z.union([z.number().int(), z.string()]).optional(),
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
  VideoID: z.string().nullable(),
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
  Title: z.string().nullable(),
  Channel: z.string().optional().nullable().default(null),
  Description: z.string().optional().nullable().default(null),
  ImportanceRating: z.number().int().min(1).max(5).optional().nullable().default(null),
  PersonalComment: z.string().optional().nullable().default(null),
  CreatedAt: z.coerce.date().optional().nullable().default(null),
  UpdatedAt: z.coerce.date().optional().nullable().default(null),
  PublishedAt: z.coerce.date().optional().nullable().default(null),
  Tags: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Categories: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
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
  Locations: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Events: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  FileFormat: z.string().optional().nullable().default(null),
  FileSize: z.string().optional().nullable().default(null),
  FrameRate: z.number().optional().nullable().default(null),
  Hashtags: z.preprocess(stringToArrayOrNullPreprocessor, z.array(z.string()).nullable().default([]).optional()),
  Language: z.string().optional().nullable().default(null),
  MainTopic: z.string().optional().nullable().default(null),
  Priority: z.string().optional().nullable().default(null),
  Private: z.boolean().optional().nullable().default(null),
  Products: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
  Project: z.string().optional().nullable().default(null),
  Resolution: z.string().optional().nullable().default(null),
  Source: z.string().optional().nullable().default(null),
  TopicsDiscussed: z.preprocess(emptyObjectToNull, z.array(z.string()).nullable().default([]).optional()),
  Speaker: z.string().optional().nullable().default(null),
  Status: z.string().optional().nullable().default(null),
  Subtitles: z.union([z.boolean(), z.preprocess(emptyObjectToNull, z.array(z.string()))]).optional().nullable().default(null),
  Speakers: z.preprocess(stringToLinkedRecordArrayPreprocessor, z.array(linkedRecordItemSchema).nullable().default([]).optional()),
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
  Title: z.string().nullable(),
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
  Description: z.string().optional().nullable(),
  VideoGenre: z.string().optional().nullable(),
  Persons: z
    .preprocess(
      stringToLinkedRecordArrayPreprocessor,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
  Companies: z
    .preprocess(
      stringToLinkedRecordArrayPreprocessor,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
  Indicators: z
    .preprocess(
      stringToLinkedRecordArrayPreprocessor,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
  Trends: z
    .preprocess(
      stringToLinkedRecordArrayPreprocessor,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
  InvestableAssets: z.preprocess(
    stringToArrayOrNullPreprocessor,
    z.array(z.string()).nullable().default([]).optional(),
  ),
  TickerSymbol: z.string().optional().nullable(),
  Institutions: z
    .preprocess(
      stringToLinkedRecordArrayPreprocessor,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
  EventsFairs: z.preprocess(
    emptyObjectToNull,
    z.array(z.string()).nullable().default([]).optional(),
  ),
  DOIs: z.preprocess(
    emptyObjectToNull,
    z.array(z.string()).nullable().default([]).optional(),
  ),
  Hashtags: z.preprocess(
    stringToArrayOrNullPreprocessor,
    z.array(z.string()).nullable().default([]).optional(),
  ),
  MainTopic: z.string().optional().nullable(),
  PrimarySources: z.preprocess(
    stringToArrayOrNullPreprocessor,
    z.array(z.string()).nullable().default([]).optional(),
  ),
  Sentiment: z
    .preprocess(
      (val) => {
        if (val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      },
      z.number().nullable().default(null),
    )
    .optional(),
  SentimentReason: z.string().optional().nullable(),
  TechnicalTerms: z.preprocess(
    stringToArrayOrNullPreprocessor,
    z.array(z.string()).nullable().default([]).optional(),
  ),
  Speaker: z.string().optional().nullable(),
  VideoID: z.string().nullable(),
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
 * @param ncTableIdParam - Optional override for NocoDB table name
 * @returns The updated video record
 * @throws Error if the update fails or response validation fails
 */

/**
 * Updates a video record in NocoDB
 *
 * Accepts either a numeric recordId or a VideoID string. If a string is provided, resolves it to the numeric Id.
 */
export async function updateVideo(
  recordIdOrVideoId: number | string,
  data: Partial<z.infer<typeof videoSchema>>,
  ncProjectIdParam?: string,
  ncTableIdParam?: string
): Promise<Video> {
  const { url: ncUrl, token, projectId, tableId } = getNocoDBConfig({
    projectId: ncProjectIdParam,
    tableId: ncTableIdParam,
  });

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
    numericId = await resolveNumericId(recordIdOrVideoId, projectId, tableId);
    console.log(`[updateVideo] Resolved record ID ${recordIdOrVideoId} to numeric ID:`, numericId);
  } catch (error) {
    console.error(`[updateVideo] Failed to resolve numeric ID for record ${recordIdOrVideoId}:`, error);
    throw new Error(`Could not find video with ID: ${recordIdOrVideoId}`);
  }

  // Build the URL for the PATCH request
  // NocoDB v2 endpoint: /api/v2/meta/projects/{projectId}/tables/{tableId}/records/{rowId}
  // Use project and table IDs. This is the most compatible and robust endpoint for PATCH/DELETE.
  // Example: http://localhost:8080/api/v2/meta/projects/MyProject/tables/MyTable/records/123
  const requestUrl = `${ncUrl}/api/v2/meta/projects/${projectId}/tables/${tableId}/records/${numericId}`;

  // --- DEBUG LOGGING ---
  console.log('=== UPDATE VIDEO DEBUG INFO ===');
  console.log('Full Request URL:', requestUrl);
  console.log('Request Method:', 'PATCH');
  console.log('Headers:', {
    'xc-token': token ? '[TOKEN_PRESENT]' : 'MISSING',
    'xc-project': projectId ? `[${projectId}]` : 'MISSING',
    'Content-Type': 'application/json'
  });
  console.log('Request Data:', updateData);
  console.log('Table ID:', tableId);
  console.log('Project ID:', projectId);
  console.log('Numeric Record ID:', numericId);
  console.log('==============================');
  // --- END DEBUG LOGGING ---

  try {
    // PATCH the video using v2 endpoint (project/table IDs)
    const response = await apiClient.patch<z.infer<typeof videoSchema>>(
      requestUrl,
      updateData,
      {
        headers: {
          'xc-token': token, // Auth token for NocoDB
          'Content-Type': 'application/json',
        }, // No xc-project header needed for v2 endpoint
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
      throw new NocoDBValidationError('Received invalid data format from NocoDB', parsed.error.issues);
    }

    // Update the cache with the new data
    const updatedVideo = parsed.data;
    if (updatedVideo.VideoID) {
      setInCache(updatedVideo.VideoID, updatedVideo);
    }
    
    // Also cache by numeric ID if available
    if (updatedVideo.Id) {
      setInCache(updatedVideo.Id.toString(), updatedVideo);
    }
    
    return updatedVideo;
  } catch (error: unknown) {
    console.error('=== UPDATE VIDEO ERROR ===');
    
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers ? {
            ...error.config.headers,
            'xc-token': error.config.headers['xc-token'] ? '[TOKEN_PRESENT]' : 'MISSING',
            'xc-project': error.config.headers['xc-project'] ? '[PROJECT_ID_PRESENT]' : 'MISSING'
          } : 'NO_HEADERS',
          data: error.config?.data
        }
      });
    } else if (error instanceof NocoDBValidationError) {
      console.error('Validation Error:', error.issues);
      throw error;
    } else if (error instanceof Error) {
      console.error('Error Details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Unknown Error:', error);
    }
    
    console.error('=========================');
    throw createRequestError('Failed to update video record', error);
  }
}

/**
 * Deletes a video record from NocoDB.
 *
 * Accepts either a numeric recordId or a VideoID string. If a string is
 * provided, the numeric Id is resolved via `fetchVideoByVideoId`.
 */
export async function deleteVideo(
  recordIdOrVideoId: number | string,
  ncProjectIdParam?: string,
  ncTableIdParam?: string
): Promise<void> {

  const { url, token, projectId, tableId } = getNocoDBConfig({
    projectId: ncProjectIdParam,
    tableId: ncTableIdParam,
  });

  let numericId: number;
  try {
    numericId = await resolveNumericId(recordIdOrVideoId, projectId, tableId);
    console.log(`[deleteVideo] Resolved record ID ${recordIdOrVideoId} to numeric ID:`, numericId);
  } catch (error) {
    console.error(`[deleteVideo] Failed to resolve numeric ID for record ${recordIdOrVideoId}:`, error);
    throw new Error(`Could not find video with ID: ${recordIdOrVideoId}`);
  }

  // NocoDB v2 endpoint: /api/v2/meta/projects/{projectId}/tables/{tableId}/records/{rowId}
  // Use project and table IDs. This is the most compatible and robust endpoint for PATCH/DELETE.
  // Example: http://localhost:8080/api/v2/meta/projects/MyProject/tables/MyTable/records/123
  const requestUrl = `${url}/api/v2/meta/projects/${projectId}/tables/${tableId}/records/${numericId}`;
  console.log('[deleteVideo] DELETE to:', requestUrl);

  try {
    await apiClient.delete(requestUrl, { headers: { 'xc-token': token } });

    deleteFromCache(recordIdOrVideoId.toString());
    if (typeof recordIdOrVideoId === 'string' && !/^\d+$/.test(recordIdOrVideoId)) {
      deleteFromCache(recordIdOrVideoId);
    }
  } catch (error: unknown) {
    console.error(`Error deleting video record ${recordIdOrVideoId}:`, error);
    throw createRequestError('Failed to delete video record', error);
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
   * Override for NocoDB table ID (v2 API)
   */
  ncTableId?: string;
  /**
   * Optional search query string for tags.
   * Words in the string will be used to filter with 'ilike' on the Hashtags field.
   */
  tagSearchQuery?: string;
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
  // Only extract used variables to avoid lint errors
const { url, token, projectId, tableId } = getNocoDBConfig({
    projectId: options?.ncProjectId,
    tableId: options?.ncTableId,
  });

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
  const params: Record<string, string | number | undefined> = {
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

  // Add tag search query to the request parameters if specified
  if (options?.tagSearchQuery) {
    const searchWords = options.tagSearchQuery.trim().split(/\s+/);
    if (searchWords.length > 0) {
      // Build NocoDB v2 where filter using ilike on Hashtags for each word
      // Correct format for each condition: (Hashtags,ilike,%<word>%)
      const whereConditions = searchWords
        .map((word: string) => `(Hashtags,ilike,%${word}%)`)
        .join('~and');
      params.where = whereConditions;
    }
  }

  try {
    // Make the request to NocoDB
    let fieldsToRequest = options?.fields ? [...options.fields] : [];
    let response;
    
    try {
      // First try with all requested fields
      response = await apiClient.get(
        `${url}/api/v2/meta/projects/${projectId}/tables/${tableId}/records`,
        {
          headers: {
          'xc-token': token, // Auth token for NocoDB
        }, // No xc-project header needed for v1 endpoint
          params: {
            limit,
            offset: (page - 1) * limit,
            sort: options?.sort,
            fields: fieldsToRequest.join(','),
            where: params.where, // Add where clause
          },
        }
      );
    } catch (error) {
      // If we get a field not found error, try again without the problematic fields
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const errorData = error.response?.data as { error?: string; message?: string };
        if (errorData?.error === 'FIELD_NOT_FOUND' && errorData.message?.includes('TickerSymbol, EventsFairs')) {
          // Remove the problematic fields and try again
          fieldsToRequest = fieldsToRequest.filter(field => 
            !['TickerSymbol', 'EventsFairs'].includes(field)
          );
          
          response = await apiClient.get(
            `${url}/api/v2/meta/projects/${projectId}/tables/${tableId}/records`,
            {
              headers: { 'xc-token': token },
              params: {
                limit,
                offset: (page - 1) * limit,
                sort: options?.sort,
                fields: fieldsToRequest.join(','),
                where: params.where, // Add where clause
              },
            }
          );
        } else {
          throw error; // Re-throw if it's a different error
        }
      } else {
        throw error; // Re-throw if it's not a 404 or not a field not found error
      }
    }

    // Validate the response using the chosen schema
    const parsedResponse = responseSchema.safeParse(response.data);

    if (!parsedResponse.success) {
      console.error(
        `Failed to parse NocoDB response (Page: ${page}, Limit: ${limit}, Fields: ${
          params.fields || 'all'
        }, Where: ${params.where || 'none'}, Schema: ${schemaToUse.description || 'video schema'}):`,
        parsedResponse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
      throw new NocoDBValidationError(
        `Failed to parse NocoDB API response for page ${page}.`,
        parsedResponse.error.issues
      );
    }
    
    // Return the parsed response data
    return { videos: parsedResponse.data.list as z.infer<T>[], pageInfo: parsedResponse.data.pageInfo };

  } catch (error: unknown) {
    /**
     * Handle any errors that occur during the request
     */
    const requestUrl = axios.isAxiosError(error) ? error.config?.url : 'URL not available';
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(
        `Received 404 from NocoDB when fetching page ${page}. Returning empty result set.`
      );
      return {
        videos: [],
        pageInfo: {
          totalRows: 0,
          page,
          pageSize: limit,
          isFirstPage: true,
          isLastPage: true,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    console.error(
      `Error fetching videos (Page ${page}, Limit ${limit}) from URL: ${requestUrl}:`,
      axios.isAxiosError(error) ? error.response?.data : error instanceof Error ? error.message : error
    );
    if (error instanceof NocoDBValidationError) {
      throw error;
    }
    throw new NocoDBRequestError(
      `Failed to fetch videos from NocoDB (page ${page}, limit ${limit}): ${
        error instanceof Error ? error.message : String(error)
      }`,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      axios.isAxiosError(error) ? error.response?.data : undefined
    );
  }
}

/**
 * Fetches a single video by its VideoID from NocoDB
 * 
 * @param videoId - The VideoID of the video to fetch
 * @param ncProjectIdParam - Optional override for NocoDB project ID
 * @param ncTableIdParam - Optional override for NocoDB table name
 * @returns The video record or null if not found
 * @throws Error if the request fails or response validation fails
 */
export async function fetchVideoByVideoId(videoId: string, ncProjectIdParam?: string, ncTableIdParam?: string): Promise<Video | null> {
  // Get cached video if available
  const cached = getFromCache<Video>(videoId);
  if (cached) {
    return cached;
  }

  // Only extract used variables to avoid lint errors
const { url, token, projectId, tableId } = getNocoDBConfig({
    projectId: ncProjectIdParam,
    tableId: ncTableIdParam,
  });

  // Make the request to NocoDB
  try {
    // First try with all fields
    const response = await apiClient.get<NocoDBResponse<z.infer<typeof videoSchema>>>(
      `${url}/api/v2/meta/projects/${projectId}/tables/${tableId}/records`,
      {
        headers: { 'xc-token': token },
        params: {
          where: `(VideoID,eq,${videoId})`,
          limit: 1
        },
      }
    );

    // Validate the response using the videoSchema
    console.log(`[fetchVideoByVideoId - ${videoId}] Raw NocoDB response data:`, JSON.stringify(response.data, null, 2));

    if (!response.data?.list || !Array.isArray(response.data.list) || response.data.list.length === 0) {
      console.warn(
        `[fetchVideoByVideoId - ${videoId}] No matching video found with VideoID: ${videoId}`
      );
      return null;
    }

    const videoData = response.data.list[0];
    const parsedVideo = videoSchema.safeParse(videoData);

    if (!parsedVideo.success) {
      console.error(
        `[fetchVideoByVideoId - ${videoId}] Failed to parse NocoDB response. Issues:`,
        parsedVideo.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
      );
      console.error(
        `[fetchVideoByVideoId - ${videoId}] Problematic NocoDB data for VideoID ${videoId}:`,
        JSON.stringify(videoData, null, 2)
      );
      throw new NocoDBValidationError(
        `Failed to parse NocoDB API response for VideoID ${videoId}.`,
        parsedVideo.error.issues
      );
    }

    // Cache the result
    setInCache(videoId, parsedVideo.data);

    return parsedVideo.data;
  } catch (error: unknown) {
    // Handle any errors that occur during the request
    // Removed unused variable errorMessage to fix lint error
    // Removed unused variables statusCode and errorData to fix lint errors.

    if (axios.isAxiosError(error)) {
      // errorMessage = error.message; // Removed unused assignment to fix lint
      // statusCode = error.response?.status;
      // errorData = error.response?.data;
      
      if (error.response) {
        console.error('NocoDB API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error('No response received from NocoDB API');
      }
    } else if (error instanceof Error) {
      // errorMessage = error.message; // Removed unused assignment to fix lint
    } else if (typeof error === 'string') {
      // errorMessage = error; // Removed unused assignment to fix lint
      return null;
    }
    
    console.error(
      `Error fetching video by VideoID ${videoId}:`,
      axios.isAxiosError(error) 
        ? error.response?.data 
        : error instanceof Error 
          ? error.message 
          : String(error)
    );
    
    if (error instanceof NocoDBValidationError) {
      throw error;
    }
    
    throw new NocoDBRequestError(
      `Failed to fetch video (VideoID: ${videoId}) from NocoDB: ${
        error instanceof Error ? error.message : String(error)
      }`,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      axios.isAxiosError(error) ? error.response?.data : undefined
    );
  }
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
  ncTableId?: string;
  /**
   * Optional search query string for tags.
   * Words in the string will be used to filter with 'ilike' on the Hashtags field.
   */
  tagSearchQuery?: string;
}

/**
 * Fetches all videos from NocoDB with automatic pagination.
 *
 * The function first requests the initial page to determine the total
 * number of records. It then creates a list of remaining pages and fetches
 * them in small batches to avoid overloading the API. The `concurrency`
 * setting controls how many page requests are executed in parallel.
 *
 * @template T - The schema type for video items (defaults to videoSchema)
 * @param options - Configuration options for the request
 * @returns Array of all video records
 * @throws Error if any request fails or response validation fails
 */
export async function fetchAllVideos<T extends z.ZodType = typeof videoSchema>(
  options?: FetchAllVideosOptions<T>
): Promise<z.infer<T>[]> {
  const cacheKey = JSON.stringify({
    sort: options?.sort,
    fields: options?.fields,
    project: options?.ncProjectId,
    table: options?.ncTableId,
  });
  const cached = getFromCache<z.infer<T>[]>(cacheKey);
  if (cached) {
    return cached;
  }
  const pageSize = options?.fields ? 50 : DEFAULT_PAGE_SIZE;

  const schemaToUse = (options?.schema || videoSchema) as T;
  const fetchOptions: Omit<FetchVideosOptions<T>, 'schema'> = {
    sort: options?.sort,
    limit: pageSize,
    fields: options?.fields,
    ncProjectId: options?.ncProjectId,
    ncTableId: options?.ncTableId,
    tagSearchQuery: options?.tagSearchQuery, // Pass down the tag search query
  };

  // Fetch the first page to determine total number of pages
  const { videos: firstPage, pageInfo } = await fetchVideos<T>({
    ...fetchOptions,
    schema: schemaToUse,
    page: 1,
    limit: pageSize,
  });

  const allItems: z.infer<T>[] = [...firstPage];
  const totalPages = Math.ceil(pageInfo.totalRows / pageSize);

  if (totalPages <= 1) {
    return allItems;
  }

  const pages: number[] = [];
  for (let p = 2; p <= totalPages; p++) {
    pages.push(p);
  }

  const concurrency = 5;
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((pageNum) =>
        fetchVideos<T>({
          ...fetchOptions,
          schema: schemaToUse,
          page: pageNum,
          limit: pageSize,
        }).then((r) => r.videos)
      )
    );
    results.forEach((list) => allItems.push(...list));
  }

  // Cache the results
  setInCache(cacheKey, allItems);

  return allItems;
}

