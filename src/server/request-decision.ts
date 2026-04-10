import { randomUUID } from "crypto";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { approval, request as requestTable } from "@/db/schema";
import { isApproverAllowedForRequest } from "@/server/approval-routing";
import { recordAuditEvent } from "@/server/audit";
import {
  enqueueFulfillmentJob,
  processFulfillmentJobById,
} from "@/server/fulfillment-queue";
import { deliverOrgWebhook } from "@/server/webhooks";

export type RequestDecision = "approved" | "denied" | "needs_info";

const APPROVABLE_STATUSES = ["pending_approval", "needs_info"] as const;

/**
 * Apply an approval decision (shared by session action and email token API).
 * Does not call revalidatePath — caller must do that.
 */
export async function applyRequestDecision(input: {
  organizationId: string;
  requestId: string;
  decision: RequestDecision;
  comment?: string | null;
  actorUserId: string;
  actorRole: "approver" | "admin";
}): Promise<void> {
  const {
    organizationId: orgId,
    requestId,
    decision,
    comment,
    actorUserId: approverId,
    actorRole,
  } = input;

  const [req] = await db
    .select()
    .from(requestTable)
    .where(
      and(
        eq(requestTable.id, requestId),
        eq(requestTable.organizationId, orgId),
      ),
    )
    .limit(1);

  if (!req) throw new Error("Request not found.");
  if (!APPROVABLE_STATUSES.includes(req.status as (typeof APPROVABLE_STATUSES)[number])) {
    throw new Error("Request is not awaiting approval.");
  }

  if (actorRole === "approver") {
    const allowed = isApproverAllowedForRequest({
      approverUserId: approverId,
      routingApproverIds: req.routingApproverIds ?? null,
      assignedApproverId: req.assignedApproverId,
    });
    if (!allowed) {
      throw new Error("You are not authorized to approve this request.");
    }
  }

  const nextStatus =
    decision === "approved"
      ? "approved"
      : decision === "denied"
        ? "denied"
        : "needs_info";

  let jobId: string | null = null;

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(requestTable)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(
        and(
          eq(requestTable.id, req.id),
          eq(requestTable.organizationId, orgId),
          or(
            eq(requestTable.status, APPROVABLE_STATUSES[0]),
            eq(requestTable.status, APPROVABLE_STATUSES[1]),
          ),
        ),
      )
      .returning({ id: requestTable.id });

    if (updated.length === 0) {
      throw new Error(
        "Request is no longer awaiting approval. Please refresh before deciding.",
      );
    }

    await tx.insert(approval).values({
      id: randomUUID(),
      requestId: req.id,
      approverId,
      decision,
      comment: comment ?? null,
    });

    await recordAuditEvent(
      {
        organizationId: orgId,
        actorId: approverId,
        entityType: "request",
        entityId: req.id,
        action: `approval_${decision}`,
        metadata: { comment: comment ?? undefined },
      },
      tx,
    );

    // Enqueue fulfillment job atomically inside the TX so a crash between
    // commit and enqueue cannot orphan an approved request without a job.
    if (decision === "approved") {
      jobId = await enqueueFulfillmentJob(
        { organizationId: orgId, requestId: req.id, actorId: approverId },
        tx,
      );
    }
  });

  if (decision !== "approved" || !jobId) return;

  void deliverOrgWebhook({
    organizationId: orgId,
    event: "request.approved",
    data: { requestId: req.id, approverId },
  });

  await processFulfillmentJobById(jobId);
}
