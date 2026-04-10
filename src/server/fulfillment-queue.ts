import { randomUUID } from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { fulfillmentJob, request as requestTable } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit";
import { runProvisionWithConnector } from "@/server/fulfillment";
import { deliverOrgWebhook } from "@/server/webhooks";

const OPEN_STATUSES = ["pending", "processing"] as const;
const PROCESSING_STALE_AFTER_MS = 5 * 60 * 1000;

type DbExecutor = { insert: typeof db.insert; select: typeof db.select };

/**
 * Enqueue a fulfillment job. Accepts an optional transaction executor so the
 * insert can be made atomic with the approval status update — if the server
 * crashes after the TX commits, the job row is guaranteed to exist.
 */
export async function enqueueFulfillmentJob(
  input: {
    organizationId: string;
    requestId: string;
    actorId: string | null;
  },
  executor: DbExecutor = db,
): Promise<string> {
  const [open] = await executor
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
  await executor.insert(fulfillmentJob).values({
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

  if (!job) return;

  const staleCutoff = new Date(Date.now() - PROCESSING_STALE_AFTER_MS);
  const canRetryFailed = job.status === "failed" && job.attempts < job.maxAttempts;
  const isStaleProcessing =
    job.status === "processing" &&
    job.attempts < job.maxAttempts &&
    job.updatedAt <= staleCutoff;

  if (job.status !== "pending" && !canRetryFailed && !isStaleProcessing) return;

  const nextAttempts = job.attempts + 1;

  const claimed = await db
    .update(fulfillmentJob)
    .set({
      status: "processing",
      attempts: nextAttempts,
      updatedAt: new Date(),
    })
    .where(and(eq(fulfillmentJob.id, jobId), eq(fulfillmentJob.status, job.status)))
    .returning({ id: fulfillmentJob.id });

  if (claimed.length === 0) return;

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

    const exhausted = nextAttempts >= job.maxAttempts;
    const nextStatus = exhausted ? "failed" : "pending";

    if (exhausted) {
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
    }

    await db
      .update(fulfillmentJob)
      .set({
        status: nextStatus,
        lastError: message.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(fulfillmentJob.id, jobId));

    if (exhausted) {
      throw err;
    }
  }
}

/** Drain pending jobs (cron / worker). Logs per-job errors; counts only. */
export async function processStaleFulfillmentJobs(limit: number): Promise<{
  processed: number;
  errors: number;
}> {
  const candidates = await db
    .select({ id: fulfillmentJob.id })
    .from(fulfillmentJob)
    .where(
      and(
        inArray(fulfillmentJob.status, ["pending", "failed", "processing"]),
      ),
    )
    .orderBy(asc(fulfillmentJob.createdAt))
    .limit(limit);

  let errors = 0;
  let processed = 0;
  for (const row of candidates) {
    try {
      await processFulfillmentJobById(row.id);
      processed++;
    } catch {
      errors++;
    }
  }
  return { processed, errors };
}
