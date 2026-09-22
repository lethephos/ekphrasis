import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentifyPipeline } from '../../lib/api/identify.js';

function deps(overrides = {}) {
  return {
    validate: async () => ({}),
    hash: async () => 'hash',
    cache: { get: async () => null, set: async () => {} },
    normalize: async (bytes) => ({ bytes }),
    vision: { detect: async () => ({ signals: [{ type: 'title', value: 'Target' }] }) },
    museums: [{ search: async () => [{ institution: 'Museum', objectId: '1', title: 'Wrong', artist: 'Artist', artworkUrl: 'u', imageUrl: 'i' }] }],
    score: (query, candidate) => ({
      score: candidate.title === 'Target' ? 1 : 0.5,
      evidence: { title: candidate.title === 'Target' ? 'MATCH' : 'MISMATCH', artist: 'MATCH' },
      candidate,
    }),
    selectCanonical: (items) => items[0],
    gate: (item) => item.score >= 0.8 ? { status: 'match', confidence: 'high', useVisualFallback: false } : { status: 'no_match', confidence: 'low', useVisualFallback: true },
    visual: { resolve: async () => ({ similarity: 0.99, candidate: { institution: 'Visual Museum', objectId: '2', title: 'Wrong Visual', artist: 'Artist', artworkUrl: 'vu', imageUrl: 'vi' } }) },
    ...overrides,
  };
}

test('visual similarity cannot convert a metadata mismatch into a match', async () => {
  const result = await createIdentifyPipeline(deps()).identify(Buffer.from('x'));
  assert.equal(result.status, 'no_match');
});

test('visual fallback may select a visually matched candidate when metadata is unavailable', async () => {
  const result = await createIdentifyPipeline(deps({
    score: (query, candidate) => ({
      score: candidate.institution === 'Visual Museum' ? 0 : 0,
      evidence: { title: 'UNAVAILABLE', artist: 'UNAVAILABLE' },
      candidate,
    }),
    gate: (item) => ({ status: item.score >= 0.8 ? 'match' : 'no_match', confidence: item.score >= 0.8 ? 'high' : 'low', useVisualFallback: item.score < 0.8 }),
    visual: { resolve: async () => ({ similarity: 0.99, candidate: { institution: 'Visual Museum', objectId: '2', title: null, artist: null, artworkUrl: 'vu', imageUrl: 'vi' } }) },
  })).identify(Buffer.from('x'));
  assert.equal(result.status, 'match');
  assert.equal(result.source.institution, 'Visual Museum');
});
