import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArtifactManifest } from '../../lib/visual/corpus-artifact.js';

test('artifact manifest records model, collection, corpus count, and provenance', () => {
  const manifest = buildArtifactManifest({
    collection: 'ekphrasis-v1',
    model: 'openai/clip-vit-base-patch32',
    dimensions: 512,
    artifacts: [
      {
        institution: 'The Metropolitan Museum of Art',
        objectId: '436535',
        sha256: 'abc',
        sourceUrl: 'https://images.example/met/436535.jpg',
        artworkUrl: 'https://www.metmuseum.org/art/collection/search/436535',
        contentType: 'image/jpeg',
      },
    ],
  });

  assert.equal(manifest.collection, 'ekphrasis-v1');
  assert.equal(manifest.model, 'openai/clip-vit-base-patch32');
  assert.equal(manifest.dimensions, 512);
  assert.equal(manifest.pointCount, 1);
  assert.deepEqual(manifest.sourceCounts, { 'The Metropolitan Museum of Art': 1 });
  assert.equal(manifest.artifacts[0].sha256, 'abc');
  assert.deepEqual(Object.keys(manifest).sort(), ['artifacts', 'collection', 'dimensions', 'model', 'pointCount', 'sourceCounts']);
});
