export function createVisualResolver({ embed, search, similarityThreshold = 0.75 } = {}) {
  if (typeof embed !== 'function' || typeof search !== 'function') throw new TypeError('embed and search must be functions');

  return {
    async resolve(bytes, { useVisualFallback } = {}) {
      if (!useVisualFallback) return null;
      try {
        const vector = await embed(bytes);
        const hits = await search(vector);
        const best = [...hits].sort((a, b) => b.score - a.score || String(a.payload?.institution ?? '').localeCompare(String(b.payload?.institution ?? '')) || String(a.payload?.objectId ?? '').localeCompare(String(b.payload?.objectId ?? '')) || String(a.id).localeCompare(String(b.id)))[0];
        if (!best || !Number.isFinite(best.score) || best.score < similarityThreshold) {
          return { candidate: null, similarity: best?.score ?? null, degraded: false };
        }
        return {
          candidate: best.payload ?? null,
          similarity: best.score,
          degraded: false,
        };
      } catch {
        return { candidate: null, similarity: null, degraded: true };
      }
    },
  };
}
