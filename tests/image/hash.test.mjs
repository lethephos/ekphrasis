import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256 } from '../../lib/image/hash.js';

test('hashes the original upload bytes deterministically', () => {
  assert.equal(
    sha256(new TextEncoder().encode('hello')),
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  );
});
