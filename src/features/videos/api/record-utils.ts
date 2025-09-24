import { getNocoDBConfig, type NocoDBConfig } from './config';
import { apiClient, toRequestError } from './http-client';
import { resolveTableIdentifiers } from './table-metadata';
import { getFromCache, setInCache, deleteFromCache } from './cache';
import { logDevEvent, logDevError } from '@/shared/utils/server-logger';
import { NocoDBValidationError } from './errors';
import { videoSchema, type Video } from './schemas';

export type VideoRecordWithRowMeta = Video & {
  __rowId?: string | null;
  rowId?: string | null;
  RowId?: string | null;
};

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

function safeTrim(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

export function cacheVideoRecord(video: VideoRecordWithRowMeta, extraKeys: Array<string | null | undefined> = []) {
  const keys = new Set<string>();
  extraKeys.forEach((key) => {
    if (typeof key === 'string' && key.trim().length > 0) {
      keys.add(key);
    }
  });

  if (video.VideoID) {
    keys.add(video.VideoID);
  }

  const numericKey = typeof video.Id === 'number' ? video.Id.toString() : safeTrim(video.Id);
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

export function purgeVideoFromCache(video: VideoRecordWithRowMeta, extraKeys: Array<string | null | undefined> = []) {
  const keys = new Set<string>();
  extraKeys.forEach((key) => {
    if (typeof key === 'string' && key.trim().length > 0) {
      keys.add(key);
    }
  });

  if (video.VideoID) {
    keys.add(video.VideoID);
  }

  if (typeof video.Id === 'number') {
    keys.add(video.Id.toString());
  } else {
    const trimmed = safeTrim(video.Id);
    if (trimmed) {
      keys.add(trimmed);
    }
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

interface FetchSingleVideoRecordOptions {
  where: string;
  cacheKeys?: string[];
  logLabel: string;
  configOverrides?: Partial<NocoDBConfig>;
}

export async function fetchSingleVideoRecord({
  where,
  cacheKeys = [],
  logLabel,
  configOverrides = {},
}: FetchSingleVideoRecordOptions): Promise<VideoRecordWithRowMeta | null> {
  for (const key of cacheKeys) {
    const cached = getFromCache<VideoRecordWithRowMeta>(key);
    if (cached) {
      return cached;
    }
  }

  const config = getNocoDBConfig(configOverrides);
  const { resolvedTableId } = await resolveTableIdentifiers(config);
  const endpointUrl = `${config.url}/api/v2/tables/${encodeURIComponent(resolvedTableId)}/records`;

  try {
    const response = await apiClient.get(endpointUrl, {
      headers: { 'xc-token': config.token },
      params: {
        where,
        limit: 1,
        includeSystemFields: 'true',
      },
    });

    const list = Array.isArray(response.data?.list)
      ? response.data.list
      : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

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

    void logDevError(`${logLabel}: request failed`, {
      where,
      error: error instanceof Error ? error.message : String(error),
    });

    throw toRequestError(logLabel, error, endpointUrl);
  }
}

interface FetchSingleVideoOptions {
  cache?: boolean;
  configOverrides?: Partial<NocoDBConfig>;
}

export async function fetchSingleVideo(
  identifier: number | string,
  identifierType: 'id' | 'videoId',
  options: FetchSingleVideoOptions = {},
): Promise<VideoRecordWithRowMeta | null> {
  const cacheKeys = options.cache === false ? [] : [String(identifier)];
  const where = identifierType === 'id' ? `(Id,eq,${identifier})` : `(VideoID,eq,${identifier})`;

  return fetchSingleVideoRecord({
    where,
    cacheKeys,
    logLabel: `fetchSingleVideo - ${identifier}`,
    configOverrides: options.configOverrides,
  });
}

export interface ResolvedRecordIdentifiers {
  numericId: number;
  rowId: string | null;
  video: VideoRecordWithRowMeta;
}

export async function resolveRecordIdentifiers(
  idOrVideoId: number | string,
  overrides: Partial<NocoDBConfig> = {},
): Promise<ResolvedRecordIdentifiers> {
  const numericCandidate =
    typeof idOrVideoId === 'number'
      ? idOrVideoId
      : Number.isInteger(Number(idOrVideoId))
        ? Number(idOrVideoId)
        : null;

  let video: VideoRecordWithRowMeta | null = null;

  if (numericCandidate !== null && !Number.isNaN(numericCandidate)) {
    video = await fetchSingleVideo(numericCandidate, 'id', {
      cache: true,
      configOverrides: overrides,
    });
  }

  if (!video) {
    video = await fetchSingleVideo(String(idOrVideoId), 'videoId', {
      cache: true,
      configOverrides: overrides,
    });
  }

  if (!video) {
    void logDevError('resolveRecordIdentifiers: video not found', {
      identifier: idOrVideoId,
    });
    throw new Error(`No video found matching identifier: ${idOrVideoId}`);
  }

  const numericId = typeof video.Id === 'number' ? video.Id : Number(video.Id);
  if (!Number.isInteger(numericId)) {
    throw new Error('Resolved video is missing a numeric Id field.');
  }

  const rowId =
    video.rowId ??
    video.RowId ??
    video.__rowId ??
    extractRowIdFromRecord(video as unknown as Record<string, unknown>);

  cacheVideoRecord(video, [String(numericId), rowId ?? undefined, typeof idOrVideoId === 'string' ? idOrVideoId : null]);

  return {
    numericId,
    rowId: rowId ?? null,
    video,
  };
}

export async function resolveNumericId(
  idOrVideoId: number | string,
  overrides: Partial<NocoDBConfig> = {},
): Promise<number> {
  const identifiers = await resolveRecordIdentifiers(idOrVideoId, overrides);
  return identifiers.numericId;
}
