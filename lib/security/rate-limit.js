export function createSlidingWindowLimiter({ limit, windowMs, now = () => Date.now(), store } = {}) {
  if (!Number.isInteger(limit) || limit <= 0 || !Number.isFinite(windowMs) || windowMs <= 0) throw new Error('INVALID_RATE_LIMIT');
  const timestamps = new Map();
  const backend = store ?? {
    async increment(key, timestamp, window) {
      const current = timestamps.get(key) ?? [];
      const fresh = current.filter((t) => t > timestamp - window);
      fresh.push(timestamp);
      timestamps.set(key, fresh);
      return fresh.length;
    },
  };
  async function check(clientKey) {
    try {
      const count = await backend.increment(clientKey, now(), windowMs);
      if (typeof count !== 'number') throw new Error('INVALID_RATE_LIMIT_STORE');
      return count <= limit;
    } catch {
      throw new Error('RATE_LIMITER_UNAVAILABLE');
    }
  }
  return { check, allow: check };
}
