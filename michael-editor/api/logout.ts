import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearAuthCookieHeader } from '../lib/auth-token.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Set-Cookie', clearAuthCookieHeader());
  return res.redirect(302, '/login');
}
