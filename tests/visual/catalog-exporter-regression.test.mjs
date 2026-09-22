import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogExporter } from '../../lib/visual/catalog-exporter.js';

function response(body) {
  return { ok: true, json: async () => body };
}

test('AIC exporter follows pagination until the requested record limit', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    const page = Number(new URL(url).searchParams.get('page'));
    if (page === 1) {
      return response({
        data: [{ id: 1, title: 'A', artist_title: 'Artist A', image_id: 'a' }],
        pagination: { current_page: 1, total_pages: 3 },
        config: { iiif_url: 'https://iiif.example' },
      });
    }
    if (page === 2) {
      return response({
        data: [{ id: 2, title: 'B', artist_title: 'Artist B', image_id: 'b' }],
        pagination: { current_page: 2, total_pages: 3 },
        config: { iiif_url: 'https://iiif.example' },
      });
    }
    return response({
      data: [{ id: 3, title: 'C', artist_title: 'Artist C', image_id: 'c' }],
      pagination: { current_page: 3, total_pages: 3 },
      config: { iiif_url: 'https://iiif.example' },
    });
  };

  const records = await createCatalogExporter({ fetchImpl }).exportAIC({ page: 1, limit: 2 });

  assert.deepEqual(records.map((record) => record.objectId), ['1', '2']);
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1]).searchParams.get('page'), '2');
});

test('AIC exporter does not fetch beyond the requested limit when a page contains extra records', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({
      data: [
        { id: 1, title: 'A', artist_title: 'Artist A', image_id: 'a' },
        { id: 2, title: 'B', artist_title: 'Artist B', image_id: 'b' },
        { id: 3, title: 'C', artist_title: 'Artist C', image_id: 'c' },
      ],
      pagination: { current_page: 1, total_pages: 4 },
      config: { iiif_url: 'https://iiif.example' },
    });
  };

  const records = await createCatalogExporter({ fetchImpl }).exportAIC({ limit: 2 });

  assert.deepEqual(records.map((record) => record.objectId), ['1', '2']);
  assert.equal(calls, 1);
});
