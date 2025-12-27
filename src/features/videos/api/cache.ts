export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<unknown>>();
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getFromCache<T>(key: string, ttl = DEFAULT_CACHE_TTL): T | null {
  const cached = globalCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttl) {
    globalCache.delete(key);
    return null;
  }
  return cached.data as T;
}

export function setInCache<T>(key: string, data: T) {
  globalCache.set(key, { data, timestamp: Date.now() });
}

export function deleteFromCache(key: string) {
  globalCache.delete(key);
}

export function clearAllCache() {
  globalCache.clear();
}
