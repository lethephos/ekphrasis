import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogExporter, normalizeRijksmuseum } from '../../lib/visual/catalog-exporter.js';

function response(body) {
  return { ok: true, json: async () => body };
}

test('Rijksmuseum normalizer extracts current Linked Art object identity', () => {
  const record = normalizeRijksmuseum({
    id: 'https://data.rijksmuseum.nl/90000100988',
    identified_by: [
      { type: 'Identifier', content: 'SK-C-5', classified_as: [{ id: 'https://id.rijksmuseum.nl/22015218' }] },
      { type: 'Name', content: 'The Night Watch', classified_as: [{ id: 'http://vocab.getty.edu/aat/300417200' }] },
    ],
    produced_by: {
      part: [{ carried_out_by: [{ notation: [{ '@language': 'en', '@value': 'Rembrandt van Rijn' }] }] }],
    },
  }, {
    imageUrl: 'https://iiif.micr.io/PJEZO/full/1024,/0/default.jpg',
  });

  assert.equal(record.objectId, 'SK-C-5');
  assert.equal(record.title, 'The Night Watch');
  assert.equal(record.artist, 'Rembrandt van Rijn');
  assert.equal(record.imageUrl, 'https://iiif.micr.io/PJEZO/full/1024,/0/default.jpg');
});

test('Rijksmuseum exporter uses current search pagination and resolves image provenance without an API key', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const value = String(url);
    calls.push(value);

    if (value.startsWith('https://data.rijksmuseum.nl/search/collection')) {
      if (value.includes('pageToken=next')) {
        return response({ orderedItems: [{ id: 'https://id.rijksmuseum.nl/900002' }] });
      }
      return response({
        orderedItems: [{ id: 'https://id.rijksmuseum.nl/900001' }],
        next: { id: 'https://data.rijksmuseum.nl/search/collection?type=painting&pageToken=next' },
      });
    }

    if (value.includes('900001?_profile=la-framed')) {
      return response({
        identified_by: [{ type: 'Identifier', content: 'SK-A-1', classified_as: [{ id: 'https://id.rijksmuseum.nl/22015218' }] }],
        produced_by: { part: [{ carried_out_by: [{ notation: [{ '@language': 'en', '@value': 'Artist One' }] }] }] },
        shows: [{ id: 'https://id.rijksmuseum.nl/800001' }],
      });
    }

    if (value.includes('800001?_profile=la-framed')) {
      return response({ digitally_shown_by: [{ id: 'https://id.rijksmuseum.nl/700001' }] });
    }

    if (value.includes('700001?_profile=la-framed')) {
      return response({ access_point: [{ id: 'https://iiif.micr.io/IMG1/full/max/0/default.jpg' }] });
    }

    if (value.includes('900002?_profile=la-framed')) {
      return response({
        identified_by: [{ type: 'Identifier', content: 'SK-A-2', classified_as: [{ id: 'https://id.rijksmuseum.nl/22015218' }] }],
        produced_by: { part: [{ carried_out_by: [{ notation: [{ '@language': 'en', '@value': 'Artist Two' }] }] }] },
        shows: [{ id: 'https://id.rijksmuseum.nl/800002' }],
      });
    }

    if (value.includes('800002?_profile=la-framed')) {
      return response({ digitally_shown_by: [{ id: 'https://id.rijksmuseum.nl/700002' }] });
    }

    if (value.includes('700002?_profile=la-framed')) {
      return response({ access_point: [{ id: 'https://iiif.micr.io/IMG2/full/max/0/default.jpg' }] });
    }

    throw new Error(`Unexpected URL: ${value}`);
  };

  const records = await createCatalogExporter({ fetchImpl }).exportRijksmuseum({ query: 'painting', limit: 2 });

  assert.deepEqual(records.map((record) => record.objectId), ['SK-A-1', 'SK-A-2']);
  assert.equal(calls.filter((url) => url.startsWith('https://data.rijksmuseum.nl/search/collection')).length, 2);
  assert.ok(calls.some((url) => url.includes('imageAvailable=true')));
});
