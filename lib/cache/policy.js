export function createCachePolicy({ normalTtlSeconds = 3600, degradedTtlSeconds = 300 } = {}) {
  if (normalTtlSeconds <= 0 || degradedTtlSeconds <= 0) throw new Error('INVALID_CACHE_TTL');
  return {
    ttlFor(result) {
      return result?.diagnostics?.degraded ? degradedTtlSeconds : normalTtlSeconds;
    },
    shouldCache(result) {
      return !(result?.status === 'error' && result?.code === 'API_UNAVAILABLE');
    },
  };
}
