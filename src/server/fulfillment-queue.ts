import { randomUUID } from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { fulfillmentJob, request as requestTable } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit";
import { runProvisionWithConnector } from "@/server/fulfillment";
import { deliverOrgWebhook } from "@/server/webhooks";

const OPEN_STATUSES = ["pending", "processing"] as const;

export async function enqueueFulfillmentJob(input: {
  organizationId: string;
  requestId: string;
  actorId: string | null;
}): Promise<string> {
  const [open] = await db
    .select({ id: fulfillmentJob.id })
    .from(fulfillmentJob)
    .where(
      and(
        eq(fulfillmentJob.requestId, input.requestId),
        inArray(fulfillmentJob.status, [...OPEN_STATUSES]),
      ),
    )
    .limit(1);

  if (open) return open.id;

  const id = randomUUID();
  await db.insert(fulfillmentJob).values({
    id,
    organizationId: input.organizationId,
    requestId: input.requestId,
    actorId: input.actorId,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
  });
  return id;
}

export async function processFulfillmentJobById(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(fulfillmentJob)
    .where(eq(fulfillmentJob.id, jobId))
    .limit(1);

  if (!job || job.status !== "pending") return;

  await db
    .update(fulfillmentJob)
    .set({
      status: "processing",
      attempts: job.attempts + 1,
      updatedAt: new Date(),
    })
    .where(eq(fulfillmentJob.id, jobId));

  try {
    await runProvisionWithConnector({
      requestId: job.requestId,
      organizationId: job.organizationId,
      actorId: job.actorId,
    });
    await db
      .update(fulfillmentJob)
      .set({ status: "succeeded", updatedAt: new Date(), lastError: null })
      .where(eq(fulfillmentJob.id, jobId));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown provision error";

    await db
      .update(requestTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(requestTable.id, job.requestId));

    await recordAuditEvent({
      organizationId: job.organizationId,
      actorId: null,
      entityType: "request",
      entityId: job.requestId,
      action: "provision_failed",
      metadata: { error: message.slice(0, 500) },
    });

    void deliverOrgWebhook({
      organizationId: job.organizationId,
      event: "provision.failed",
      data: { requestId: job.requestId, error: message.slice(0, 500) },
    });

    await db
      .update(fulfillmentJob)
      .set({
        status: "failed",
        lastError: message.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(fulfillmentJob.id, jobId));

    throw err;
  }
}

/** Drain pending jobs (cron / worker). Logs per-job errors; counts only. */
export async function processStaleFulfillmentJobs(limit: number): Promise<{
  processed: number;
  errors: number;
}> {
  const pending = await db
    .select({ id: fulfillmentJob.id })
    .from(fulfillmentJob)
    .where(eq(fulfillmentJob.status, "pending"))
    .orderBy(asc(fulfillmentJob.createdAt))
    .limit(limit);

  let errors = 0;
  let processed = 0;
  for (const row of pending) {
    try {
      await processFulfillmentJobById(row.id);
      processed++;
    } catch {
      errors++;
    }
  }
  return { processed, errors };
}
