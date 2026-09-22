const INSTITUTIONS = {
  met: 'The Metropolitan Museum of Art',
  rijksmuseum: 'Rijksmuseum',
  aic: 'Art Institute of Chicago',
  smithsonian: 'Smithsonian',
};

const unknownLicense = { status: 'unknown', details: null };

export function normalizeMet(item) {
  return { institution: INSTITUTIONS.met, objectId: String(item.objectID), title: item.title ?? null, artist: item.artistDisplayName ?? null, year: item.objectDate ?? null, medium: item.medium ?? null, imageUrl: item.primaryImage ?? item.primaryImageSmall ?? null, artworkUrl: item.objectURL ?? (item.objectID ? `https://www.metmuseum.org/art/collection/search/${item.objectID}` : null), license: unknownLicense };
}

function findRijksIdentifier(item) {
  return item?.identified_by?.find((entry) =>
    entry?.type === 'Identifier' &&
    entry.classified_as?.some((classification) => classification.id === 'https://id.rijksmuseum.nl/22015218')
  )?.content ?? null;
}

function findRijksName(item) {
  return item?.identified_by?.find((entry) =>
    entry?.type === 'Name' &&
    entry.classified_as?.some((classification) => classification.id === 'http://vocab.getty.edu/aat/300417200')
  )?.content ?? null;
}

function findRijksArtist(item) {
  for (const part of item?.produced_by?.part ?? []) {
    for (const actor of part?.carried_out_by ?? []) {
      const notation = actor?.notation?.find((entry) => entry?.['@language'] === 'en');
      if (notation?.['@value']) return notation['@value'];
    }
  }
  return null;
}

export function normalizeRijksmuseum(item, { imageUrl = null } = {}) {
  if (item?.objectNumber || item?.webImage || item?.principalOrFirstMaker) {
    return {
      institution: INSTITUTIONS.rijksmuseum,
      objectId: String(item.objectNumber),
      title: item.title ?? null,
      artist: item.principalOrFirstMaker ?? null,
      year: item.dating?.presentingDate ?? null,
      medium: item.physicalMedium ?? item.materials?.join?.(', ') ?? null,
      imageUrl: item.webImage?.url ?? imageUrl,
      artworkUrl: item.links?.web ?? (item.objectNumber ? `https://www.rijksmuseum.nl/en/collection/${item.objectNumber}` : null),
      license: unknownLicense,
    };
  }

  const objectId = findRijksIdentifier(item);
  return {
    institution: INSTITUTIONS.rijksmuseum,
    objectId,
    title: findRijksName(item),
    artist: findRijksArtist(item),
    year: null,
    medium: null,
    imageUrl,
    artworkUrl: objectId ? `https://www.rijksmuseum.nl/en/collection/${objectId}` : null,
    license: unknownLicense,
  };
}

export function normalizeAIC(item, config = { iiif_url: 'https://www.artic.edu/iiif/2' }) {
  return { institution: INSTITUTIONS.aic, objectId: String(item.id), title: item.title ?? null, artist: item.artist_title ?? null, year: item.date_display ?? null, medium: item.medium_display ?? null, imageUrl: item.image_id ? `${config.iiif_url}/${item.image_id}/full/843,/0/default.jpg` : null, artworkUrl: item.id ? `https://www.artic.edu/artworks/${item.id}` : null, license: unknownLicense };
}

export function normalizeSmithsonian(item) {
  const d = item.content?.descriptiveNonRepeating;
  return { institution: INSTITUTIONS.smithsonian, objectId: String(item.id), title: item.title ?? null, artist: item.content?.freetext?.name?.[0]?.content ?? null, year: null, medium: null, imageUrl: d?.online_media?.media?.[0]?.content ?? null, artworkUrl: d?.record_link ?? null, license: unknownLicense };
}

async function sleep(ms) { if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms)); }

