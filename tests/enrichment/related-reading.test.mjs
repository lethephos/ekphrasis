import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRelatedReading } from '../../lib/enrichment/related-reading.js';

test('related reading keeps first qualifying external links in article order and caps at three', () => {
  const links = extractRelatedReading({
    externalLinks: [
      { title: 'First', url: 'https://www.metmuseum.org/a' },
      { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/X' },
      { title: 'Second', url: 'https://www.nationalgallery.org.uk/a' },
      { title: 'Third', url: 'https://www.moma.org/a' },
      { title: 'Fourth', url: 'https://www.example.org/a' },
    ],
  });
  assert.deepEqual(links, [
    { title: 'First', url: 'https://www.metmuseum.org/a' },
    { title: 'Second', url: 'https://www.nationalgallery.org.uk/a' },
    { title: 'Third', url: 'https://www.moma.org/a' },
  ]);
});

test('related reading returns an empty array when no qualifying links exist', () => {
  assert.deepEqual(extractRelatedReading({ externalLinks: [{ title: 'X', url: 'https://en.wikipedia.org/wiki/X' }] }), []);
});
