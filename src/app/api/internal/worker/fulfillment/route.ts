import { lt } from "drizzle-orm";
import { db } from "@/db";
import { approvalEmailNonce } from "@/db/schema";
import { processStaleFulfillmentJobs } from "@/server/fulfillment-queue";
import { drainWebhookRetries } from "@/server/webhooks";

export const runtime = "nodejs";

const NONCE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Worker hook for Vercel Cron, k8s CronJob, or systemd timer.
 * `Authorization: Bearer <CRON_SECRET>`
 * Runs:
 *   1. Stale fulfillment job drain
 *   2. Approval email nonce TTL cleanup
 *   3. Webhook delivery retry drain
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return Response.json(
      { error: "CRON_SECRET is not configured", code: "disabled" },
      { status: 503 },
    );
  }
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [fulfillmentResult, webhookResult] = await Promise.allSettled([
    processStaleFulfillmentJobs(100),
    drainWebhookRetries(50),
  ]);

  // Purge nonces older than TTL (consumed or not — email links expire naturally)
  const nonceCutoff = new Date(Date.now() - NONCE_TTL_MS);
  let noncesDeleted = 0;
  try {
    const deleted = await db
      .delete(approvalEmailNonce)
      .where(lt(approvalEmailNonce.createdAt, nonceCutoff))
      .returning({ jti: approvalEmailNonce.jti });
    noncesDeleted = deleted.length;
  } catch (e) {
    console.error("[worker] nonce cleanup failed:", e);
  }

  const fulfillment =
    fulfillmentResult.status === "fulfilled"
      ? fulfillmentResult.value
      : { processed: 0, errors: 1 };

  const webhooks =
    webhookResult.status === "fulfilled"
      ? webhookResult.value
      : { delivered: 0, failed: 0, errors: 1 };

  return Response.json({
    ok: true,
    fulfillment,
    webhooks,
    noncesDeleted,
  });
}
