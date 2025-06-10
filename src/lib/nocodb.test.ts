import { getNocoDBConfig } from './nocodb';

describe('getNocoDBConfig', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env };
  });
  afterEach(() => {
    process.env = env;
  });

  it('throws if no url or token', () => {
    delete process.env.NOCODB_URL;
    delete process.env.NC_URL;
    delete process.env.NOCODB_AUTH_TOKEN;
    delete process.env.NC_TOKEN;
    expect(() => getNocoDBConfig()).toThrow();
  });

  it('uses env variables', () => {
    process.env.NOCODB_URL = 'http://test';
    process.env.NOCODB_AUTH_TOKEN = 't';
    const cfg = getNocoDBConfig();
    expect(cfg.url).toBe('http://test');
    expect(cfg.token).toBe('t');
  });

  it('overrides with arguments', () => {
    process.env.NOCODB_URL = 'http://env';
    process.env.NOCODB_AUTH_TOKEN = 't';
    const cfg = getNocoDBConfig({ url: 'http://arg', token: 'x' });
    expect(cfg.url).toBe('http://arg');
    expect(cfg.token).toBe('x');
  });
});
