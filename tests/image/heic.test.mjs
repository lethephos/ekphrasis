import test from 'node:test';
import assert from 'node:assert/strict';
import { detectImageFormat } from '../../lib/image/heic.js';

test('recognizes HEIC family brands from the file signature', () => {
  const bytes = new Uint8Array(16);
  bytes.set(new TextEncoder().encode('ftyp'), 4);
  bytes.set(new TextEncoder().encode('heic'), 8);
  assert.equal(detectImageFormat(bytes), 'heic');
});

test('does not classify an unrelated ISO base media file as HEIC', () => {
  const bytes = new Uint8Array(16);
  bytes.set(new TextEncoder().encode('ftyp'), 4);
  bytes.set(new TextEncoder().encode('isom'), 8);
  assert.equal(detectImageFormat(bytes), null);
});
