export function createQdrantClient({ search, endpoint, apiKey, collection = process.env.QDRANT_COLLECTION, fetchImpl = fetch, timeoutMs = 6000 } = {}) {
  if (typeof search === 'function') return { search };
  if (!endpoint || !apiKey || !collection) throw new Error('QDRANT_CONFIG_MISSING');
  return {
    async search(vector) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${endpoint.replace(/\/$/, '')}/collections/${encodeURIComponent(collection)}/points/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'api-key': apiKey },
          body: JSON.stringify({ vector, limit: 10, with_payload: true }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('QDRANT_UNAVAILABLE');
        const body = await response.json();
        return (body.result?.result ?? body.result ?? []).map((item) => ({
          id: String(item.id),
          score: Number(item.score),
          payload: item.payload ?? {},
        }));
      } catch (error) {
        if (error?.name === 'AbortError' || controller.signal.aborted) throw new Error('QDRANT_TIMEOUT');
        if (error?.message === 'QDRANT_UNAVAILABLE') throw error;
        throw new Error('QDRANT_UNAVAILABLE');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
