import axios, { type AxiosError } from 'axios';

import { NocoDBRequestError } from './errors';
import { logDevError } from '@/shared/utils/server-logger';

/**
 * Shared Axios instance used for every NocoDB request.
 * Keeping a single instance makes it easy to add interceptors later on.
 */
export const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 second default timeout
});

/**
 * Convert an Axios error into our domain specific error type while logging
 * enough context for local debugging. Beginners often wonder why we do not
 * simply throw the original error – the reason is that Axios errors are not
 * serialisable which makes debugging in Next.js harder.
 */
export function toRequestError(
  context: string,
  error: unknown,
  endpoint?: string,
): NocoDBRequestError {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    void logDevError(`${context}: request failed`, {
      endpoint,
      status,
      data,
      message: error.message,
    });

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new NocoDBRequestError(
        `${context}: Request timed out. NocoDB may be slow or unavailable.`,
        status,
        data,
      );
    }

    return new NocoDBRequestError(`${context}: ${error.message}`, status, data);
  }

  const fallbackMessage = error instanceof Error ? error.message : String(error);
  void logDevError(`${context}: unexpected failure`, { endpoint, message: fallbackMessage });
  return new NocoDBRequestError(`${context}: ${fallbackMessage}`);
}

function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
