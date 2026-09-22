import test from 'node:test';
import assert from 'node:assert/strict';
import { createQdrantIndex } from '../../lib/visual/qdrant-index.js';

test('creates a versioned collection and upserts CLIP points', async () => {
  const calls = [];
  const index = createQdrantIndex({
    client: {
      async createCollection(name, config) { calls.push(['create', name, config]); },
      async upsert(name, points) { calls.push(['upsert', name, points]); },
    },
    collection: 'ekphrasis-clip',
    dimensions: 512,
  });

  await index.createVersion('2026-09-22');
  await index.upsert('2026-09-22', [{ id: 'The Met:1', vector: [1, 2], payload: { institution: 'The Met', objectId: '1' } }]);

  assert.deepEqual(calls, [
    ['create', 'ekphrasis-clip-2026-09-22', { vectors: { size: 512, distance: 'Cosine' } }],
    ['upsert', 'ekphrasis-clip-2026-09-22', [{ id: 'The Met:1', vector: [1, 2], payload: { institution: 'The Met', objectId: '1' } }]],
  ]);
});

test('rejects upsert into an unversioned collection name', async () => {
  const index = createQdrantIndex({ client: {}, collection: 'ekphrasis-clip', dimensions: 512 });
  await assert.rejects(() => index.upsert('latest', []), /INVALID_COLLECTION_VERSION/);
});
