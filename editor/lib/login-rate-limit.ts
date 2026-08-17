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

function sharedLoginRateLimiter(): SharedLoginRateLimiter {
  if (!sharedLimiter) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Shared login rate limiting is not configured');
    }
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

/** Atomically reserve one verification attempt in shared storage before doing PIN work. */
export async function takeLoginAttempt(
  key: string,
  limiter: SharedLoginRateLimiter = sharedLoginRateLimiter(),
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
  limiter: SharedLoginRateLimiter = sharedLoginRateLimiter(),
): Promise<void> {
  await limiter.resetUsedTokens(key);
}
