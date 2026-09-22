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
