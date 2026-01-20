import { apiClient, toRequestError } from './http-client';
import { getNocoDBConfig, type NocoDBConfig } from './config';
import { resolveTableIdentifiers } from './table-metadata';
import {
  cacheVideoRecord,
  fetchSingleVideo,
  purgeVideoFromCache,
  resolveRecordIdentifiers,
  type VideoRecordWithRowMeta,
} from './record-utils';
import type { Video } from './schemas';
import { logDevEvent, logDevError } from '@/shared/utils/server-logger';

export function normalizeImportanceRating(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return null;
    }
    return parsed;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > 5) {
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

interface MutationOverrides {
  projectId?: string;
  tableId?: string;
  tableName?: string;
}

function buildMutationConfig(overrides: MutationOverrides): NocoDBConfig {
  return getNocoDBConfig({
    projectId: overrides.projectId,
    tableId: overrides.tableId,
    tableName: overrides.tableName,
  });
}

export async function updateVideo(
  recordIdOrVideoId: number | string,
  data: Partial<Video>,
  overrides: MutationOverrides = {},
): Promise<VideoRecordWithRowMeta> {
  const config = buildMutationConfig(overrides);
  const { resolvedTableId } = await resolveTableIdentifiers(config);

  const identifiers = await resolveRecordIdentifiers(recordIdOrVideoId, {
    projectId: config.projectId,
    tableId: resolvedTableId,
    tableName: config.tableName,
  });

  const payload: Record<string, unknown> = { ...data };

  if ('ImportanceRating' in payload) {
    const normalized = normalizeImportanceRating(payload.ImportanceRating);
    if (normalized === undefined) {
      delete payload.ImportanceRating;
    } else {
      payload.ImportanceRating = normalized;
    }
  }

  if ('PersonalComment' in payload) {
    const normalizedComment = normalizePersonalComment(payload.PersonalComment);
    if (normalizedComment === undefined) {
      delete payload.PersonalComment;
    } else {
      payload.PersonalComment = normalizedComment;
    }
  }

  const endpoint = `${config.url}/api/v2/tables/${encodeURIComponent(resolvedTableId)}/records`;

  try {
    await apiClient.patch(
      endpoint,
      {
        Id: identifiers.numericId,
        ...payload,
      },
      {
        headers: { 'xc-token': config.token },
      },
    );

    const refreshed = await fetchSingleVideo(identifiers.numericId, 'id', {
      cache: false,
      configOverrides: {
        projectId: config.projectId,
        tableId: resolvedTableId,
        tableName: config.tableName,
      },
    });

    if (!refreshed) {
      throw new Error('Updated video could not be reloaded after update');
    }

    cacheVideoRecord(refreshed, [
      String(identifiers.numericId),
      refreshed.VideoID ?? undefined,
      refreshed.__rowId ?? undefined,
    ]);

    void logDevEvent({
      message: 'updateVideo: update completed',
      payload: {
        identifier: recordIdOrVideoId,
        numericId: identifiers.numericId,
        updatedFields: Object.keys(payload),
      },
    });

    return refreshed;
  } catch (error) {
    void logDevError('updateVideo: request failed', {
      identifier: recordIdOrVideoId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw toRequestError('updateVideo', error, endpoint);
  }
}

export async function deleteVideo(
  recordIdOrVideoId: number | string,
  overrides: MutationOverrides = {},
): Promise<void> {
  const config = buildMutationConfig(overrides);
  const { resolvedTableId } = await resolveTableIdentifiers(config);

  const identifiers = await resolveRecordIdentifiers(recordIdOrVideoId, {
    projectId: config.projectId,
    tableId: resolvedTableId,
    tableName: config.tableName,
  });

  const attempts: Array<{ label: string; run: () => Promise<unknown> }> = [
    {
      label: 'filter-delete',
      run: () =>
        apiClient.delete(
          `${config.url}/api/v2/tables/${encodeURIComponent(resolvedTableId)}/records`,
          {
            headers: { 'xc-token': config.token },
            data: {
              Id: identifiers.numericId,
              filter: `(Id,eq,${identifiers.numericId})`,
            },
          },
        ),
    },
    {
      label: 'numeric-path',
      run: () =>
        apiClient.delete(
          `${config.url}/api/v2/tables/${encodeURIComponent(resolvedTableId)}/records/${identifiers.numericId}`,
          {
            headers: { 'xc-token': config.token },
          },
        ),
    },
  ];

  if (identifiers.rowId) {
    attempts.push({
      label: 'rowid-path',
      run: () =>
        apiClient.delete(
          `${config.url}/api/v2/tables/${encodeURIComponent(resolvedTableId)}/records/${encodeURIComponent(identifiers.rowId!)}`,
          {
            headers: { 'xc-token': config.token },
          },
        ),
    });
  }

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      await attempt.run();

      purgeVideoFromCache(identifiers.video, [
        identifiers.numericId.toString(),
        identifiers.rowId ?? undefined,
        identifiers.video.VideoID ?? undefined,
      ]);

      void logDevEvent({
        message: 'deleteVideo: completed',
        payload: {
          identifier: recordIdOrVideoId,
          strategy: attempt.label,
        },
      });

      return;
    } catch (error) {
      lastError = error;
      void logDevError('deleteVideo: attempt failed', {
        label: attempt.label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw toRequestError('deleteVideo', lastError, `${config.url}/api/v2/tables/${resolvedTableId}/records`);
}