async function json(fetchImpl, url, options, { retryAttempts = 3, retryDelayMs = 250 } = {}) {
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, options);
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === retryAttempts) throw new Error('CATALOG_PROVIDER_UNAVAILABLE');
    } catch (error) {
      if (error?.message === 'CATALOG_PROVIDER_UNAVAILABLE' || attempt === retryAttempts) throw new Error('CATALOG_PROVIDER_UNAVAILABLE');
    }
    await sleep(retryDelayMs * attempt);
  }
  throw new Error('CATALOG_PROVIDER_UNAVAILABLE');
}

export function createCatalogExporter({ fetchImpl = fetch, retryAttempts = 3, retryDelayMs = 250 } = {}) {
  const request = (url, options) => json(fetchImpl, url, options, { retryAttempts, retryDelayMs });
  return {
    async exportMet({ query = 'painting', limit = 100 } = {}) {
      const search = await request( `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`);
      const ids = (search.objectIDs ?? []).slice(0, limit);
      const records = [];
      for (const id of ids) {
        const detail = await request( `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        const record = normalizeMet(detail);
        if (!record.imageUrl || !record.objectId) continue;
        records.push(record);
      }
      return records;
    },

    async exportRijksmuseum({ query = 'painting', limit = 100 } = {}) {
      const records = [];
      let url = new URL('https://data.rijksmuseum.nl/search/collection');
      url.searchParams.set('imageAvailable', 'true');
      if (query && query !== 'painting') url.searchParams.set('title', query);
      else url.searchParams.set('type', 'painting');

      while (records.length < limit && url) {
        const body = await request( url);
        for (const item of body.orderedItems ?? []) {
          if (records.length >= limit) break;
          const identifier = item?.id?.replace('https://id.rijksmuseum.nl/', 'https://data.rijksmuseum.nl/');
          if (!identifier) continue;

          const objectRecord = await request( `${identifier}?_profile=la-framed`);
          const visualItem = objectRecord.shows?.[0]?.id?.replace('https://id.rijksmuseum.nl/', 'https://data.rijksmuseum.nl/');
          if (!visualItem) continue;

          const visualRecord = await request( `${visualItem}?_profile=la-framed`);
          const digitalObject = visualRecord.digitally_shown_by?.[0]?.id?.replace('https://id.rijksmuseum.nl/', 'https://data.rijksmuseum.nl/');
          if (!digitalObject) continue;

          const digitalRecord = await request( `${digitalObject}?_profile=la-framed`);
          const accessPoint = digitalRecord.access_point?.find((entry) => entry?.id?.includes('iiif.micr.io/'))?.id;
          if (!accessPoint) continue;

          const imageId = accessPoint.split('iiif.micr.io/')[1]?.split('/')[0];
          if (!imageId) continue;

          const record = normalizeRijksmuseum(objectRecord, {
            imageUrl: `https://iiif.micr.io/${imageId}/full/max/0/default.jpg`,
          });
          if (record.imageUrl && record.objectId) records.push(record);
        }

        const next = body.next?.id;
        url = next ? new URL(next) : null;
      }

      return records;
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
        const body = await request( url);
        const pageRecords = (body.data ?? [])
          .map((item) => normalizeAIC(item, body.config))
          .filter((r) => r.imageUrl && r.objectId);

        records.push(...pageRecords.slice(0, target - records.length));

        const totalPages = Number(body.pagination?.total_pages ?? currentPage);
        if (currentPage >= totalPages || pageRecords.length === 0) break;
        currentPage += 1;
      }

      return records;
    },

    async exportSmithsonian({ query = 'painting', limit = 100, apiKey } = {}) {
      if (!apiKey) throw new Error('SMITHSONIAN_API_KEY_REQUIRED');
      const url = new URL('https://api.si.edu/openaccess/api/v1.0/search');
      url.searchParams.set('q', query); url.searchParams.set('api_key', apiKey); url.searchParams.set('rows', String(Math.min(limit, 100)));
      const body = await request( url);
      return (body.response?.rows ?? []).map(normalizeSmithsonian).filter((r) => r.imageUrl && r.objectId);
    },
  };
}
