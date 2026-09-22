import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisualResolver } from '../../lib/visual/fallback.js';

test('visual resolver selects the highest-similarity hit, not the first returned hit', async () => {
  const resolver = createVisualResolver({
    embed: async () => [1, 0],
    search: async () => [
      { id: 'low', score: 0.81, payload: { institution: 'A', objectId: '1' } },
      { id: 'high', score: 0.93, payload: { institution: 'B', objectId: '2' } },
      { id: 'mid', score: 0.88, payload: { institution: 'C', objectId: '3' } },
    ],
  });

  const result = await resolver.resolve(Buffer.from('x'), { useVisualFallback: true });

  assert.equal(result.similarity, 0.93);
  assert.equal(result.candidate.institution, 'B');
});

test('visual resolver returns no candidate below the similarity threshold', async () => {
  const resolver = createVisualResolver({
    embed: async () => [1, 0],
    search: async () => [
      { id: 'near', score: 0.7499, payload: { institution: 'A', objectId: '1' } },
    ],
  });

  const result = await resolver.resolve(Buffer.from('x'), { useVisualFallback: true });

  assert.equal(result.candidate, null);
  assert.equal(result.similarity, 0.7499);
});

test('visual resolver breaks equal-score ties deterministically by museum identity', async () => {
  const resolver = createVisualResolver({
    embed: async () => [1, 0],
    search: async () => [
      { id: 'z', score: 0.9, payload: { institution: 'Zeta', objectId: '2' } },
      { id: 'a', score: 0.9, payload: { institution: 'Alpha', objectId: '9' } },
    ],
  });

  const result = await resolver.resolve(Buffer.from('x'), { useVisualFallback: true });

  assert.equal(result.candidate.institution, 'Alpha');
  assert.equal(result.candidate.objectId, '9');
});
