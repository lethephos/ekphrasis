import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVisualIndex } from '../../lib/visual/index-builder.js';

test('visual index builder downloads artifacts, embeds them, and publishes a versioned collection', async () => {
  const calls = [];
  const result = await buildVisualIndex({
    records: [
      { institution: 'The Met', objectId: '1', imageUrl: 'https://img/1', artworkUrl: 'https://art/1', title: 'A', artist: 'B', license: { status: 'unknown' } },
    ],
    version: '2026-09-22',
    collection: 'ekphrasis-clip',
    model: 'test-model',
    dimensions: 2,
    download: async () => [{ institution: 'The Met', objectId: '1', sha256: 'hash', bytes: new Uint8Array([1]), contentType: 'image/jpeg', sourceUrl: 'https://img/1', artworkUrl: 'https://art/1' }],
    embed: async () => [1, 0],
    index: {
      createVersion: async (version) => { calls.push(['create', version]); },
      upsert: async (version, points) => { calls.push(['upsert', version, points]); },
    },
  });
  assert.equal(result.collection, 'ekphrasis-clip-2026-09-22');
  assert.equal(result.pointCount, 1);
  assert.deepEqual(calls[0], ['create', '2026-09-22']);
  assert.equal(calls[1][2][0].payload.objectId, '1');
});
