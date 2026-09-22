import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentifyPipeline } from '../../lib/api/identify.js';

test('identify pipeline combines Vision title and artist signals into one scoring query', async () => {
  let receivedQuery;
  const pipeline = createIdentifyPipeline({
    validate: async () => ({ format: 'jpeg', byteLength: 1 }),
    hash: async () => 'abc123',
    cache: { get: async () => null, set: async () => {} },
    rateLimiter: { check: async () => ({ allowed: true, remaining: 9 }) },
    normalize: async (bytes) => ({ bytes }),
    vision: { detect: async () => ({ signals: [
      { value: 'Wheat Field with Cypresses', type: 'title' },
      { value: 'Vincent van Gogh', type: 'artist' },
    ] }) },
    museums: [{ search: async () => [{
      institution: 'The Met', objectId: '436535', title: 'Wheat Field with Cypresses',
      artist: 'Vincent van Gogh', year: '1889', medium: 'Oil on canvas',
      style: null, imageUrl: 'https://example.org/image.jpg',
      artworkUrl: 'https://example.org/object/436535', license: 'unknown'
    }] }],
    score: (query, candidate) => {
      receivedQuery = query;
      return { candidate, evidence: {
        artist_match: query.artist === candidate.artist ? 'MATCH' : 'UNAVAILABLE',
        title_match: query.title === candidate.title ? 'MATCH' : 'UNAVAILABLE',
        year_match: 'UNAVAILABLE', medium_match: 'UNAVAILABLE'
      }, score: 1 };
    },
    selectCanonical: (items) => items[0],
    gate: () => ({ status: 'match', confidence: 'high', useVisualFallback: false }),
  });
  const result = await pipeline.identify(new Uint8Array([1]), { clientKey: 'ip' });
  assert.equal(receivedQuery.title, 'Wheat Field with Cypresses');
  assert.equal(receivedQuery.artist, 'Vincent van Gogh');
  assert.equal(result.status, 'match');
});

test('identify pipeline treats individual museum failures as degraded, not total failure', async () => {
  const pipeline = createIdentifyPipeline({
    validate: async () => ({ format: 'jpeg', byteLength: 1 }),
    hash: async () => 'abc',
    cache: { get: async () => null, set: async () => {} },
    rateLimiter: { check: async () => ({ allowed: true, remaining: 9 }) },
    normalize: async (bytes) => ({ bytes }),
    vision: { detect: async () => ({ signals: [{ value: 'artist', type: 'artist' }] }) },
    museums: [
      { search: async () => { throw new Error('MUSEUM_TIMEOUT'); } },
      { search: async () => [{ institution: 'A', objectId: '1', title: 'Work', artist: 'artist', imageUrl: 'https://x', artworkUrl: 'https://x', license: 'unknown' }] },
    ],
    score: (query, candidate) => ({ candidate, evidence: { artist_match: 'MATCH' }, score: 1 }),
    selectCanonical: (items) => items[0],
    gate: () => ({ status: 'match', confidence: 'high', useVisualFallback: false }),
  });
  const result = await pipeline.identify(new Uint8Array([1]), { clientKey: 'ip' });
  assert.equal(result.status, 'match');
});


test('identify pipeline marks a match as degraded when a museum provider failed', async () => {
  const pipeline = createIdentifyPipeline({
    validate: async () => ({ format: 'jpeg', byteLength: 1 }), hash: async () => 'd',
    cache: { get: async () => null, set: async () => {} },
    rateLimiter: { check: async () => ({ allowed: true, remaining: 9 }) },
    normalize: async (bytes) => ({ bytes }), vision: { detect: async () => ({ signals: [{ value: 'artist', type: 'artist' }] }) },
    museums: [{ search: async () => { throw new Error('MUSEUM_TIMEOUT'); } }, { search: async () => [{ institution: 'A', objectId: '1', title: 'Work', artist: 'artist', imageUrl: 'https://x', artworkUrl: 'https://x', license: 'unknown' }] }],
    score: (q, c) => ({ candidate: c, evidence: { artist_match: 'MATCH' }, score: 1 }),
    selectCanonical: (items) => items[0], gate: () => ({ status: 'match', confidence: 'high', useVisualFallback: false }),
  });
  const result = await pipeline.identify(new Uint8Array([1]), { clientKey: 'ip' });
  assert.equal(result.diagnostics.degraded, true);
});
