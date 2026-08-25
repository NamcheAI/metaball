import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMemoryLoginRateLimiter,
  enableMemoryLoginRateLimitFallback,
  resetLoginAttempts,
  takeLoginAttempt,
} from '../lib/login-rate-limit';

test('the in-memory limiter allows up to the max attempts, then blocks', async () => {
  const limiter = createMemoryLoginRateLimiter(5, 900_000);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await limiter.limit('source-a');
    assert.equal(result.success, true);
  }
  const blocked = await limiter.limit('source-a');
  assert.equal(blocked.success, false);
});

test('the in-memory limiter tracks keys independently', async () => {
  const limiter = createMemoryLoginRateLimiter(1, 900_000);
  assert.equal((await limiter.limit('a')).success, true);
  assert.equal((await limiter.limit('a')).success, false);
  assert.equal((await limiter.limit('b')).success, true);
});

test('resetUsedTokens clears a key so it can retry immediately', async () => {
  const limiter = createMemoryLoginRateLimiter(1, 900_000);
  assert.equal((await limiter.limit('a')).success, true);
  assert.equal((await limiter.limit('a')).success, false);
  await limiter.resetUsedTokens('a');
  assert.equal((await limiter.limit('a')).success, true);
});

test('attempts outside the sliding window expire', async () => {
  const limiter = createMemoryLoginRateLimiter(1, 10);
  assert.equal((await limiter.limit('a')).success, true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal((await limiter.limit('a')).success, true);
});

test('takeLoginAttempt and resetLoginAttempts compose with the in-memory limiter', async () => {
  const limiter = createMemoryLoginRateLimiter(2, 900_000);
  const now = Date.now();
  assert.deepEqual(await takeLoginAttempt('key', limiter, now), { allowed: true });
  assert.deepEqual(await takeLoginAttempt('key', limiter, now), { allowed: true });
  const blocked = await takeLoginAttempt('key', limiter, now);
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) assert.ok(blocked.retryAfterSeconds > 0);
  await resetLoginAttempts('key', limiter);
  assert.deepEqual(await takeLoginAttempt('key', limiter, now), { allowed: true });
});

// Ordering matters for the two tests below: enableMemoryLoginRateLimitFallback
// is a one-way, process-wide switch, so the fail-closed default must be
// asserted before the fallback is enabled. node:test runs tests in a file
// sequentially, and this file runs in its own process.
test('without Upstash, the default resolution fails closed — serverless never gets a per-instance limiter', async () => {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    await assert.rejects(
      () => takeLoginAttempt('unconfigured-source'),
      /not configured/,
    );
  } finally {
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});

test('with the fallback enabled (self-hosted server), the default resolution uses the in-memory limiter', async () => {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    enableMemoryLoginRateLimitFallback();
    const result = await takeLoginAttempt('self-hosted-source');
    assert.equal(result.allowed, true);
  } finally {
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});
