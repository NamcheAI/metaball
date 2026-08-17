import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_COOKIE, createAuthToken } from '../lib/auth-token';
import middleware from '../middleware';

const savedPin = process.env.AUTH_PIN;
const savedSecret = process.env.AUTH_SECRET;

test.after(() => {
  if (savedPin === undefined) delete process.env.AUTH_PIN;
  else process.env.AUTH_PIN = savedPin;
  if (savedSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = savedSecret;
});

test('middleware continues instead of recursively fetching the same route', async () => {
  delete process.env.AUTH_PIN;
  delete process.env.AUTH_SECRET;
  const response = await middleware(new Request('https://studio.example/work'));
  assert.equal(response.headers.get('x-middleware-next'), '1');
});

test('valid tokens continue and invalid tokens redirect to the local login page', async () => {
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
