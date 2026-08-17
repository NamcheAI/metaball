import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loginRateLimitKey,
  resetLoginAttempts,
  takeLoginAttempt,
  type SharedLoginRateLimiter,
} from '../lib/login-rate-limit';
import { safeRedirectPath } from '../lib/redirect-path';

test('redirects stay on the editor origin', () => {
  assert.equal(safeRedirectPath('/studio?mode=3d#view'), '/studio?mode=3d#view');
  assert.equal(safeRedirectPath('//attacker.example'), '/');
  assert.equal(safeRedirectPath('/\\attacker.example'), '/');
  assert.equal(safeRedirectPath('https://attacker.example'), '/');
  assert.equal(safeRedirectPath(undefined), '/');
});

function fakeSharedLimiter(now: number): SharedLoginRateLimiter {
  const attempts = new Map<string, number>();
  return {
    async limit(key) {
      const used = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, used);
      return { success: used <= 5, reset: now + 900_000 };
    },
    async resetUsedTokens(key) {
      attempts.delete(key);
    },
  };
}

test('PIN attempts use a shared limiter and reset on success', async () => {
  const now = 1_000;
  const limiter = fakeSharedLimiter(now);
  const key = loginRateLimitKey({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });
  assert.equal(key, '203.0.113.7');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.deepEqual(await takeLoginAttempt(key, limiter, now), { allowed: true });
  }
  assert.deepEqual(await takeLoginAttempt(key, limiter, now), {
    allowed: false,
    retryAfterSeconds: 900,
  });
  await resetLoginAttempts(key, limiter);
  assert.deepEqual(await takeLoginAttempt(key, limiter, now), { allowed: true });
});

test('PIN attempts fail closed when shared storage times out', async () => {
  const limiter: SharedLoginRateLimiter = {
    async limit() {
      return { success: true, reset: 0, reason: 'timeout' };
    },
    async resetUsedTokens() {},
  };
  assert.deepEqual(await takeLoginAttempt('source', limiter, 1_000), {
    allowed: false,
    retryAfterSeconds: 900,
  });
});
