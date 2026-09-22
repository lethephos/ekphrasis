import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogExporter, normalizeMet, normalizeRijksmuseum, normalizeAIC, normalizeSmithsonian } from '../../lib/visual/catalog-exporter.js';

const fetchJson = (body) => async () => ({ ok: true, json: async () => body });

test('Met normalizer preserves museum identity and image provenance', () => {
  const r = normalizeMet({ objectID: 436535, title: 'Wheat Field with Cypresses', artistDisplayName: 'Vincent van Gogh', objectDate: '1889', medium: 'Oil on canvas', primaryImage: 'https://example.org/met.jpg', objectURL: 'https://example.org/met' });
  assert.deepEqual(r, { institution:'The Metropolitan Museum of Art', objectId:'436535', title:'Wheat Field with Cypresses', artist:'Vincent van Gogh', year:'1889', medium:'Oil on canvas', imageUrl:'https://example.org/met.jpg', artworkUrl:'https://example.org/met', license:{status:'unknown',details:null} });
});

test('Rijksmuseum, AIC, and Smithsonian normalizers produce the same corpus shape', () => {
  assert.equal(normalizeRijksmuseum({ objectNumber:'SK-A-1', title:'X', principalOrFirstMaker:'Artist', dating:{presentingDate:'1900'}, physicalMedium:'Oil', webImage:{url:'https://r/i.jpg'}, links:{web:'https://r/a'} }).objectId, 'SK-A-1');
  assert.equal(normalizeAIC({ id:1,title:'X',artist_title:'Artist',date_display:'1900',medium_display:'Oil',image_id:'img' }).imageUrl.includes('/iiif/2/img/'), true);
  assert.equal(normalizeSmithsonian({ id:'si1', title:'X', online_media:{media:[{content:'https://s/i.jpg'}]}, url:'https://s/a', artist:'Artist', date:'1900', medium:'Oil' }).objectId, 'si1');
});

test('catalog exporter paginates and rejects records without source images', async () => {
  const exporter = createCatalogExporter({ fetchImpl: fetchJson({ objectIDs:[1,2], total:2 }) });
  const records = await exporter.exportMet({ limit: 2 });
  assert.deepEqual(records, []);
});


test('catalog exporter retries transient provider responses with bounded backoff', async () => {
  let attempts = 0;
  const exporter = createCatalogExporter({
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 3) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, json: async () => ({ objectIDs: [] }) };
    },
    retryAttempts: 3,
    retryDelayMs: 0,
  });
  await exporter.exportMet({ limit: 1 });
  assert.equal(attempts, 3);
});


test('Smithsonian exporter paginates beyond the API page size', async () => {
  const urls = [];
  const exporter = createCatalogExporter({
    fetchImpl: async (url) => {
      urls.push(String(url));
      const start = new URL(url).searchParams.get('start') ?? '0';
      const rows = Number(new URL(url).searchParams.get('rows'));
      return {
        ok: true,
        json: async () => ({
          response: {
            rows: Array.from({ length: Math.min(rows, start === '0' ? 2 : 1) }, (_, i) => ({
              id: `si-${Number(start) + i}`,
              title: 'Painting',
              content: { descriptiveNonRepeating: { online_media: { media: [{ content: 'https://img.example/x.jpg' }] } } },
            })),
          },
        }),
      };
    },
  });
  const records = await exporter.exportSmithsonian({ limit: 3, apiKey: 'key' });
  assert.equal(records.length, 3);
  assert.equal(urls.length, 2);
});
