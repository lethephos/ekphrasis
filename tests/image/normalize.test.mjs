import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImage } from '../../lib/image/normalize.js';

test('normalization maps decoder failures to unsupported input', async () => {
  await assert.rejects(() => normalizeImage(new Uint8Array([1, 2, 3])), /UNSUPPORTED_INPUT/);
});
