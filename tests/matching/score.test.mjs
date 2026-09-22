import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreCandidate, selectCanonical } from '../../lib/matching/score.js';

test('missing candidate fields are neutral rather than mismatches', () => {
  const scored = scoreCandidate(
    { artist: 'Vincent van Gogh', title: 'Wheat Field with Cypresses', year: null, medium: null },
    { artist: 'Vincent van Gogh', title: 'Wheat Field with Cypresses', year: '1889', medium: 'Oil on canvas' }
  );
  assert.equal(scored.evidence.artist_match, 'MATCH');
  assert.equal(scored.evidence.title_match, 'MATCH');
  assert.equal(scored.evidence.year_match, 'UNAVAILABLE');
  assert.equal(scored.evidence.medium_match, 'UNAVAILABLE');
  assert.equal(scored.score, 1);
});

test('explicit disagreement contributes mismatch evidence', () => {
  const scored = scoreCandidate(
    { artist: 'Pablo Picasso', title: 'Wheat Field with Cypresses', year: '1889', medium: 'Oil on canvas' },
    { artist: 'Vincent van Gogh', title: 'Wheat Field with Cypresses', year: '1889', medium: 'Oil on canvas' }
  );
  assert.equal(scored.evidence.artist_match, 'MISMATCH');
  assert.ok(scored.score < 1);
});

test('canonical selection is deterministic when scores tie', () => {
  const candidates = [
    { institution: 'Rijksmuseum', objectId: 'B', score: 0.9 },
    { institution: 'The Met', objectId: 'A', score: 0.9 },
  ];
  assert.equal(selectCanonical(candidates).objectId, 'A');
});
