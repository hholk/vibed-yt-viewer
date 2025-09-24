import { z } from 'zod';

import { apiClient, toRequestError } from './http-client';
import { getNocoDBConfig } from './config';
import { resolveTableIdentifiers } from './table-metadata';
import { getFromCache, setInCache } from './cache';
import {
  createNocoDBResponseSchema,
  videoSchema,
  type PageInfo,
  type Video,
} from './schemas';
import { fetchSingleVideo } from './record-utils';
import { NocoDBValidationError } from './errors';
import { logDevEvent } from '@/shared/utils/server-logger';

const DEFAULT_PAGE_SIZE = 25;

export interface FetchVideosOptions<T extends z.ZodTypeAny> {
  sort?: string;
  limit?: number;
  page?: number;
  fields?: string[];
  schema?: T;
  ncProjectId?: string;
  ncTableId?: string;
  ncTableName?: string;
  tagSearchQuery?: string;
}

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

function buildTagFilter(query?: string): string | undefined {
  if (!query) {
    return undefined;
  }

  const searchWords = query.trim().split(/\s+/).filter(Boolean);
  if (searchWords.length === 0) {
    return undefined;
  }

  return searchWords.map((word) => `(Hashtags,ilike,%${word}%)`).join('~and');
}

export async function fetchVideos<T extends z.ZodTypeAny>(
  options: FetchVideosOptions<T> = {},
): Promise<{ videos: z.infer<T>[]; pageInfo: PageInfo }> {
  const cacheKey = JSON.stringify({
    sort: options.sort,
    limit: options.limit || DEFAULT_PAGE_SIZE,
    page: options.page || 1,
    fields: options.fields,
    tagSearchQuery: options.tagSearchQuery,
    project: options.ncProjectId,
    table: options.ncTableId,
  });

  const cached = getFromCache<{ videos: z.infer<T>[]; pageInfo: PageInfo }>(cacheKey);
  if (cached) {
    return cached;
  }

  const config = getNocoDBConfig({
    projectId: options.ncProjectId,
    tableId: options.ncTableId,
    tableName: options.ncTableName,
  });

  const { resolvedTableId } = await resolveTableIdentifiers(config);

  const limit = options.limit || DEFAULT_PAGE_SIZE;
  const page = options.page || 1;
  const offset = (page - 1) * limit;

  const schemaToUse = (options.schema || videoSchema) as z.ZodType;
  const responseSchema = createNocoDBResponseSchema(schemaToUse);

  const params: Record<string, string | number | undefined> = {
    limit,
    offset,
    sort: options.sort,
  };

  const where = buildTagFilter(options.tagSearchQuery);
  if (where) {
    params.where = where;
  }

  let fieldsToRequest = options.fields ? [...options.fields] : [];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const requestParams: Record<string, string | number | undefined> = {
        ...params,
      };

      if (fieldsToRequest.length > 0) {
        requestParams.fields = fieldsToRequest.join(',');
      }

      const response = await apiClient.get(
        `${config.url}/api/v2/tables/${encodeURIComponent(resolvedTableId)}/records`,
        {
          headers: { 'xc-token': config.token },
          params: requestParams,
        },
      );

      const parsedResponse = responseSchema.safeParse(response.data);
      if (!parsedResponse.success) {
        throw new NocoDBValidationError(
          `Failed to parse NocoDB API response for page ${page}.`,
          parsedResponse.error.issues,
        );
      }

      const result = {
        videos: parsedResponse.data.list as z.infer<T>[],
        pageInfo: parsedResponse.data.pageInfo,
      };

      setInCache(cacheKey, result);
      return result;
    } catch (error) {
      lastError = error;

      if (error instanceof NocoDBValidationError) {
        throw error;
      }

      const isAxiosError = (candidate: unknown): candidate is { response?: { status?: number; data?: unknown } } =>
        typeof candidate === 'object' && candidate !== null;

      if (isAxiosError(error) && 'response' in error && error.response?.status === 404) {
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

          void logDevEvent({
            message: 'fetchVideos: removed missing fields',
            payload: {
              missingFields,
              remainingFields: fieldsToRequest.length,
            },
          });

          continue;
        }

        const emptyResult = {
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
        } satisfies { videos: z.infer<T>[]; pageInfo: PageInfo };

        setInCache(cacheKey, emptyResult);
        return emptyResult;
      }

      break;
    }
  }

  throw toRequestError(
    `fetchVideos(page=${page}, limit=${limit})`,
    lastError ?? new Error('Unknown error'),
    `${config.url}/api/v2/tables/${resolvedTableId}/records`,
  );
}

export interface FetchAllVideosOptions<T extends z.ZodTypeAny> {
  sort?: string;
  fields?: string[];
  schema?: T;
  ncProjectId?: string;
  ncTableId?: string;
  ncTableName?: string;
  tagSearchQuery?: string;
}

