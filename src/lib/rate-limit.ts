import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  /** Maximum number of allowed requests in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

interface WindowEntry {
  timestamps: number[];
}

// In-memory sliding window store
const memoryStore = new Map<string, WindowEntry>();

// Prune memory every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;

  for (const [key, entry] of memoryStore.entries()) {
    // Keep timestamps from the last 15 minutes
    const valid = entry.timestamps.filter((t) => now - t < 900_000);
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      entry.timestamps = valid;
    }
  }
}

/**
 * Extracts client IP from headers (works on Vercel, Cloudflare, proxies, localhost).
 */
export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Checks and updates rate limit for a given identifier using a sliding window algorithm.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupStaleEntries();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  let entry = memoryStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(identifier, entry);
  }

  // Filter out timestamps outside the active window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const resetTimeSec = Math.ceil((now + windowMs) / 1000);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0] || now;
    const retryResetSec = Math.ceil((oldest + windowMs) / 1000);

    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: retryResetSec,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.timestamps.length),
    reset: resetTimeSec,
  };
}

/**
 * Helper to rate limit incoming NextRequest instances.
 */
export function rateLimit(
  req: Request | NextRequest,
  prefix: string,
  config: RateLimitConfig
): RateLimitResult {
  const ip = getClientIp(req);
  const identifier = `${prefix}:${ip}`;
  return checkRateLimit(identifier, config);
}

/**
 * Generates standard RFC rate limit headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

/**
 * Creates a standard 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, result.reset - Math.floor(Date.now() / 1000));
  return NextResponse.json(
    {
      error: "Too Many Requests",
      message: `Rate limit exceeded. Please try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        ...getRateLimitHeaders(result),
      },
    }
  );
}
