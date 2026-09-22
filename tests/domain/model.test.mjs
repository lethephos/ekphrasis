import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIdentificationResult } from '../../lib/domain/model.js';

test('buildIdentificationResult accepts a sourced style value', () => {
  const result = buildIdentificationResult({
    status: 'match',
    confidence: 'high',
    artwork: {
      title: 'Wheat Field with Cypresses',
      artist: 'Vincent van Gogh',
      year: '1889',
      medium: 'Oil on canvas',
      style: 'Post-Impressionism',
      styleSource: 'wikipedia',
      museum: 'The Metropolitan Museum of Art',
    },
    source: {
      institution: 'The Metropolitan Museum of Art',
      objectId: '436535',
      artworkUrl: 'https://www.metmuseum.org/art/collection/search/436535',
      imageUrl: 'https://images.metmuseum.org/example.jpg',
      license: { status: 'unknown', details: null },
    },
  });

  assert.equal(result.artwork.style, 'Post-Impressionism');
  assert.equal(result.artwork.year, '1889');
  assert.equal(result.artwork.styleSource, 'wikipedia');
});

test('buildIdentificationResult rejects style without a valid style source', () => {
  assert.throws(() => buildIdentificationResult({
    status: 'match',
    confidence: 'high',
    artwork: {
      title: 'Wheat Field with Cypresses',
      artist: 'Vincent van Gogh',
      year: '1889',
      medium: 'Oil on canvas',
      style: 'Post-Impressionism',
      styleSource: 'inferred',
      museum: 'The Metropolitan Museum of Art',
    },
    source: {
      institution: 'The Metropolitan Museum of Art',
      objectId: '436535',
      artworkUrl: 'https://www.metmuseum.org/art/collection/search/436535',
      imageUrl: 'https://images.metmuseum.org/example.jpg',
      license: { status: 'unknown', details: null },
    },
  }), /styleSource/);
});
