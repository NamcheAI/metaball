import type { VercelRequest } from './vercel-types.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SOURCES = 2048;

type AttemptWindow = { attempts: number; resetAt: number };
const windows = new Map<string, AttemptWindow>();

export type LoginAttempt = { allowed: true } | { allowed: false; retryAfterSeconds: number };

function firstHeader(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(',')[0]?.trim() || undefined;
}

/** Vercel overwrites these forwarding headers before invoking the function. */
export function loginRateLimitKey(req: Pick<VercelRequest, 'headers'>): string {
  return (
    firstHeader(req.headers['x-vercel-forwarded-for']) ??
    firstHeader(req.headers['x-forwarded-for']) ??
    firstHeader(req.headers['x-real-ip']) ??
    'unknown-source'
  );
}

function prune(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  while (windows.size >= MAX_SOURCES) {
    const oldest = windows.keys().next().value;
    if (oldest === undefined) break;
    windows.delete(oldest);
  }
}

/** Reserve one verification attempt before doing any PIN work. */
export function takeLoginAttempt(key: string, now = Date.now()): LoginAttempt {
  let window = windows.get(key);
  if (!window || window.resetAt <= now) {
    if (windows.size >= MAX_SOURCES) prune(now);
    window = { attempts: 0, resetAt: now + WINDOW_MS };
    windows.set(key, window);
  }
  if (window.attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }
  window.attempts += 1;
  return { allowed: true };
}

export function resetLoginAttempts(key: string): void {
  windows.delete(key);
}

export function clearLoginRateLimits(): void {
  windows.clear();
}
