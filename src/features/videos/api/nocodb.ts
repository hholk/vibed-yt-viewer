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
import { logDevEvent, logDevError } from '@/shared/utils';

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
const { tableName } = getNocoDBConfig({ projectId: ncProjectId, tableId: ncTableId });
const identifiers = await resolveRecordIdentifiers(idOrVideoId, ncProjectId, ncTableId, tableName);
  return identifiers.numericId;
}

/** Configuration options required to connect to NocoDB */
export interface NocoDBConfig {
  url: string;
  token: string;
  projectId: string;
  tableId: string; // Table ID is now required for all NocoDB v2 API operations
  sourceAlias: string; // Added sourceAlias
  tableName?: string;
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
  const tableName = overrides.tableName || process.env.NOCODB_TABLE_NAME;
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

  return { url, token, projectId, tableId, sourceAlias, tableName };
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
  rowId: z.string().optional().nullable(),
  RowId: z.string().optional().nullable(),
  _rowId: z.string().optional().nullable(),
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

type VideoRecordWithRowMeta = Video & {
  __rowId?: string | null;
  rowId?: string | null;
  RowId?: string | null;
};

interface ResolvedRecordIdentifiers {
  numericId: number;
  rowId: string | null;
  video: VideoRecordWithRowMeta;
}

function extractRowIdFromRecord(record: Record<string, unknown> | null | undefined): string | null {
  if (!record) return null;
  const candidates = [
    'rowId',
    'RowId',
    'rowID',
    'RowID',
    'row_id',
    '_rowId',
    '__rowId',
    '__RowId',
    '__rowid__',
    '__nc_rowid__',
    '__ncRowId',
    '$rowId',
  ];

  for (const key of candidates) {
    const value = (record as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

async function resolveRecordIdentifiers(
  idOrVideoId: number | string,
  ncProjectId?: string,
  ncTableId?: string,
  ncTableName?: string,
): Promise<ResolvedRecordIdentifiers> {
  const { projectId, tableId, tableName } = getNocoDBConfig({
    projectId: ncProjectId,
    tableId: ncTableId,
    tableName: ncTableName,
  });

  const asNumber =
    typeof idOrVideoId === 'number'
      ? idOrVideoId
      : Number.isInteger(Number(idOrVideoId))
        ? Number(idOrVideoId)
        : null;

  let video: VideoRecordWithRowMeta | null = null;

  if (asNumber !== null && !Number.isNaN(asNumber)) {
    void logDevEvent({
      message: 'resolveRecordIdentifiers: trying numeric lookup',
      payload: { identifier: idOrVideoId, numeric: asNumber },
    });
    video = (await fetchVideoByRecordId(asNumber, projectId, tableId, tableName)) as VideoRecordWithRowMeta | null;
  }

  if (!video) {
    void logDevEvent({
      message: 'resolveRecordIdentifiers: fallback to VideoID',
      payload: { identifier: idOrVideoId },
    });
    video = (await fetchVideoByVideoId(String(idOrVideoId), projectId, tableId, tableName)) as VideoRecordWithRowMeta | null;
  }

  if (!video) {
    void logDevError('resolveRecordIdentifiers: video not found', {
      identifier: idOrVideoId,
      projectId,
      tableId,
    });
    throw new Error(`No video found matching identifier: ${idOrVideoId}`);
  }

  const numericId = typeof video.Id === 'number' ? video.Id : Number(video.Id);
  if (!Number.isInteger(numericId)) {
    void logDevError('resolveRecordIdentifiers: invalid numeric Id', {
      identifier: idOrVideoId,
      receivedId: video.Id,
    });
    throw new Error('Resolved video is missing a numeric Id field.');
  }

  const rowId =
    video.rowId ??
    video.RowId ??
    video.__rowId ??
    extractRowIdFromRecord(video as unknown as Record<string, unknown>);

  void logDevEvent({
    message: 'resolveRecordIdentifiers: resolved identifiers',
    payload: {
      identifier: idOrVideoId,
      numericId,
      rowId: rowId ?? null,
      projectId,
      tableId,
    },
  });

  return {
    numericId,
    rowId: rowId ?? null,
    video,
  };
}

/**
 * Lightweight schema for video list items
 * Contains only the fields needed for displaying videos in a grid/list view
 * Optimized for performance by excluding unnecessary fields
 */
export const videoListItemSchema = z.object({
  Id: z.number().int(),
  rowId: z.string().optional().nullable(),
  RowId: z.string().optional().nullable(),
  _rowId: z.string().optional().nullable(),
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

type NocoDBTableMetadata = {
  id?: string;
  title?: string;
  table_name?: string;
  name?: string;
  slug?: string;
};

const projectTablesMetaCache = new Map<string, NocoDBTableMetadata[]>();
const tableDetailCache = new Map<string, NocoDBTableMetadata>();

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function getMetadataCandidates(meta: NocoDBTableMetadata): string[] {
  const candidates = [meta.id, meta.slug, meta.table_name, meta.title, meta.name]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  // De-duplicate while preserving order.
  return Array.from(new Set(candidates));
}

async function loadProjectTablesMetadata(
  url: string,
  token: string,
  projectId: string,
): Promise<NocoDBTableMetadata[]> {
  const cacheKey = `${url}:${projectId}`;
  if (projectTablesMetaCache.has(cacheKey)) {
    return projectTablesMetaCache.get(cacheKey)!;
  }

  const endpoints: Array<{ label: string; url: string }> = [
    {
      label: 'v2',
      url: `${url}/api/v2/meta/projects/${encodeURIComponent(projectId)}/tables`,
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.get(endpoint.url, {
        headers: { 'xc-token': token },
      });

      const data = response.data;
      const listCandidate = Array.isArray(data?.list)
        ? data.list
        : Array.isArray(data?.tables)
          ? data.tables
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];

      const metadata = listCandidate.filter((item: unknown): item is NocoDBTableMetadata => {
        return typeof item === 'object' && item !== null;
      });

      if (metadata.length > 0) {
        projectTablesMetaCache.set(cacheKey, metadata);
        return metadata;
      }
    } catch (error) {
      const payload = {
        projectId,
        endpoint: endpoint.url,
        error: axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
            }
          : error instanceof Error
            ? { message: error.message }
            : { message: String(error) },
      };

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        void logDevEvent({ message: 'resolveTableIdentifiers: metadata endpoint unavailable', payload });
      } else {
        void logDevError('resolveTableIdentifiers: metadata fetch failed', payload);
      }
    }
  }

  projectTablesMetaCache.set(cacheKey, []);
  return [];
}

async function loadTableDetails(
  url: string,
  token: string,
  tableId: string,
): Promise<NocoDBTableMetadata | null> {
  const cacheKey = `${url}:${tableId}`;
  if (tableDetailCache.has(cacheKey)) {
    return tableDetailCache.get(cacheKey)!;
  }

  const endpoints: Array<{ label: string; url: string }> = [
    {
      label: 'v2',
      url: `${url}/api/v2/tables/${encodeURIComponent(tableId)}`,
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.get(endpoint.url, {
        headers: { 'xc-token': token },
      });

      const data = response.data;
      if (data && typeof data === 'object') {
        const meta: NocoDBTableMetadata = {
          id: typeof data.id === 'string' ? data.id : undefined,
          slug: typeof data.slug === 'string' ? data.slug : undefined,
          table_name: typeof data.table_name === 'string' ? data.table_name : undefined,
          title: typeof data.title === 'string' ? data.title : undefined,
          name: typeof data.name === 'string' ? data.name : undefined,
        };

        tableDetailCache.set(cacheKey, meta);
        return meta;
      }
    } catch (error) {
      const payload = {
        tableId,
        endpoint: endpoint.url,
        error: axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
            }
          : error instanceof Error
            ? { message: error.message }
            : { message: String(error) },
      };

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        void logDevEvent({ message: 'resolveTableIdentifiers: table info endpoint unavailable', payload });
      } else {
        void logDevError('resolveTableIdentifiers: table info fetch failed', payload);
      }
    }
  }

  tableDetailCache.set(cacheKey, {});
  return null;
}

function uniqueIdentifiers(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

type ResolvedTableIdentifiers = {
  identifiers: string[];
  resolvedTableName: string | null;
  resolvedTableId: string;
};

const tableIdentifiersCache = new Map<string, ResolvedTableIdentifiers>();

async function resolveTableIdentifiers(
  url: string,
  token: string,
  projectId: string,
  tableId: string,
  tableName?: string,
): Promise<ResolvedTableIdentifiers> {
  const cacheKey = `${projectId}:${tableId}:${tableName ?? ''}`;
  if (tableIdentifiersCache.has(cacheKey)) {
    return tableIdentifiersCache.get(cacheKey)!;
  }

  const identifiers = uniqueIdentifiers([tableId, tableName]);
  const normalizedTargets = identifiers.map(normalizeIdentifier);

  const metadata = await loadProjectTablesMetadata(url, token, projectId);
  let resolvedTableId = tableId;
  let resolvedTableName = tableName && tableName.trim().length > 0 ? tableName.trim() : null;

  let matchedMeta = metadata.find((tableMeta) => {
    const metaCandidates = getMetadataCandidates(tableMeta).map(normalizeIdentifier);
    return metaCandidates.some((value) => normalizedTargets.includes(value));
  });

  if (!matchedMeta) {
    const tableDetails = await loadTableDetails(url, token, tableId);
    if (tableDetails) {
      matchedMeta = tableDetails;
    }
  }

  if (matchedMeta) {
    if (typeof matchedMeta.id === 'string' && matchedMeta.id.trim().length > 0) {
      resolvedTableId = matchedMeta.id.trim();
    }

    if (typeof matchedMeta.slug === 'string' && matchedMeta.slug.trim().length > 0) {
      resolvedTableName = matchedMeta.slug.trim();
    }

    if (!resolvedTableName) {
      const metaSlug = getMetadataCandidates(matchedMeta).find((candidate) => candidate !== matchedMeta.id);
      resolvedTableName = metaSlug ?? null;
    }
  }

  const result: ResolvedTableIdentifiers = {
    identifiers: uniqueIdentifiers([
      tableId,
      tableName,
      resolvedTableId,
      resolvedTableName ?? undefined,
      matchedMeta?.slug,
      matchedMeta?.table_name,
      matchedMeta?.title,
      matchedMeta?.name,
    ]),
    resolvedTableName,
    resolvedTableId,
  };

  tableIdentifiersCache.set(cacheKey, result);
  return result;
}

const DEFAULT_PAGE_SIZE = 25;

function normalizeFieldName(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function extractMissingFieldsFromMessage(message?: string): string[] {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const matches = new Set<string>();

  const bracketMatches = message.match(/\[([^\]]+)\]/g);
  if (bracketMatches) {
    bracketMatches.forEach((group) => {
      const inner = group.slice(1, -1);
      inner.split(',').forEach((field) => {
        const trimmed = field.trim().replace(/^['"]|['"]$/g, '');
        if (trimmed.length > 0) {
          matches.add(trimmed);
        }
      });
    });
  }

  const quoteMatches = message.match(/['"]([^'"]+)['"]/g);
  if (quoteMatches) {
    quoteMatches.forEach((match) => {
      const trimmed = match.replace(/^['"]|['"]$/g, '').trim();
      if (trimmed.length > 0) {
        matches.add(trimmed);
      }
    });
  }

  return Array.from(matches);
}

function safeTrim(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function cacheVideoRecord(
  video: VideoRecordWithRowMeta,
  extraKeys: Array<string | null | undefined> = [],
) {
  const keys = new Set<string>();
  extraKeys.forEach((key) => {
    if (typeof key === 'string' && key.trim().length > 0) {
      keys.add(key);
    }
  });

  if (video.VideoID) {
    keys.add(video.VideoID);
  }

  const numericKey =
    typeof video.Id === 'number'
      ? video.Id.toString()
      : safeTrim(video.Id);
  if (numericKey) {
    keys.add(numericKey);
  }

  const rowIdKey =
    video.rowId ??
    video.RowId ??
    video.__rowId ??
    extractRowIdFromRecord(video as unknown as Record<string, unknown>);

  if (rowIdKey) {
    keys.add(rowIdKey);
    if (!video.__rowId && !video.rowId && !video.RowId) {
      video.__rowId = rowIdKey;
    }
  }

  keys.forEach((key) => setInCache(key, video));
}

function purgeVideoFromCache(
  video: VideoRecordWithRowMeta,
  extraKeys: Array<string | null | undefined> = [],
) {
  const keys = new Set<string>();
  extraKeys.forEach((key) => {
    if (typeof key === 'string' && key.trim().length > 0) {
      keys.add(key);
    }
  });

  if (video.VideoID) {
    keys.add(video.VideoID);
  }

  const numericKey = (() => {
    if (typeof video.Id === 'number') {
      return video.Id.toString();
    }
    if (video.Id && typeof video.Id === 'string') {
      const idString = video.Id as string;
      return idString.trim().length > 0 ? idString.trim() : null;
    }
    return null;
  })();
  if (numericKey) {
    keys.add(numericKey);
  }
  if (numericKey) {
    keys.add(numericKey);
  }
  if (numericKey) {
    keys.add(numericKey);
  }
  if (numericKey) {
    keys.add(numericKey);
  }

  const rowIdKey =
    video.rowId ??
    video.RowId ??
    video.__rowId ??
    extractRowIdFromRecord(video as unknown as Record<string, unknown>);

  if (rowIdKey) {
    keys.add(rowIdKey);
  }

  keys.forEach((key) => deleteFromCache(key));
}

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
export function normalizeImportanceRating(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    if (!Number.isInteger(parsed)) {
      return null;
    }

    if (parsed < 1 || parsed > 5) {
      return null;
    }

    return parsed;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }

    if (!Number.isInteger(value)) {
      return null;
    }

    if (value < 1 || value > 5) {
      return null;
    }

    return value;
  }

  return null;
}

export function normalizePersonalComment(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  return null;
}

/**
 * Simplified version of updateVideo for debugging purposes
 * Uses only the direct v2 API endpoint without fallback logic
 */
export async function updateVideoSimple(
  recordIdOrVideoId: number | string,
  data: Partial<z.infer<typeof videoSchema>>,
  ncProjectIdParam?: string,
  ncTableIdParam?: string,
): Promise<Video> {
  const config = getNocoDBConfig({
    projectId: ncProjectIdParam,
    tableId: ncTableIdParam,
  });

  const updateData = { ...data };

  // Normalize data
  if ('ImportanceRating' in updateData) {
    const normalized = normalizeImportanceRating(updateData.ImportanceRating);
    if (normalized === undefined) {
      delete updateData.ImportanceRating;
    } else {
      updateData.ImportanceRating = normalized;
    }
  }

  if ('PersonalComment' in updateData) {
    const normalizedComment = normalizePersonalComment(updateData.PersonalComment);
    if (normalizedComment === undefined) {
      delete updateData.PersonalComment;
    } else {
      updateData.PersonalComment = normalizedComment;
    }
  }

  // Use the table ID directly instead of resolving metadata
  const tableIdForApi = config.tableId;

  void logDevEvent({
    message: 'updateVideoSimple: using direct table ID',
    payload: {
      tableId: tableIdForApi,
      videoId: recordIdOrVideoId,
    },
  });

  try {
    // Step 1: Find the record by VideoID to get the Record-ID (Id field)
    const findResponse = await apiClient.get(
      `${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records`,
      {
        headers: {
          'xc-token': config.token,
          'Content-Type': 'application/json',
        },
        params: {
          where: `(VideoID,eq,${JSON.stringify(recordIdOrVideoId)})`,
          fields: 'Id',
          limit: 1,
        },
      }
    );

    // Extract the Record-ID from the response
    const records = findResponse.data?.list || [];
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error(`No video found with VideoID: ${recordIdOrVideoId}`);
    }

    const recordId = records[0].Id;
    if (!recordId || typeof recordId !== 'number') {
      throw new Error(`Invalid Record-ID found for VideoID: ${recordIdOrVideoId}`);
    }

    void logDevEvent({
      message: 'updateVideoSimple: found record by VideoID',
      payload: {
        videoId: recordIdOrVideoId,
        recordId,
      },
    });

    // Step 2: Update the record using the Record-ID in the request body
    await apiClient.patch(
      `${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records`,
      {
        Id: recordId,
        ...updateData,
      },
      {
        headers: {
          'xc-token': config.token,
          'Content-Type': 'application/json',
        },
      }
    );

    void logDevEvent({
      message: 'updateVideoSimple: record updated successfully',
      payload: {
        videoId: recordIdOrVideoId,
        recordId,
        updatedFields: Object.keys(updateData),
      },
    });

    // Refresh the data to confirm it was saved
    const refreshed = await fetchVideoByRecordIdDirect(
      recordId,
      config.projectId,
      tableIdForApi,
      config.token,
    );

    if (!refreshed) {
      throw new Error('Updated video could not be reloaded after update');
    }

    void logDevEvent({
      message: 'updateVideoSimple: update-by-key pattern completed successfully',
      payload: {
        videoId: recordIdOrVideoId,
        recordId,
        updatedFields: Object.keys(updateData),
      },
    });

    return refreshed;
  } catch (error) {
    void logDevError('updateVideoSimple: update-by-key pattern failed', {
      videoId: recordIdOrVideoId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw createRequestError('Failed to update video record', error ?? new Error('Unknown error'));
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
  ncTableIdParam?: string,
  ncTableNameParam?: string,
): Promise<void> {
  const config = getNocoDBConfig({
    projectId: ncProjectIdParam,
    tableId: ncTableIdParam,
    tableName: ncTableNameParam,
  });

  const tableInfo = await resolveTableIdentifiers(
    config.url,
    config.token,
    config.projectId,
    config.tableId,
    config.tableName,
  );

  const tableIdForApi = tableInfo.resolvedTableId;

  let identifiers: ResolvedRecordIdentifiers;
  try {
    identifiers = await resolveRecordIdentifiers(
      recordIdOrVideoId,
      config.projectId,
      tableIdForApi,
      undefined,
    );

    void logDevEvent({
      message: 'deleteVideo: identifiers resolved',
      payload: {
        input: recordIdOrVideoId,
        numericId: identifiers.numericId,
        rowId: identifiers.rowId ?? null,
      },
    });
  } catch (error) {
    void logDevError('deleteVideo: identifier resolution failed', {
      input: recordIdOrVideoId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Could not find video with ID: ${recordIdOrVideoId}`);
  }

  const deleteAttempts: Array<{ label: string; endpoint: string; run: () => Promise<unknown> }> = [];

  // Attempt 1: Filter-based delete (most reliable - doesn't require rowId)
  deleteAttempts.push({
    label: 'v2-filter-delete',
    endpoint: `${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records`,
    run: () =>
      apiClient.delete(`${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records`, {
        headers: {
          'xc-token': config.token,
          'Content-Type': 'application/json',
        },
        data: {
          filter: `(Id,eq,${identifiers.numericId})`,
        },
      }),
  });

  // Attempt 2: Numeric ID path (reliable when rowId is not available)
  deleteAttempts.push({
    label: 'v2-numeric-path',
    endpoint: `${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records/${identifiers.numericId}`,
    run: () =>
      apiClient.delete(`${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records/${identifiers.numericId}`, {
        headers: {
          'xc-token': config.token,
          'Content-Type': 'application/json',
        },
      }),
  });

  // Attempt 3: RowId path (least reliable - avoid when possible)
  if (identifiers.rowId && typeof identifiers.rowId === 'string') {
    const rowId = identifiers.rowId; // Type is narrowed to string here
    deleteAttempts.push({
      label: 'v2-rowid-path',
      endpoint: `${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records/${encodeURIComponent(rowId)}`,
      run: () =>
        apiClient.delete(`${config.url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records/${encodeURIComponent(rowId)}`, {
          headers: {
            'xc-token': config.token,
            'Content-Type': 'application/json',
          },
        }),
    });
  }

  let lastError: unknown = null;

  for (const attempt of deleteAttempts) {
    try {
      void logDevEvent({
        message: 'deleteVideo: attempting DELETE',
        payload: {
          label: attempt.label,
          endpoint: attempt.endpoint,
        },
      });

      await attempt.run();

      purgeVideoFromCache(identifiers.video, [
        identifiers.numericId.toString(),
        identifiers.rowId && typeof identifiers.rowId === 'string' ? identifiers.rowId : undefined,
      ].filter((item): item is string => item !== undefined));

      void logDevEvent({
        message: 'deleteVideo: simplified approach used',
        payload: {
          input: recordIdOrVideoId,
          numericId: identifiers.numericId,
          rowId: identifiers.rowId ?? null,
          successfulMethod: attempt.label,
          endpoint: attempt.endpoint,
        },
      });
      return;
    } catch (error) {
      lastError = error;

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        void logDevEvent({
          message: 'deleteVideo: 404 response',
          payload: {
            label: attempt.label,
            endpoint: attempt.endpoint,
            status: error.response.status,
            data: error.response.data,
          },
        });
        continue;
      }

      void logDevError('deleteVideo: request failed', {
        label: attempt.label,
        endpoint: attempt.endpoint,
        error: axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
            }
          : error instanceof Error
            ? { message: error.message }
            : { message: String(error) },
      });
    }
  }

  void logDevError('deleteVideo: all simplified attempts failed', {
    input: recordIdOrVideoId,
    numericId: identifiers.numericId,
    rowId: identifiers.rowId ?? null,
    lastError: lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown'),
  });

  throw createRequestError('Failed to delete video record', lastError ?? new Error('Unknown error'));
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
  const config = getNocoDBConfig({
    projectId: options?.ncProjectId,
    tableId: options?.ncTableId,
  });

  const { url, token, tableId, projectId, tableName } = config;

  const tableInfo = await resolveTableIdentifiers(url, token, projectId, tableId, tableName);
  const tableIdForApi = tableInfo.resolvedTableId;

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

  let fieldsToRequest = options?.fields ? [...options.fields] : [];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const requestParams: Record<string, string | number | boolean | null | undefined> = {
        limit,
        offset: (page - 1) * limit,
        sort: options?.sort,
        where: params.where,
      };

      if (fieldsToRequest.length > 0) {
        requestParams.fields = fieldsToRequest.join(',');
      }

      const response = await apiClient.get(
        `${url}/api/v2/tables/${encodeURIComponent(tableIdForApi)}/records`,
        {
          headers: { 'xc-token': token },
          params: requestParams,
        },
      );

      const parsedResponse = responseSchema.safeParse(response.data);
      if (!parsedResponse.success) {
        console.error(
          `Failed to parse NocoDB response (Page: ${page}, Limit: ${limit}, Fields: ${
            params.fields || 'all'
          }, Where: ${params.where || 'none'}, Schema: ${schemaToUse.description || 'video schema'}):`,
          parsedResponse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
        );
        throw new NocoDBValidationError(
          `Failed to parse NocoDB API response for page ${page}.`,
          parsedResponse.error.issues,
        );
      }

      return { videos: parsedResponse.data.list as z.infer<T>[], pageInfo: parsedResponse.data.pageInfo };
    } catch (error) {
      lastError = error;

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const errorData = error.response?.data as { error?: string; message?: string } | undefined;

        if (errorData?.error === 'FIELD_NOT_FOUND' && fieldsToRequest.length > 0) {
          const missingFields = extractMissingFieldsFromMessage(errorData.message);
          const normalizedMissing = missingFields.map((field) => normalizeFieldName(field));
          const originalLength = fieldsToRequest.length;

          fieldsToRequest = fieldsToRequest.filter((field) => {
            const normalizedField = normalizeFieldName(field);
            return !normalizedMissing.includes(normalizedField);
          });

          if (fieldsToRequest.length === originalLength) {
            fieldsToRequest = [];
          }

          // Only log if this is the first retry or if it's actually removing fields
          if (originalLength > fieldsToRequest.length) {
            void logDevEvent({
              message: 'NocoDB fetch: removing missing fields',
              payload: {
                missingFields,
                remainingFields: fieldsToRequest.length,
              },
            });
          }
          continue;
        }

        console.warn(`Received 404 from NocoDB when fetching page ${page}. Returning empty result set.`);
        return {
          videos: [],
          pageInfo: {
            totalRows: 0,
            page,
            pageSize: limit,
            isFirstPage: page === 1,
            isLastPage: true,
            hasNextPage: false,
            hasPreviousPage: page > 1,
          },
        };
      }

      if (error instanceof NocoDBValidationError) {
        throw error;
      }

      break;
    }
  }

  throw createRequestError(
    `Failed to fetch videos from NocoDB (page ${page}, limit ${limit}).`,
    lastError ?? new Error('Unknown error'),
  );
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
interface FetchSingleVideoOptions {
  where: string;
  cacheKeys?: string[];
  logLabel: string;
  projectId?: string;
  tableId?: string;
  tableName?: string;
}

async function fetchSingleVideoRecord({
  where,
  cacheKeys = [],
  logLabel,
  projectId,
  tableId,
  tableName,
}: FetchSingleVideoOptions): Promise<VideoRecordWithRowMeta | null> {
  for (const key of cacheKeys) {
    const cached = getFromCache<VideoRecordWithRowMeta>(key);
    if (cached) {
      return cached;
    }
  }

  const config = getNocoDBConfig({ projectId, tableId, tableName });
  const {
    url,
    token,
    tableId: initialTableId,
    projectId: resolvedProjectId,
    tableName: resolvedTableName,
  } = config;

  const {
    resolvedTableId,
  } = await resolveTableIdentifiers(
    url,
    token,
    resolvedProjectId,
    initialTableId,
    resolvedTableName,
  );

  const primaryIdentifier = resolvedTableId;
  const endpointUrl = `${url}/api/v2/tables/${encodeURIComponent(primaryIdentifier)}/records`;

  try {
    const response = await apiClient.get(endpointUrl, {
      headers: { 'xc-token': token },
      params: {
        where,
        limit: 1,
        includeSystemFields: 'true',
      },
    });

    let list: unknown[] = [];
    if (response.data && typeof response.data === 'object') {
      if (Array.isArray((response.data as { list?: unknown[] }).list)) {
        list = (response.data as { list: unknown[] }).list;
      } else if (Array.isArray((response.data as { data?: unknown[] }).data)) {
        list = (response.data as { data: unknown[] }).data;
      }
    }

    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }

    const videoData = list[0];

    void logDevEvent({
      message: `${logLabel}: response row`,
      payload: {
        endpoint: endpointUrl,
        where,
        keys: Object.keys(videoData ?? {}),
      },
    });
    const parsedVideo = videoSchema.safeParse(videoData);

    if (!parsedVideo.success) {
      console.error(
        `[${logLabel}] Failed to parse NocoDB response. Issues:`,
        parsedVideo.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'),
      );
      console.error(`[${logLabel}] Problematic NocoDB data:`, JSON.stringify(videoData, null, 2));
      throw new NocoDBValidationError(
        `Failed to parse NocoDB API response for query ${where}.`,
        parsedVideo.error.issues,
      );
    }

    const enrichedVideo: VideoRecordWithRowMeta = {
      ...(parsedVideo.data as Video),
    };

    const responseRowId = extractRowIdFromRecord(videoData as Record<string, unknown>);
    if (responseRowId && !enrichedVideo.rowId && !enrichedVideo.RowId) {
      enrichedVideo.__rowId = responseRowId;
    }

    cacheVideoRecord(enrichedVideo, cacheKeys);
    return enrichedVideo;
  } catch (error) {
    if (error instanceof NocoDBValidationError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`[${logLabel}] NocoDB API error response (${endpointUrl}):`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
      } else if (error.request) {
        console.error(`[${logLabel}] No response received from NocoDB API (${endpointUrl})`);
      }
    }

    throw new NocoDBRequestError(
      `Failed to fetch video from NocoDB (${logLabel}): ${
        error instanceof Error ? error.message : String(error)
      }`,
      axios.isAxiosError(error) ? error.response?.status : undefined,
      axios.isAxiosError(error) ? error.response?.data : undefined,
    );
  }
}

async function fetchVideoByRecordId(
  recordId: number,
  ncProjectIdParam?: string,
  ncTableIdParam?: string,
  ncTableNameParam?: string,
): Promise<Video | null> {
  return fetchSingleVideoRecord({
    where: `(Id,eq,${recordId})`,
    cacheKeys: [recordId.toString()],
    logLabel: `fetchVideoByRecordId - ${recordId}`,
    projectId: ncProjectIdParam,
    tableId: ncTableIdParam,
    tableName: ncTableNameParam,
  });
}

async function fetchVideoByRecordIdDirect(
  recordId: number,
  projectId: string,
  tableId: string,
  token: string,
): Promise<Video | null> {
  const config = getNocoDBConfig({ projectId: projectId, tableId: tableId, token: token });
  const endpointUrl = `${config.url}/api/v2/tables/${encodeURIComponent(tableId)}/records`;

  try {
    const response = await apiClient.get(endpointUrl, {
      headers: { 'xc-token': config.token },
      params: {
        where: `(Id,eq,${recordId})`,
        limit: 1,
        includeSystemFields: 'true',
      },
    });

    let list: unknown[] = [];
    if (response.data && typeof response.data === 'object') {
      if (Array.isArray((response.data as { list?: unknown[] }).list)) {
        list = (response.data as { list: unknown[] }).list;
      } else if (Array.isArray((response.data as { data?: unknown[] }).data)) {
        list = (response.data as { data: unknown[] }).data;
      }
    }

    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }

    const videoData = list[0];
    const parsedVideo = videoSchema.safeParse(videoData);

    if (!parsedVideo.success) {
      console.error('Failed to parse NocoDB response:', parsedVideo.error.issues);
      return null;
    }

    return parsedVideo.data as Video;
  } catch (error) {
    console.error('fetchVideoByRecordIdDirect failed:', error);
    return null;
  }
}

export async function fetchVideoByVideoId(
  videoId: string,
  ncProjectIdParam?: string,
  ncTableIdParam?: string,
  ncTableNameParam?: string,
): Promise<Video | null> {
  return fetchSingleVideoRecord({
    where: `(VideoID,eq,${videoId})`,
    cacheKeys: [videoId],
    logLabel: `fetchVideoByVideoId - ${videoId}`,
    projectId: ncProjectIdParam,
    tableId: ncTableIdParam,
    tableName: ncTableNameParam,
  });
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
