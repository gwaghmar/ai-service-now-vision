import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySlackRequestSignature } from "@/lib/slack-signature";

function slackSig(secret: string, ts: string, raw: string): string {
  const base = `v0:${ts}:${raw}`;
  const h = createHmac("sha256", secret).update(base, "utf8").digest("hex");
  return `v0=${h}`;
}

describe("verifySlackRequestSignature", () => {
  it("accepts a valid v0 signature", () => {
    const secret = "test-signing-secret";
    const body = "payload=%7B%22test%22%3A1%7D";
    const ts = "1355517523";
    const sig = slackSig(secret, ts, body);
    expect(
      verifySlackRequestSignature(secret, body, ts, sig, Number(ts) + 10),
    ).toBe(true);
  });

  it("rejects tampered body", () => {
    const secret = "test-signing-secret";
    const body = "payload=original";
    const ts = "1355517523";
    const sig = slackSig(secret, ts, body);
    expect(
      verifySlackRequestSignature(secret, "payload=tampered", ts, sig, Number(ts)),
    ).toBe(false);
  });

  it("rejects stale timestamps", () => {
    const secret = "test-signing-secret";
    const body = "{}";
    const ts = "1000000000";
    const sig = slackSig(secret, ts, body);
    expect(
      verifySlackRequestSignature(secret, body, ts, sig, 2_000_000_000),
    ).toBe(false);
  });
});
