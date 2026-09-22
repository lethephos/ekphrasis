export function createMemoryCacheStore({ now = () => Date.now() } = {}) {
  const entries = new Map();
  return {
    async get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now()) { entries.delete(key); return null; }
      return entry.value;
    },
    async set(key, value, ttlSeconds) {
      entries.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
    },
  };
}
