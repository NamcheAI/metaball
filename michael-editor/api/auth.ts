import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authCookieHeader,
  authEnabled,
  createAuthToken,
} from '../lib/auth-token.js';

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

  const pin = readPin(req).trim();
  if (pin !== process.env.AUTH_PIN) {
    return res.redirect(302, '/login?error=1');
  }

  const token = await createAuthToken(process.env.AUTH_SECRET!);
  res.setHeader('Set-Cookie', authCookieHeader(token));
  const from =
    typeof req.query.from === 'string' && req.query.from.startsWith('/')
      ? req.query.from
      : '/';
  return res.redirect(302, from);
}
