import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { withImageLifecycle } from '../../lib/image/lifecycle.js';

test('cleans the temporary resource after successful processing', async () => {
  let originalPath;
  const result = await withImageLifecycle({
    originalBytes: new Uint8Array([1, 2, 3]),
    process: async (resource) => {
      originalPath = resource.originalPath;
      await access(resource.originalPath);
      return 'ok';
    },
  });
  assert.equal(result, 'ok');
  await assert.rejects(access(originalPath));
});

test('cleans the temporary resource when processing throws', async () => {
  let originalPath;
  await assert.rejects(
    withImageLifecycle({
      originalBytes: new Uint8Array([1, 2, 3]),
      process: async (resource) => {
        originalPath = resource.originalPath;
        await access(resource.originalPath);
        throw new Error('processing failed');
      },
    }),
    /processing failed/,
  );
  await assert.rejects(access(originalPath));
});
