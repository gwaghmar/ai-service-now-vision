import { describe, expect, it } from "vitest";
import { getClientIp, rateLimitAllow } from "@/server/agent-rate-limit";

describe("getClientIp", () => {
  it("reads x-forwarded-for first hop", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to unknown", () => {
    const req = new Request("http://x");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimitAllow", () => {
  it("allows then blocks within the same window", async () => {
    const key = `t-${Math.random()}`;
    const limit = 2;
    const windowMs = 60_000;
    expect(await rateLimitAllow(key, limit, windowMs)).toEqual({ ok: true });
    expect(await rateLimitAllow(key, limit, windowMs)).toEqual({ ok: true });
    const last = await rateLimitAllow(key, limit, windowMs);
    expect(last.ok).toBe(false);
    if (!last.ok) {
      expect(last.retryAfterMs).toBeGreaterThan(0);
    }
  });
});
