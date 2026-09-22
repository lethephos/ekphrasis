import test from 'node:test';
import assert from 'node:assert/strict';
import { createCachePolicy } from '../../lib/cache/policy.js';

test('provider-unavailable errors are never cached', () => {
  const policy = createCachePolicy();
  assert.equal(policy.shouldCache({ status: 'error', code: 'API_UNAVAILABLE' }), false);
});

test('degraded matches use degraded TTL', () => {
  const policy = createCachePolicy({ normalTtlSeconds: 3600, degradedTtlSeconds: 300 });
  assert.equal(policy.ttlFor({ status: 'match', diagnostics: { degraded: true } }), 300);
});
