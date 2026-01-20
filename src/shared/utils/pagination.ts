const PAGINATION_LIMITS = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  MIN_OFFSET: 0,
  MAX_OFFSET: 5000,
  DEFAULT_LIMIT: 35,
  DEFAULT_PAGE: 1,
  DEFAULT_OFFSET: 0,
} as const;

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
  offset: number;
}

export function normalizePagination(params: PaginationParams): NormalizedPagination {
  const rawLimit = params.limit ?? params.page !== undefined ? PAGINATION_LIMITS.DEFAULT_LIMIT : undefined;
  const rawPage = params.page ?? PAGINATION_LIMITS.DEFAULT_PAGE;
  const rawOffset = params.offset ?? PAGINATION_LIMITS.DEFAULT_OFFSET;

  const limit = rawLimit !== undefined ? clamp(rawLimit, PAGINATION_LIMITS.MIN_LIMIT, PAGINATION_LIMITS.MAX_LIMIT) : PAGINATION_LIMITS.DEFAULT_LIMIT;
  const page = clamp(rawPage, 1, Infinity);
  const offset = clamp(rawOffset, PAGINATION_LIMITS.MIN_OFFSET, PAGINATION_LIMITS.MAX_OFFSET);

  return { page, limit, offset };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
