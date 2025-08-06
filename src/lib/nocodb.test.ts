import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getNocoDBConfig } from './nocodb';

describe('getNocoDBConfig', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  it('throws if required environment variables are missing', () => {
    delete process.env.NC_URL;
    delete process.env.NC_TOKEN;
    delete process.env.NOCODB_PROJECT_ID;
    delete process.env.NOCODB_TABLE_ID;

    expect(() => getNocoDBConfig()).toThrow('NocoDB URL is not configured.');

    process.env.NC_URL = 'http://test';
    expect(() => getNocoDBConfig()).toThrow('NocoDB Auth Token is not configured.');

    process.env.NC_TOKEN = 'test-token';
    expect(() => getNocoDBConfig()).toThrow('NocoDB Project ID is not configured.');

    process.env.NOCODB_PROJECT_ID = 'test-project';
    expect(() => getNocoDBConfig()).toThrow('NocoDB Table ID is not configured.');
  });

  it('uses env variables when all are set', () => {
    process.env.NC_URL = 'http://test-url';
    process.env.NC_TOKEN = 'test-token';
    process.env.NOCODB_PROJECT_ID = 'test-project-id';
    process.env.NOCODB_TABLE_ID = 'test-table-id';

    const config = getNocoDBConfig();

    expect(config.url).toBe('http://test-url');
    expect(config.token).toBe('test-token');
    expect(config.projectId).toBe('test-project-id');
    expect(config.tableId).toBe('test-table-id');
  });

  it('overrides env variables with arguments', () => {
    process.env.NC_URL = 'http://env-url';
    process.env.NC_TOKEN = 'env-token';
    process.env.NOCODB_PROJECT_ID = 'env-project-id';
    process.env.NOCODB_TABLE_ID = 'env-table-id';

    const overrides = {
      url: 'http://arg-url',
      token: 'arg-token',
      projectId: 'arg-project-id',
      tableId: 'arg-table-id',
    };

    const config = getNocoDBConfig(overrides);

    expect(config.url).toBe('http://arg-url');
    expect(config.token).toBe('arg-token');
    expect(config.projectId).toBe('arg-project-id');
    expect(config.tableId).toBe('arg-table-id');
  });
});
