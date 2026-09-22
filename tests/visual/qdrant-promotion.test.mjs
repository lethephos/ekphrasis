import test from 'node:test';
import assert from 'node:assert/strict';
import { createQdrantPromotion } from '../../lib/visual/qdrant-promotion.js';

const valid = {
  collection: 'ekphrasis-clip-2026-09-22',
  model: 'Xenova/clip-vit-base-patch32',
  dimensions: 512,
  pointCount: 4,
  sourceCounts: { 'The Met': 1, Rijksmuseum: 1, AIC: 1, Smithsonian: 1 },
};

test('promotes only a collection matching the manifest contract', async () => {
  const calls = [];
  const promotion = createQdrantPromotion({
    client: {
      async count(collection) { calls.push(['count', collection]); return { count: 4 }; },
      async getCollection(collection) { calls.push(['get', collection]); return { config: { params: { vectors: { size: 512 } } } }; },
      async switchAlias(alias, collection) { calls.push(['alias', alias, collection]); },
    },
    requiredSources: ['The Met', 'Rijksmuseum', 'AIC', 'Smithsonian'],
    alias: 'ekphrasis-clip-current',
  });

  await promotion.promote(valid);

  assert.deepEqual(calls, [
    ['count', valid.collection],
    ['get', valid.collection],
    ['alias', 'ekphrasis-clip-current', valid.collection],
  ]);
});

test('rejects promotion when a required museum source is missing', async () => {
  const promotion = createQdrantPromotion({
    client: {},
    requiredSources: ['The Met', 'Rijksmuseum', 'AIC', 'Smithsonian'],
    alias: 'ekphrasis-clip-current',
  });

  await assert.rejects(
    () => promotion.promote({ ...valid, sourceCounts: { 'The Met': 1, Rijksmuseum: 1, AIC: 1 } }),
    /SOURCE_COVERAGE_MISMATCH/,
  );
});

test('rejects promotion when stored vector dimensions differ', async () => {
  const promotion = createQdrantPromotion({
    client: {
      async count() { return { count: 4 }; },
      async getCollection() { return { config: { params: { vectors: { size: 768 } } } }; },
    },
    requiredSources: ['The Met', 'Rijksmuseum', 'AIC', 'Smithsonian'],
    alias: 'ekphrasis-clip-current',
  });

  await assert.rejects(() => promotion.promote(valid), /DIMENSION_MISMATCH/);
});


test('promotes by atomically switching an existing alias', async () => {
  const calls = [];
  const promotion = createQdrantPromotion({
    client: {
      async count() { return { count: 4 }; },
      async getCollection() { return { config: { params: { vectors: { size: 512 } } } }; },
      async switchAlias(alias, collection) { calls.push(['alias', alias, collection]); },
    },
    requiredSources: ['The Met', 'Rijksmuseum', 'AIC', 'Smithsonian'],
    alias: 'ekphrasis-clip-current',
  });
  await promotion.promote(valid);
  assert.deepEqual(calls, [['alias', 'ekphrasis-clip-current', valid.collection]]);
});
