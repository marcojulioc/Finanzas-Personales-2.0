/**
 * Simple in-memory rate limiter
 * Note: Resets on server restart. For persistent limiting, use Redis.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requests = new Map<string, RateLimitRecord>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, record] of requests) {
    if (record.resetTime < now) {
      requests.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP address)
 * @param limit - Max requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const record = requests.get(identifier);

  // First request or window expired
  if (!record || record.resetTime < now) {
    requests.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  // Within window, check limit
  if (record.count >= limit) {
    const resetIn = Math.ceil((record.resetTime - now) / 1000);
    return { success: false, remaining: 0, resetIn };
  }

  // Increment counter
  record.count++;
  const resetIn = Math.ceil((record.resetTime - now) / 1000);
  return { success: true, remaining: limit - record.count, resetIn };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    const ip = forwarded.split(',')[0];
    return ip ? ip.trim() : 'anonymous';
  }
  if (realIP) {
    return realIP;
  }
  return 'anonymous';
}
