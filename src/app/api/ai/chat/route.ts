import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  AiNotConfiguredError,
  getOrgLanguageModel,
} from "@/server/ai/client";
import { HOME_COPILOT_SYSTEM } from "@/server/ai/prompts";
import { assertAiRequestGuard } from "@/server/ai/request-guard";
import { recordAuditEvent } from "@/server/audit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const orgId = session.user.organizationId;
  if (!orgId) {
    return new Response("No organization", { status: 403 });
  }

  let body: { messages?: UIMessage[] };
  try {
    body = (await req.json()) as { messages?: UIMessage[] };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const messages = body.messages ?? [];
  if (!Array.isArray(messages)) {
    return new Response("messages must be an array", { status: 400 });
  }
  try {
    await assertAiRequestGuard({
      req,
      organizationId: orgId,
      userId: session.user.id,
      messages,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rate limit exceeded";
    const status = typeof (e as { status?: unknown })?.status === "number"
      ? ((e as { status: number }).status)
      : 429;
    return new Response(message, { status });
  }

  try {
    const { model, usedPlatformFallback } = await getOrgLanguageModel(orgId);
    const actorId = session.user.id;
    const system =
      HOME_COPILOT_SYSTEM +
      (usedPlatformFallback
        ? "\nNote: this reply used the platform fallback API key for the organization."
        : "");
    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages),
      onFinish: () => {
        if (usedPlatformFallback) {
          void recordAuditEvent({
            organizationId: orgId,
            actorId,
            entityType: "organization",
            entityId: orgId,
            action: "ai_copilot_platform_fallback",
            metadata: { usedPlatformKey: true },
          });
        }
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return Response.json(
        { error: e.message, code: "ai_not_configured" },
        { status: 503 },
      );
    }
    throw e;
  }
}
