import { createMuseumAdapter } from './adapter.js';

const configs = {
  met: {
    institution: 'The Metropolitan Museum of Art',
    endpoint: 'https://collectionapi.metmuseum.org/public/collection/v1/search',
    map: (item) => ({ objectId: item.objectID, title: item.title, artist: item.artistDisplayName, year: item.objectDate, medium: item.medium, imageUrl: item.primaryImageSmall, artworkUrl: `https://www.metmuseum.org/art/collection/search/${item.objectID}`, license: 'unknown' }),
  },
  rijksmuseum: {
    institution: 'Rijksmuseum',
    endpoint: 'https://www.rijksmuseum.nl/api/en/collection',
    map: (item) => ({ objectId: item.objectNumber, title: item.title, artist: item.principalOrFirstMaker, year: item.dating?.presentingDate, medium: item.materials?.join?.(', ') ?? null, imageUrl: item.webImage?.url ?? null, artworkUrl: item.links?.web ?? null, license: 'unknown' }),
  },
  aic: {
    institution: 'Art Institute of Chicago',
    endpoint: 'https://api.artic.edu/api/v1/artworks/search',
    map: (item) => ({ objectId: item.id, title: item.title, artist: item.artist_title, year: item.date_display, medium: item.medium_display, style: item.style_title ?? null, imageUrl: item.image_id ? `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg` : null, artworkUrl: `https://www.artic.edu/artworks/${item.id}`, license: 'unknown' }),
  },
  smithsonian: {
    institution: 'Smithsonian',
    endpoint: 'https://api.si.edu/openaccess/api/v1.0/search',
    map: (item) => ({ objectId: item.id, title: item.title, artist: item.content?.descriptiveNonRepeating?.title?.label ?? item.title, year: null, medium: null, style: null, imageUrl: item.content?.descriptiveNonRepeating?.online_media?.media?.[0]?.content ?? null, artworkUrl: item.content?.descriptiveNonRepeating?.record_link ?? null, license: 'unknown' }),
  },
};

export function createMuseumSearchAdapters({ fetchImpl = fetch, keys = {} } = {}) {
  return Object.fromEntries(Object.entries(configs).map(([name, config]) => [
    name,
    createMuseumAdapter({
      search: async ({ query, signal }) => {
        const url = new URL(config.endpoint);
        url.searchParams.set('q', query);
        if (name === 'met') url.searchParams.set('hasImages', 'true');
        if (name === 'smithsonian') url.searchParams.set('api_key', keys.smithsonian ?? 'DEMO_KEY');
        const response = await fetchImpl(url, { signal });
        if (!response.ok) throw new Error('provider');
        const body = await response.json();
        const items = name === 'met' ? (body.objectIDs ?? []).slice(0, 10).map((id) => ({ objectID: id, title: query, artistDisplayName: null })) :
          name === 'aic' ? (body.data ?? []) : name === 'smithsonian' ? (body.response?.rows ?? []) : (body.artObjects ?? []);
        return items.map(config.map).filter((item) => item.title && item.artist);
      },
    }),
  ]));
}
