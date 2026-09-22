import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCorpusRecord, buildCorpusManifest, validateCorpusManifest } from '../../lib/visual/corpus.js';

const record = {
  institution: 'The Metropolitan Museum of Art',
  objectId: '436535',
  title: 'Wheat Field with Cypresses',
  artist: 'Vincent van Gogh',
  year: '1889',
  medium: 'Oil on canvas',
  imageUrl: 'https://example.org/image.jpg',
  artworkUrl: 'https://example.org/artwork',
  license: { status: 'unknown', details: null },
};

test('corpus records require resolvable museum identity and source provenance', () => {
  assert.equal(validateCorpusRecord(record).objectId, '436535');
  assert.throws(() => validateCorpusRecord({ ...record, imageUrl: '' }), /INVALID_CORPUS_RECORD/);
});

test('corpus manifest records pinned model, collection version, dimensions, and source counts', () => {
  const manifest = buildCorpusManifest({
    collection: 'ekphrasis-v1',
    model: 'openai/clip-vit-base-patch32',
    dimensions: 512,
    records: [
      record,
      { ...record, institution: 'Rijksmuseum', objectId: 'r1' },
      { ...record, institution: 'Art Institute of Chicago', objectId: 'a1' },
      { ...record, institution: 'Smithsonian', objectId: 's1' },
    ],
  });
  assert.equal(manifest.collection, 'ekphrasis-v1');
  assert.equal(manifest.pointCount, 4);
  assert.deepEqual(manifest.sourceCounts, {
    'The Metropolitan Museum of Art': 1,
    Rijksmuseum: 1,
    'Art Institute of Chicago': 1,
    Smithsonian: 1,
  });
  assert.equal(validateCorpusManifest(manifest).dimensions, 512);
});

test('corpus manifest rejects duplicate museum/object identities', () => {
  assert.throws(() => buildCorpusManifest({
    collection: 'ekphrasis-v1',
    model: 'openai/clip-vit-base-patch32',
    dimensions: 512,
    records: [record, record],
  }), /DUPLICATE_CORPUS_IDENTITY/);
});
