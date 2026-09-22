import test from 'node:test';
import assert from 'node:assert/strict';
import { createClipEmbedder } from '../../lib/visual/clip-adapter.js';

test('CLIP adapter converts image bytes into a normalized embedding', async () => {
  const embedder = createClipEmbedder({
    model: 'Xenova/clip-vit-base-patch32',
    pipelineFactory: async () => async () => ({ data: new Float32Array([3, 4]) }),
    imageLoader: async (bytes) => {
      assert.deepEqual([...bytes], [1, 2, 3]);
      return { width: 1, height: 1, channels: 3 };
    },
  });

  assert.deepEqual(await embedder(new Uint8Array([1, 2, 3])), [0.6, 0.8]);
});

test('CLIP adapter rejects a non-2D feature tensor', async () => {
  const embedder = createClipEmbedder({
    model: 'Xenova/clip-vit-base-patch32',
    pipelineFactory: async () => async () => ({ data: new Float32Array([1, 2]), dims: [1, 2, 3] }),
    imageLoader: async () => ({ width: 1, height: 1, channels: 3 }),
  });

  await assert.rejects(() => embedder(new Uint8Array([1])), /INVALID_CLIP_OUTPUT/);
});


test('production CLIP embedder wires Transformers.js image feature extraction', async () => {
  const calls = [];
  const embedder = createProductionClipEmbedder({
    model: 'test/clip',
    pipelineFactory: async (task, model) => {
      calls.push([task, model]);
      return async (image) => {
        assert.equal(image.kind, 'raw-image');
        return { data: new Float32Array([3, 4]), dims: [1, 2] };
      };
    },
    imageLoader: async (bytes) => {
      assert.deepEqual([...bytes], [9, 8]);
      return { kind: 'raw-image' };
    },
  });
  assert.deepEqual(await embedder(new Uint8Array([9, 8])), [0.6, 0.8]);
  assert.deepEqual(calls, [['image-feature-extraction', 'test/clip']]);
});
