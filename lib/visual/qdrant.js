export function createQdrantClient({ search } = {}) {
  if (typeof search !== 'function') throw new TypeError('search must be a function');
  return {
    async search(vector) {
      const response = await search(vector);
      if (!response || !Array.isArray(response.result)) throw new Error('QDRANT_INVALID_RESPONSE');
      return response.result.map((item) => ({
        id: String(item.id),
        score: Number(item.score),
        payload: item.payload ?? {},
      }));
    },
  };
}
