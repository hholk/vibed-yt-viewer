import axios from 'axios';

import { apiClient, toRequestError } from './http-client';
import type { NocoDBConfig } from './config';
import { logDevError, logDevEvent } from '@/shared/utils/server-logger';

interface NocoDBTableMetadata {
  id?: string;
  title?: string;
  table_name?: string;
  name?: string;
  slug?: string;
}

export interface ResolvedTableIdentifiers {
  identifiers: string[];
  resolvedTableName: string | null;
  resolvedTableId: string;
}

const projectTablesMetaCache = new Map<string, NocoDBTableMetadata[]>();
const tableDetailCache = new Map<string, NocoDBTableMetadata>();
const tableIdentifiersCache = new Map<string, ResolvedTableIdentifiers>();

const METADATA_ENDPOINT = (config: Pick<NocoDBConfig, 'url' | 'projectId'>) =>
  `${config.url}/api/v2/meta/projects/${encodeURIComponent(config.projectId)}/tables`;

const TABLE_DETAIL_ENDPOINT = (config: Pick<NocoDBConfig, 'url'>, tableId: string) =>
  `${config.url}/api/v2/tables/${encodeURIComponent(tableId)}`;

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueIdentifiers(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function getMetadataCandidates(meta: NocoDBTableMetadata): string[] {
  const candidates = [meta.id, meta.slug, meta.table_name, meta.title, meta.name]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  return Array.from(new Set(candidates));
}

async function loadProjectTablesMetadata(config: Pick<NocoDBConfig, 'url' | 'token' | 'projectId'>): Promise<NocoDBTableMetadata[]> {
  const cacheKey = `${config.url}:${config.projectId}`;
  if (projectTablesMetaCache.has(cacheKey)) {
    return projectTablesMetaCache.get(cacheKey)!;
  }

  try {
    const response = await apiClient.get(METADATA_ENDPOINT(config), {
      headers: { 'xc-token': config.token },
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

    projectTablesMetaCache.set(cacheKey, metadata);
    return metadata;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      void logDevEvent({
        message: 'resolveTableIdentifiers: metadata endpoint unavailable',
        payload: { projectId: config.projectId },
      });
      projectTablesMetaCache.set(cacheKey, []);
      return [];
    }

    void logDevError('resolveTableIdentifiers: metadata fetch failed', {
      projectId: config.projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw toRequestError('resolveTableIdentifiers', error, METADATA_ENDPOINT(config));
  }
}

async function loadTableDetails(
  config: Pick<NocoDBConfig, 'url' | 'token'>,
  tableId: string,
): Promise<NocoDBTableMetadata | null> {
  const cacheKey = `${config.url}:${tableId}`;
  if (tableDetailCache.has(cacheKey)) {
    return tableDetailCache.get(cacheKey)!;
  }

  try {
    const response = await apiClient.get(TABLE_DETAIL_ENDPOINT(config, tableId), {
      headers: { 'xc-token': config.token },
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
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      void logDevEvent({
        message: 'resolveTableIdentifiers: table info endpoint unavailable',
        payload: { tableId },
      });
      tableDetailCache.set(cacheKey, {});
      return null;
    }

    void logDevError('resolveTableIdentifiers: table info fetch failed', {
      tableId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw toRequestError('resolveTableIdentifiers', error, TABLE_DETAIL_ENDPOINT(config, tableId));
  }

  tableDetailCache.set(cacheKey, {});
  return null;
}

export async function resolveTableIdentifiers(
  config: Pick<NocoDBConfig, 'url' | 'token' | 'projectId' | 'tableId' | 'tableName'>,
): Promise<ResolvedTableIdentifiers> {
  const cacheKey = `${config.projectId}:${config.tableId}:${config.tableName ?? ''}`;
  if (tableIdentifiersCache.has(cacheKey)) {
    return tableIdentifiersCache.get(cacheKey)!;
  }

  const identifiers = uniqueIdentifiers([config.tableId, config.tableName]);
  const normalizedTargets = identifiers.map(normalizeIdentifier);

  const metadata = await loadProjectTablesMetadata(config);
  let resolvedTableId = config.tableId;
  let resolvedTableName = config.tableName && config.tableName.trim().length > 0 ? config.tableName.trim() : null;

  let matchedMeta = metadata.find((tableMeta) => {
    const metaCandidates = getMetadataCandidates(tableMeta).map(normalizeIdentifier);
    return metaCandidates.some((value) => normalizedTargets.includes(value));
  });

  if (!matchedMeta) {
    matchedMeta = await loadTableDetails(config, config.tableId) ?? undefined;
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
      config.tableId,
      config.tableName,
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

  void logDevEvent({
    message: 'resolveTableIdentifiers: resolved metadata',
    payload: {
      inputTableId: config.tableId,
      inputTableName: config.tableName ?? null,
      resolvedTableId,
      resolvedTableName,
    },
  });

  return result;
}

export function resetTableMetadataCaches() {
  projectTablesMetaCache.clear();
  tableDetailCache.clear();
  tableIdentifiersCache.clear();
}
