export function normalizeMuseumCandidate(input) {
  if (!input?.institution || !input?.objectId || !input?.title || !input?.artist) {
    throw new Error('MUSEUM_INVALID_CANDIDATE');
  }
  return {
    institution: input.institution,
    objectId: String(input.objectId),
    title: input.title,
    artist: input.artist,
    year: input.year ?? null,
    medium: input.medium ?? null,
    style: input.style ?? null,
    imageUrl: input.imageUrl ?? null,
    artworkUrl: input.artworkUrl ?? null,
    license: input.license ?? 'unknown',
  };
}

export function createMuseumAdapter({ search, timeoutMs = 4000 } = {}) {
  if (typeof search !== 'function') throw new TypeError('search must be a function');
  return {
    async search(query) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const raw = await search({ query, signal: controller.signal });
        if (!Array.isArray(raw)) throw new Error('MUSEUM_INVALID_RESPONSE');
        return raw.map(normalizeMuseumCandidate);
      } catch (error) {
        if (error?.name === 'AbortError' || controller.signal.aborted) throw new Error('MUSEUM_TIMEOUT');
        if (error?.message === 'MUSEUM_INVALID_RESPONSE' || error?.message === 'MUSEUM_INVALID_CANDIDATE') throw error;
        throw new Error('MUSEUM_UNAVAILABLE');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
