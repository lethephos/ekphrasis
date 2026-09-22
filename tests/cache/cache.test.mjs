import test from 'node:test';
import assert from 'node:assert/strict';
import { createCachePolicy } from '../../lib/cache/policy.js';
import { createMemoryCacheStore } from '../../lib/cache/store.js';

const result = { status: 'match', confidence: 'high', artwork: { title: 'x' } };

test('cache stores and returns normal results until their TTL expires', async () => {
  const store = createMemoryCacheStore();
  const policy = createCachePolicy({ normalTtlSeconds: 60, degradedTtlSeconds: 10 });
  await store.set('abc', result, policy.ttlFor(result));
  assert.deepEqual(await store.get('abc'), result);
});

test('degraded results use the shorter TTL', () => {
  const policy = createCachePolicy({ normalTtlSeconds: 60, degradedTtlSeconds: 10 });
  assert.equal(policy.ttlFor({ status: 'match', diagnostics: { degraded: true } }), 10);
});

test('no-match is cacheable but API_UNAVAILABLE is not', () => {
  const policy = createCachePolicy({ normalTtlSeconds: 60, degradedTtlSeconds: 10 });
  assert.equal(policy.shouldCache({ status: 'no_match' }), true);
  assert.equal(policy.shouldCache({ status: 'error', code: 'API_UNAVAILABLE' }), false);
});
