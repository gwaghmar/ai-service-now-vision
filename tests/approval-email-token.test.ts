import { afterEach, describe, expect, it, vi } from "vitest";

describe("verifyEmailApprovalToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects tampered signature", async () => {
    vi.stubEnv("APPROVAL_EMAIL_SECRET", "x".repeat(32));
    const { createEmailApprovalToken, verifyEmailApprovalToken } =
      await import("@/lib/approval-email-token");
    const t = createEmailApprovalToken({
      requestId: "req-1",
      approverUserId: "u1",
      action: "approve",
    })!;
    const tampered = `${t.slice(0, -4)}xxxx`;
    const r = verifyEmailApprovalToken(tampered);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/signature/i);
  });

  it("rejects expired token", async () => {
    vi.stubEnv("APPROVAL_EMAIL_SECRET", "x".repeat(32));
    const { createEmailApprovalToken, verifyEmailApprovalToken } =
      await import("@/lib/approval-email-token");
    const t = createEmailApprovalToken({
      requestId: "req-1",
      approverUserId: "u1",
      action: "approve",
      ttlSec: -10,
    })!;
    const r = verifyEmailApprovalToken(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/expired/i);
  });
});
