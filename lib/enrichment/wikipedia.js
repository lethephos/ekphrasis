export function createWikipediaStyleSource({ lookup } = {}) {
  if (typeof lookup !== 'function') throw new TypeError('lookup must be a function');
  return {
    async lookup({ title, artist }) {
      const evidence = await lookup({ title, artist });
      if (!evidence || evidence.source !== 'wikipedia' || typeof evidence.style !== 'string') return null;
      return { style: evidence.style, source: 'wikipedia' };
    },
  };
}


export function createWikipediaClient({ fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  return {
    async lookup({ title } = {}) {
      if (!title) return null;
      const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, { signal: controller.signal, headers: { accept: 'application/json' } });
        if (!response.ok) return null;
        const body = await response.json();
        if (!body?.extract) return null;
        return { title: body.title ?? title, extract: body.extract, url: body.content_urls?.desktop?.page ?? url };
      } catch { return null; }
      finally { clearTimeout(timer); }
    },
    async externalLinks(title) {
      if (!title) return [];
      const url = new URL('https://en.wikipedia.org/w/api.php');
      url.searchParams.set('action', 'parse');
      url.searchParams.set('page', title);
      url.searchParams.set('prop', 'externallinks');
      url.searchParams.set('format', 'json');
      const response = await fetchImpl(url);
      if (!response.ok) return [];
      return (await response.json()).parse?.externallinks ?? [];
    },
  };
}
