import test from 'node:test';
import assert from 'node:assert/strict';
import { decideMatch, createVisualFallback } from '../../lib/matching/gate.js';

test('high metadata score produces a high-confidence match without visual fallback', () => {
  const decision = decideMatch({ score: 1, evidence: { artist_match: 'MATCH', title_match: 'MATCH', year_match: 'UNAVAILABLE', medium_match: 'UNAVAILABLE' } });
  assert.deepEqual(decision, { status: 'match', confidence: 'high', useVisualFallback: false });
});

test('ambiguous or low metadata score requests visual fallback', () => {
  const decision = decideMatch({ score: 0.5, evidence: { artist_match: 'MATCH', title_match: 'MISMATCH', year_match: 'MATCH', medium_match: 'UNAVAILABLE' } });
  assert.equal(decision.useVisualFallback, true);
});

test('visual fallback is isolated behind a provider boundary', async () => {
  const fallback = createVisualFallback({ search: async () => [{ objectId: 'q1', similarity: 0.93 }] });
  assert.deepEqual(await fallback.search(new Uint8Array([1, 2])), [{ objectId: 'q1', similarity: 0.93 }]);
});
