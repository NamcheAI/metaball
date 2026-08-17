export const AUTH_COOKIE = 'mb_auth';
export const AUTH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bytesToHex(sig);
}

export async function createAuthToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + AUTH_MAX_AGE;
  const payloadB64 = btoa(JSON.stringify({ exp }));
  const sig = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyAuthToken(
  secret: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(secret, payloadB64);
  if (sig !== expected) return false;
  try {
    const { exp } = JSON.parse(atob(payloadB64)) as { exp?: number };
    return typeof exp === 'number' && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

export function authCookieHeader(token: string, maxAge = AUTH_MAX_AGE): string {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const parts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearAuthCookieHeader(): string {
  return authCookieHeader('', 0);
}

export function authEnabled(): boolean {
  return Boolean(process.env.AUTH_PIN && process.env.AUTH_SECRET);
}
