const INSTITUTIONS = {
  met: 'The Metropolitan Museum of Art',
  rijksmuseum: 'Rijksmuseum',
  aic: 'Art Institute of Chicago',
  smithsonian: 'Smithsonian',
};

const unknownLicense = { status: 'unknown', details: null };

export function normalizeMet(item) {
  return { institution: INSTITUTIONS.met, objectId: String(item.objectID), title: item.title ?? null, artist: item.artistDisplayName ?? null, year: item.objectDate ?? null, medium: item.medium ?? null, imageUrl: item.primaryImage ?? item.primaryImageSmall ?? null, artworkUrl: item.objectID ? `https://www.metmuseum.org/art/collection/search/${item.objectID}` : null, license: unknownLicense };
}

export function normalizeRijksmuseum(item) {
  return { institution: INSTITUTIONS.rijksmuseum, objectId: String(item.objectNumber), title: item.title ?? null, artist: item.principalOrFirstMaker ?? null, year: item.dating?.presentingDate ?? null, medium: item.physicalMedium ?? item.materials?.join?.(', ') ?? null, imageUrl: item.webImage?.url ?? null, artworkUrl: item.links?.web ?? null, license: unknownLicense };
}

export function normalizeAIC(item, config = { iiif_url: 'https://www.artic.edu/iiif/2' }) {
  return { institution: INSTITUTIONS.aic, objectId: String(item.id), title: item.title ?? null, artist: item.artist_title ?? null, year: item.date_display ?? null, medium: item.medium_display ?? null, imageUrl: item.image_id ? `${config.iiif_url}/${item.image_id}/full/843,/0/default.jpg` : null, artworkUrl: item.id ? `https://www.artic.edu/artworks/${item.id}` : null, license: unknownLicense };
}

export function normalizeSmithsonian(item) {
  const d = item.content?.descriptiveNonRepeating;
  return { institution: INSTITUTIONS.smithsonian, objectId: String(item.id), title: item.title ?? null, artist: item.content?.freetext?.name?.[0]?.content ?? null, year: null, medium: null, imageUrl: d?.online_media?.media?.[0]?.content ?? null, artworkUrl: d?.record_link ?? null, license: unknownLicense };
}

async function json(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  if (!response.ok) throw new Error('CATALOG_PROVIDER_UNAVAILABLE');
  return response.json();
}

export function createCatalogExporter({ fetchImpl = fetch } = {}) {
  return {
    async exportMet({ query = 'painting', limit = 100 } = {}) {
      const search = await json(fetchImpl, `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`);
      const ids = (search.objectIDs ?? []).slice(0, limit);
      const records = [];
      for (const id of ids) {
        const detail = await json(fetchImpl, `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        const record = normalizeMet(detail);
        if (!record.imageUrl || !record.objectId) continue;
        records.push(record);
      }
      return records;
    },

    async exportRijksmuseum({ query = '', limit = 100, apiKey } = {}) {
      if (!apiKey) throw new Error('RIJKSMUSEUM_API_KEY_REQUIRED');
      const url = new URL('https://www.rijksmuseum.nl/api/en/collection');
      url.searchParams.set('q', query); url.searchParams.set('key', apiKey); url.searchParams.set('format', 'json'); url.searchParams.set('ps', String(Math.min(limit, 100)));
      const body = await json(fetchImpl, url);
      return (body.artObjects ?? []).slice(0, limit).map(normalizeRijksmuseum).filter((r) => r.imageUrl && r.objectId);
    },

    async exportAIC({ page = 1, limit = 100 } = {}) {
      const records = [];
      let currentPage = page;
      const target = Math.max(0, limit);

      while (records.length < target) {
        const url = new URL('https://api.artic.edu/api/v1/artworks');
        url.searchParams.set('page', String(currentPage));
        url.searchParams.set('limit', String(Math.min(target - records.length, 100)));
        url.searchParams.set('fields', 'id,title,artist_title,date_display,medium_display,image_id');
        const body = await json(fetchImpl, url);
        const pageRecords = (body.data ?? [])
          .map((item) => normalizeAIC(item, body.config))
          .filter((r) => r.imageUrl && r.objectId);

        records.push(...pageRecords.slice(0, target - records.length));

        const totalPages = Number(body.pagination?.total_pages ?? currentPage);
        if (currentPage >= totalPages || pageRecords.length === 0) break;
        currentPage += 1;
      }

      return records;
    }

    async exportSmithsonian({ query = 'painting', limit = 100, apiKey } = {}) {
      if (!apiKey) throw new Error('SMITHSONIAN_API_KEY_REQUIRED');
      const url = new URL('https://api.si.edu/openaccess/api/v1.0/search');
      url.searchParams.set('q', query); url.searchParams.set('api_key', apiKey); url.searchParams.set('rows', String(Math.min(limit, 100)));
      const body = await json(fetchImpl, url);
      return (body.response?.rows ?? []).map(normalizeSmithsonian).filter((r) => r.imageUrl && r.objectId);
    },
  };
}
