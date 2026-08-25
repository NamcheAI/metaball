import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRenderRateLimiter,
  renderRateLimitBudget,
} from '../server/render-rate-limit';

test('the render limiter allows the hourly budget, then blocks with a retry hint', () => {
  const limiter = createRenderRateLimiter(2, 3_600_000);
  const t0 = 1_000_000;
  assert.deepEqual(limiter.take('ip', t0), { allowed: true });
  assert.deepEqual(limiter.take('ip', t0 + 1), { allowed: true });
  const blocked = limiter.take('ip', t0 + 2);
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) assert.ok(blocked.retryAfterSeconds > 0);
  // The window slides: once the oldest render ages out, budget returns.
  assert.deepEqual(limiter.take('ip', t0 + 3_600_001), { allowed: true });
});

test('keys are tracked independently and a zero budget disables the guard', () => {
  const limiter = createRenderRateLimiter(1, 3_600_000);
  const t0 = 5_000;
  assert.equal(limiter.take('a', t0).allowed, true);
  assert.equal(limiter.take('a', t0 + 1).allowed, false);
  assert.equal(limiter.take('b', t0 + 1).allowed, true);

  const unlimited = createRenderRateLimiter(0);
  for (let i = 0; i < 50; i += 1) assert.equal(unlimited.take('a').allowed, true);
});

test('the key map is bounded: keys past the cap are evicted oldest-first', () => {
  const limiter = createRenderRateLimiter(1, 3_600_000, 2);
  const t0 = 9_000;
  assert.equal(limiter.take('k1', t0).allowed, true);
  assert.equal(limiter.take('k1', t0 + 1).allowed, false);
  assert.equal(limiter.take('k2', t0 + 2).allowed, true);
  assert.equal(limiter.take('k3', t0 + 3).allowed, true);
  // Next call sees the map above the cap and evicts oldest-first (k1),
  // returning it to a fresh budget — bounded memory over perfect fairness.
  assert.equal(limiter.take('k4', t0 + 4).allowed, true);
  assert.equal(limiter.take('k1', t0 + 5).allowed, true);
});

test('the budget env knob accepts integers, 0, and rejects junk', () => {
  assert.equal(renderRateLimitBudget({}), 10);
  assert.equal(renderRateLimitBudget({ RENDER_MAX_PER_HOUR: '25' }), 25);
  assert.equal(renderRateLimitBudget({ RENDER_MAX_PER_HOUR: '0' }), 0);
  assert.equal(renderRateLimitBudget({ RENDER_MAX_PER_HOUR: 'lots' }), 10);
  assert.equal(renderRateLimitBudget({ RENDER_MAX_PER_HOUR: '-3' }), 10);
});
