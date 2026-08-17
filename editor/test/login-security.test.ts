import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearLoginRateLimits,
  loginRateLimitKey,
  resetLoginAttempts,
  takeLoginAttempt,
} from '../lib/login-rate-limit';
import { safeRedirectPath } from '../lib/redirect-path';

test('redirects stay on the editor origin', () => {
  assert.equal(safeRedirectPath('/studio?mode=3d#view'), '/studio?mode=3d#view');
  assert.equal(safeRedirectPath('//attacker.example'), '/');
  assert.equal(safeRedirectPath('/\\attacker.example'), '/');
  assert.equal(safeRedirectPath('https://attacker.example'), '/');
  assert.equal(safeRedirectPath(undefined), '/');
});

test('PIN attempts are limited per forwarded source and reset on success', () => {
  clearLoginRateLimits();
  const key = loginRateLimitKey({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });
  assert.equal(key, '203.0.113.7');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.deepEqual(takeLoginAttempt(key, 1_000), { allowed: true });
  }
  assert.deepEqual(takeLoginAttempt(key, 1_000), {
    allowed: false,
    retryAfterSeconds: 900,
  });
  resetLoginAttempts(key);
  assert.deepEqual(takeLoginAttempt(key, 1_000), { allowed: true });
});
