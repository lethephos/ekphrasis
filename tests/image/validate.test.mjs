import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_UPLOAD_BYTES, validateImageBytes } from '../../lib/image/validate.js';

const jpeg = Uint8Array.from([0xff,0xd8,0xff,0xdb,0x00,0x04,0x00,0x00]);
const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
const text = new TextEncoder().encode('not an image');

test('accepts supported image signatures at the 10 MB boundary', () => {
  assert.equal(MAX_UPLOAD_BYTES, 10 * 1024 * 1024);
  assert.equal(validateImageBytes(jpeg, { declaredMime: 'text/plain', fileName: 'x.jpg' }).format, 'jpeg');
  assert.equal(validateImageBytes(png, { declaredMime: 'application/octet-stream', fileName: 'x.bin' }).format, 'png');
});

test('rejects bytes over the 10 MB baseline regardless of extension', () => {
  const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1);
  oversized.set(jpeg);
  assert.throws(() => validateImageBytes(oversized, { declaredMime: 'image/jpeg', fileName: 'x.jpg' }), /UPLOAD_TOO_LARGE/);
});

test('rejects unsupported content even when the filename says image', () => {
  assert.throws(() => validateImageBytes(text, { declaredMime: 'image/jpeg', fileName: 'x.jpg' }), /UNSUPPORTED_INPUT/);
});
