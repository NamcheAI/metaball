import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, type Server } from 'node:http';
import { createRequestListener } from '../server/app';
import { AUTH_COOKIE, createAuthToken } from '../lib/auth-token';

function makeDistDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'metaball-server-test-'));
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'index.html'), '<html>app shell</html>');
  writeFileSync(path.join(dir, 'login.html'), '<html>login</html>');
  writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log(1)');
  return dir;
}

function addressOf(server: Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('expected a TCP address');
  return `http://127.0.0.1:${address.port}`;
}

async function withServer(
  distDir: string,
  run: (base: string) => Promise<void>,
): Promise<void> {
  const server = createServer(createRequestListener({ distDir }));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    await run(addressOf(server));
  } finally {
    // Force-close keep-alive sockets so `server.close()` resolves right
    // away instead of waiting out fetch's keep-alive idle timeout.
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/** Snapshot and restore the auth env vars around a test so tests can't leak state. */
function withAuthEnv(t: import('node:test').TestContext, vars: Record<string, string | undefined>): void {
  const saved = {
    AUTH_PIN: process.env.AUTH_PIN,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISABLED: process.env.AUTH_DISABLED,
  };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('the health check is exempt from auth even with no auth configured at all', async (t) => {
  withAuthEnv(t, { AUTH_PIN: undefined, AUTH_SECRET: undefined, AUTH_DISABLED: undefined });
  await withServer(makeDistDir(), async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

test('disabled auth mode passes every request straight through', async (t) => {
  withAuthEnv(t, { AUTH_DISABLED: '1', AUTH_PIN: undefined, AUTH_SECRET: undefined });
  await withServer(makeDistDir(), async (base) => {
    const res = await fetch(`${base}/`, { redirect: 'manual' });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '<html>app shell</html>');
  });
});

test('an invalid (partial) auth configuration fails closed with 503, except for exempt paths', async (t) => {
  withAuthEnv(t, { AUTH_DISABLED: undefined, AUTH_PIN: '1234', AUTH_SECRET: undefined });
  await withServer(makeDistDir(), async (base) => {
    const res = await fetch(`${base}/`, { redirect: 'manual' });
    assert.equal(res.status, 503);

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
  });
});

test('enabled auth mode redirects unauthenticated requests and exempts /login and /api/health', async (t) => {
  withAuthEnv(t, { AUTH_DISABLED: undefined, AUTH_PIN: '1234', AUTH_SECRET: 'server-test-secret' });
  await withServer(makeDistDir(), async (base) => {
    const root = await fetch(`${base}/`, { redirect: 'manual' });
    assert.equal(root.status, 302);
    assert.equal(root.headers.get('location'), '/login');

    const nested = await fetch(`${base}/studio`, { redirect: 'manual' });
    assert.equal(nested.headers.get('location'), '/login?from=%2Fstudio');

    const login = await fetch(`${base}/login`, { redirect: 'manual' });
    assert.equal(login.status, 200);

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);

    // Exemptions match on path boundaries: a path that merely begins with an
    // exempt name must still be gated, or the SPA fallback would serve the
    // protected index.html for it.
    const loginSubpath = await fetch(`${base}/login/foo`, { redirect: 'manual' });
    assert.equal(loginSubpath.status, 302);
    assert.equal(loginSubpath.headers.get('location'), '/login?from=%2Flogin%2Ffoo');
    const healthAlias = await fetch(`${base}/api/health-anything`, { redirect: 'manual' });
    assert.equal(healthAlias.status, 302);
    const assetSubtree = await fetch(`${base}/assets/missing.css`, { redirect: 'manual' });
    assert.equal(assetSubtree.status, 404);

    // The exempt /assets/ subtree must never SPA-fall-back to the gated app
    // shell: an extensionless miss is a hard 404, not index.html.
    const assetShellAlias = await fetch(`${base}/assets/anything`, { redirect: 'manual' });
    assert.equal(assetShellAlias.status, 404);

    // The gate judges the same canonical path the file server resolves:
    // percent-encoded dot-dot under an exempt subtree must never reach the
    // shell. WHATWG URL parsing (which app.ts applies to the raw req.url)
    // resolves %2E%2E dot segments, so this arrives as /index.html and is
    // gated; the app.ts decode-then-reject pass backstops anything that
    // slips through differently. Either way: not a 200.
    const encodedTraversal = await fetch(`${base}/assets/%2E%2E/index.html`, {
      redirect: 'manual',
    });
    assert.equal(encodedTraversal.status, 302);
    assert.equal(encodedTraversal.headers.get('location'), '/login?from=%2Findex.html');
    const encodedSlash = await fetch(`${base}/login%2Ffoo`, { redirect: 'manual' });
    assert.equal(encodedSlash.status, 302);

    const token = await createAuthToken('server-test-secret');
    const authed = await fetch(`${base}/`, {
      headers: { cookie: `${AUTH_COOKIE}=${token}` },
      redirect: 'manual',
    });
    assert.equal(authed.status, 200);
  });
});

test('the /login, /impressum and /datenschutz rewrites serve their .html files', async (t) => {
  withAuthEnv(t, { AUTH_DISABLED: '1', AUTH_PIN: undefined, AUTH_SECRET: undefined });
  const dir = makeDistDir();
  writeFileSync(path.join(dir, 'impressum.html'), '<html>impressum</html>');
  writeFileSync(path.join(dir, 'datenschutz.html'), '<html>datenschutz</html>');
  await withServer(dir, async (base) => {
    const login = await fetch(`${base}/login`);
    assert.equal(await login.text(), '<html>login</html>');

    const impressum = await fetch(`${base}/impressum`);
    assert.equal(await impressum.text(), '<html>impressum</html>');

    const datenschutz = await fetch(`${base}/datenschutz`);
    assert.equal(await datenschutz.text(), '<html>datenschutz</html>');
  });
});

test('hashed assets are cached immutably, the app shell is never cached', async (t) => {
  withAuthEnv(t, { AUTH_DISABLED: '1', AUTH_PIN: undefined, AUTH_SECRET: undefined });
  await withServer(makeDistDir(), async (base) => {
    const asset = await fetch(`${base}/assets/app.js`);
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    const index = await fetch(`${base}/`);
    assert.equal(index.headers.get('cache-control'), 'no-store');
  });
});

test('a missing asset-like path 404s instead of falling back to the app shell', async (t) => {
  withAuthEnv(t, { AUTH_DISABLED: '1', AUTH_PIN: undefined, AUTH_SECRET: undefined });
  await withServer(makeDistDir(), async (base) => {
    const res = await fetch(`${base}/missing.js`);
    assert.equal(res.status, 404);
  });
});

test('an unknown client-side route falls back to the app shell (SPA routing)', async (t) => {
  withAuthEnv(t, { AUTH_DISABLED: '1', AUTH_PIN: undefined, AUTH_SECRET: undefined });
  await withServer(makeDistDir(), async (base) => {
    const res = await fetch(`${base}/studio/anything`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '<html>app shell</html>');
  });
});
