import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestCorpusImage } from '../../lib/visual/image-ingest.js';

function makeResponse(bytes, contentType = 'image/jpeg') {
  return {
    ok: true,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

test('image ingest downloads museum source image, hashes bytes, and preserves provenance', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const result = await ingestCorpusImage({
    record: {
      institution: 'The Metropolitan Museum of Art',
      objectId: '436535',
      imageUrl: 'https://images.example/met/436535.jpg',
      artworkUrl: 'https://www.metmuseum.org/art/collection/search/436535',
    },
    fetchImpl: async (url) => {
      assert.equal(url, 'https://images.example/met/436535.jpg');
      return makeResponse(bytes);
    },
  });

  assert.equal(result.status, 'downloaded');
  assert.equal(result.sha256, '9f64a747e1b99c8c2f2e5d7a7f4a0a0e2f0f0d8d6f0a6f6f2d8c4f3f6b6c4e8');
  assert.equal(result.contentType, 'image/jpeg');
  assert.equal(result.sourceUrl, 'https://images.example/met/436535.jpg');
  assert.equal(result.institution, 'The Metropolitan Museum of Art');
  assert.equal(result.objectId, '436535');
});

test('image ingest rejects non-image source responses', async () => {
  const result = await ingestCorpusImage({
    record: { institution: 'Rijksmuseum', objectId: 'SK-A-1', imageUrl: 'https://example.test/not-image' },
    fetchImpl: async () => makeResponse(new Uint8Array([1, 2]), 'text/html'),
  });

  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, 'SOURCE_NOT_IMAGE');
});
