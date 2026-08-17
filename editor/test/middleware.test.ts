import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_COOKIE, createAuthToken } from '../lib/auth-token';
import middleware from '../middleware';

const savedPin = process.env.AUTH_PIN;
const savedSecret = process.env.AUTH_SECRET;
const savedDisabled = process.env.AUTH_DISABLED;

test.after(() => {
  if (savedPin === undefined) delete process.env.AUTH_PIN;
  else process.env.AUTH_PIN = savedPin;
  if (savedSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = savedSecret;
  if (savedDisabled === undefined) delete process.env.AUTH_DISABLED;
  else process.env.AUTH_DISABLED = savedDisabled;
});

test('middleware continues only for an explicitly open deployment', async () => {
  delete process.env.AUTH_PIN;
  delete process.env.AUTH_SECRET;
  process.env.AUTH_DISABLED = '1';
  const response = await middleware(new Request('https://studio.example/work'));
  assert.equal(response.headers.get('x-middleware-next'), '1');
});

test('middleware fails closed for missing or partial credentials', async () => {
  delete process.env.AUTH_DISABLED;
  delete process.env.AUTH_PIN;
  delete process.env.AUTH_SECRET;
  const missing = await middleware(new Request('https://studio.example/work'));
  assert.equal(missing.status, 503);

  process.env.AUTH_PIN = '1234';
  const partial = await middleware(new Request('https://studio.example/work'));
  assert.equal(partial.status, 503);
});

test('valid tokens continue and invalid tokens redirect to the local login page', async () => {
  delete process.env.AUTH_DISABLED;
  process.env.AUTH_PIN = '1234';
  process.env.AUTH_SECRET = 'middleware-test-secret';
  const token = await createAuthToken(process.env.AUTH_SECRET);

  const allowed = await middleware(
    new Request('https://studio.example/work', {
      headers: { cookie: `${AUTH_COOKIE}=${token}` },
    }),
  );
  assert.equal(allowed.headers.get('x-middleware-next'), '1');

  const rejected = await middleware(new Request('https://studio.example/work'));
  assert.equal(rejected.status, 302);
  assert.equal(rejected.headers.get('location'), 'https://studio.example/login?from=%2Fwork');
});
