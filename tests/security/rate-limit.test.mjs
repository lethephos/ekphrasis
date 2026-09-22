import test from 'node:test';
import assert from 'node:assert/strict';
import { createSlidingWindowLimiter } from '../../lib/security/rate-limit.js';

test('limits requests per client independently of image hash', async () => {
  let now = 1000;
  const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 1000, now: () => now });
  assert.equal(await limiter.allow('client-a'), true);
  assert.equal(await limiter.allow('client-a'), true);
  assert.equal(await limiter.allow('client-a'), false);
  assert.equal(await limiter.allow('client-b'), true);
  now += 1001;
  assert.equal(await limiter.allow('client-a'), true);
});

test('fails closed when the backing store cannot admit a request', async () => {
  const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 1000, store: {
    async increment() { throw new Error('store unavailable'); },
  }});
  await assert.rejects(limiter.check('client-a'), /RATE_LIMITER_UNAVAILABLE/);
});
