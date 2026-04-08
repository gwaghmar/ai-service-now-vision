type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();
let pruneCounter = 0;

function pruneStale(now: number, maxAgeMs: number) {
  for (const [k, b] of buckets) {
    if (now - b.windowStart > maxAgeMs) buckets.delete(k);
  }
}

/** Public client IP for rate limiting (best-effort behind proxies). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return "unknown";
}

/**
 * Fixed-window limiter (in-memory; per Node instance). Suitable for a single
 * server or as a safety valve before edge/CDN limits.
 */
export function rateLimitAllow(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  if (++pruneCounter % 200 === 0) {
    pruneStale(now, windowMs * 2);
  }

  const b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (b.count < limit) {
    b.count++;
    return { ok: true };
  }
  return { ok: false, retryAfterMs: windowMs - (now - b.windowStart) };
}
