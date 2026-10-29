const defaultTtl = Math.max(0, Number(process.env.CACHE_DEFAULT_TTL_SECONDS || 300)) * 1000;
const MAX_CACHE_ENTRIES = Math.max(50, Number(process.env.CACHE_MAX_ENTRIES || 500));
const cache = new Map();

export function cacheGet(key) {
  const item = cache.get(key);
  if (!item) return undefined;
  if (item.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, item);
  return item.value;
}

export function cacheSet(key, value, ttlMs = defaultTtl) {
  if (ttlMs <= 0) return value;
  cache.delete(key);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  return value;
}

export function cacheTtlSeconds(kind = 'default') {
  const key = {
    search: 'CACHE_TTL_SEARCH_SECONDS',
    metadata: 'CACHE_TTL_METADATA_SECONDS',
    default: 'CACHE_DEFAULT_TTL_SECONDS'
  }[kind] || 'CACHE_DEFAULT_TTL_SECONDS';
  return Math.max(0, Number(process.env[key] ?? 300));
}

export function cacheClear() {
  cache.clear();
}
