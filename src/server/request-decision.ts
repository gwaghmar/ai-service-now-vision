import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
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
  if (req.status !== "pending_approval" && req.status !== "needs_info") {
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

  await db.insert(approval).values({
    id: randomUUID(),
    requestId: req.id,
    approverId,
    decision,
    comment: comment ?? null,
  });

  await recordAuditEvent({
    organizationId: orgId,
    actorId: approverId,
    entityType: "request",
    entityId: req.id,
    action: `approval_${decision}`,
    metadata: { comment: comment ?? undefined },
  });

  if (decision === "approved") {
    await db
      .update(requestTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(requestTable.id, req.id));

    void deliverOrgWebhook({
      organizationId: orgId,
      event: "request.approved",
      data: { requestId: req.id, approverId },
    });

    const jobId = await enqueueFulfillmentJob({
      organizationId: orgId,
      requestId: req.id,
      actorId: approverId,
    });
    await processFulfillmentJobById(jobId);
  } else if (decision === "denied") {
    await db
      .update(requestTable)
      .set({ status: "denied", updatedAt: new Date() })
      .where(eq(requestTable.id, req.id));
  } else {
    await db
      .update(requestTable)
      .set({ status: "needs_info", updatedAt: new Date() })
      .where(eq(requestTable.id, req.id));
  }
}