export async function fetchAllVideos<T extends z.ZodTypeAny = typeof videoSchema>(
  options: FetchAllVideosOptions<T> = {},
): Promise<z.infer<T>[]> {
  const cacheKey = JSON.stringify({
    sort: options.sort,
    fields: options.fields,
    project: options.ncProjectId,
    table: options.ncTableId,
  });

  const cached = getFromCache<z.infer<T>[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const pageSize = options.fields ? 50 : DEFAULT_PAGE_SIZE;
  const schemaToUse = (options.schema || videoSchema) as T;

  const fetchOptions: Omit<FetchVideosOptions<T>, 'schema'> = {
    sort: options.sort,
    limit: pageSize,
    fields: options.fields,
    ncProjectId: options.ncProjectId,
    ncTableId: options.ncTableId,
    ncTableName: options.ncTableName,
    tagSearchQuery: options.tagSearchQuery,
  };

  const { videos: firstPage, pageInfo } = await fetchVideos<T>({
    ...fetchOptions,
    schema: schemaToUse,
    page: 1,
    limit: pageSize,
  });

  const allItems: z.infer<T>[] = [...firstPage];
  const totalPages = Math.ceil(pageInfo.totalRows / pageSize);

  if (totalPages <= 1) {
    setInCache(cacheKey, allItems);
    return allItems;
  }

  const pages: number[] = [];
  for (let p = 2; p <= totalPages; p += 1) {
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
        }).then((r) => r.videos),
      ),
    );
    results.forEach((list) => allItems.push(...list));
  }

  setInCache(cacheKey, allItems);
  return allItems;
}

export async function fetchVideoByVideoId(
  videoId: string,
  overrides?: { ncProjectId?: string; ncTableId?: string; ncTableName?: string },
): Promise<Video | null> {
  const record = await fetchSingleVideo(videoId, 'videoId', {
    cache: true,
    configOverrides: {
      projectId: overrides?.ncProjectId,
      tableId: overrides?.ncTableId,
      tableName: overrides?.ncTableName,
    },
  });

  return record ?? null;
}

interface NavigationRecord {
  Id: string | number;
  VideoID?: string | null;
  Title?: string | null;
}

async function fetchNavigationRecords(
  configOverrides: { projectId?: string; tableId?: string; tableName?: string },
  sort: string,
  limit: number,
): Promise<NavigationRecord[]> {
  const config = getNocoDBConfig(configOverrides);
  const { resolvedTableId } = await resolveTableIdentifiers(config);

  const response = await apiClient.get(
    `${config.url}/api/v2/tables/${encodeURIComponent(resolvedTableId)}/records`,
    {
      headers: { 'xc-token': config.token },
      params: {
        fields: 'Id,VideoID,Title',
        sort,
        limit,
      },
    },
  );

  const list = Array.isArray(response.data?.list)
    ? response.data.list
    : Array.isArray(response.data?.data)
      ? response.data.data
      : [];

  return Array.isArray(list) ? (list as NavigationRecord[]) : [];
}

export async function getSimpleNavigationData(
  currentVideoId: string,
  sort: string = '-CreatedAt',
): Promise<{
  previousVideoData: { Id: string; Title: string | null } | null;
  nextVideoData: { Id: string; Title: string | null } | null;
}> {
  const records = await fetchNavigationRecords({}, sort, 50);
  const currentIndex = records.findIndex((record) => record.VideoID === currentVideoId);

  if (currentIndex === -1) {
    return { previousVideoData: null, nextVideoData: null };
  }

  const previousVideoData =
    currentIndex > 0
      ? {
          Id: String(records[currentIndex - 1].VideoID ?? records[currentIndex - 1].Id),
          Title: records[currentIndex - 1].Title ?? null,
        }
      : null;

  const nextVideoData =
    currentIndex < records.length - 1
      ? {
          Id: String(records[currentIndex + 1].VideoID ?? records[currentIndex + 1].Id),
          Title: records[currentIndex + 1].Title ?? null,
        }
      : null;

  return { previousVideoData, nextVideoData };
}

export async function getVideoNavigationData(
  currentVideoId: string,
  sort: string = '-CreatedAt',
): Promise<{
  previousVideoData: { Id: string; Title: string | null } | null;
  nextVideoData: { Id: string; Title: string | null } | null;
}> {
  const cacheKey = `nav_${currentVideoId}_${sort}`;
  const cached = getFromCache<{
    previousVideoData: { Id: string; Title: string | null } | null;
    nextVideoData: { Id: string; Title: string | null } | null;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const currentVideo = await fetchSingleVideo(currentVideoId, 'videoId', { cache: true });
  if (!currentVideo) {
    setInCache(cacheKey, { previousVideoData: null, nextVideoData: null });
    return { previousVideoData: null, nextVideoData: null };
  }

  const records = await fetchNavigationRecords({}, sort, 1000);
  const currentIndex = records.findIndex((record) => {
    if (typeof record.Id === 'number') {
      return record.Id === currentVideo.Id;
    }
    return record.VideoID === currentVideo.VideoID;
  });

  if (currentIndex === -1) {
    setInCache(cacheKey, { previousVideoData: null, nextVideoData: null });
    return { previousVideoData: null, nextVideoData: null };
  }

  const previousVideoData =
    currentIndex > 0
      ? {
          Id: String(records[currentIndex - 1].VideoID ?? records[currentIndex - 1].Id),
          Title: records[currentIndex - 1].Title ?? null,
        }
      : null;

  const nextVideoData =
    currentIndex < records.length - 1
      ? {
          Id: String(records[currentIndex + 1].VideoID ?? records[currentIndex + 1].Id),
          Title: records[currentIndex + 1].Title ?? null,
        }
      : null;

  const result = { previousVideoData, nextVideoData };
  setInCache(cacheKey, result);
  return result;
}
