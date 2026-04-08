import { afterEach, describe, expect, it, vi } from "vitest";

describe("getTrustedAuthOrigins", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("adds 127.0.0.1 alias for localhost in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const { getTrustedAuthOrigins } = await import("@/lib/env");
    const origins = getTrustedAuthOrigins();
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("http://127.0.0.1:3000");
  });

  it("does not add loopback aliases in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const { getTrustedAuthOrigins } = await import("@/lib/env");
    const origins = getTrustedAuthOrigins();
    expect(origins).toContain("http://localhost:3000");
    expect(origins).not.toContain("http://127.0.0.1:3000");
  });
});
