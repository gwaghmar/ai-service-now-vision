"use server";

import { and, eq } from "drizzle-orm";
import { generateText } from "ai";
import { db } from "@/db";
import {
  request as requestTable,
  requestType,
  user,
} from "@/db/schema";
import { recordAuditEvent } from "@/server/audit";
import {
  AiNotConfiguredError,
  getOrgLanguageModel,
  isTestAiMock,
} from "@/server/ai/client";
import { requireSession } from "@/lib/session";
import { isApproverAllowedForRequest } from "@/server/approval-routing";

export async function generateApproverSummaryAction(input: {
  requestId: string;
}): Promise<
  | { ok: true; summary: string; usedPlatformFallback: boolean }
  | { ok: false; error: string }
> {
  const session = await requireSession();
  const role = (session.user as { role?: string }).role ?? "requester";
  if (role !== "approver" && role !== "admin") {
    return { ok: false, error: "Approver or admin only." };
  }
  const orgId = session.user.organizationId;
  if (!orgId) return { ok: false, error: "No organization." };

  const [row] = await db
    .select({
      request: requestTable,
      typeTitle: requestType.title,
      typeRisk: requestType.riskDefaults,
      requesterName: user.name,
      requesterEmail: user.email,
    })
    .from(requestTable)
    .innerJoin(requestType, eq(requestTable.requestTypeId, requestType.id))
    .innerJoin(user, eq(requestTable.requesterId, user.id))
    .where(
      and(
        eq(requestTable.id, input.requestId),
        eq(requestTable.organizationId, orgId),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Request not found." };

  const canView =
    role === "admin" ||
    row.request.requesterId === session.user.id ||
    (role === "approver" &&
      isApproverAllowedForRequest({
        approverUserId: session.user.id,
        routingApproverIds: row.request.routingApproverIds ?? null,
        assignedApproverId: row.request.assignedApproverId,
      }));

  if (!canView) {
    return { ok: false, error: "You cannot view this request." };
  }

  if (isTestAiMock()) {
    return {
      ok: true,
      summary:
        "**Test mode** — Summary: Review the payload and risk hints below. Confirm scope, data classes, and rollback before approving.",
      usedPlatformFallback: false,
    };
  }

  const payloadStr = JSON.stringify(row.request.payload, null, 2);
  const riskStr = JSON.stringify(row.typeRisk ?? {}, null, 2);

  try {
    const { model, usedPlatformFallback } = await getOrgLanguageModel(orgId);
    const { text } = await generateText({
      model,
      system: `You help approvers review governed access/change requests. Output 3–6 short bullet points in markdown: what is being asked, key risks or blast radius, what to verify, and whether anything looks missing or inconsistent. Do not invent facts not in the data. Stay neutral and professional.`,
      prompt: `Request type: ${row.typeTitle}
Status: ${row.request.status}
Requester: ${row.requesterName} (${row.requesterEmail})

Catalog risk defaults (hints):
${riskStr}

Submitted payload:
${payloadStr}`,
      maxOutputTokens: 600,
    });

    await recordAuditEvent({
      organizationId: orgId,
      actorId: session.user.id,
      entityType: "request",
      entityId: input.requestId,
      action: "ai_approver_summary",
      metadata: { usedPlatformFallback },
    });

    return {
      ok: true,
      summary: text.trim() || "No summary produced.",
      usedPlatformFallback,
    };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return {
        ok: false,
        error: "AI is not configured. Ask an admin to set Admin → AI.",
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Summary failed.",
    };
  }
}
