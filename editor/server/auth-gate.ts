import type { IncomingMessage, ServerResponse } from 'node:http';
import { AUTH_COOKIE, authConfiguration, getCookie, verifyAuthToken } from '../lib/auth-token.js';

/**
 * Mirrors `middleware.ts`'s `config.matcher` exempt-path list. Vercel's
 * matcher must stay a static string literal for its build-time route
 * analysis, so it cannot be imported from here -- keep the two lists in
 * sync by hand when either changes. `api/health` is a self-host-only
 * addition: the deploy contract's health check must never be redirected to
 * the login page.
 */
const EXEMPT_PREFIXES = [
  'api/auth',
  'api/logout',
  'api/health',
  'login',
  'impressum',
  'datenschutz',
  'legal.css',
  'theme.css',
  'assets',
  'favicon.svg',
  'icons.svg',
];

export function isAuthExemptPath(pathname: string): boolean {
  if (pathname === '/') return false;
  const rest = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  return EXEMPT_PREFIXES.some((prefix) => rest.startsWith(prefix));
}

export type AuthGateResult = 'next' | 'handled';

/**
 * Node port of `middleware.ts`'s redirect semantics, reusing the same
 * `authConfiguration`/`verifyAuthToken`/`getCookie` primitives from
 * `lib/auth-token.ts`. Returns `'next'` when the request may proceed to the
 * route handlers, or `'handled'` once it has written a response (a 503 for
 * an invalid configuration, or a 302 redirect to `/login`).
 */
export async function applyAuthGate(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<AuthGateResult> {
  if (isAuthExemptPath(pathname)) return 'next';

  const auth = authConfiguration();
  if (auth.mode === 'disabled') return 'next';
  if (auth.mode === 'invalid') {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Authentication is not configured');
    return 'handled';
  }

  const cookieHeader = req.headers.cookie;
  const fetchRequest = new Request(
    'http://internal.invalid/',
    cookieHeader ? { headers: { cookie: cookieHeader } } : undefined,
  );
  const token = getCookie(fetchRequest, AUTH_COOKIE);
  if (await verifyAuthToken(auth.secret, token)) return 'next';

  const loginUrl = new URL('/login', 'http://internal.invalid');
  if (pathname !== '/') loginUrl.searchParams.set('from', pathname);
  res.statusCode = 302;
  res.setHeader('Location', `${loginUrl.pathname}${loginUrl.search}`);
  res.end();
  return 'handled';
}
