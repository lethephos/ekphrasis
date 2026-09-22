export function createWikidataStyleSource({ lookup } = {}) {
  if (typeof lookup !== 'function') throw new TypeError('lookup must be a function');
  return {
    async lookup({ title, artist }) {
      const evidence = await lookup({ title, artist });
      if (!evidence || evidence.source !== 'wikidata' || typeof evidence.style !== 'string') return null;
      return { style: evidence.style, source: 'wikidata' };
    },
  };
}


export function createWikidataClient({ fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  return {
    async lookup({ artist } = {}) {
      if (!artist) return null;
      const search = new URL('https://www.wikidata.org/w/api.php');
      search.searchParams.set('action', 'wbsearchentities');
      search.searchParams.set('search', artist);
      search.searchParams.set('language', 'en');
      search.searchParams.set('format', 'json');
      search.searchParams.set('limit', '1');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(search, { signal: controller.signal });
        if (!response.ok) return null;
        const found = (await response.json()).search?.[0];
        if (!found?.id) return null;
        const entityUrl = new URL('https://www.wikidata.org/w/api.php');
        entityUrl.searchParams.set('action', 'wbgetentities');
        entityUrl.searchParams.set('ids', found.id);
        entityUrl.searchParams.set('languages', 'en');
        entityUrl.searchParams.set('format', 'json');
        const entityResponse = await fetchImpl(entityUrl, { signal: controller.signal });
        if (!entityResponse.ok) return null;
        const entity = (await entityResponse.json()).entities?.[found.id];
        const description = entity?.descriptions?.en?.value;
        return description ? { detail: description } : null;
      } catch { return null; }
      finally { clearTimeout(timer); }
    },
  };
}
