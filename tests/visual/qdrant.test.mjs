import test from 'node:test';
import assert from 'node:assert/strict';
import { createQdrantClient } from '../../lib/visual/qdrant.js';

test('Qdrant client is read-only and normalizes nearest-neighbor results', async () => {
  const client = createQdrantClient({
    search: async () => ({ result: [{ id: '436535', score: 0.93, payload: { institution: 'The Met', objectId: '436535' } }] }),
  });
  assert.deepEqual(await client.search(new ArrayBuffer(8)), [
    { id: '436535', score: 0.93, payload: { institution: 'The Met', objectId: '436535' } },
  ]);
});
