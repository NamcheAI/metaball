import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authCookieHeader,
  createAuthToken,
  verifyAuthToken,
  verifySharedSecret,
} from '../lib/auth-token';

test('auth tokens verify and reject tampering', async () => {
  const token = await createAuthToken('test-secret');
  assert.equal(await verifyAuthToken('test-secret', token), true);
  assert.equal(await verifyAuthToken('wrong-secret', token), false);
  assert.equal(await verifyAuthToken('test-secret', `${token}0`), false);
});

test('shared PIN comparison uses the signing key', async () => {
  assert.equal(await verifySharedSecret('secret', '4829', '4829'), true);
  assert.equal(await verifySharedSecret('secret', '0000', '4829'), false);
});

test('production cookies carry the expected security attributes', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const header = authCookieHeader('token');
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Lax/);
    assert.match(header, /Secure/);
  } finally {
    process.env.NODE_ENV = previous;
  }
});
