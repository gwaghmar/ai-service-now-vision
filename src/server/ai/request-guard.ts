import type { UIMessage } from "ai";
import { getClientIp, rateLimitAllow } from "@/server/agent-rate-limit";

const MAX_AI_CONTENT_LENGTH_BYTES = 200_000;
const MAX_AI_MESSAGES = 40;
const AI_WINDOW_MS = 60_000;
const AI_LIMIT_PER_USER = 20;
const AI_LIMIT_PER_ORG = 120;
const AI_LIMIT_PER_IP = 60;

function fail(message: string, status: number): never {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  throw err;
}

export async function assertAiRequestGuard(input: {
  req: Request;
  organizationId: string;
  userId: string;
  messages: UIMessage[];
}) {
  const contentLengthHeader = input.req.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_AI_CONTENT_LENGTH_BYTES
    ) {
      fail("Request body too large", 413);
    }
  }

  if (input.messages.length > MAX_AI_MESSAGES) {
    fail(`Too many messages (max ${MAX_AI_MESSAGES})`, 400);
  }

  const userKey = `ai:user:${input.organizationId}:${input.userId}`;
  const orgKey = `ai:org:${input.organizationId}`;
  const ipKey = `ai:ip:${getClientIp(input.req)}`;

  for (const [key, limit] of [
    [userKey, AI_LIMIT_PER_USER],
    [orgKey, AI_LIMIT_PER_ORG],
    [ipKey, AI_LIMIT_PER_IP],
  ] as const) {
    const allowed = await rateLimitAllow(key, limit, AI_WINDOW_MS);
    if (!allowed.ok) {
      fail("Rate limit exceeded. Please retry shortly.", 429);
    }
  }
}
