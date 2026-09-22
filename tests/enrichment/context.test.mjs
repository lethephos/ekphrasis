import test from 'node:test';
import assert from 'node:assert/strict';
import { createContextEnricher } from '../../lib/enrichment/context.js';

test('context enricher returns linked factual context and detail', async () => {
  const enricher = createContextEnricher({
    wikipedia: {
      lookup: async () => ({ title: 'Wheat Field with Cypresses', extract: 'A factual article summary.', url: 'https://en.wikipedia.org/wiki/Wheat_Field_with_Cypresses' }),
    },
    wikidata: {
      lookup: async () => ({ detail: 'Vincent van Gogh painted the work in 1889.' }),
    },
  });
  assert.deepEqual(await enricher.enrich({ title: 'Wheat Field with Cypresses', artist: 'Vincent van Gogh' }), {
    context: 'A factual article summary.',
    detail: 'Vincent van Gogh painted the work in 1889.',
  });
});

test('context enricher returns null enrichment when linked sources are unavailable', async () => {
  const enricher = createContextEnricher({
    wikipedia: { lookup: async () => null },
    wikidata: { lookup: async () => { throw new Error('timeout'); } },
  });
  assert.deepEqual(await enricher.enrich({ title: 'Unknown', artist: 'Unknown' }), { context: null, detail: null });
});


test('Wikipedia client resolves an exact article summary by title', async () => {
  const { createWikipediaClient } = await import('../../lib/enrichment/wikipedia.js');
  const client = createWikipediaClient({
    fetchImpl: async () => ({ ok: true, json: async () => ({ title: 'Wheat Field', extract: 'Summary', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Wheat_Field' } } }) }),
  });
  assert.deepEqual(await client.lookup({ title: 'Wheat Field' }), { title: 'Wheat Field', extract: 'Summary', url: 'https://en.wikipedia.org/wiki/Wheat_Field' });
});


test('Wikidata client returns only explicitly supplied detail evidence', async () => {
  const { createWikidataClient } = await import('../../lib/enrichment/wikidata.js');
  const client = createWikidataClient({
    lookup: async () => ({ detail: 'Explicit fact.' }),
  });
  assert.deepEqual(await client.lookup({ title: 'Work', artist: 'Artist' }), { detail: 'Explicit fact.' });
});
