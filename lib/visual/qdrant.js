
function normalizeSearchResults(payload) {
  return (Array.isArray(payload) ? payload : payload?.result?.result ?? payload?.result ?? []).map((item) => ({
    id: String(item.id), score: Number(item.score), payload: item.payload ?? {},
  }));
}
export function createQdrantClient({ search, endpoint, apiKey, collection = process.env.QDRANT_COLLECTION, fetchImpl = fetch, timeoutMs = 6000 } = {}) {
  if (typeof search === 'function') {
    return { search: async (vector) => normalizeSearchResults(await search(vector)) };
  }
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
        return normalizeSearchResults(body);
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


export function createQdrantAdminClient({ endpoint, apiKey, fetchImpl = fetch, timeoutMs = 6000 } = {}) {
  if (!endpoint || !apiKey) throw new Error('QDRANT_CONFIG_MISSING');

  async function request(path, method, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${endpoint.replace(/\/$/, '')}${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'api-key': apiKey },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('QDRANT_UNAVAILABLE');
      return response.json();
    } catch (error) {
      if (error?.name === 'AbortError' || controller.signal.aborted) throw new Error('QDRANT_TIMEOUT');
      if (error?.message === 'QDRANT_UNAVAILABLE') throw error;
      throw new Error('QDRANT_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    createCollection: (name, config) => request(`/collections/${encodeURIComponent(name)}`, 'PUT', config),
    upsert: (name, points) => request(`/collections/${encodeURIComponent(name)}/points?wait=true`, 'PUT', { points }),
    count: async (name) => (await request(`/collections/${encodeURIComponent(name)}/points/count`, 'POST', { exact: true })).result,
    getCollection: (name) => request(`/collections/${encodeURIComponent(name)}`, 'GET'),
    setAlias: (alias, collection) => request('/collections/aliases', 'POST', {
      actions: [{ create_alias: { collection_name: collection, alias_name: alias } }],
    }),
  };
}
