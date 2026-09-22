import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichStyle } from '../../lib/enrichment/style.js';

test('museum-supplied style wins and does not call fallback sources', async () => {
  let calls = 0;
  const result = await enrichStyle(
    { title: 'Wheat Field with Cypresses', artist: 'Vincent van Gogh', style: 'Post-Impressionism', styleSource: 'museum' },
    { lookup: async () => { calls += 1; return null; } }
  );
  assert.deepEqual(result, { style: 'Post-Impressionism', styleSource: 'museum' });
  assert.equal(calls, 0);
});

test('Wikipedia/Wikidata supplies style only from explicit classification', async () => {
  const result = await enrichStyle(
    { title: 'Wheat Field with Cypresses', artist: 'Vincent van Gogh', style: null },
    { lookup: async () => ({ style: 'Post-Impressionism', source: 'wikipedia' }) }
  );
  assert.deepEqual(result, { style: 'Post-Impressionism', styleSource: 'wikipedia' });
});

test('Wikidata supplies style only from explicit classification', async () => {
  const result = await enrichStyle(
    { title: 'Work', artist: 'Artist', style: null },
    { lookup: async () => ({ style: 'Impressionism', source: 'wikidata' }) }
  );
  assert.deepEqual(result, { style: 'Impressionism', styleSource: 'wikidata' });
});

test('unclassified fallback stays null', async () => {
  const result = await enrichStyle(
    { title: 'Unknown work', artist: 'Unknown artist', style: null },
    { lookup: async () => ({ description: 'A painting' }) }
  );
  assert.deepEqual(result, { style: null, styleSource: null });
});

test('fallback errors do not mutate identity', async () => {
  const result = await enrichStyle(
    { title: 'Work', artist: 'Artist', style: null },
    { lookup: async () => { throw new Error('down'); } }
  );
  assert.deepEqual(result, { style: null, styleSource: null });
});
