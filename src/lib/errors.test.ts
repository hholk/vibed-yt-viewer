import { describe, it, expect } from 'vitest';
import { NocoDBRequestError, NocoDBValidationError } from './errors';

describe('custom error classes', () => {
  it('creates NocoDBRequestError with properties', () => {
    const err = new NocoDBRequestError('msg', 404, { ok: false });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('NocoDBRequestError');
    expect(err.status).toBe(404);
    expect(err.data).toEqual({ ok: false });
  });

  it('creates NocoDBValidationError with issues', () => {
    const issues = [{ path: ['a'], message: 'bad' }];
    const err = new NocoDBValidationError('fail', issues);
    expect(err).toBeInstanceOf(Error);
    expect(err.issues).toBe(issues);
  });
});
