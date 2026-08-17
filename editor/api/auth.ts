import type { VercelRequest, VercelResponse } from '../lib/vercel-types.js';
import {
  authCookieHeader,
  authEnabled,
  createAuthToken,
  verifySharedSecret,
} from '../lib/auth-token.js';
import {
  loginRateLimitKey,
  resetLoginAttempts,
  takeLoginAttempt,
} from '../lib/login-rate-limit.js';
import { safeRedirectPath } from '../lib/redirect-path.js';

function readPin(req: VercelRequest): string {
  const body = req.body;
  if (typeof body === 'string') {
    const params = new URLSearchParams(body);
    const fromForm = params.get('pin');
    if (fromForm) return fromForm;
  }
  if (body && typeof body === 'object' && 'pin' in body) {
    return String((body as { pin: unknown }).pin ?? '');
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  if (!authEnabled()) {
    return res.redirect(302, '/');
  }

  const source = loginRateLimitKey(req);
  const attempt = takeLoginAttempt(source);
  if (!attempt.allowed) {
    res.setHeader('Retry-After', String(attempt.retryAfterSeconds));
    return res.redirect(302, '/login?error=rate');
  }

  const pin = readPin(req).trim();
  if (!(await verifySharedSecret(process.env.AUTH_SECRET!, pin, process.env.AUTH_PIN!))) {
    return res.redirect(302, '/login?error=1');
  }

  resetLoginAttempts(source);
  const token = await createAuthToken(process.env.AUTH_SECRET!);
  res.setHeader('Set-Cookie', authCookieHeader(token));
  return res.redirect(302, safeRedirectPath(req.query.from));
}
