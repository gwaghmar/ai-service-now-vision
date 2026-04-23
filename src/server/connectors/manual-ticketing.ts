import type { ProvisionContext } from "./types";
import { db } from "@/db";
import { fulfillmentJob } from "@/db/app-schema";
import { and, eq } from "drizzle-orm";

/**
 * Fallback connector for apps without SCIM/API support (or for strict human-verification).
 * Instead of auto-provisioning via RPA, we update the fulfillment job state to indicate it's waiting on a human
 * and conceptually dispatch a notification to the IT Ops channel.
 */
export async function runManualProvisionFallback(ctx: ProvisionContext) {
  console.info(`[connector:manual_ticketing] Enqueueing manual task for request: ${ctx.requestId} (${ctx.requestTypeSlug})`);

  // Update it to a special manual state, preventing it from standard backoff retries.
  await db
    .update(fulfillmentJob)
    .set({
      status: "manual_action_required",
      lastError: "Requires human intervention from IT App Owner.",
      updatedAt: new Date()
    })
    .where(eq(fulfillmentJob.requestId, ctx.requestId));

  // Note: Here is where we inject the Slack Webhook call or Transactional Email
  // to notify the #it-ops channel that they need to click the app admin panels.
  
  console.info(`[connector:manual_ticketing] Marked fulfillment job for ${ctx.requestId} as manual_action_required`);
}

/**
 * Revoke manually: marks the job as requiring human intervention.
 */
export async function runManualRevokeFallback(ctx: ProvisionContext) {
  console.info(`[connector:manual_ticketing] Enqueueing manual revocation task for request: ${ctx.requestId} (${ctx.requestTypeSlug})`);

  // Update it to a special manual state
  await db
    .update(fulfillmentJob)
    .set({
      status: "manual_action_required",
      lastError: "Revocation requires human intervention from IT App Owner.",
      updatedAt: new Date()
    })
    .where(and(eq(fulfillmentJob.requestId, ctx.requestId), eq(fulfillmentJob.jobType, "revoke")));

  console.info(`[connector:manual_ticketing] Marked revocation job for ${ctx.requestId} as manual_action_required`);
}

