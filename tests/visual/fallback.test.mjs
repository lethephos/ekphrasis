import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisualResolver } from '../../lib/visual/fallback.js';

test('visual resolver returns a corpus candidate when metadata gate requests fallback', async () => {
  const resolver = createVisualResolver({
    embed: async () => [0.1, 0.2],
    search: async () => [{ id: 'p1', score: 0.91, payload: { institution: 'The Met', objectId: '436535', title: 'Wheat Field with Cypresses', artist: 'Vincent van Gogh' } }],
  });
  const result = await resolver.resolve(new Uint8Array([1, 2]), { useVisualFallback: true });
  assert.equal(result.candidate.objectId, '436535');
  assert.equal(result.similarity, 0.91);
});

test('visual resolver does not run when metadata gate is sufficient', async () => {
  let calls = 0;
  const resolver = createVisualResolver({
    embed: async () => { calls += 1; return [0.1]; },
    search: async () => { calls += 1; return []; },
  });
  const result = await resolver.resolve(new Uint8Array([1]), { useVisualFallback: false });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test('visual resolver treats visual provider failure as degraded, not an identity', async () => {
  const resolver = createVisualResolver({
    embed: async () => { throw new Error('CLIP_UNAVAILABLE'); },
    search: async () => [],
  });
  const result = await resolver.resolve(new Uint8Array([1]), { useVisualFallback: true });
  assert.deepEqual(result, { candidate: null, similarity: null, degraded: true });
});
