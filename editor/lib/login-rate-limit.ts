import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest } from './vercel-types.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export type SharedLoginRateLimiter = {
  limit(identifier: string): Promise<{ success: boolean; reset: number; reason?: string }>;
  resetUsedTokens(identifier: string): Promise<void>;
};

let sharedLimiter: SharedLoginRateLimiter | undefined;
let memoryLimiter: SharedLoginRateLimiter | undefined;

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

/**
 * Single-process in-memory sliding window. Used as the fallback when no
 * shared store is configured (self-hosted server with no Upstash env), and
 * as the last resort so login rate limiting can always be constructed.
 * Per-instance only: on a horizontally scaled deployment each instance
 * tracks attempts independently, which is why the shared Upstash-backed
 * limiter is preferred whenever it is configured.
 */
export function createMemoryLoginRateLimiter(
  maxAttempts = MAX_ATTEMPTS,
  windowMs = WINDOW_MS,
): SharedLoginRateLimiter {
  const attempts = new Map<string, number[]>();

  function prune(key: string, now: number): number[] {
    const timestamps = (attempts.get(key) ?? []).filter((ts) => now - ts < windowMs);
    if (timestamps.length > 0) attempts.set(key, timestamps);
    else attempts.delete(key);
    return timestamps;
  }

  return {
    async limit(key: string) {
      const now = Date.now();
      const timestamps = prune(key, now);
      if (timestamps.length >= maxAttempts) {
        return { success: false, reset: (timestamps[0] ?? now) + windowMs };
      }
      timestamps.push(now);
      attempts.set(key, timestamps);
      return { success: true, reset: now + windowMs };
    },
    async resetUsedTokens(key: string) {
      attempts.delete(key);
    },
  };
}

function upstashLoginRateLimiter(): SharedLoginRateLimiter | undefined {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return undefined;
  if (!sharedLimiter) {
    sharedLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, '15 m'),
      prefix: 'metaball:login',
      analytics: false,
      timeout: 3_000,
    });
  }
  return sharedLimiter;
}

/**
 * Prefer the shared Upstash-backed limiter when it is configured (protects
 * against multi-instance deployments, e.g. Vercel). Fall back to an
 * in-memory limiter otherwise -- it can always be constructed, so a login
 * attempt is never rejected purely for lack of a rate limiter.
 */
function defaultLoginRateLimiter(): SharedLoginRateLimiter {
  return upstashLoginRateLimiter() ?? (memoryLimiter ??= createMemoryLoginRateLimiter());
}

/** Atomically reserve one verification attempt in shared storage before doing PIN work. */
export async function takeLoginAttempt(
  key: string,
  limiter: SharedLoginRateLimiter = defaultLoginRateLimiter(),
  now = Date.now(),
): Promise<LoginAttempt> {
  const result = await limiter.limit(key);
  // The Upstash SDK normally fails open on its timeout. Authentication must fail closed.
  if (!result.success || result.reason === 'timeout') {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(((result.reset || now + WINDOW_MS) - now) / 1000),
      ),
    };
  }
  return { allowed: true };
}

export async function resetLoginAttempts(
  key: string,
  limiter: SharedLoginRateLimiter = defaultLoginRateLimiter(),
): Promise<void> {
  await limiter.resetUsedTokens(key);
}
