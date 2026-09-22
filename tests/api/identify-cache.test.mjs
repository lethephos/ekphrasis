import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentifyPipeline } from '../../lib/api/identify.js';

test('cache failures do not turn a valid identification into API_UNAVAILABLE', async () => {
  const pipeline = createIdentifyPipeline({
    validate: async () => ({ format: 'jpeg', byteLength: 1 }), hash: async () => 'h',
    cache: { get: async () => { throw new Error('REDIS_DOWN'); }, set: async () => { throw new Error('REDIS_DOWN'); } },
    rateLimiter: { check: async () => ({ allowed: true, remaining: 9 }) },
    normalize: async (bytes) => ({ bytes }), vision: { detect: async () => ({ signals: [{ value: 'artist', type: 'artist' }] }) },
    museums: [{ search: async () => [{ institution: 'A', objectId: '1', title: 'Work', artist: 'artist', imageUrl: 'https://x', artworkUrl: 'https://x', license: 'unknown' }] }],
    score: (q, c) => ({ candidate: c, evidence: { artist_match: 'MATCH' }, score: 1 }), selectCanonical: (x) => x[0],
    gate: () => ({ status: 'match', confidence: 'high' }), enrich: async () => ({ style: null, styleSource: null }),
  });
  const result = await pipeline.identify(new Uint8Array([1]), { clientKey: 'ip' });
  assert.equal(result.status, 'match');
});
