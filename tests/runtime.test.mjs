import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../lib/runtime.js';

test('runtime composition wires the real image, Vision, museum, cache, limiter, and enrichment boundaries', () => {
  const runtime = createRuntime({
    env: {
      GOOGLE_VISION_API_KEY: 'vision',
      SMITHSONIAN_API_KEY: 'smithsonian',
      RIJKSMUSEUM_API_KEY: 'rijks',
    },
    fetchImpl: async () => { throw new Error('not called'); },
  });
  for (const key of ['validate', 'normalize', 'hash', 'cache', 'rateLimiter', 'vision', 'museums', 'enrich']) {
    assert.ok(runtime[key], key);
  }
  assert.equal(runtime.museums.length, 4);
});

test('runtime refuses to start without the required Vision credential', () => {
  assert.throws(() => createRuntime({ env: {} }), /VISION_CONFIG_MISSING/);
});


test('runtime wires local Transformers.js CLIP when Qdrant is configured', () => {
  const runtime = createRuntime({
    env: {
      GOOGLE_VISION_API_KEY: 'vision',
      QDRANT_URL: 'https://qdrant.example',
      QDRANT_API_KEY: 'qdrant',
      QDRANT_COLLECTION: 'ekphrasis-clip-current',
    },
    fetchImpl: async () => { throw new Error('not called'); },
    clipPipelineFactory: async () => async () => ({ data: new Float32Array([1, 0]), dims: [1, 2] }),
    clipImageLoader: async () => ({ kind: 'image' }),
  });
  assert.ok(runtime.visual);
});
