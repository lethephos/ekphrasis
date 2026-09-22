import test from 'node:test';
import assert from 'node:assert/strict';
import { readRequestBytes } from '../../lib/api/body.js';

function requestFrom(chunks) {
  return new Request('https://example.test/api/identify', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    duplex: 'half',
  });
}

test('request byte reader enforces the 10 MB limit while streaming', async () => {
  const bytes = await readRequestBytes(requestFrom([new Uint8Array([1, 2]), new Uint8Array([3])]), 3);
  assert.deepEqual([...bytes], [1, 2, 3]);
  await assert.rejects(() => readRequestBytes(requestFrom([new Uint8Array(3), new Uint8Array(1)]), 3), /UPLOAD_TOO_LARGE/);
});
