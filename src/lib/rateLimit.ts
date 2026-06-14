/**
 * In-memory rate limiter for API routes.
 *
 * Tracks request counts per IP address within a rolling time window.
 * Returns whether the request should be allowed or blocked.
 *
 * NOTE: This is an in-memory store — it resets on server restart and does
 * not share state across serverless function instances. For a small-scale
 * app like this, it's a significant improvement over zero rate limiting.
 * For production-grade limiting, consider Upstash Redis or Vercel KV.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check and consume a rate limit attempt for the given identifier.
 *
 * @param identifier - Unique key (typically IP address)
 * @param maxAttempts - Maximum attempts allowed in the window (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  // First request or window expired — start fresh
  if (!entry || now > entry.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  // Within window — check count
  if (entry.count >= maxAttempts) {
    const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  // Allowed — increment
  entry.count += 1;
  const remaining = maxAttempts - entry.count;
  const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);

  return { allowed: true, remaining, resetInSeconds };
}
