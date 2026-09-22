import test from 'node:test';
import assert from 'node:assert/strict';
import { withImageLifecycle } from '../../lib/image/lifecycle.js';

test('cleans the temporary resource after successful processing', async () => {
  let cleaned = false;
  const result = await withImageLifecycle({
    originalBytes: new Uint8Array([1, 2, 3]),
    process: async ({ cleanup }) => {
      const value = await cleanup(() => { cleaned = true; });
      return value ?? 'ok';
    },
  });

  assert.equal(result, 'ok');
  assert.equal(cleaned, true);
});

test('cleans the temporary resource when processing throws', async () => {
  let cleaned = false;
  await assert.rejects(
    withImageLifecycle({
      originalBytes: new Uint8Array([1, 2, 3]),
      process: async ({ cleanup }) => {
        await cleanup(() => { cleaned = true; });
        throw new Error('processing failed');
      },
    }),
    /processing failed/,
  );
  assert.equal(cleaned, true);
});
