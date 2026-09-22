import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentifyPipeline } from '../../lib/api/identify.js';

test('identify pipeline returns a sourced match and preserves provenance', async () => {
  const pipeline = createIdentifyPipeline({
    validate: async () => ({ format: 'jpeg', size: 10 }),
    hash: async () => 'abc123',
    cache: { get: async () => null, set: async () => {} },
    rateLimiter: { check: async () => ({ allowed: true, remaining: 9 }) },
    vision: { detect: async () => ({ queries: ['Wheat Field with Cypresses'] }) },
    museums: [{ search: async () => [{
      institution: 'The Met', objectId: '436535', title: 'Wheat Field with Cypresses',
      artist: 'Vincent van Gogh', year: '1889', medium: 'Oil on canvas',
      style: null, imageUrl: 'https://example.org/image.jpg',
      artworkUrl: 'https://example.org/object/436535', license: 'unknown'
    }] }],
    score: (query, candidate) => ({ candidate, evidence: {
      artist_match: 'MATCH', title_match: 'MATCH', year_match: 'MATCH', medium_match: 'MATCH'
    }, score: 1 }),
    gate: () => ({ status: 'match', confidence: 'high', useVisualFallback: false }),
    enrich: async () => ({ style: 'Post-Impressionism', styleSource: 'wikipedia' }),
  });
  const result = await pipeline.identify(new Uint8Array([1]), { clientKey: 'ip' });
  assert.equal(result.status, 'match');
  assert.equal(result.artwork.style, 'Post-Impressionism');
  assert.equal(result.artwork.styleSource, 'wikipedia');
  assert.equal(result.source.objectId, '436535');
});

test('identify pipeline rejects rate-limited requests before expensive work', async () => {
  let validated = false;
  const pipeline = createIdentifyPipeline({
    validate: async () => { validated = true; },
    rateLimiter: { check: async () => ({ allowed: false, remaining: 0 }) },
  });
  await assert.rejects(pipeline.identify(new Uint8Array([1]), { clientKey: 'ip' }), /RATE_LIMITED/);
  assert.equal(validated, false);
});
