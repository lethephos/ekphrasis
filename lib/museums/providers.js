import { createMuseumAdapter } from './adapter.js';

function mapMet(item) {
  return {
    objectId: item.objectID,
    title: item.title,
    artist: item.artistDisplayName,
    year: item.objectDate,
    medium: item.medium,
    imageUrl: item.primaryImageSmall || item.primaryImage,
    artworkUrl: item.objectID ? `https://www.metmuseum.org/art/collection/search/${item.objectID}` : null,
    license: 'unknown',
  };
}

const configs = {
  met: {
    institution: 'The Metropolitan Museum of Art',
    searchUrl: 'https://collectionapi.metmuseum.org/public/collection/v1/search',
    async fetchItems({ query, signal, fetchImpl }) {
      const search = new URL(this.searchUrl);
      search.searchParams.set('q', query);
      search.searchParams.set('hasImages', 'true');
      const response = await fetchImpl(search, { signal });
      if (!response.ok) throw new Error('provider');
      const body = await response.json();
      const ids = (body.objectIDs ?? []).slice(0, 10);
      const items = [];
      for (const id of ids) {
        const detail = await fetchImpl(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, { signal });
        if (detail.ok) items.push(mapMet(await detail.json()));
      }
      return items;
    },
  },
  rijksmuseum: {
    institution: 'Rijksmuseum',
    searchUrl: 'https://www.rijksmuseum.nl/api/en/collection',
    async fetchItems({ query, signal, fetchImpl, apiKey }) {
      if (!apiKey) throw new Error('provider');
      const url = new URL(this.searchUrl);
      url.searchParams.set('q', query);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('format', 'json');
      const response = await fetchImpl(url, { signal });
      if (!response.ok) throw new Error('provider');
      const body = await response.json();
      return (body.artObjects ?? []).slice(0, 10).map((item) => ({
        objectId: item.objectNumber,
        title: item.title,
        artist: item.principalOrFirstMaker,
        year: item.dating?.presentingDate ?? null,
        medium: item.materials?.join?.(', ') ?? null,
        style: null,
        imageUrl: item.webImage?.url ?? null,
        artworkUrl: item.links?.web ?? null,
        license: 'unknown',
      }));
    },
  },
  aic: {
    institution: 'Art Institute of Chicago',
    searchUrl: 'https://api.artic.edu/api/v1/artworks/search',
    async fetchItems({ query, signal, fetchImpl }) {
      const url = new URL(this.searchUrl);
      url.searchParams.set('q', query);
      url.searchParams.set('limit', '10');
      url.searchParams.set('fields', 'id,title,artist_title,date_display,medium_display,style_title,image_id');
      const response = await fetchImpl(url, { signal });
      if (!response.ok) throw new Error('provider');
      const body = await response.json();
      return (body.data ?? []).map((item) => ({
        objectId: item.id,
        title: item.title,
        artist: item.artist_title,
        year: item.date_display ?? null,
        medium: item.medium_display ?? null,
        style: item.style_title ?? null,
        imageUrl: item.image_id ? `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg` : null,
        artworkUrl: `https://www.artic.edu/artworks/${item.id}`,
        license: 'unknown',
      }));
    },
  },
  smithsonian: {
    institution: 'Smithsonian',
    searchUrl: 'https://api.si.edu/openaccess/api/v1.0/search',
    async fetchItems({ query, signal, fetchImpl, apiKey }) {
      if (!apiKey) throw new Error('provider');
      const url = new URL(this.searchUrl);
      url.searchParams.set('q', query);
      url.searchParams.set('api_key', apiKey);
      const response = await fetchImpl(url, { signal });
      if (!response.ok) throw new Error('provider');
      const body = await response.json();
      return (body.response?.rows ?? []).slice(0, 10).map((item) => {
        const d = item.content?.descriptiveNonRepeating;
        return {
          objectId: item.id,
          title: item.title,
          artist: item.content?.freetext?.name?.[0]?.content ?? item.title,
          year: null,
          medium: null,
          style: null,
          imageUrl: d?.online_media?.media?.[0]?.content ?? null,
          artworkUrl: d?.record_link ?? null,
          license: 'unknown',
        };
      });
    },
  },
};

export function createMuseumSearchAdapters({ fetchImpl = fetch, keys = {} } = {}) {
  return Object.values(configs).map((config) => createMuseumAdapter({
    timeoutMs: 4000,
    search: ({ query, signal }) => config.fetchItems({
      query, signal, fetchImpl,
      apiKey: config === configs.rijksmuseum ? keys.rijksmuseum : config === configs.smithsonian ? keys.smithsonian : undefined,
    }),
  }));
}
