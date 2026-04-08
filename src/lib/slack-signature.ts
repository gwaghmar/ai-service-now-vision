import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SEC = 5 * 60;

/**
 * Verify Slack request signing (interactivity & Events API).
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequestSignature(
  signingSecret: string,
  rawBody: string,
  slackRequestTimestamp: string,
  slackSignature: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  const ts = Number.parseInt(slackRequestTimestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > MAX_SKEW_SEC) {
    return false;
  }
  const base = `v0:${slackRequestTimestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret)
    .update(base, "utf8")
    .digest("hex");
  const expected = `v0=${digest}`;
  try {
    const a = Buffer.from(slackSignature, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  return true;
}
