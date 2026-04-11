import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { approval, request as requestTable } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit";
import { enqueueFulfillmentJob } from "@/server/fulfillment-queue";
import {
  AiNotConfiguredError,
  getOrgLanguageModel,
  isTestAiMock,
} from "@/server/ai/client";

export type TriageRisk = "low" | "medium" | "high" | "critical";

const triageOutputSchema = z.object({
  risk: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string().max(300),
});

/**
 * Background AI triage: classifies risk, stores result, optionally auto-approves.
 * Called as `void triageRequestAsync(...)` — never throws to the caller.
 */
export async function triageRequestAsync(input: {
  requestId: string;
  organizationId: string;
  requestTypeTitle: string;
  requestTypeSlug: string;
  riskDefaults: unknown;
  payload: Record<string, unknown>;
}): Promise<void> {
  const {
    requestId,
    organizationId,
    requestTypeTitle,
    requestTypeSlug,
    riskDefaults,
    payload,
  } = input;

  try {
    let risk: TriageRisk;
    let reason: string;

    if (isTestAiMock()) {
      risk = "low";
      reason = "Test mock: auto-classified as low risk.";
    } else {
      try {
        const { model } = await getOrgLanguageModel(organizationId);

        const payloadText = Object.entries(payload)
          .map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`)
          .join("\n");

        const { object } = await generateObject({
          model,
          schema: triageOutputSchema,
          system: `You are an IT governance triage assistant. Classify the risk of a service request as one of: low, medium, high, critical. Base your classification on the request type, payload content, and any admin-configured risk hints. Keep the reason to one concise sentence.`,
          prompt: `Request type: ${requestTypeTitle} (slug: ${requestTypeSlug})
Admin risk hints: ${JSON.stringify(riskDefaults ?? {})}
Request payload:
${payloadText}`,
        });

        risk = object.risk;
        reason = object.reason;
      } catch (err) {
        if (err instanceof AiNotConfiguredError) return;
        throw err;
      }
    }

    await db
      .update(requestTable)
      .set({
        aiTriageRisk: risk,
        aiTriageReason: reason,
        aiTriageAt: new Date(),
      })
      .where(eq(requestTable.id, requestId));

    await recordAuditEvent({
      organizationId,
      actorId: null,
      entityType: "request",
      entityId: requestId,
      action: "ai_triage_complete",
      metadata: { risk, reason },
    });

    const rd = riskDefaults as Record<string, unknown> | null;
    if (risk === "low" && rd?.autoApproveLowRisk === true) {
      await autoApproveRequest({ requestId, organizationId, reason });
    }
  } catch {
    // Triage is a best-effort enhancement — silently absorb errors.
  }
}

async function autoApproveRequest(input: {
  requestId: string;
  organizationId: string;
  reason: string;
}): Promise<void> {
  const { requestId, organizationId, reason } = input;

  const [req] = await db
    .select({ id: requestTable.id, status: requestTable.status })
    .from(requestTable)
    .where(
      and(
        eq(requestTable.id, requestId),
        eq(requestTable.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!req || req.status !== "pending_approval") return;

  let jobId: string | null = null;

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(requestTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(
        and(
          eq(requestTable.id, requestId),
          eq(requestTable.status, "pending_approval"),
        ),
      )
      .returning({ id: requestTable.id });

    if (updated.length === 0) return;

    await tx.insert(approval).values({
      id: randomUUID(),
      requestId,
      approverId: null,
      decision: "approved",
      comment: `Auto-approved by AI triage (low risk): ${reason}`,
    });

    await recordAuditEvent(
      {
        organizationId,
        actorId: null,
        entityType: "request",
        entityId: requestId,
        action: "ai_auto_approved",
        metadata: { reason },
      },
      tx,
    );

    jobId = await enqueueFulfillmentJob(
      { organizationId, requestId, actorId: null },
      tx,
    );
  });

  if (jobId) {
    const { processFulfillmentJobById } = await import(
      "@/server/fulfillment-queue"
    );
    void processFulfillmentJobById(jobId);
  }
}
