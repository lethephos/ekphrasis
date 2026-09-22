export function createContextEnricher({ wikipedia, wikidata, timeoutMs = 5000 } = {}) {
  return {
    async enrich(artwork) {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('ENRICHMENT_TIMEOUT')), timeoutMs));
      const work = (async () => {
        const [wiki, data] = await Promise.all([
          wikipedia?.lookup?.({ title: artwork?.title ?? '', artist: artwork?.artist ?? '' }) ?? null,
          wikidata?.lookup?.({ title: artwork?.title ?? '', artist: artwork?.artist ?? '' }) ?? null,
        ]);
        return {
          context: typeof wiki?.extract === 'string' && wiki.extract ? wiki.extract : null,
          detail: typeof data?.detail === 'string' && data.detail ? data.detail : null,
        };
      })();
      try { return await Promise.race([work, timeout]); }
      catch { return { context: null, detail: null }; }
    },
  };
}
