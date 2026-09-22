import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWebDetection, createVisionClient } from '../../lib/vision/web-detection.js';

test('normalizes web detection pages and entities into museum search candidates', () => {
  const result = normalizeWebDetection({
    webDetection: {
      webEntities: [{ entityId: 'e1', description: 'Vincent van Gogh' }],
      pagesWithMatchingImages: [
        { url: 'https://example.org/wheat-field', pageTitle: 'Wheat Field with Cypresses' },
      ],
      fullMatchingImages: [{ url: 'https://example.org/image.jpg' }],
    },
  });
  assert.deepEqual(result, {
    queries: ['Wheat Field with Cypresses', 'Vincent van Gogh'],
    references: [{ url: 'https://example.org/wheat-field', title: 'Wheat Field with Cypresses' }],
  });
});

test('returns an empty candidate set when Vision has no useful evidence', () => {
  assert.deepEqual(normalizeWebDetection({ webDetection: {} }), { queries: [], references: [] });
});

test('classifies malformed Vision responses', () => {
  assert.throws(() => normalizeWebDetection({ nope: true }), /VISION_MALFORMED_RESPONSE/);
});

test('uses the fixed 5 second timeout and hides provider errors', async () => {
  let seenTimeout;
  const client = createVisionClient({
    request: async ({ signal }) => {
      seenTimeout = signal;
      throw new Error('provider exploded');
    },
    timeoutMs: 5000,
  });
  await assert.rejects(client.detect(new Uint8Array([1])), /VISION_UNAVAILABLE/);
  assert.equal(seenTimeout.aborted, false);
});
