import test from 'node:test';
import assert from 'node:assert/strict';
import { validateIndexManifest, buildQdrantFilter } from '../../lib/visual/schema.js';

test('index manifest validates pinned model, dimensions, collection, and source identity', () => {
  const manifest = {
    collection: 'ekphrasis-v1',
    model: 'openai/clip-vit-base-patch32',
    dimensions: 512,
    sources: ['The Metropolitan Museum of Art', 'Rijksmuseum', 'Art Institute of Chicago', 'Smithsonian'],
    pointCount: 4,
  };
  assert.equal(validateIndexManifest(manifest).collection, 'ekphrasis-v1');
});

test('Qdrant filter targets museum/object identity only', () => {
  assert.deepEqual(buildQdrantFilter('The Met', '436535'), {
    must: [
      { key: 'institution', match: { value: 'The Met' } },
      { key: 'objectId', match: { value: '436535' } },
    ],
  });
});
