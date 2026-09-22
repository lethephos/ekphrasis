import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResultViewModel } from '../../lib/ui/result-view-model.js';

test('result view model always exposes core artwork metadata and optional style/reading', () => {
  const vm = buildResultViewModel({
    status: 'match',
    confidence: 'high',
    artwork: { title: 'Work', artist: 'Artist', year: 1889, medium: 'Oil', style: 'Post-Impressionism', styleSource: 'wikipedia', museum: 'The Met' },
    source: { institution: 'The Met', objectId: '1', artworkUrl: 'https://museum/object/1', imageUrl: 'https://museum/image/1', license: { status: 'verified' } },
    related_reading: [{ title: 'Context', url: 'https://example.org/context' }],
  });
  assert.equal(vm.title, 'Work');
  assert.deepEqual(vm.metadata, { artist: 'Artist', year: 1889, medium: 'Oil', style: 'Post-Impressionism' });
  assert.equal(vm.source.imageUrl, 'https://museum/image/1');
  assert.equal(vm.relatedReading.length, 1);
});

test('result view model hides empty related reading and preserves no-match state', () => {
  const vm = buildResultViewModel({ status: 'no_match', confidence: 'low', diagnostics: { degraded: false } });
  assert.equal(vm.status, 'no_match');
  assert.deepEqual(vm.relatedReading, []);
});
