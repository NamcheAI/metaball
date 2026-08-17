import { next } from '@vercel/functions';
import {
  authEnabled,
  getCookie,
  verifyAuthToken,
  AUTH_COOKIE,
} from './lib/auth-token.js';

export const config = {
  matcher: [
    '/((?!api/auth|api/logout|login|login\\.html|impressum|impressum\\.html|datenschutz|datenschutz\\.html|legal\\.css|theme\\.css|assets|favicon\\.svg|icons\\.svg).*)',
  ],
};

export default async function middleware(request: Request): Promise<Response> {
  if (!authEnabled()) return next();

  const secret = process.env.AUTH_SECRET!;
  const token = getCookie(request, AUTH_COOKIE);
  if (await verifyAuthToken(secret, token)) return next();

  const loginUrl = new URL('/login', request.url);
  const path = new URL(request.url).pathname;
  if (path !== '/') loginUrl.searchParams.set('from', path);

  return Response.redirect(loginUrl, 302);
}
