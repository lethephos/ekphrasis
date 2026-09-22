import test from 'node:test';
import assert from 'node:assert/strict';
import { readRequestBytes } from '../../lib/api/body.js';

test('request byte reader enforces the upload ceiling without buffering the full stream', async () => {
  const chunks = [new Uint8Array([1,2,3]), new Uint8Array([4,5,6])];
  let reads = 0;
  const request = { body: { getReader() {
    return { async read() { if (reads === chunks.length) return { done: true }; return { done: false, value: chunks[reads++] }; }, releaseLock() {} };
  }}};
  assert.deepEqual([...await readRequestBytes(request, 6)], [1,2,3,4,5,6]);
});

test('request byte reader cancels a stream that crosses the upload ceiling', async () => {
  let cancelled = false;
  const request = { body: { getReader() {
    return { async read() { return { done: false, value: new Uint8Array(7) }; }, async cancel() { cancelled = true; }, releaseLock() {} };
  }}};
  await assert.rejects(() => readRequestBytes(request, 6), /UPLOAD_TOO_LARGE/);
  assert.equal(cancelled, true);
});


test('health endpoint contract is a no-store JSON response', async () => {
  const { GET } = await import('../../app/api/health/route.ts');
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok', service: 'ekphrasis', version: 'unknown' });
});
