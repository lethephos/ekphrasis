import test from 'node:test';
import assert from 'node:assert/strict';
import { createQdrantClient, createQdrantAdminClient } from '../../lib/visual/qdrant.js';

test('Qdrant client is read-only and normalizes nearest-neighbor results', async () => {
  const client = createQdrantClient({
    search: async () => ({ result: [{ id: '436535', score: 0.93, payload: { institution: 'The Met', objectId: '436535' } }] }),
  });
  assert.deepEqual(await client.search(new ArrayBuffer(8)), [
    { id: '436535', score: 0.93, payload: { institution: 'The Met', objectId: '436535' } },
  ]);
});


test('Qdrant admin client uses the documented collection, point, count, and alias endpoints', async () => {
  const calls = [];
  const client = createQdrantAdminClient({
    endpoint: 'https://qdrant.example',
    apiKey: 'key',
    collection: 'ekphrasis-clip-current',
    fetchImpl: async (url, options) => {
      calls.push([url, options.method, options.body]);
      return { ok: true, json: async () => ({ result: { count: 4, config: { params: { vectors: { size: 512 } } } } }) };
    },
  });
  await client.createCollection('ekphrasis-clip-2026-09-22', { vectors: { size: 512, distance: 'Cosine' } });
  await client.upsert('ekphrasis-clip-2026-09-22', [{ id: 'x', vector: [1, 0], payload: {} }]);
  await client.count('ekphrasis-clip-2026-09-22');
  await client.getCollection('ekphrasis-clip-2026-09-22');
  await client.setAlias('ekphrasis-clip-current', 'ekphrasis-clip-2026-09-22');
  assert.equal(calls[0][0], 'https://qdrant.example/collections/ekphrasis-clip-2026-09-22');
  assert.equal(calls[0][1], 'PUT');
  assert.equal(calls[1][0], 'https://qdrant.example/collections/ekphrasis-clip-2026-09-22/points?wait=true');
  assert.equal(calls[1][1], 'PUT');
  assert.equal(calls[2][0], 'https://qdrant.example/collections/ekphrasis-clip-2026-09-22/points/count');
  assert.equal(calls[2][1], 'POST');
  assert.equal(calls[3][0], 'https://qdrant.example/collections/ekphrasis-clip-2026-09-22');
  assert.equal(calls[3][1], 'GET');
  assert.equal(calls[4][0], 'https://qdrant.example/collections/aliases');
  const aliasActions = JSON.parse(calls[4][2]).actions;
  assert.deepEqual(aliasActions, [{ create_alias: { alias_name: 'ekphrasis-clip-current', collection_name: 'ekphrasis-clip-2026-09-22' } }]);
});
