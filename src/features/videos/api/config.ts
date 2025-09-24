/**
 * Minimal configuration required to talk to the NocoDB instance.
 * Each value is loaded lazily from environment variables so that tests can
 * override them without rebuilding the module cache.
 */
export interface NocoDBConfig {
  url: string;
  token: string;
  projectId: string;
  tableId: string;
  tableName?: string;
}

export function getNocoDBConfig(overrides: Partial<NocoDBConfig> = {}): NocoDBConfig {
  const url = overrides.url ?? process.env.NC_URL;
  if (!url) {
    throw new Error('NocoDB URL is not configured. Please set NC_URL in your environment.');
  }

  const token = overrides.token ?? process.env.NC_TOKEN;
  if (!token) {
    throw new Error('NocoDB Auth Token is not configured. Please set NC_TOKEN in your environment.');
  }

  const projectId = overrides.projectId ?? process.env.NOCODB_PROJECT_ID;
  if (!projectId) {
    throw new Error('NocoDB Project ID is not configured. Please set NOCODB_PROJECT_ID in your environment.');
  }

  const tableId = overrides.tableId ?? process.env.NOCODB_TABLE_ID;
  if (!tableId) {
    throw new Error('NocoDB Table ID is not configured. Please set NOCODB_TABLE_ID in your environment.');
  }

  const tableName = overrides.tableName ?? process.env.NOCODB_TABLE_NAME;

  return { url, token, projectId, tableId, tableName };
}
