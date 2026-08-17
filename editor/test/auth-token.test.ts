import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authConfiguration,
  authCookieHeader,
  createAuthToken,
  verifyAuthToken,
  verifySharedSecret,
} from '../lib/auth-token';

test('server auth requires complete credentials or an explicit opt-out', () => {
  assert.deepEqual(authConfiguration({}), { mode: 'invalid' });
  assert.deepEqual(authConfiguration({ AUTH_PIN: '1234' }), { mode: 'invalid' });
  assert.deepEqual(authConfiguration({ AUTH_SECRET: 'secret' }), { mode: 'invalid' });
  assert.deepEqual(authConfiguration({ AUTH_DISABLED: '1' }), { mode: 'disabled' });
  assert.deepEqual(authConfiguration({ AUTH_PIN: '1234', AUTH_SECRET: 'secret' }), {
    mode: 'enabled',
    pin: '1234',
    secret: 'secret',
  });
});

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
