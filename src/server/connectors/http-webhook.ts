import type { ProvisionContext } from "./types";
import { withProvisionLifecycle } from "@/server/fulfillment";

/**
 * POSTs provision payload to PROVISION_WEBHOOK_URL (Bearer optional via
 * PROVISION_WEBHOOK_BEARER). On non-OK response, fulfillment_job is marked failed.
 */
export async function runHttpWebhookProvision(ctx: ProvisionContext): Promise<void> {
  const url = process.env.PROVISION_WEBHOOK_URL?.trim();
  if (!url) {
    throw new Error("PROVISION_WEBHOOK_URL is not set");
  }

  await withProvisionLifecycle(
    ctx,
    { connector: "http_webhook" },
    async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const bearer = process.env.PROVISION_WEBHOOK_BEARER?.trim();
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      const body = JSON.stringify({
        requestId: ctx.requestId,
        organizationId: ctx.organizationId,
        actorId: ctx.actorId,
        requestTypeSlug: ctx.requestTypeSlug,
        requestTypeTitle: ctx.requestTypeTitle,
        payload: ctx.payload,
        requestStatus: ctx.requestStatus,
      });

      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Provision webhook failed: HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`,
        );
      }
    },
  );
}
