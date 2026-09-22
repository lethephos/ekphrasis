import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMuseumCandidate, createMuseumAdapter } from '../../lib/museums/adapter.js';

test('normalizes museum candidates without turning missing fields into mismatches', () => {
  const candidate = normalizeMuseumCandidate({
    institution: 'The Met',
    objectId: '436535',
    title: 'Wheat Field with Cypresses',
    artist: 'Vincent van Gogh',
    year: undefined,
    medium: 'Oil on canvas',
    style: undefined,
    imageUrl: 'https://example.org/image.jpg',
    artworkUrl: 'https://example.org/object/436535',
    license: 'unknown',
  });
  assert.equal(candidate.year, null);
  assert.equal(candidate.style, null);
  assert.equal(candidate.institution, 'The Met');
});

test('adapter classifies provider failures and preserves a neutral empty result', async () => {
  const adapter = createMuseumAdapter({
    search: async () => { throw new Error('upstream'); },
    timeoutMs: 4000,
  });
  await assert.rejects(adapter.search('van Gogh'), /MUSEUM_UNAVAILABLE/);
});

test('adapter timeout is explicit', async () => {
  const adapter = createMuseumAdapter({
    search: ({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }),
    timeoutMs: 1,
  });
  await assert.rejects(adapter.search('slow'), /MUSEUM_TIMEOUT/);
});
